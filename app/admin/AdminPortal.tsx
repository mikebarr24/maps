import { type ReactNode } from "react";
import { FiChevronDown } from "react-icons/fi";

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const settingsFieldClassName =
  "w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition focus:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60";

export const settingsTextareaClassName = joinClasses(
  settingsFieldClassName,
  "min-h-28 resize-y",
);

export const settingsCheckboxClassName =
  "h-4 w-4 rounded border-border accent-accent disabled:cursor-not-allowed";

export function AdminPortal({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}

export function AdminPortalHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[2rem] border border-border bg-surface px-6 py-7 shadow-sm sm:px-8">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="m-0 mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="m-0 mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
        {description}
      </p>
    </section>
  );
}

export function AdminPortalNotice({
  children,
  tone = "danger",
}: {
  children: ReactNode;
  tone?: "danger" | "default";
}) {
  return (
    <section
      className={joinClasses(
        "rounded-[1.5rem] border px-5 py-4 text-sm shadow-sm",
        tone === "danger"
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-border bg-surface text-foreground",
      )}
    >
      {children}
    </section>
  );
}

export function AdminPortalSection({
  eyebrow,
  title,
  description,
  toggleLabel = "Edit details",
  defaultOpen = false,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  toggleLabel?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-[2rem] border border-border bg-surface px-4 py-5 shadow-sm sm:px-8 sm:py-6"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </p>
            <h2 className="m-0 text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>
            <p className="m-0 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <span className="inline-flex shrink-0 self-end items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground sm:self-start">
            <span>{toggleLabel}</span>
            <FiChevronDown
              size={16}
              className="transition-transform duration-150 group-open:rotate-180"
            />
          </span>
        </div>
      </summary>

      <div className="mt-6 border-t border-border pt-6">{children}</div>
    </details>
  );
}

export function SettingsGroup({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description?: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="m-0 text-lg font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="m-0 mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {count ? (
          <span className="self-start rounded-full bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:shrink-0">
            {count}
          </span>
        ) : null}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

export function SettingsOption({
  title,
  description,
  meta,
  badges,
  leading,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {leading ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background text-muted-foreground">
            {leading}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="m-0 text-base font-semibold tracking-tight">
                  {title}
                </p>
                {badges}
              </div>

              {description ? (
                <div className="m-0 mt-1 text-sm leading-6 text-muted-foreground">
                  {description}
                </div>
              ) : null}

              {meta ? (
                <div className="m-0 mt-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {meta}
                </div>
              ) : null}
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                {actions}
              </div>
            ) : null}
          </div>

          {children ? (
            <div className="mt-4 border-t border-border pt-4">{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SettingsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-5 sm:px-6">
      <p className="m-0 text-sm font-medium text-foreground">{title}</p>
      <p className="m-0 mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
