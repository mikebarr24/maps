import { expect, test } from "@playwright/test";

test("shows the source URLs field on the admin activity type form", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Manage map activity filters" }),
  ).toBeVisible();

  await page.getByRole("heading", { name: "Activity types" }).click();

  await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();

  await expect(page.getByRole("textbox", { name: "Source URLs" })).toBeVisible();

  await expect(
    page.getByText("Add one HTTPS website URL per line to guide LLM research"),
  ).toBeVisible();
});

test("rejects non-https source URLs on the admin activity type form", async ({
  page,
}) => {
  await page.goto("/admin");

  await page.getByRole("heading", { name: "Activity types" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Test activity type");
  await page
    .getByRole("textbox", { name: "Source URLs" })
    .fill("http://example.com");

  await page.getByRole("button", { name: "Create activity type" }).click();

  await expect(
    page.getByText("Enter valid HTTPS URLs, one per line."),
  ).toBeVisible();
});

test("requires a manual description when AI is not configured", async ({
  page,
}) => {
  test.skip(
    !!process.env.OPENAI_API_KEY,
    "This scenario only applies when AI generation is not configured.",
  );

  const uniqueSuffix = Date.now().toString();
  const activityTypeName = `Test activity type ${uniqueSuffix}`;

  await page.goto("/admin");

  await page.getByRole("heading", { name: "Activity types" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill(activityTypeName);
  await page.getByRole("button", { name: "Create activity type" }).click();

  await expect(page.getByText("Activity type created.")).toBeVisible();

  await page.getByRole("heading", { name: "Activities" }).click();
  await page
    .getByRole("combobox", { name: "Activity type" })
    .selectOption({ label: activityTypeName });
  await page.getByRole("textbox", { name: "Title" }).fill("Test activity");
  await page
    .getByRole("button", { name: "Create activity", exact: true })
    .click();

  await expect(
    page.getByText(
      "Add a description manually, or configure OPENAI_API_KEY to enable AI generation.",
    ),
  ).toBeVisible();
});
