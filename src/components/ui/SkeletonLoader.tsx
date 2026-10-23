import { FiShoppingBag } from "react-icons/fi";

interface SkeletonLoaderProps {
  /** Variante visual del skeleton */
  variant?: "card" | "grid" | "detail";
  /** Cantidad de elementos skeleton (para grid) */
  count?: number;
  /** Mensaje personalizado bajo el skeleton */
  message?: string;
  /** Indica si hubo un error real (no solo carga) */
  isError?: boolean;
}

/**
 * Skeleton loader con animación shimmer.
 * Se muestra cuando MS1 no responde (carga) o cuando falla (error).
 * Variantes:
 * - card: una tarjeta skeleton individual
 * - grid: grilla de tarjetas skeleton
 * - detail: skeleton para página de detalle (header + contenido)
 */
export function SkeletonLoader({
  variant = "card",
  count = 6,
  message,
  isError = false,
}: SkeletonLoaderProps) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-market-card border border-market-border flex items-center justify-center mb-6">
          <FiShoppingBag className="w-9 h-9 text-market-muted" />
        </div>
        <h2 className="text-xl font-bold text-market-white mb-2">
          Mercado temporalmente cerrado
        </h2>
        <p className="text-market-muted text-center max-w-md">
          {message || "No pudimos conectar con el servicio. Los datos se cargarán cuando esté disponible."}
        </p>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="animate-fade-in space-y-6 p-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl skeleton-shimmer" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-48 rounded-lg skeleton-shimmer" />
            <div className="h-4 w-32 rounded skeleton-shimmer" />
          </div>
        </div>
        {/* Live section skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-40 rounded skeleton-shimmer" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="min-w-[200px] h-56 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        </div>
        {/* Catalog grid skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-36 rounded skeleton-shimmer" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="animate-fade-in">
        {message && (
          <p className="text-market-muted text-sm mb-4 text-center">{message}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(count)].map((_, i) => (
            <SkeletonCard key={i} delay={i * 100} />
          ))}
        </div>
      </div>
    );
  }

  // Variante "card" (individual)
  return <SkeletonCard delay={0} />;
}

/** Tarjeta skeleton individual con delay de animación escalonada */
function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className="rounded-2xl border border-market-border bg-market-card overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Logo placeholder */}
      <div className="h-40 skeleton-shimmer" />
      {/* Content lines */}
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded skeleton-shimmer" />
        <div className="h-4 w-1/2 rounded skeleton-shimmer" />
        <div className="h-4 w-2/3 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}
