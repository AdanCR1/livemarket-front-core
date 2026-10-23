import { useState, type ImgHTMLAttributes } from "react";

interface FallbackImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  /**
   * Nombre usado para generar las iniciales del placeholder.
   * Ej: "La Fogata" → "LF"
   */
  fallbackName?: string;
}

/**
 * Wrapper de <img> con fallback visual ante fallo de R2/multimedia.
 * Si la imagen no carga (MS3 caído, URL rota, etc.), muestra un
 * placeholder estilizado con las iniciales del nombre.
 */
export function FallbackImage({
  fallbackName = "?",
  src,
  alt,
  className = "",
  ...props
}: FallbackImageProps) {
  const [hasError, setHasError] = useState(false);

  // Generar iniciales: "La Fogata" → "LF"
  const initials = fallbackName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (hasError || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-theme-primary/20 to-theme-secondary/50
                    text-theme-primary font-display font-bold select-none ${className}`}
        role="img"
        aria-label={alt || fallbackName}
      >
        <span className="text-2xl tracking-wider opacity-80">{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || fallbackName}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
