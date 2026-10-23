// ─── Tipos del dominio derivados del esquema SQL ───

/** Slugs de nicho válidos */
/** Slugs de nicho válidos sincronizados con niches.ts y el panel */
export type NicheSlug =
  | "gastronomia"
  | "tecnologia"
  | "ropa"
  | "jugueteria"
  | "otros";

export interface CreateProductPayload {
  store_id: string;
  business_model: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  attributes: Record<string, unknown>;
}

/** Departamento geográfico (MS1) */
export interface Department {
  id: number;
  name: string;
}

/** Ciudad dentro de un departamento (MS1) */
export interface City {
  id: number;
  department_id: number;
  name: string;
}

/** Tienda B2B registrada (MS1) */
export interface B2BStore {
  profile_id: string;
  store_name: string;
  business_model: string;
  city_id: number;
  local_address?: string;
  logo_url?: string;
  is_live: boolean;
  /** Campos enriquecidos por join en MS1 */
  city_name?: string;
  department_id?: number;
  department_name?: string;
}

/** Producto del inventario (MS2) */
export interface Product {
  id: string;
  store_id: string;
  business_model: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  attributes: Record<string, unknown>;
  created_at: string;
}

/** Media asociada a un producto (MS2, URLs relativas a R2) */
export interface ProductMedia {
  id: string;
  product_id: string;
  url: string;
  media_type: string;
  variant_tag?: string;
  angle_tag?: string;
  order: number;
}

/** Sesión de live - producto anclado a una transmisión (MS2) */
export interface LiveSession {
  id: string;
  store_id: string;
  product_id: string;
  is_pinned: boolean;
  added_at: string;
}

/** Producto enriquecido con media para renderizado en el front */
export interface ProductWithMedia extends Product {
  media: ProductMedia[];
}

/** Resultado genérico de un service call — patrón de fault tolerance */
export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Autenticación (MS1) ───
// Espejo exacto de los tipos en livemarket-ms-auth/src/types/index.ts,
// para que el contrato no se desalinee entre el MS y el front.

export interface RegisterB2BPayload {
  email: string;
  password: string;
  store_name: string;
  business_model: NicheSlug;
  city_id: number;
  local_address?: string;
  logo_url?: string;
}

export interface RegisterB2CPayload {
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Respuesta de un registro exitoso (b2b o b2c) */
export interface RegisterResponse {
  user_id: string;
  email: string;
  message: string;
}

/** Respuesta de login exitoso — lo que devuelve MS1 en `data` */
export interface AuthSession {
  access_token: string;
  user_id: string;
  email: string;
  role: "B2B" | "B2C";
}

/** Input del ProductForm: un slot de imagen (orden 0, 1 o 2) */
export interface MediaSlotInput {
  order: number;
  file: File | null;
  existingUrl: string | null;
}