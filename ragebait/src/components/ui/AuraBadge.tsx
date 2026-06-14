import clsx from "clsx";

interface AuraBadgeProps {
  value: number;
  size?: "sm" | "md" | "lg";
  trend?: "up" | "down" | "neutral";
}

export default function AuraBadge({ value, size = "md", trend = "neutral" }: AuraBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2 font-mono font-medium",
        {
          "px-2.5 py-1 text-xs": size === "sm",
          "px-3.5 py-1.5 text-sm": size === "md",
          "px-5 py-2 text-lg": size === "lg",
        }
      )}
    >
      <span
        className={clsx("h-2 w-2 rounded-full", {
          "bg-aura-blue": trend === "up",
          "bg-aura-crimson": trend === "down",
          "bg-aura-purple": trend === "neutral",
        })}
      />
      <span className="text-gradient font-display">{value.toLocaleString()}</span>
      <span className="text-white/40">Aura</span>
    </span>
  );
}
