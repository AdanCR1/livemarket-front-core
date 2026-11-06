import type { APIRoute } from 'astro';
import {apiError,proxyCommerce} from '../../../lib/server/commerce-proxy';
export const prerender=false;
export const GET:APIRoute=async ctx=>{
  const session = ctx.locals.session;
  if (!session) return apiError('Sesión requerida', 401);
  if (!['B2C','B2B'].includes(session.role)) return apiError('No autorizado',403);
  const scope = ctx.url.searchParams.get('scope');
  if (scope === 'sales' && (session.role !== 'B2B' || !session.store_id)) return apiError('No autorizado',403);
  const response = await proxyCommerce(ctx,'MS4','/api/orders');
  if (!response.ok || (scope !== 'sales' && scope !== 'purchases')) return response;
  const result = await response.json();
  if (result?.success !== true || !Array.isArray(result.data)) return apiError('Lista de pedidos inválida', 502);
  const data = result.data.filter((order: { store_id?: string; customer_id?: string } | null) => scope === 'sales'
    ? order?.store_id === session.store_id
    : order?.customer_id === session.sub);
  return Response.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } });
};
