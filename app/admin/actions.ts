"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AiConfigurationError,
  AiGenerationError,
  AiProvider,
} from "@/app/ai/contracts";
import { generateText } from "@/app/ai/service";
import { db } from "@/db";
import { activities, activityTypes } from "@/db/schema";

export type AdminFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  submittedAt?: number;
};

const sourceUrlErrorMessage = "Enter valid HTTPS URLs, one per line.";

const sourceUrlSchema = z
  .url({ message: sourceUrlErrorMessage })
  .refine((url) => new URL(url).protocol === "https:", {
    message: sourceUrlErrorMessage,
  });

const parseSourceUrls = (value: string, ctx: z.RefinementCtx) => {
  const sourceUrls = [
    ...new Set(
      value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];

  const invalidSourceUrl = sourceUrls.find(
    (sourceUrl) => !sourceUrlSchema.safeParse(sourceUrl).success,
  );

  if (invalidSourceUrl) {
    ctx.addIssue({
      code: "custom",
      message: sourceUrlErrorMessage,
    });

    return z.NEVER;
  }

  return sourceUrls;
};

const activityTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(120, "Name must be 120 characters or fewer."),
  sourceUrls: z
    .string()
    .trim()
    .max(4000, "Source URLs must be 4000 characters or fewer.")
    .transform((value, ctx) => parseSourceUrls(value, ctx)),
});

const activityDescriptionFieldSchema = z
  .string()
  .trim()
  .max(4000, "Description must be 4000 characters or fewer.");

const activityDescriptionSchema = activityDescriptionFieldSchema.min(
  1,
  "Description is required.",
);

const activitySchema = z.object({
  activityTypeId: z.coerce.number().int().positive("Choose an activity type."),
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(160, "Title must be 160 characters or fewer."),
  description: activityDescriptionFieldSchema,
  customPrompt: z
    .string()
    .trim()
    .max(4000, "Custom prompt must be 4000 characters or fewer.")
    .optional(),
  isPublished: z.boolean(),
});

const idSchema = z.object({
  id: z.coerce.number().int().positive("A valid record id is required."),
});

const getFieldErrors = (
  error: z.ZodError,
): Record<string, string> | undefined => {
  const flattened = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const entries = Object.entries(flattened)
    .map(([key, value]) => [key, value?.[0]] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const isDatabaseError = (
  error: unknown,
): error is {
  code?: string;
} => typeof error === "object" && error !== null;

const getErrorState = (
  fallbackMessage: string,
  error: unknown,
): AdminFormState => {
  if (isDatabaseError(error) && error.code === "23505") {
    return {
      status: "error",
      message: "That record already exists.",
      submittedAt: Date.now(),
    };
  }

  if (isDatabaseError(error) && error.code === "23503") {
    return {
      status: "error",
      message: "Delete linked activities before deleting this activity type.",
      submittedAt: Date.now(),
    };
  }

  return {
    status: "error",
    message: fallbackMessage,
    submittedAt: Date.now(),
  };
};

const getDescriptionErrorState = (message: string): AdminFormState => ({
  status: "error",
  message,
  fieldErrors: {
    description: message,
  },
  submittedAt: Date.now(),
});

const buildActivityDescriptionPrompt = ({
  activityTypeName,
  title,
  customPrompt,
  sourceUrls,
}: {
  activityTypeName: string;
  title: string;
  customPrompt?: string;
  sourceUrls: string[];
}) =>
  [
    `Activity type: ${activityTypeName}`,
    `Activity title: ${title}`,
    customPrompt ? `Additional guidance: ${customPrompt}` : null,
    sourceUrls.length > 0
      ? `Context URLs: ${sourceUrls.join(", ")}`
      : "Context URLs: none provided",
  ]
    .filter(Boolean)
    .join("\n");

async function resolveActivityDescription(fields: {
  activityTypeId: number;
  title: string;
  description: string;
  customPrompt?: string;
}): Promise<
  | {
      description: string;
    }
  | {
      errorState: AdminFormState;
    }
> {
  if (fields.description) {
    const parsedDescription = activityDescriptionSchema.safeParse(
      fields.description,
    );

    if (!parsedDescription.success) {
      return {
        errorState: {
          status: "error",
          message: "Fix the highlighted fields and try again.",
          fieldErrors: getFieldErrors(parsedDescription.error),
          submittedAt: Date.now(),
        },
      };
    }

    return {
      description: parsedDescription.data,
    };
  }

  const [activityTypeRow] = await db
    .select({
      name: activityTypes.name,
      sourceUrls: activityTypes.sourceUrls,
    })
    .from(activityTypes)
    .where(eq(activityTypes.id, fields.activityTypeId))
    .limit(1);

  if (!activityTypeRow) {
    return {
      errorState: {
        status: "error",
        message: "Fix the highlighted fields and try again.",
        fieldErrors: {
          activityTypeId: "Choose an activity type.",
        },
        submittedAt: Date.now(),
      },
    };
  }

  try {
    const generated = await generateText({
      instructions:
        "Write a plain-text description for an outdoor map activity filter. Keep it to one or two sentences, do not use markdown or bullet points, and do not mention AI, prompts, or source URLs.",
      prompt: buildActivityDescriptionPrompt({
        activityTypeName: activityTypeRow.name,
        title: fields.title,
        customPrompt: fields.customPrompt,
        sourceUrls: activityTypeRow.sourceUrls,
      }),
      sessionId: `activity-description-${fields.activityTypeId}-${fields.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40)}`,
      config: {
        provider: AiProvider.OpenAI,
      },
    });

    const parsedDescription = activityDescriptionSchema.safeParse(generated.text);

    if (!parsedDescription.success) {
      return {
        errorState: getDescriptionErrorState(
          "AI generated an invalid description. Add one manually and try again.",
        ),
      };
    }

    return {
      description: parsedDescription.data,
    };
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      return {
        errorState: getDescriptionErrorState(
          "Add a description manually, or configure OPENAI_API_KEY to enable AI generation.",
        ),
      };
    }

    if (error instanceof AiGenerationError) {
      return {
        errorState: getDescriptionErrorState(
          "Unable to generate a description right now. Add one manually and try again.",
        ),
      };
    }

    throw error;
  }
}

export async function createActivityTypeAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsed = activityTypeSchema.safeParse({
    name: formData.get("name"),
    sourceUrls: formData.get("sourceUrls") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsed.error),
      submittedAt: Date.now(),
    };
  }

  try {
    await db.insert(activityTypes).values({
      name: parsed.data.name,
      sourceUrls: parsed.data.sourceUrls,
    });
  } catch (error) {
    return getErrorState("Unable to create activity type.", error);
  }

  revalidatePath("/admin");

  return {
    status: "success",
    message: "Activity type created.",
    submittedAt: Date.now(),
  };
}

