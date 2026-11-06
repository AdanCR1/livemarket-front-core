import type { APIRoute } from 'astro';
import { jsonError, noStore } from '../../../lib/server/profile-api';
export const prerender=false;

export const GET: APIRoute = async (ctx) => {
  const session=ctx.locals.session;
  if(!session || !ctx.locals.token)return jsonError('Sesión requerida',401);
  const base=(import.meta.env.PUBLIC_MS1_URL||'http://localhost:8787').replace(/\/+$/,'');
  try{
    const upstream=await fetch(`${base}/api/account/me`,{headers:{Authorization:`Bearer ${ctx.locals.token}`},signal:AbortSignal.timeout(10000)});
    const json=await upstream.json().catch(()=>null);
    if(!upstream.ok || !json?.success)return jsonError(json?.error||'No se pudo obtener la identidad',upstream.status);
    return new Response(JSON.stringify({success:true,data:{
      ...json.data,
      store_id:session.store_id??null,
      business_model:session.business_model??null,
      refund_qr_url:null, // La imagen de recepción se consulta desde el servicio de QR, no aquí.
    }}),{status:200,headers:noStore});
  }catch{return jsonError('MS1 no disponible',503)}
};