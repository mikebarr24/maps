import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "inverseGhost";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border-sky-700 bg-sky-700 text-white hover:bg-sky-800 hover:border-sky-800",
  secondary:
    "border-slate-900 bg-slate-900 text-white hover:border-slate-700 hover:bg-slate-700",
  ghost:
    "border-transparent bg-transparent text-slate-900 hover:bg-slate-100",
  inverseGhost:
    "border-transparent bg-transparent text-white hover:bg-white/10",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-2",
  md: "min-h-10 px-4 py-2.5",
  lg: "min-h-11 px-5 py-3",
  icon: "h-10 w-10 p-0",
};

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      disabled = false,
      fullWidth = false,
      isLoading = false,
      size = "md",
      type = "button",
      variant = "primary",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        aria-busy={isLoading || undefined}
        className={joinClasses(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled || isLoading}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export default Button;
