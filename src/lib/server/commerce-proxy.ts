import type { APIContext } from 'astro';
import { protectMutation } from './profile-api';
import { serviceUrl } from './service-url';

type MS = 'MS4' | 'MS6';
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
export function apiError(message: string, status = 400) {
  return new Response(JSON.stringify({success:false,error:message}), { status, headers:jsonHeaders });
}

/** Impide disparar operaciones autenticadas desde un origen cruzado mediante cookies. */
export function rejectCrossOrigin(request: Request): Response | null {
  return protectMutation(request);
}

export async function proxyCommerce(ctx: APIContext, ms: MS, path: string, opts: {
  method?: 'GET'|'POST'|'PATCH'; body?: unknown; idempotencyKey?: string;
} = {}): Promise<Response> {
  const token = ctx.locals.token;
  if (!token) return apiError('Debes iniciar sesión para continuar',401);
  let base: string;
  try { base = serviceUrl(ms, ctx.url); }
  catch { return apiError('Servicio de comercio no configurado', 503); }
  const headers:Record<string,string> = {Authorization:`Bearer ${token}`,Accept:'application/json'};
  if (opts.body !== undefined) headers['Content-Type']='application/json';
  if (opts.idempotencyKey) headers['Idempotency-Key']=opts.idempotencyKey;
  try {
    const response = await fetch(`${base}${path}`, {
      method: opts.method || 'GET', headers,
      body:opts.body === undefined ? undefined : JSON.stringify(opts.body),
      redirect: 'manual',
      signal:AbortSignal.timeout(path === '/api/orders' && opts.method === 'POST' ? 30000 : 15000),
    });
    const body = await response.json().catch(()=>null);
    if (!body || typeof body !== 'object') return apiError(`${ms} respondió con un formato inválido`,502);
    return new Response(JSON.stringify(body), {status:response.status,headers:jsonHeaders});
  } catch {
    return apiError(`${ms} no disponible. No se ha confirmado la operación; consulta tus pedidos antes de reintentar.`,503);
  }
}
export async function readJson(request: Request):Promise<Record<string,unknown>|null> {
  const data:unknown = await request.json().catch(()=>null);
  return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string,unknown> : null;
}
export function isUuid(value:unknown):value is string {
  return typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
