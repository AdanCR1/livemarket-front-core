import type { APIRoute } from 'astro';
import { apiError, isUuid, proxyCommerce, readJson, rejectCrossOrigin } from '../../lib/server/commerce-proxy';
export const prerender = false;

/** Solo PICKUP. El importe/stock se validan exclusivamente en MS2 mediante MS4. */
export const POST: APIRoute = async (ctx) => {
  const csrf = rejectCrossOrigin(ctx.request); if(csrf) return csrf;
  if (!ctx.locals.session || !ctx.locals.token) return apiError('Sesión requerida',401);
  if (!['B2C','B2B'].includes(ctx.locals.session?.role??'')) return apiError('Debes iniciar sesión como comprador',403);
  const body=await readJson(ctx.request);
  if (body?.delivery_type === 'DELIVERY') {
    return apiError('Entrega a domicilio deshabilitada. Puedes elegir recogida en tienda.', 409);
  }
  if (!body || !isUuid(body.store_id) || !Array.isArray(body.items) || body.items.length<1 || body.items.length>30)
    return apiError('Pedido inválido',400);
  const items=[] as {product_id:string; quantity:number; variant_id?:string}[];
  for (const it of body.items) {
    if (!it || typeof it!=='object') return apiError('Artículo inválido',400);
    const item=it as Record<string,unknown>;
    if (!isUuid(item.product_id) || !Number.isInteger(item.quantity) || (item.quantity as number)<1 || (item.quantity as number)>100)
      return apiError('Producto o cantidad inválidos',400);
    if(item.variant_id!==undefined && item.variant_id!==null && !isUuid(item.variant_id)) return apiError('Variante inválida',400);
    items.push({product_id:item.product_id,quantity:item.quantity as number,...(item.variant_id?{variant_id:item.variant_id as string}:{})});
  }
  const deadline=body.pickup_deadline;
  if(typeof deadline!=='string'||!Number.isFinite(Date.parse(deadline))) return apiError('Fecha de recogida inválida',400);
  const millis=Date.parse(deadline)-Date.now();
  if(millis<86400000||millis>7*86400000) return apiError('Fecha límite entre 1 y 7 días',400);
  const key=ctx.request.headers.get('Idempotency-Key') || '';
  if(!/^[a-zA-Z0-9_-]{8,128}$/.test(key)) return apiError('Idempotency-Key inválida',400);
  return proxyCommerce(ctx,'MS4','/api/orders',{method:'POST',idempotencyKey:key,body:{
    store_id:body.store_id, delivery_type:'PICKUP',pickup_deadline:deadline, items,
    notes: typeof body.notes==='string' ? body.notes.slice(0,500) : undefined,
  }});
};
