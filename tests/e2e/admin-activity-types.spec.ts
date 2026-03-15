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
    page.getByText("Add one website URL per line to guide LLM research"),
  ).toBeVisible();
});
