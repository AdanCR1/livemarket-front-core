// ─── Constantes globales y variables de entorno ───

/** MS1: Auth, Perfiles, Tiendas, Departamentos, Ciudades */
export const MS1_URL = (import.meta.env.PUBLIC_MS1_URL || (import.meta.env.DEV ? "http://127.0.0.1:8789" : "")).replace(/\/$/, "");

/** MS2: Inventario, Productos, Live Sessions */
export const MS2_URL = (import.meta.env.PUBLIC_MS2_URL || (import.meta.env.DEV ? "http://127.0.0.1:8791" : "")).replace(/\/$/, "");

export const MS3_URL = (import.meta.env.PUBLIC_MS3_URL || "")
  .replace(/\/$/, "")
  .replace(/\/media$/, "");

export const MS4_URL = (import.meta.env.PUBLIC_MS4_URL || (import.meta.env.DEV ? "http://127.0.0.1:8788" : "")).replace(/\/$/, "");

// En src/lib/constants.ts
export const PUBLIC_MS1_URL = MS1_URL;
export const PUBLIC_MS2_URL = MS2_URL;
export const PUBLIC_MS3_URL = MS3_URL;
export const PUBLIC_MS4_URL = MS4_URL;
export const PUBLIC_MS6_URL = import.meta.env.PUBLIC_MS6_URL || (import.meta.env.DEV ? "http://127.0.0.1:8787" : "");

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
