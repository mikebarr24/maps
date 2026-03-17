import { z } from "zod";

const originalUrlErrorMessage =
  "Each result must include a valid HTTP or HTTPS original URL.";

const isPublicWebUrl = (value: string) => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const searchResultsSchema = z.object({
  results: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        shortDescription: z.string().trim().min(1).max(280),
        originalUrl: z.string().trim().refine(isPublicWebUrl, {
          message: originalUrlErrorMessage,
        }),
      }),
    )
    .max(8),
});
