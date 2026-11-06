import type { APIRoute } from 'astro';
import { apiError, proxyCommerce } from '../../../lib/server/commerce-proxy';

export const prerender = false;

// GET /api/plans: consultar el plan de la tienda autenticada en MS6.
export const GET: APIRoute = async (ctx) => {
  const session = ctx.locals.session;

  if (!session) {
    return apiError('Debes iniciar sesión.', 401);
  }
  if (session.role !== 'B2B') {
    return apiError('Solo los comercios B2B pueden consultar sus planes.', 403);
  }

  const response = await proxyCommerce(ctx, 'MS6', '/api/subscriptions/me');
  if (!response.ok) return response;
  const result = await response.json();
  const subscription = result?.data;
  if (result?.success !== true || !subscription || subscription.store_id !== session.store_id) {
    return apiError('MS6 devolvió una suscripción inválida.', 502);
  }
  const { store_id, plan, status, can_accept_orders, current_period_end, trial_end_at, currency, period_days } = subscription;
  const prices = { PRO: subscription.prices?.PRO ?? null };
  return Response.json({ success: true, data: {
    store_id, plan, status, can_accept_orders, current_period_end, trial_end_at, currency, period_days, prices,
  } }, { headers: { 'Cache-Control': 'no-store' } });
};
