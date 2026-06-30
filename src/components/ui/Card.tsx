import { HTMLAttributes } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: "purple" | "blue" | "crimson" | "none";
}

export default function Card({
  className,
  children,
  glow = "none",
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "card-surface rounded-2xl p-6 transition-colors duration-300 hover:border-aura-purple/40",
        {
          "hover:glow-ring-purple": glow === "purple",
          "hover:glow-ring-blue": glow === "blue",
          "hover:glow-ring-crimson": glow === "crimson",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
