import type { APIRoute } from 'astro';
import { apiError, proxyCommerce } from '../../../lib/server/commerce-proxy';

export const prerender = false;
export const GET: APIRoute = (ctx) => {
  if (!ctx.locals.session || !ctx.locals.token) return apiError('Sesión requerida', 401);
  if (ctx.locals.session.role !== 'DRIVER') return apiError('Solo repartidores', 403);
  return proxyCommerce(ctx, 'MS4', '/api/drivers/deliveries');
};
