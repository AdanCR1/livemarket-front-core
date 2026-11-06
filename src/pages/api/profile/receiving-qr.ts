import type { APIRoute } from 'astro';
import {actor,callMs6,jsonError,protectMutation} from '../../../lib/server/profile-api';
export const prerender=false;
export const GET:APIRoute=ctx=>callMs6(ctx,'/api/profile/receiving-qr');
export const PUT:APIRoute=async ctx=>{
  const csrf=protectMutation(ctx.request);if(csrf)return csrf;
  if (!actor(ctx)) return jsonError('Sesión requerida', 401);
  const body=await ctx.request.json().catch(()=>null);
  if(typeof body?.email!=='string'||typeof body?.password!=='string'||typeof body?.qr_payload!=='string') return jsonError('Datos inválidos');
  return callMs6(ctx,'/api/profile/receiving-qr','PUT',{email:body.email,password:body.password,qr_payload:body.qr_payload});
};
