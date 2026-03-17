import { expect, test } from "@playwright/test";

test("shows an explicit error when AI description generation is unavailable", async ({
  page,
}) => {
  const activityTypeName = `AI Test ${Date.now()}`;

  await page.goto("/admin");

  await page.getByRole("heading", { name: "Activity types" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill(activityTypeName);
  await page.getByRole("button", { name: "Create activity type" }).click();

  await expect(page.getByText("Activity type created.")).toBeVisible();

  await page.getByRole("heading", { name: "Activities" }).click();
  await page.getByRole("combobox", { name: "Activity type" }).selectOption({
    label: activityTypeName,
  });
  await page.getByRole("textbox", { name: "Title" }).fill("Trail running");
  await page
    .getByRole("textbox", { name: "Custom prompt", exact: true })
    .fill("Focus on routes that suit mixed terrain and day trips.");

  await page.getByRole("button", { name: "Generate with AI" }).click();

  await expect(
    page.getByText(
      'Unable to generate a description. AI generation failed for openai/gpt-5-mini: OPENAI_API_KEY is required to use the OpenAI provider.',
    ),
  ).toBeVisible();
});
