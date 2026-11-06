import type { ApiResponse, GeneratedPaymentQR, PurchaseOrder } from '../types/commerce';
export class CommerceError extends Error { constructor(message:string,public status:number){super(message)} }
export async function commerceFetch<T>(path:string,init?:RequestInit):Promise<T> {
  let res:Response;
  try {res=await fetch(path,{...init,credentials:'same-origin',cache:'no-store',
    signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(35000)]):AbortSignal.timeout(35000),
    headers:{...{'Accept':'application/json'},...init?.headers}})}
  catch { throw new CommerceError('Sin conexión. Consulta tus pedidos antes de reintentar.',0); }
  const json=(await res.json().catch(()=>null)) as ApiResponse<T>|null;
  if(!res.ok || !json?.success || json.data===undefined){
    const err=json?.error;
    throw new CommerceError(typeof err==='string'?err:err?.message||`Error HTTP ${res.status}`,res.status);
  }
  return json.data;
}
export async function createPickupOrder(storeId:string,productId:string,quantity:number,notes:string,key:string,pickupDeadline:string){
  return commerceFetch<PurchaseOrder>('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({store_id:storeId,items:[{product_id:productId,quantity}],notes,pickup_deadline:pickupDeadline})});
}
export async function createOrderQR(orderId:string,idempotencyKey:string){
  return commerceFetch<GeneratedPaymentQR>('/api/payments/qr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_id:orderId,idempotency_key:idempotencyKey})});
}
export const getPurchase=(id:string,signal?:AbortSignal)=>commerceFetch<PurchaseOrder>(`/api/orders/${encodeURIComponent(id)}`,{signal});
export const listPurchases=()=>commerceFetch<PurchaseOrder[]>('/api/orders?scope=purchases');
export const listSales=()=>commerceFetch<PurchaseOrder[]>('/api/orders?scope=sales');
export const setMerchantOrderStatus=(id:string,status:'PREPARING'|'READY')=>commerceFetch<PurchaseOrder>(`/api/orders/${id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
