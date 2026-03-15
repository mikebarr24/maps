import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required to connect to Postgres."),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});
