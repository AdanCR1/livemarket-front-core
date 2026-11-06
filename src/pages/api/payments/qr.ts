import type { APIRoute } from 'astro';
import { apiError,isUuid,proxyCommerce,readJson,rejectCrossOrigin } from '../../../lib/server/commerce-proxy';
export const prerender = false;
export const POST:APIRoute=async ctx=>{
  const csrf=rejectCrossOrigin(ctx.request);if(csrf)return csrf;
  if(!['B2C','B2B'].includes(ctx.locals.session?.role??''))return apiError('Se requiere cuenta compradora',403);
  const body=await readJson(ctx.request);
  if(!body||!isUuid(body.order_id))return apiError('order_id inválido',400);
  const key=body.idempotency_key;
  if(typeof key!=='string'||key.length<8||key.length>200)return apiError('Clave idempotente inválida',400);
  return proxyCommerce(ctx,'MS6','/api/qr/generate',{method:'POST',body:{
    purpose:'ORDER_PAYMENT',reference_id:body.order_id,idempotency_key:key,
    // NUNCA enviar amount o target_store_id desde el navegador.
  }});
};
