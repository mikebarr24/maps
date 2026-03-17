#!/usr/bin/env node

import { execFile } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CONTAINER_NAME = "maps-postgres";
const COMPOSE_SERVICE = "postgres";
const POLL_INTERVAL_MS = 1_000;
const WAIT_TIMEOUT_MS = 60_000;

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function buildDockerError(error, args) {
  const detail = [error.stderr, error.stdout, error.message]
    .filter(Boolean)
    .map((value) => value.toString().trim())
    .find(Boolean);

  return new Error(
    `Docker command failed: docker ${args.join(" ")}${detail ? `\n${detail}` : ""}`,
  );
}

async function runDockerCommand(args) {
  try {
    return await execFileAsync("docker", args, {
      cwd: process.cwd(),
    });
  } catch (error) {
    throw buildDockerError(error, args);
  }
}

function isMissingContainerError(error) {
  return (
    error instanceof Error &&
    error.message.includes(`No such object: ${CONTAINER_NAME}`)
  );
}

function isContainerNameConflictError(error) {
  return (
    error instanceof Error &&
    error.message.includes(
      `container name "/${CONTAINER_NAME}" is already in use`,
    )
  );
}

async function readContainerState() {
  const { stdout } = await runDockerCommand([
    "inspect",
    CONTAINER_NAME,
    "--format",
    "{{json .State}}",
  ]);
  const serializedState = stdout.trim();

  if (!serializedState) {
    throw new Error(
      `Docker inspect did not return state for container "${CONTAINER_NAME}".`,
    );
  }

  return JSON.parse(serializedState);
}

async function readContainerStateOrNull() {
  try {
    return await readContainerState();
  } catch (error) {
    if (isMissingContainerError(error)) {
      return null;
    }

    throw error;
  }
}

async function ensureComposeService() {
  try {
    await runDockerCommand(["compose", "up", "-d", COMPOSE_SERVICE]);
    return;
  } catch (error) {
    if (!isContainerNameConflictError(error)) {
      throw error;
    }
  }

  const existingState = await readContainerStateOrNull();

  if (!existingState) {
    throw new Error(
      `Docker Compose could not manage "${CONTAINER_NAME}", and no existing container was found to reuse.`,
    );
  }

  console.log(
    `Docker container "${CONTAINER_NAME}" already exists outside Compose state; reusing it.`,
  );

  if (!existingState.Running) {
    await runDockerCommand(["start", CONTAINER_NAME]);
  }
}

async function waitForHealthyContainer() {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const state = await readContainerState();
    const healthStatus = state.Health?.Status;

    if (state.Running && (!healthStatus || healthStatus === "healthy")) {
      return;
    }

    if (healthStatus === "unhealthy") {
      throw new Error(
        `Docker container "${CONTAINER_NAME}" became unhealthy while starting.`,
      );
    }

    if (!state.Running && state.Status && state.Status !== "created") {
      throw new Error(
        `Docker container "${CONTAINER_NAME}" is not running (status: ${state.Status}).`,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  const finalState = await readContainerState();
  const finalHealthStatus = finalState.Health?.Status ?? "no-healthcheck";

  throw new Error(
    `Timed out waiting for Docker container "${CONTAINER_NAME}" to become ready. Last known state: running=${String(finalState.Running)}, status=${finalState.Status}, health=${finalHealthStatus}.`,
  );
}

async function ensurePostgresContainer() {
  console.log(`Ensuring Docker service "${COMPOSE_SERVICE}" is running...`);
  await ensureComposeService();
  await waitForHealthyContainer();
  console.log(`Docker container "${CONTAINER_NAME}" is ready.`);
}

await ensurePostgresContainer();
