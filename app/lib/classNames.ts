export type ClassNameValue = string | false | null | undefined;

export const joinClasses = (...classes: ClassNameValue[]) =>
  classes.filter(Boolean).join(" ");