export async function createActivityAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsed = activitySchema.safeParse({
    activityTypeId: formData.get("activityTypeId"),
    title: formData.get("title"),
    description: formData.get("description"),
    customPrompt: formData.get("customPrompt") || undefined,
    isPublished: formData.get("isPublished") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsed.error),
      submittedAt: Date.now(),
    };
  }

  const descriptionResult = await resolveActivityDescription(parsed.data);

  if ("errorState" in descriptionResult) {
    return descriptionResult.errorState;
  }

  try {
    await db.insert(activities).values({
      activityTypeId: parsed.data.activityTypeId,
      title: parsed.data.title,
      description: descriptionResult.description,
      customPrompt: parsed.data.customPrompt || null,
      isPublished: parsed.data.isPublished,
    });
  } catch (error) {
    return getErrorState("Unable to create activity.", error);
  }

  revalidatePath("/admin");

  return {
    status: "success",
    message: "Activity created.",
    submittedAt: Date.now(),
  };
}

export async function updateActivityTypeAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsedId = idSchema.safeParse({
    id: formData.get("id"),
  });
  const parsedFields = activityTypeSchema.safeParse({
    name: formData.get("name"),
    sourceUrls: formData.get("sourceUrls") ?? "",
  });

  if (!parsedId.success || !parsedFields.success) {
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: {
        ...(!parsedId.success ? getFieldErrors(parsedId.error) : undefined),
        ...(!parsedFields.success ? getFieldErrors(parsedFields.error) : undefined),
      },
      submittedAt: Date.now(),
    };
  }

  try {
    await db
      .update(activityTypes)
      .set({
        name: parsedFields.data.name,
        sourceUrls: parsedFields.data.sourceUrls,
        updatedAt: new Date(),
      })
      .where(eq(activityTypes.id, parsedId.data.id));
  } catch (error) {
    return getErrorState("Unable to update activity type.", error);
  }

  revalidatePath("/admin");

  return {
    status: "success",
    message: "Activity type updated.",
    submittedAt: Date.now(),
  };
}

export async function deleteActivityTypeAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsed = idSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Unable to delete that activity type.",
      submittedAt: Date.now(),
    };
  }

  try {
    await db.delete(activityTypes).where(eq(activityTypes.id, parsed.data.id));
  } catch (error) {
    return getErrorState("Unable to delete activity type.", error);
  }

  revalidatePath("/admin");

  return {
    status: "success",
    message: "Activity type deleted.",
    submittedAt: Date.now(),
  };
}

export async function updateActivityAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsedId = idSchema.safeParse({
    id: formData.get("id"),
  });
  const parsedFields = activitySchema.safeParse({
    activityTypeId: formData.get("activityTypeId"),
    title: formData.get("title"),
    description: formData.get("description"),
    customPrompt: formData.get("customPrompt") || undefined,
    isPublished: formData.get("isPublished") === "on",
  });

  if (!parsedId.success || !parsedFields.success) {
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: {
        ...(!parsedId.success ? getFieldErrors(parsedId.error) : undefined),
        ...(!parsedFields.success ? getFieldErrors(parsedFields.error) : undefined),
      },
      submittedAt: Date.now(),
    };
  }

  const descriptionResult = await resolveActivityDescription(parsedFields.data);

  if ("errorState" in descriptionResult) {
    return descriptionResult.errorState;
  }

  try {
    await db
      .update(activities)
      .set({
        activityTypeId: parsedFields.data.activityTypeId,
        title: parsedFields.data.title,
        description: descriptionResult.description,
        customPrompt: parsedFields.data.customPrompt || null,
        isPublished: parsedFields.data.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, parsedId.data.id));
  } catch (error) {
    return getErrorState("Unable to update activity.", error);
  }

  revalidatePath("/admin");

  return {
    status: "success",
    message: "Activity updated.",
    submittedAt: Date.now(),
  };
}

export async function deleteActivityAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsed = idSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Unable to delete that activity.",
      submittedAt: Date.now(),
    };
  }

  try {
    await db.delete(activities).where(eq(activities.id, parsed.data.id));
  } catch (error) {
    return getErrorState("Unable to delete activity.", error);
  }

  revalidatePath("/admin");

  return {
    status: "success",
    message: "Activity deleted.",
    submittedAt: Date.now(),
  };
}
