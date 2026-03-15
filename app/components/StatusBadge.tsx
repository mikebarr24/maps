import type { HTMLAttributes, ReactNode } from "react";

type StatusBadgeTone = "default" | "accent";

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: StatusBadgeTone;
};

const toneClassNames: Record<StatusBadgeTone, string> = {
  accent: "bg-accent text-accent-foreground",
  default: "bg-background text-muted-foreground",
};

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export default function StatusBadge({
  children,
  className,
  tone = "default",
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={joinClasses(
        "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        toneClassNames[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
