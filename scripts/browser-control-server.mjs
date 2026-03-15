#!/usr/bin/env node

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium, firefox, webkit } from "playwright";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_OUTPUT_DIR = ".browser-control";
const DEFAULT_TIMEOUT_MS = 15_000;

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(
    `Invalid boolean value "${value}" for browser control configuration.`,
  );
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName} value "${value}".`);
  }

  return parsed;
}

function getConfig() {
  const baseUrl = new URL(
    process.env.BROWSER_CONTROL_BASE_URL ?? DEFAULT_BASE_URL,
  ).toString();
  const browserName = process.env.BROWSER_CONTROL_BROWSER ?? "chromium";

  if (!["chromium", "firefox", "webkit"].includes(browserName)) {
    throw new Error(
      `Unsupported BROWSER_CONTROL_BROWSER "${browserName}". Expected chromium, firefox, or webkit.`,
    );
  }

  return {
    actionTimeoutMs: parsePositiveInteger(
      process.env.BROWSER_CONTROL_TIMEOUT_MS ?? `${DEFAULT_TIMEOUT_MS}`,
      "BROWSER_CONTROL_TIMEOUT_MS",
    ),
    baseUrl,
    browserName,
    headless: parseBoolean(process.env.BROWSER_CONTROL_HEADLESS, true),
    outputDir: path.resolve(
      process.cwd(),
      process.env.BROWSER_CONTROL_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR,
    ),
  };
}

const config = getConfig();

const browserTypes = {
  chromium,
  firefox,
  webkit,
};

let browser;
let context;
let page;

async function ensurePage() {
  if (!browser) {
    browser = await browserTypes[config.browserName].launch({
      headless: config.headless,
    });
  }

  if (!context) {
    context = await browser.newContext({
      baseURL: config.baseUrl,
      viewport: { width: 1440, height: 900 },
    });
  }

  if (!page) {
    page = await context.newPage();
    page.setDefaultTimeout(config.actionTimeoutMs);
  }

  return page;
}

function resolveUrl(target) {
  return new URL(target, config.baseUrl).toString();
}

function resolveOutputPath(fileName) {
  const chosenFileName =
    fileName ??
    `screenshot-${new Date().toISOString().replaceAll(":", "-")}.png`;
  const screenshotPath = path.resolve(config.outputDir, chosenFileName);
  const outputRoot = `${config.outputDir}${path.sep}`;

  if (
    screenshotPath !== config.outputDir &&
    !screenshotPath.startsWith(outputRoot)
  ) {
    throw new Error(
      `Screenshot path must stay inside ${config.outputDir}. Received "${chosenFileName}".`,
    );
  }

  return screenshotPath;
}

async function getPageState() {
  if (!page) {
    return {
      title: "",
      url: config.baseUrl,
    };
  }

  return {
    title: await page.title(),
    url: page.url(),
  };
}

function asTextContent(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "maps-browser-control",
  version: "1.0.0",
});

server.registerTool(
  "browser_navigate",
  {
    title: "Navigate Browser",
    description:
      "Open a page in a persistent Playwright browser. Accepts an absolute URL or a path resolved against the local dev server base URL.",
    inputSchema: {
      timeoutMs: z.number().int().positive().max(120_000).optional(),
      url: z
        .string()
        .min(1)
        .describe("Absolute URL or relative path such as / or /maps"),
      waitUntil: z
        .enum(["commit", "domcontentloaded", "load", "networkidle"])
        .optional(),
    },
  },
  async ({ timeoutMs, url, waitUntil = "load" }) => {
    const currentPage = await ensurePage();
    const targetUrl = resolveUrl(url);

    await currentPage.goto(targetUrl, {
      timeout: timeoutMs ?? config.actionTimeoutMs,
      waitUntil,
    });

    return asTextContent({
      action: "navigate",
      ...(await getPageState()),
    });
  },
);

server.registerTool(
  "browser_click",
  {
    title: "Click Element",
    description:
      "Click the first element matching a Playwright selector on the active page.",
    inputSchema: {
      selector: z
        .string()
        .min(1)
        .describe(
          "A Playwright selector such as text=Hello World or button:has-text('Save')",
        ),
      timeoutMs: z.number().int().positive().max(120_000).optional(),
    },
  },
  async ({ selector, timeoutMs }) => {
    const currentPage = await ensurePage();
    const locator = currentPage.locator(selector).first();

    await locator.click({
      timeout: timeoutMs ?? config.actionTimeoutMs,
    });

    return asTextContent({
      action: "click",
      selector,
      ...(await getPageState()),
    });
  },
);

server.registerTool(
  "browser_type",
  {
    title: "Type Into Element",
    description:
      "Fill an input, textarea, or editable field on the active page.",
    inputSchema: {
      clearExisting: z.boolean().optional(),
      pressEnter: z.boolean().optional(),
      selector: z
        .string()
        .min(1)
        .describe("A Playwright selector for the target field"),
      text: z.string().describe("Text to enter into the field"),
      timeoutMs: z.number().int().positive().max(120_000).optional(),
    },
  },
  async ({
    clearExisting = true,
    pressEnter = false,
    selector,
    text,
    timeoutMs,
  }) => {
    const currentPage = await ensurePage();
    const locator = currentPage.locator(selector).first();
    const timeout = timeoutMs ?? config.actionTimeoutMs;

    if (clearExisting) {
      await locator.fill(text, { timeout });
    } else {
      await locator.pressSequentially(text, { timeout });
    }

    if (pressEnter) {
      await locator.press("Enter", { timeout });
    }

    return asTextContent({
      action: "type",
      clearExisting,
      pressEnter,
      selector,
      text,
      ...(await getPageState()),
    });
  },
);

server.registerTool(
  "browser_screenshot",
  {
    title: "Capture Screenshot",
    description:
      "Save a screenshot of the active page or a specific element and return both the file path and inline image data.",
    inputSchema: {
      fileName: z
        .string()
        .min(1)
        .optional()
        .describe("Optional PNG file name relative to the screenshot output dir"),
      fullPage: z.boolean().optional(),
      selector: z
        .string()
        .min(1)
        .optional()
        .describe("Optional Playwright selector for an element screenshot"),
    },
  },
  async ({ fileName, fullPage = true, selector }) => {
    const currentPage = await ensurePage();
    const screenshotPath = resolveOutputPath(fileName);

    await mkdir(path.dirname(screenshotPath), { recursive: true });

    if (selector) {
      await currentPage.locator(selector).first().screenshot({
        path: screenshotPath,
      });
    } else {
      await currentPage.screenshot({
        fullPage,
        path: screenshotPath,
      });
    }

    const image = await readFile(screenshotPath, { encoding: "base64" });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              action: "screenshot",
              fullPage,
              path: screenshotPath,
              selector: selector ?? null,
              ...(await getPageState()),
            },
            null,
            2,
          ),
        },
        {
          type: "image",
          data: image,
          mimeType: "image/png",
        },
      ],
    };
  },
);

async function shutdown() {
  page = undefined;
  context = undefined;

  if (browser?.isConnected()) {
    await browser.close();
  }

  browser = undefined;

  await server.close();
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const signals = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.once(signal, () => {
      shutdown()
        .catch((error) => {
          console.error("Browser control shutdown error:", error);
        })
        .finally(() => {
          process.exit(0);
        });
    });
  }
}

main().catch((error) => {
  console.error("Browser control server error:", error);
  process.exit(1);
});
