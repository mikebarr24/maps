"use client";

import {
  type ReactNode,
  useActionState,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { FiEdit2, FiLayers, FiSliders, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import Button from "@/app/components/Button";
import {
  SettingsEmptyState,
  SettingsGroup,
  SettingsOption,
  settingsCheckboxClassName,
  settingsFieldClassName,
  settingsTextareaClassName,
} from "./AdminPortal";
import {
  deleteActivityAction,
  deleteActivityTypeAction,
  type AdminFormState,
  updateActivityAction,
  updateActivityTypeAction,
} from "./actions";

type ActivityTypeRecord = {
  id: number;
  name: string;
  updatedAt: string;
};

type ActivityRecord = {
  id: number;
  activityTypeId: number;
  activityTypeName: string;
  title: string;
  description: string;
  customPrompt: string | null;
  isPublished: boolean;
  updatedAt: string;
};

type ActivityTypeOption = {
  id: number;
  name: string;
};

type AdminRecordsProps = {
  activityTypes: ActivityTypeRecord[];
  activityTypeOptions: ActivityTypeOption[];
  activities: ActivityRecord[];
};

const initialState: AdminFormState = {
  status: "idle",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function IconButton({
  label,
  icon,
  onClick,
  tone = "default",
  type = "button",
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  tone?: "default" | "danger";
  type?: "button" | "submit";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === "danger"
          ? "border-danger/30 text-danger hover:bg-danger/10"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );
}

function StatusBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        tone === "accent"
          ? "bg-accent text-accent-foreground"
          : "bg-background text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function useActionToast(
  state: AdminFormState,
  {
    onSuccess,
  }: {
    onSuccess?: () => void;
  } = {},
) {
  const router = useRouter();
  const lastHandledSubmission = useRef<number | undefined>(undefined);
  const handleSuccess = useEffectEvent(() => {
    onSuccess?.();
    router.refresh();
  });

  useEffect(() => {
    if (
      state.status === "idle" ||
      !state.message ||
      state.submittedAt === lastHandledSubmission.current
    ) {
      return;
    }

    lastHandledSubmission.current = state.submittedAt;

    const notify = state.status === "success" ? toast.success : toast.error;
    notify(state.message, {
      id: state.submittedAt,
    });

    if (state.status === "success") {
      handleSuccess();
    }
  }, [state.message, state.status, state.submittedAt]);
}

function ActivityTypeCard({ activityType }: { activityType: ActivityTypeRecord }) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction] = useActionState(
    updateActivityTypeAction,
    initialState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteActivityTypeAction,
    initialState,
  );

  useActionToast(updateState, {
    onSuccess: () => setIsEditing(false),
  });
  useActionToast(deleteState);

  return (
    <SettingsOption
      leading={<FiLayers size={18} />}
      title={activityType.name}
      meta={`Updated ${dateFormatter.format(new Date(activityType.updatedAt))}`}
      actions={
        !isEditing ? (
          <>
            <IconButton
              label="Edit activity type"
              icon={<FiEdit2 size={16} />}
              onClick={() => setIsEditing(true)}
            />
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (!window.confirm(`Delete "${activityType.name}"?`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={activityType.id} />
              <IconButton
                label="Delete activity type"
                icon={<FiTrash2 size={16} />}
                tone="danger"
                type="submit"
              />
            </form>
          </>
        ) : null
      }
    >
      {isEditing ? (
        <form action={updateAction} className="space-y-4 rounded-2xl bg-background px-4 py-4">
          <input type="hidden" name="id" value={activityType.id} />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Name</span>
            <input
              name="name"
              type="text"
              required
              maxLength={120}
              defaultValue={activityType.name}
              className={settingsFieldClassName}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </SettingsOption>
  );
}

function ActivityCard({
  activity,
  activityTypeOptions,
}: {
  activity: ActivityRecord;
  activityTypeOptions: ActivityTypeOption[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction] = useActionState(
    updateActivityAction,
    initialState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteActivityAction,
    initialState,
  );

  useActionToast(updateState, {
    onSuccess: () => setIsEditing(false),
  });
  useActionToast(deleteState);

  return (
    <SettingsOption
      leading={<FiSliders size={18} />}
      title={activity.title}
      description={activity.description}
      meta={`Updated ${dateFormatter.format(new Date(activity.updatedAt))}`}
      badges={
        <>
          <StatusBadge>{activity.activityTypeName}</StatusBadge>
          <StatusBadge tone={activity.isPublished ? "accent" : "default"}>
            {activity.isPublished ? "Published" : "Draft"}
          </StatusBadge>
        </>
      }
      actions={
        !isEditing ? (
          <>
            <IconButton
              label="Edit activity"
              icon={<FiEdit2 size={16} />}
              onClick={() => setIsEditing(true)}
            />
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (!window.confirm(`Delete "${activity.title}"?`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={activity.id} />
              <IconButton
                label="Delete activity"
                icon={<FiTrash2 size={16} />}
                tone="danger"
                type="submit"
              />
            </form>
          </>
        ) : null
      }
    >
      {isEditing ? (
        <form action={updateAction} className="space-y-4 rounded-2xl bg-background px-4 py-4">
          <input type="hidden" name="id" value={activity.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Activity type</span>
              <select
                name="activityTypeId"
                defaultValue={String(activity.activityTypeId)}
                required
                className={settingsFieldClassName}
              >
                {activityTypeOptions.map((activityType) => (
                  <option key={activityType.id} value={activityType.id}>
                    {activityType.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Title</span>
              <input
                name="title"
                type="text"
                required
                maxLength={160}
                defaultValue={activity.title}
                className={settingsFieldClassName}
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Description</span>
            <textarea
              name="description"
              required
              rows={4}
              maxLength={4000}
              defaultValue={activity.description}
              className={settingsTextareaClassName}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Custom prompt</span>
            <textarea
              name="customPrompt"
              rows={3}
              maxLength={4000}
              defaultValue={activity.customPrompt ?? ""}
              className={settingsTextareaClassName}
            />
          </label>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                name="isPublished"
                type="checkbox"
                value="on"
                defaultChecked={activity.isPublished}
                className={settingsCheckboxClassName}
              />
              Published
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      ) : activity.customPrompt ? (
        <div className="rounded-2xl bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
          {activity.customPrompt}
        </div>
      ) : null}
    </SettingsOption>
  );
}

export function ActivityTypeRecordsCard({
  activityTypes,
}: Pick<AdminRecordsProps, "activityTypes">) {
  return (
    <SettingsGroup
      title="Options"
      description="Existing activity types in the filter catalog."
      count={`${activityTypes.length} total`}
    >
      {activityTypes.length === 0 ? (
        <SettingsEmptyState
          title="No activity types yet."
          description="Create one on the left to start organising the map filters."
        />
      ) : (
        activityTypes.map((activityType) => (
          <ActivityTypeCard key={activityType.id} activityType={activityType} />
        ))
      )}
    </SettingsGroup>
  );
}

export function ActivityRecordsCard({
  activityTypeOptions,
  activities,
}: Pick<AdminRecordsProps, "activityTypeOptions" | "activities">) {
  return (
    <SettingsGroup
      title="Options"
      description="Existing activity filters grouped under their activity type."
      count={`${activities.length} total`}
    >
      {activities.length === 0 ? (
        <SettingsEmptyState
          title="No activities yet."
          description="Create an activity to populate the map filter options."
        />
      ) : (
        activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            activityTypeOptions={activityTypeOptions}
          />
        ))
      )}
    </SettingsGroup>
  );
}
