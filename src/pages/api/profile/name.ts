import type { APIRoute } from 'astro';
import { jsonError, protectMutation } from '../../../lib/server/profile-api';
export const prerender=false;

async function forward(ctx: Parameters<APIRoute>[0], method:'GET'|'PATCH'){
  if(!ctx.locals.token || !ctx.locals.session)return jsonError('Sesión requerida',401);
  const base=(import.meta.env.PUBLIC_MS1_URL || 'http://localhost:8787').replace(/\/+$/,'');
  let body: string|undefined;
  if(method==='PATCH'){
    const csrf=protectMutation(ctx.request);if(csrf)return csrf;
    const input=await ctx.request.json().catch(()=>null);
    if(typeof input?.full_name!=='string' || input.full_name.trim().length<3 || input.full_name.trim().length>120)
      return jsonError('Nombre inválido',400);
    body=JSON.stringify({full_name:input.full_name.trim()});
  }
  try{
    const upstream=await fetch(`${base}/api/account/me`,{method,headers:{
      Authorization:`Bearer ${ctx.locals.token}`,Accept:'application/json',
      ...(body?{'Content-Type':'application/json'}:{}),
    },body,signal:AbortSignal.timeout(10000)});
    const data=await upstream.json().catch(()=>null);
    if(!data || typeof data!=='object')return jsonError('Respuesta inválida de MS1',502);
    return new Response(JSON.stringify(data),{status:upstream.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }catch{return jsonError('MS1 no disponible',503)}
}
export const GET:APIRoute=ctx=>forward(ctx,'GET');
export const PATCH:APIRoute=ctx=>forward(ctx,'PATCH');
