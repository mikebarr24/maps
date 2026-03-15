import { expect, test } from "@playwright/test";

test("clicks around the current homepage", async ({ page }) => {
  await page.goto("/");

  const heading = page.getByRole("heading", { name: "Hello World" });
  await expect(heading).toBeVisible();

  // Click the visible heading and a couple of screen coordinates
  // to validate interaction wiring end-to-end.
  await heading.click();
  await page.mouse.click(40, 40);
  await page.mouse.click(220, 180);

  await expect(page).toHaveURL(/127\.0\.0\.1:3000\/?$/);
});
