// ─── Capa de servicios con fault tolerance ───
// Cada función devuelve {data, error} — nunca lanza excepciones.
// En desarrollo, usa datos mock SOLO para departamentos/ciudades.

import { MS1_URL, MS2_URL, MS3_URL } from "../constants";
import { MOCK_DEPARTMENTS, MOCK_CITIES } from "../mock-data";
import type {
  B2BStore,
  Department,
  City,
  ProductWithMedia,
  ServiceResult,
  RegisterB2BPayload,
  RegisterB2CPayload,
  RegisterResponse,
  LoginPayload,
  AuthSession,
  CreateProductPayload,
} from "./types";

// ─── Envelope de respuesta ───

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  detalle?: string;
}

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  timeout?: number;
  token?: string;
}

// ─── safeFetch: JSON in / JSON out ───

async function safeFetch<T>(url: string, options: FetchOptions = {}): Promise<ServiceResult<T>> {
  const { method = "GET", body, timeout = 8000, token } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    clearTimeout(timeoutId);

    const envelope: ApiEnvelope<T> = await response
      .json()
      .catch(() => ({} as ApiEnvelope<T>));

    if (!response.ok || !envelope.success) {
      const message = envelope.detalle
        ? `${envelope.error ?? "Error"}: ${envelope.detalle}`
        : (envelope.error ?? `HTTP ${response.status}: ${response.statusText}`);
      throw new Error(message);
    }

    return { data: envelope.data ?? null, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error de red desconocido";
    console.warn(`[MARKETCLOUD] Fetch fallido → ${url}: ${message}`);
    return { data: null, error: message };
  }
}

// ─── safeUpload: FormData in / JSON out (para MS3) ───

