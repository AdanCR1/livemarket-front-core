interface LiveBadgeProps {
  className?: string;
  /** Tamaño del badge */
  size?: "sm" | "md";
}

/**
 * Badge "LIVE" con animación de pulso rojo/neón.
 * Posicionamiento absoluto — el padre debe tener position: relative.
 * La animación pulse-live está definida en global.css via @theme.
 */
export function LiveBadge({ className = "", size = "sm" }: LiveBadgeProps) {
  const sizeClasses = size === "md"
    ? "px-3 py-1.5 text-xs gap-2"
    : "px-2 py-1 text-[10px] gap-1.5";

  return (
    <div
      className={`inline-flex items-center rounded-full
                  bg-live-red/15 border border-live-red/30
                  backdrop-blur-sm animate-pulse-live ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-live-red shrink-0" />
      <span className="font-bold tracking-widest text-live-red uppercase">
        Live
      </span>
    </div>
  );
}
