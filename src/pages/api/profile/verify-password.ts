import type { APIRoute } from 'astro';
import { MS1_URL } from '../../../lib/constants';
import { protectMutation, jsonError } from '../../../lib/server/profile-api';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const blocked = protectMutation(request);
  if (blocked) return blocked;

  const session = locals.session as unknown as Record<string, unknown> | null;
  if (!locals.token || !session) return jsonError('Sesión no válida o expirada.', 401);

  const sessionId = session.sub ?? session.user_id ?? session.id;
  if (typeof sessionId !== 'string' || !sessionId) {
    return jsonError('No se pudo identificar al usuario de la sesión.', 401);
  }

  const input = await request.json().catch(() => null);
  const email = typeof input?.email === 'string'
    ? input.email.trim().toLowerCase()
    : typeof session.email === 'string'
      ? session.email.trim().toLowerCase()
      : '';
  const password = typeof input?.password === 'string' ? input.password : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('Introduce el correo con el que iniciaste sesión.', 400);
  }
  if (!password) return jsonError('Introduce tu contraseña actual.', 400);

  try {
    const upstream = await fetch(`${MS1_URL.replace(/\/+$/, '')}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10000),
    });
    const result: any = await upstream.json().catch(() => null);
    if (!upstream.ok || result?.success !== true) {
      return jsonError('Correo o contraseña incorrectos.', 401);
    }

    const authenticatedId = result?.data?.user_id;
    if (typeof authenticatedId !== 'string' || authenticatedId !== sessionId) {
      return jsonError('Las credenciales no corresponden a la sesión actual.', 403);
    }

    return new Response(JSON.stringify({ success: true, message: 'Identidad confirmada.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return jsonError('No se pudo contactar con MS1. Comprueba que esté funcionando.', 503);
  }
};
