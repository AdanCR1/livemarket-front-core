import type { APIRoute } from 'astro';
import {apiError,isUuid,proxyCommerce} from '../../../lib/server/commerce-proxy';
export const prerender=false;
export const GET:APIRoute=async ctx=>{
  if (!ctx.locals.session || !ctx.locals.token) return apiError('Sesión requerida',401);
  if(!['B2C','B2B'].includes(ctx.locals.session?.role||''))return apiError('No autorizado',403);
  if(!isUuid(ctx.params.id))return apiError('Pedido inválido',400);
  return proxyCommerce(ctx,'MS4',`/api/orders/${ctx.params.id}`);
};
