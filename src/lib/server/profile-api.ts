import type { APIContext } from 'astro';
import { serviceUrl } from './service-url';
export const noStore = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
export function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({success:false,error}),{status,headers:noStore});
}
export function protectMutation(request: Request): Response | null {
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin) return jsonError('Origen inválido',403);
  if(request.headers.get('sec-fetch-site')==='cross-site')return jsonError('Origen inválido',403);
  return null;
}
export function actor(ctx:APIContext) {
  const s=ctx.locals.session;
  if(!ctx.locals.token || !s || !['B2B','B2C'].includes(s.role)) return null;
  return s;
}
export async function callMs6(ctx:APIContext,path:string, method:'GET'|'PUT'='GET',body?:unknown){
  if(!actor(ctx))return jsonError('Sesión requerida',401);
  let base: string;
  try { base = serviceUrl('MS6', ctx.url); }
  catch { return jsonError('Servicio de perfil bancario no configurado', 503); }
  try{
    const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${ctx.locals.token}`,Accept:'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
    const data=await r.json().catch(()=>null);
    if(!data || typeof data!=='object')return jsonError('Respuesta inválida de MS6',502);
    return new Response(JSON.stringify(data),{status:r.status,headers:noStore});
  }catch{return jsonError('MS6 no está disponible',503)}
}
