"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { logger } from "@/db/logger";
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

const activitySchema = z.object({
  activityTypeId: z.coerce.number().int().positive("Choose an activity type."),
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(160, "Title must be 160 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(4000, "Description must be 4000 characters or fewer."),
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

const logAdminActionError = async ({
  eventType,
  message,
  error,
  metadata,
}: {
  eventType: string;
  message: string;
  error: unknown;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await logger.error({
      eventType,
      source: "admin.actions",
      message,
      error,
      metadata,
    });
  } catch (loggingError) {
    console.error("[admin.actions] Failed to write error log", {
      eventType,
      actionError: error,
      loggingError,
    });
  }
};

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

  const values = {
    name: parsed.data.name,
    sourceUrls: parsed.data.sourceUrls,
  };

  try {
    await db.transaction(async (tx) => {
      const [createdActivityType] = await tx
        .insert(activityTypes)
        .values(values)
        .returning({
          id: activityTypes.id,
          name: activityTypes.name,
          sourceUrls: activityTypes.sourceUrls,
        });

      await logger.info(
        {
          eventType: "activity-type.created",
          source: "admin.actions",
          message: "Created activity type from admin",
          metadata: {
            activityTypeId: createdActivityType.id,
            name: createdActivityType.name,
            sourceUrls: createdActivityType.sourceUrls,
          },
        },
        tx,
      );
    });
  } catch (error) {
    await logAdminActionError({
      eventType: "activity-type.create.failed",
      message: "Failed to create activity type from admin",
      error,
      metadata: values,
    });

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

  const values = {
    activityTypeId: parsed.data.activityTypeId,
    title: parsed.data.title,
    description: parsed.data.description,
    customPrompt: parsed.data.customPrompt || null,
    isPublished: parsed.data.isPublished,
  };

  try {
    await db.transaction(async (tx) => {
      const [createdActivity] = await tx
        .insert(activities)
        .values(values)
        .returning({
          id: activities.id,
          activityTypeId: activities.activityTypeId,
          title: activities.title,
          description: activities.description,
          customPrompt: activities.customPrompt,
          isPublished: activities.isPublished,
        });

      await logger.info(
        {
          eventType: "activity.created",
          source: "admin.actions",
          message: "Created activity from admin",
          metadata: {
            activityId: createdActivity.id,
            activityTypeId: createdActivity.activityTypeId,
            title: createdActivity.title,
            description: createdActivity.description,
            customPrompt: createdActivity.customPrompt,
            isPublished: createdActivity.isPublished,
          },
        },
        tx,
      );
    });
  } catch (error) {
    await logAdminActionError({
      eventType: "activity.create.failed",
      message: "Failed to create activity from admin",
      error,
      metadata: values,
    });

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

  const values = {
    name: parsedFields.data.name,
    sourceUrls: parsedFields.data.sourceUrls,
    updatedAt: new Date(),
  };

  try {
    await db.transaction(async (tx) => {
      const [updatedActivityType] = await tx
        .update(activityTypes)
        .set(values)
        .where(eq(activityTypes.id, parsedId.data.id))
        .returning({
          id: activityTypes.id,
          name: activityTypes.name,
          sourceUrls: activityTypes.sourceUrls,
        });

      if (!updatedActivityType) {
        return;
      }

      await logger.info(
        {
          eventType: "activity-type.updated",
          source: "admin.actions",
          message: "Updated activity type from admin",
          metadata: {
            activityTypeId: updatedActivityType.id,
            name: updatedActivityType.name,
            sourceUrls: updatedActivityType.sourceUrls,
          },
        },
        tx,
      );
    });
  } catch (error) {
    await logAdminActionError({
      eventType: "activity-type.update.failed",
      message: "Failed to update activity type from admin",
      error,
      metadata: {
        activityTypeId: parsedId.data.id,
        ...values,
      },
    });

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
    await db.transaction(async (tx) => {
      const [deletedActivityType] = await tx
        .delete(activityTypes)
        .where(eq(activityTypes.id, parsed.data.id))
        .returning({
          id: activityTypes.id,
          name: activityTypes.name,
          sourceUrls: activityTypes.sourceUrls,
        });

      if (!deletedActivityType) {
        return;
      }

      await logger.info(
        {
          eventType: "activity-type.deleted",
          source: "admin.actions",
          message: "Deleted activity type from admin",
          metadata: {
            activityTypeId: deletedActivityType.id,
            name: deletedActivityType.name,
            sourceUrls: deletedActivityType.sourceUrls,
          },
        },
        tx,
      );
    });
  } catch (error) {
    await logAdminActionError({
      eventType: "activity-type.delete.failed",
      message: "Failed to delete activity type from admin",
      error,
      metadata: {
        activityTypeId: parsed.data.id,
      },
    });

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

  const values = {
    activityTypeId: parsedFields.data.activityTypeId,
    title: parsedFields.data.title,
    description: parsedFields.data.description,
    customPrompt: parsedFields.data.customPrompt || null,
    isPublished: parsedFields.data.isPublished,
    updatedAt: new Date(),
  };

  try {
    await db.transaction(async (tx) => {
      const [updatedActivity] = await tx
        .update(activities)
        .set(values)
        .where(eq(activities.id, parsedId.data.id))
        .returning({
          id: activities.id,
          activityTypeId: activities.activityTypeId,
          title: activities.title,
          description: activities.description,
          customPrompt: activities.customPrompt,
          isPublished: activities.isPublished,
        });

      if (!updatedActivity) {
        return;
      }

      await logger.info(
        {
          eventType: "activity.updated",
          source: "admin.actions",
          message: "Updated activity from admin",
          metadata: {
            activityId: updatedActivity.id,
            activityTypeId: updatedActivity.activityTypeId,
            title: updatedActivity.title,
            description: updatedActivity.description,
            customPrompt: updatedActivity.customPrompt,
            isPublished: updatedActivity.isPublished,
          },
        },
        tx,
      );
    });
  } catch (error) {
    await logAdminActionError({
      eventType: "activity.update.failed",
      message: "Failed to update activity from admin",
      error,
      metadata: {
        activityId: parsedId.data.id,
        ...values,
      },
    });

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
    await db.transaction(async (tx) => {
      const [deletedActivity] = await tx
        .delete(activities)
        .where(eq(activities.id, parsed.data.id))
        .returning({
          id: activities.id,
          activityTypeId: activities.activityTypeId,
          title: activities.title,
          description: activities.description,
          customPrompt: activities.customPrompt,
          isPublished: activities.isPublished,
        });

      if (!deletedActivity) {
        return;
      }

      await logger.info(
        {
          eventType: "activity.deleted",
          source: "admin.actions",
          message: "Deleted activity from admin",
          metadata: {
            activityId: deletedActivity.id,
            activityTypeId: deletedActivity.activityTypeId,
            title: deletedActivity.title,
            description: deletedActivity.description,
            customPrompt: deletedActivity.customPrompt,
            isPublished: deletedActivity.isPublished,
          },
        },
        tx,
      );
    });
  } catch (error) {
    await logAdminActionError({
      eventType: "activity.delete.failed",
      message: "Failed to delete activity from admin",
      error,
      metadata: {
        activityId: parsed.data.id,
      },
    });

    return getErrorState("Unable to delete activity.", error);
  }

  revalidatePath("/admin");

  return {
    status: "success",
    message: "Activity deleted.",
    submittedAt: Date.now(),
  };
}
