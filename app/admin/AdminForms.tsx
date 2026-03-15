"use client";

import { type ReactNode, useActionState, useEffect, useRef } from "react";
import { FiLayers, FiPlusCircle } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import Button from "@/app/components/Button";
import FormFieldError from "@/app/components/FormFieldError";
import {
  SettingsGroup,
  SettingsOption,
  settingsCheckboxClassName,
  settingsFieldClassName,
  settingsTextareaClassName,
} from "./AdminPortal";
import {
  createActivityAction,
  createActivityTypeAction,
  type AdminFormState,
} from "./actions";

type ActivityTypeOption = {
  id: number;
  name: string;
};

type AdminFormsProps = {
  activityTypes: ActivityTypeOption[];
  isSchemaReady: boolean;
};

const initialState: AdminFormState = {
  status: "idle",
};

function SubmitButton({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? "Saving..." : children}
    </Button>
  );
}

export function ActivityTypeFormCard({
  isSchemaReady,
}: Pick<AdminFormsProps, "isSchemaReady">) {
  const router = useRouter();
  const activityTypeFormRef = useRef<HTMLFormElement | null>(null);
  const [activityTypeState, createActivityType] = useActionState(
    createActivityTypeAction,
    initialState,
  );

  useEffect(() => {
    if (activityTypeState.status === "idle" || !activityTypeState.message) {
      return;
    }

    const notify =
      activityTypeState.status === "success" ? toast.success : toast.error;
    notify(activityTypeState.message, {
      id: activityTypeState.submittedAt,
    });

    if (activityTypeState.status === "success") {
      activityTypeFormRef.current?.reset();
      router.refresh();
    }
  }, [
    activityTypeState.message,
    activityTypeState.status,
    activityTypeState.submittedAt,
    router,
  ]);

  const isActivityTypeFormDisabled = !isSchemaReady;

  return (
    <SettingsGroup
      title="Create"
      description="Add a new top-level activity type to the map filter catalog."
    >
      <SettingsOption
        leading={<FiLayers size={18} />}
        title="Activity type"
        description="Examples: Climbing, Running, or Cycling. You can also attach source websites for LLM research."
      >
        {!isSchemaReady ? (
          <p className="m-0 mb-4 text-sm text-danger">
            Apply the latest Drizzle migration before using this form.
          </p>
        ) : null}

        <form
          ref={activityTypeFormRef}
          action={createActivityType}
          className="space-y-4"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Name</span>
            <input
              name="name"
              type="text"
              required
              maxLength={120}
              disabled={isActivityTypeFormDisabled}
              className={settingsFieldClassName}
              placeholder="Enter an activity type name"
            />
            <FormFieldError message={activityTypeState.fieldErrors?.name} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Source URLs</span>
            <textarea
              name="sourceUrls"
              rows={5}
              maxLength={4000}
              disabled={isActivityTypeFormDisabled}
              className={settingsTextareaClassName}
              placeholder={"https://www.nps.gov\nhttps://www.rei.com"}
            />
            <p className="m-0 text-sm text-muted-foreground">
              Add one website URL per line to guide LLM research for this
              activity type.
            </p>
            <FormFieldError message={activityTypeState.fieldErrors?.sourceUrls} />
          </label>

          <div className="flex justify-start">
            <SubmitButton disabled={isActivityTypeFormDisabled}>
              Create activity type
            </SubmitButton>
          </div>
        </form>
      </SettingsOption>
    </SettingsGroup>
  );
}

export function ActivityFormCard({
  activityTypes,
  isSchemaReady,
}: AdminFormsProps) {
  const router = useRouter();
  const activityFormRef = useRef<HTMLFormElement | null>(null);
  const [activityState, createActivity] = useActionState(
    createActivityAction,
    initialState,
  );

  useEffect(() => {
    if (activityState.status === "idle" || !activityState.message) {
      return;
    }

    const notify =
      activityState.status === "success" ? toast.success : toast.error;
    notify(activityState.message, {
      id: activityState.submittedAt,
    });

    if (activityState.status === "success") {
      activityFormRef.current?.reset();
      router.refresh();
    }
  }, [
    activityState.message,
    activityState.status,
    activityState.submittedAt,
    router,
  ]);

  const isActivityFormDisabled = !isSchemaReady || activityTypes.length === 0;

  return (
    <SettingsGroup
      title="Create"
      description="Add a new activity filter and attach it to an existing type."
    >
      <SettingsOption
        leading={<FiPlusCircle size={18} />}
        title="Activity"
        description="This creates a specific filter users can select on the map."
      >
        {!isSchemaReady ? (
          <p className="m-0 mb-4 text-sm text-danger">
            Apply the latest Drizzle migration before using this form.
          </p>
        ) : null}

        <form
          ref={activityFormRef}
          action={createActivity}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Activity type</span>
              <select
                name="activityTypeId"
                required
                disabled={isActivityFormDisabled}
                className={settingsFieldClassName}
                defaultValue=""
              >
                <option value="" disabled>
                  {isActivityFormDisabled
                    ? "Create an activity type first"
                    : "Select an activity type"}
                </option>
                {activityTypes.map((activityType) => (
                  <option key={activityType.id} value={activityType.id}>
                    {activityType.name}
                  </option>
                ))}
              </select>
              <FormFieldError
                message={activityState.fieldErrors?.activityTypeId}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Title</span>
              <input
                name="title"
                type="text"
                required
                maxLength={160}
                disabled={isActivityFormDisabled}
                className={settingsFieldClassName}
                placeholder="Enter an activity name"
              />
              <FormFieldError message={activityState.fieldErrors?.title} />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Description</span>
            <textarea
              name="description"
              required
              rows={5}
              maxLength={4000}
              disabled={isActivityFormDisabled}
              className={settingsTextareaClassName}
              placeholder="Describe how this activity should appear in the map filters."
            />
            <FormFieldError message={activityState.fieldErrors?.description} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Custom prompt</span>
            <textarea
              name="customPrompt"
              rows={4}
              maxLength={4000}
              disabled={isActivityFormDisabled}
              className={settingsTextareaClassName}
              placeholder="Add optional LLM instructions, or leave this blank."
            />
            <FormFieldError message={activityState.fieldErrors?.customPrompt} />
          </label>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                name="isPublished"
                type="checkbox"
                value="on"
                disabled={isActivityFormDisabled}
                className={settingsCheckboxClassName}
              />
              Published
            </label>

            <div className="flex justify-start sm:justify-end">
              <SubmitButton disabled={isActivityFormDisabled}>
                Create activity
              </SubmitButton>
            </div>
          </div>

          {activityTypes.length === 0 && isSchemaReady ? (
            <div className="rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground">
              Add at least one activity type before creating activities.
            </div>
          ) : null}
        </form>
      </SettingsOption>
    </SettingsGroup>
  );
}
