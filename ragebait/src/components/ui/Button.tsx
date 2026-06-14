import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-semibold transition focus-visible:ring-2 focus-visible:ring-aura-blue disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-aura-gradient text-void shadow-glow hover:opacity-90":
            variant === "primary",
          "border border-line bg-surface2 text-white hover:border-aura-purple":
            variant === "secondary",
          "text-white/70 hover:text-white": variant === "ghost",
          "bg-aura-crimson text-white shadow-glow-crimson hover:opacity-90":
            variant === "danger",
        },
        {
          "px-4 py-2 text-sm": size === "sm",
          "px-6 py-3 text-sm": size === "md",
          "px-8 py-4 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
