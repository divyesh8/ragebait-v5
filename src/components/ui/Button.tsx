import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
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
        "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-aura-blue disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-aura-gradient text-void shadow-glow hover:opacity-90 hover:shadow-[0_0_50px_rgba(166,91,255,0.5)]":
            variant === "primary",
          "border border-aura-purple/25 bg-white/5 backdrop-blur-md text-white hover:border-aura-purple/60 hover:bg-white/10":
            variant === "secondary",
          "text-white/70 hover:text-white hover:bg-white/5": variant === "ghost",
          "bg-aura-crimson text-white shadow-glow-crimson hover:opacity-90":
            variant === "danger",
        },
        {
          "px-3 py-1.5 text-xs": size === "xs",
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
