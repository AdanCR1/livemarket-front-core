import type { APIRoute } from 'astro';
import { apiError, isUuid, rejectCrossOrigin } from '../../../lib/server/commerce-proxy';

export const prerender = false;
export const ALL: APIRoute = async (ctx) => {
  if (!ctx.locals.token || !ctx.locals.session) return apiError('Sesión requerida', 401);
  if (!['B2C', 'B2B'].includes(ctx.locals.session.role)) return apiError('Rol no habilitado para chat', 403);
  const method = ctx.request.method;
  const [resource, id, action, extra] = (ctx.params.path ?? '').split('/');
  const open = method === 'POST' && resource === 'conversations' && id === undefined;
  const list = method === 'GET' && resource === 'conversations' && id === undefined;
  const message = resource === 'conversations' && isUuid(id) && action === 'messages' && !extra &&
    (method === 'GET' || method === 'POST');
  const events = resource === 'conversations' && isUuid(id) && action === 'events' && !extra && method === 'GET';
  const notices = method === 'GET' && resource === 'notifications' && id === undefined;
  const read = method === 'PATCH' && resource === 'notifications' && isUuid(id) && action === 'read' && !extra;
  const disputes = method === 'GET' && resource === 'disputes' && id === undefined;
  if (!open && !list && !message && !events && !notices && !read && !disputes) return apiError('Ruta de chat no disponible', 404);
  if (method === 'POST' || method === 'PATCH') {
    const blocked = rejectCrossOrigin(ctx.request);
    if (blocked) return blocked;
    if (method === 'POST' && !ctx.request.headers.get('content-type')?.startsWith('application/json'))
      return apiError('Se requiere JSON', 415);
  }
  const base = import.meta.env.MS5_URL;
  if (import.meta.env.MS5_CHAT_ENABLED !== 'true' || !base) return apiError('Chat no habilitado en este entorno', 503);
  try {
    const target = new URL('/api/' + [resource, id, action].filter(Boolean).join('/'), base);
    const cursor = ctx.url.searchParams.get('cursor');
    if ((list || (message && method === 'GET')) && cursor) target.searchParams.set('cursor', cursor);
    if (notices) target.searchParams.set('conversation_id', ctx.url.searchParams.get('conversation_id') ?? '');
    if (disputes) target.searchParams.set('order_id', ctx.url.searchParams.get('order_id') ?? '');
    const response = await fetch(target, {
      method,
      headers: { Authorization: `Bearer ${ctx.locals.token}`, 'Content-Type': 'application/json' },
      body: method === 'POST' ? ctx.request.body : undefined,
      redirect: 'error',
      signal: AbortSignal.any([ctx.request.signal, AbortSignal.timeout(events ? 40000 : 12000)]),
    });
    return new Response(response.body, { status: response.status, headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-store',
    } });
  } catch {
    return apiError('No se pudo conectar con mensajería', 503);
  }
};
