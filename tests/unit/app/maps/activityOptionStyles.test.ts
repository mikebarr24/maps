import { describe, expect, it } from "vitest";
import { getActivityOptionClasses } from "../../../../app/maps/activityOptionStyles";

describe("app/maps/activityOptionStyles", () => {
  it("uses theme-aware high-contrast classes for selected activity options", () => {
    const classes = getActivityOptionClasses(true);

    expect(classes.button).toContain("border-accent");
    expect(classes.button).toContain("bg-accent");
    expect(classes.button).toContain("text-accent-foreground");
    expect(classes.button).not.toContain("bg-sky-50");
    expect(classes.description).toContain("text-accent-foreground");
    expect(classes.indicator).toContain("border-accent-foreground");
    expect(classes.indicator).toContain("bg-accent-foreground");
  });

  it("preserves the existing unselected activity option styling", () => {
    const classes = getActivityOptionClasses(false);

    expect(classes.button).toContain("border-border");
    expect(classes.button).toContain("bg-background");
    expect(classes.button).toContain("hover:border-slate-400");
    expect(classes.description).toContain("text-muted-foreground");
    expect(classes.indicator).toContain("border-slate-300");
    expect(classes.indicator).toContain("bg-transparent");
  });
});
