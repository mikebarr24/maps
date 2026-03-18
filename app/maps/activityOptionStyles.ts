import { joinClasses } from "@/app/lib/classNames";

export const getActivityOptionClasses = (isSelected: boolean) => ({
  button: joinClasses(
    "w-full rounded-2xl border px-4 py-3 text-left transition",
    isSelected
      ? "border-accent bg-accent text-accent-foreground"
      : "border-border bg-background hover:border-slate-400",
  ),
  description: joinClasses(
    "m-0 mt-1 text-sm leading-6",
    isSelected ? "text-accent-foreground" : "text-muted-foreground",
  ),
  indicator: joinClasses(
    "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
    isSelected
      ? "border-accent-foreground bg-accent-foreground"
      : "border-slate-300 bg-transparent",
  ),
});
