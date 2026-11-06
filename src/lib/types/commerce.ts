/** Contratos MS4/MS6. Los valores monetarios se muestran, nunca se calculan como autoridad en el navegador. */
export type OrderStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export interface PurchaseItem {
  id?: string; product_id: string; variant_id?: string | null;
  name_snapshot?: string; product_name?: string; name?: string;
  quantity: number; unit_price: number | string; subtotal?: number | string;
}
export interface PurchaseOrder {
  id: string; store_id: string; customer_id: string; status: OrderStatus;
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | string;
  delivery_type: 'PICKUP' | 'DELIVERY'; delivery_address: string | null;
  reservation_expires_at?: string; total: string | number; currency: 'BOB';
  pickup_deadline?: string | null; notes?: string | null; created_at: string; order_items?: PurchaseItem[];
}
export interface GeneratedPaymentQR {
  payment_id: string; qr_token: string; amount: string | number;
  currency: 'BOB'; purpose: 'ORDER_PAYMENT'; expires_at: string;
}
export interface ApiResponse<T> { success: boolean; data?: T; error?: string | {code?: string; message?: string}; code?: string; }
export function formatBOB(n: number | string | undefined): string {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(x) : '—';
}
