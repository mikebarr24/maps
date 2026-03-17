import { expect, test } from "@playwright/test";

test("opens and closes the popup via the close button", async ({ page }) => {
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Open popup" });
  await expect(trigger).toBeVisible();

  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Popup title")).toBeVisible();

  await page.getByRole("button", { name: "Close popup" }).click();
  await expect(dialog).not.toBeVisible();
});

test("closes the popup when the backdrop is clicked", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open popup" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Click outside the panel (top-left corner of the backdrop)
  await page.mouse.click(10, 10);
  await expect(dialog).not.toBeVisible();
});

test("closes the popup when the Escape key is pressed", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open popup" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