async function safeUpload<T>(
  url: string,
  formData: FormData,
  token?: string,
  timeout = 30000 // subida de archivos necesita más margen
): Promise<ServiceResult<T>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // NO seteamos Content-Type: el navegador pone el boundary del multipart

    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: formData,
    });
    clearTimeout(timeoutId);

    const envelope: ApiEnvelope<T> = await response
      .json()
      .catch(() => ({} as ApiEnvelope<T>));

    if (!response.ok || !envelope.success) {
      throw new Error(
        envelope.error ?? `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return { data: envelope.data ?? null, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error de red desconocido";
    console.warn(`[MARKETCLOUD] Upload fallido → ${url}: ${message}`);
    return { data: null, error: message };
  }
}

function withGeoFallback<T>(result: ServiceResult<T>, mockData: T): ServiceResult<T> {
  if (result.error && import.meta.env.DEV) {
    console.warn(`[MARKETCLOUD DEV] Usando datos geográficos mock como fallback`);
    return { data: mockData, error: null };
  }
  return result;
}

// ─── MS1: Auth / Perfiles / Tiendas ───

export const StoreService = {
  getStoresByNiche: async (niche: string): Promise<ServiceResult<B2BStore[]>> => {
    return safeFetch<B2BStore[]>(`${MS1_URL}/api/stores?niche=${niche}`);
  },

  getStoreById: async (storeId: string): Promise<ServiceResult<B2BStore>> => {
    return safeFetch<B2BStore>(`${MS1_URL}/api/stores/${storeId}`);
  },

  getDepartments: async (): Promise<ServiceResult<Department[]>> => {
    const result = await safeFetch<Department[]>(`${MS1_URL}/api/departments`);
    return withGeoFallback(result, MOCK_DEPARTMENTS);
  },

  getCitiesByDepartment: async (deptId: number): Promise<ServiceResult<City[]>> => {
    const result = await safeFetch<City[]>(`${MS1_URL}/api/departments/${deptId}/cities`);
    return withGeoFallback(
      result,
      MOCK_CITIES.filter((c) => c.department_id === deptId)
    );
  },
};

export interface AttachMediaItem {
  url: string;
  media_type: "image" | "video";
  order: number;
  variant_tag?: string;
  angle_tag?: string;
}

export const InventoryService = {
  getProductsByStore: async (storeId: string): Promise<ServiceResult<ProductWithMedia[]>> => {
    return safeFetch<ProductWithMedia[]>(
      `${MS2_URL}/api/catalog/public/store/${storeId}/products`
    );
  },

  getLiveProducts: async (storeId: string): Promise<ServiceResult<ProductWithMedia[]>> => {
    return safeFetch<ProductWithMedia[]>(
      `${MS2_URL}/api/catalog/public/store/${storeId}/live`
    );
  },

  createProduct: async (
    payload: CreateProductPayload,
    token?: string
  ): Promise<ServiceResult<ProductWithMedia>> => {
    return safeFetch<ProductWithMedia>(
      `${MS2_URL}/api/catalog/private/products`,
      {
        method: "POST",
        body: payload,
        token,
      }
    );
  },

  updateProduct: async (
    _storeId: string,
    productId: string,
    payload: Partial<CreateProductPayload>,
    token?: string
  ): Promise<ServiceResult<ProductWithMedia>> => {
    return safeFetch<ProductWithMedia>(
      `${MS2_URL}/api/catalog/private/products/${productId}`,
      { method: "PUT", body: payload, token }
    );
  },

  deleteProduct: async (
    _storeId: string,
    productId: string,
    token?: string
  ): Promise<ServiceResult<{ deleted: boolean }>> => {
    return safeFetch<{ deleted: boolean }>(
      `${MS2_URL}/api/catalog/private/products/${productId}`,
      { method: "DELETE", token }
    );
  },

  /**
   * Asocia un array de media ya subida (a MS3) contra un producto.
   * MS2 valida propiedad del producto vs store_id del JWT.
   */
  attachProductMedia: async (
    productId: string,
    media: AttachMediaItem[],
    token?: string
  ): Promise<ServiceResult<unknown[]>> => {
    return safeFetch<unknown[]>(
      `${MS2_URL}/api/catalog/private/products/${productId}/media`,
      { method: "POST", body: media, token }
    );
  },

  togglePinLiveProduct: async (
    _storeId: string,
    productId: string,
    isPinned: boolean,
    token?: string
  ): Promise<ServiceResult<{ product_id: string; is_pinned: boolean }>> => {
    return safeFetch<{ product_id: string; is_pinned: boolean }>(
      `${MS2_URL}/api/catalog/private/live/toggle/${productId}`,
      { method: "POST", body: { is_pinned: isPinned }, token }
    );
  },
};

// ─── MS3: Media ───

export interface UploadedMedia {
  relative_url: string;
  media_type: "image" | "video";
}

export const MediaService = {
  /**
   * Sube un archivo a MS3 (R2) y devuelve la ruta relativa.
   * ⚠️ MS3 solo acepta `image/webp` y `video/webm`.
   */
  uploadProductFile: async (
    file: File,
    token?: string
  ): Promise<ServiceResult<UploadedMedia>> => {
    const formData = new FormData();
    formData.append("file", file);

    return safeUpload<UploadedMedia>(
      `${MS3_URL}/upload/product-media`,
      formData,
      token
    );
  },
};

// ─── MS1: Autenticación ───

export const AuthService = {
  registerB2B: (payload: RegisterB2BPayload): Promise<ServiceResult<RegisterResponse>> =>
    safeFetch<RegisterResponse>(`${MS1_URL}/api/auth/register/b2b`, {
      method: "POST",
      body: payload,
    }),

  registerB2C: (payload: RegisterB2CPayload): Promise<ServiceResult<RegisterResponse>> =>
    safeFetch<RegisterResponse>(`${MS1_URL}/api/auth/register/b2c`, {
      method: "POST",
      body: payload,
    }),

  login: (payload: LoginPayload): Promise<ServiceResult<AuthSession>> =>
    safeFetch<AuthSession>(`${MS1_URL}/api/auth/login`, {
      method: "POST",
      body: payload,
    }),
};


// ─── MS4: Gestión de Pedidos ───
const MS4_URL = (import.meta.env.PUBLIC_MS4_URL || "http://localhost:8790").replace(/\/+$/, "");

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  store_id: string;
  customer_id: string;
  customer_name: string;
  customer_contact: string;
  delivery_address: string;
  status: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "ENTREGADO";
  is_live_order: boolean;
  total_amount: number;
  currency: string;
  notes?: string;
  created_at: string;
  order_items: OrderItem[];
}

export const OrderService = {
  /** Obtiene las órdenes recibidas por una tienda B2B */
  getStoreOrders: async (token?: string, status?: string): Promise<ServiceResult<Order[]>> => {
    const query = status ? `?status=${status}` : "";
    return safeFetch<Order[]>(`${MS4_URL}/api/orders/b2b/store${query}`, {
      method: "GET",
      token,
    });
  },

  /** Actualiza el estado de una orden (PENDIENTE -> CONFIRMADO / CANCELADO / ENTREGADO) */
  updateOrderStatus: async (
    orderId: string,
    nextStatus: "CONFIRMADO" | "CANCELADO" | "ENTREGADO",
    token?: string
  ): Promise<ServiceResult<Order>> => {
    return safeFetch<Order>(`${MS4_URL}/api/orders/b2b/${orderId}/status`, {
      method: "PATCH",
      body: { status: nextStatus },
      token,
    });
  },
};