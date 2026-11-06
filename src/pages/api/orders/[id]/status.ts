import type { APIRoute } from 'astro';
import {apiError,isUuid,proxyCommerce,readJson,rejectCrossOrigin} from '../../../../lib/server/commerce-proxy';
export const prerender=false;
export const PATCH:APIRoute=async ctx=>{
  const csrf=rejectCrossOrigin(ctx.request);if(csrf)return csrf;
  if(ctx.locals.session?.role!=='B2B')return apiError('Solo comercios B2B',403);
  if(!isUuid(ctx.params.id))return apiError('Pedido inválido',400);
  const body=await readJson(ctx.request);
  if(!body || !['PREPARING','READY'].includes(String(body.status)))return apiError('Estado no permitido desde el panel',400);
  return proxyCommerce(ctx,'MS4',`/api/orders/${ctx.params.id}/status`,{method:'PATCH',body:{status:body.status}});
};
