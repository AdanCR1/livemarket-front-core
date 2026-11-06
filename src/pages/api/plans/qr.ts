import type { APIRoute } from 'astro';
import { apiError, proxyCommerce, readJson, rejectCrossOrigin } from '../../../lib/server/commerce-proxy';
import { proCheckoutEnabled } from '../../../lib/server/plan-settings';
export const prerender = false;
export const POST: APIRoute = async (ctx) => {
  const csrf = rejectCrossOrigin(ctx.request);
  if (csrf) return csrf;
  const s = ctx.locals.session;
  if (!s || !ctx.locals.token) return apiError('Debes iniciar sesión.', 401);
  if (s.role !== 'B2B') return apiError('Solo comercios B2B', 403);
  const store = s.store_id;
  if (typeof store !== 'string' || !store) return apiError('Tienda no identificada', 403);
  const body = await readJson(ctx.request);
  if (!body || body.plan !== 'PRO') return apiError('Solo PRO admite pago por QR.', 400);
  if (Object.keys(body).some((field) => field !== 'plan' && field !== 'idempotency_key'))
    return apiError('La solicitud incluye campos no permitidos.', 400);
  if (typeof body.idempotency_key !== 'string' || body.idempotency_key.length < 8 || body.idempotency_key.length > 200)
    return apiError('Clave idempotente inválida', 400);
  if (!proCheckoutEnabled) return apiError('El cobro PRO está pendiente de validación en MS6.', 503);
  const response = await proxyCommerce(ctx, 'MS6', '/api/qr/generate', {method:'POST', body:{
    purpose:'SUBSCRIPTION_UPGRADE', reference_id: store, requested_plan: 'PRO',
    idempotency_key: body.idempotency_key,
  }});
  if (!response.ok) return response;
  const result = await response.json();
  const qr = result?.data;
  if (result?.success !== true || qr?.purpose !== 'SUBSCRIPTION_UPGRADE' ||
      Number(qr.amount) !== 59 || qr.currency !== 'BOB' ||
      typeof qr.payment_id !== 'string' || typeof qr.qr_token !== 'string' ||
      !Number.isFinite(Date.parse(qr.expires_at)) || Date.parse(qr.expires_at) <= Date.now()) {
    return apiError('MS6 devolvió un QR incompatible con el plan PRO.', 502);
  }
  const { payment_id, qr_token, amount, currency, expires_at } = qr;
  return Response.json({ success: true, data: { payment_id, qr_token, amount, currency, expires_at } },
    { status: 201, headers: { 'Cache-Control': 'no-store' } });
};
