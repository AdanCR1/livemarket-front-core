import type { APIRoute } from 'astro';
import {apiError,isUuid,proxyCommerce,readJson,rejectCrossOrigin} from '../../../lib/server/commerce-proxy';
export const prerender=false;
export const ALL:APIRoute=async ctx=>{
 if(!ctx.locals.token||!ctx.locals.session)return apiError('Sesión requerida',401);
 const role=ctx.locals.session.role,method=ctx.request.method;
 const [id,action,extra]=(ctx.params.path??'').split('/');
 const create=(!id||id==='create')&&!action&&!extra&&method==='POST';
 const read=isUuid(id)&&!action&&method==='GET';
 const confirm=isUuid(id)&&action==='confirm'&&!extra&&method==='POST';
 if(!create&&!read&&!confirm)return apiError('Ruta de entrega no disponible',404);
 if(!['B2B','B2C'].includes(role)||create&&role!=='B2B')return apiError('No autorizado',403);
 if(method==='POST'){const blocked=rejectCrossOrigin(ctx.request);if(blocked)return blocked;}
 let body;
 if(create){body=await readJson(ctx.request);if(!body||!isUuid(body.order_id))return apiError('Pedido inválido',400);body={order_id:body.order_id};}
 const response=await proxyCommerce(ctx,'MS4',create?'/api/deliveries':'/api/deliveries/'+id+(confirm?'/confirm':''),{method:method as 'POST'|'GET',body});
 const result=await response.json();
 if(result?.data?.success===false)return apiError('MS4 no confirmó la operación de entrega',409);
 return Response.json(result,{status:response.status,headers:{'Cache-Control':'no-store'}});
};
