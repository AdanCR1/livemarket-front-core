// ─── Constantes globales y variables de entorno ───

/** MS1: Auth, Perfiles, Tiendas, Departamentos, Ciudades */
export const MS1_URL = (import.meta.env.PUBLIC_MS1_URL || "http://localhost:8787").replace(/\/$/, "");

/** MS2: Inventario, Productos, Live Sessions */
export const MS2_URL = (import.meta.env.PUBLIC_MS2_URL || "http://localhost:8788").replace(/\/$/, "");

export const MS3_URL = (import.meta.env.PUBLIC_MS3_URL || "http://localhost:8789")
  .replace(/\/$/, "")
  .replace(/\/media$/, "");

export const MS4_URL = (import.meta.env.PUBLIC_MS4_URL || "http://localhost:8790").replace(/\/$/, "");

/** Alias heredado — apunta al mismo Worker que MS3 (mantener por compatibilidad) */
export const MS_MEDIA_URL = MS3_URL;

const _rawR2 = (import.meta.env.PUBLIC_R2_DOMAIN || "").replace(/\/$/, "");

export const R2_DOMAIN = _rawR2
  ? (_rawR2.endsWith("/media") ? _rawR2 : `${_rawR2}/media`)
  : `${MS3_URL}/media`;

export const SITE_NAME = "MARKETCLOUD";

export const SITE_DESCRIPTION =
  "El mercado digital multi-nicho. Descubre tiendas, productos y transmisiones en vivo de gastronomía, tecnología, moda y servicios.";

export function buildMediaUrl(relativePath: string | null | undefined): string | undefined {
  if (!relativePath) return undefined;
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  if (!R2_DOMAIN) return undefined;
  return `${R2_DOMAIN}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
}