import { HTMLAttributes } from "react";
import clsx from "clsx";

export default function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "card-surface rounded-2xl p-6 transition hover:border-aura-purple/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
