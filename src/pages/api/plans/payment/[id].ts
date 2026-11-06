import type { APIRoute } from 'astro';
import { apiError, proxyCommerce, isUuid } from '../../../../lib/server/commerce-proxy';
export const prerender = false;
export const GET: APIRoute = (ctx) => {
  if (ctx.locals.session?.role !== 'B2B') return apiError('Solo comercios B2B', 403);
  const id = ctx.params.id;
  if (!isUuid(id)) return apiError('ID inválido', 400);
  return proxyCommerce(ctx, 'MS6', `/api/subscriptions/payments/${id}`);
};
