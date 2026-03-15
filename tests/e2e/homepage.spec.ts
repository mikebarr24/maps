import { expect, test } from "@playwright/test";

test("shows the app heading on the homepage", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hello World" })).toBeVisible();
});
