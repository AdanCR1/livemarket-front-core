import { useEffect, useState } from 'react';
import { createOrderQR,getPurchase } from '../../lib/commerce/client';
import type { GeneratedPaymentQR,PurchaseOrder } from '../../lib/types/commerce';
import {formatBOB} from '../../lib/types/commerce';

type Props={order:PurchaseOrder;onClose:()=>void};
export function PaymentQR({order,onClose}:Props){
 const [qr,setQr]=useState<GeneratedPaymentQR|null>(null);
 const [svg,setSvg]=useState('');
 const [status,setStatus]=useState(order.payment_status);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [expiresIn,setExpiresIn]=useState(0);
 const [synced,setSynced]=useState(true);
 useEffect(()=>{
   const key=`marketcloud:qr:${order.id}`;
   try {const cached=sessionStorage.getItem(key);if(cached){const parsed=JSON.parse(cached) as GeneratedPaymentQR;
     if(new Date(parsed.expires_at).getTime()>Date.now()){setQr(parsed);return;}
   }}catch{}
   void generate();
 },[order.id]);
 async function generate(){
  setBusy(true);setError('');setSvg('');
  try { const payment=await createOrderQR(order.id,`mc-payment-${order.id}`);
    setQr(payment);sessionStorage.setItem(`marketcloud:qr:${order.id}`,JSON.stringify(payment));
  }catch(e){setError(e instanceof Error?e.message:'No se pudo generar QR');}finally{setBusy(false)}
 }
 useEffect(()=>{
   if(!qr)return;
   let cancelled=false;
   import('qrcode').then(mod=>mod.toString(qr.qr_token,{type:'svg',margin:2,width:280,color:{dark:'#07172a',light:'#ffffff'}}))
      .then(s=>{if(!cancelled)setSvg(s)}).catch(()=>{if(!cancelled)setError('No se pudo dibujar el QR')});
   return()=>{cancelled=true};
 },[qr?.qr_token]);
 useEffect(()=>{
  const t=window.setInterval(()=>{if(qr)setExpiresIn(Math.max(0,Math.ceil((Date.parse(qr.expires_at)-Date.now())/1000)))},1000);
  return()=>window.clearInterval(t);
 },[qr?.expires_at]);
 useEffect(()=>{
  if(status==='PAID')return;
  let mounted=true;
  let polling=false;
  const controller=new AbortController();
  async function poll(){
   if(document.hidden||polling)return;
   polling=true;
   try {const next=await getPurchase(order.id,controller.signal);if(!mounted)return;
    setSynced(true);setStatus(next.payment_status);
    if(next.payment_status==='PAID')sessionStorage.removeItem(`marketcloud:qr:${order.id}`);
   }catch{if(mounted)setSynced(false)}finally{polling=false}
  }
  void poll(); const timer=window.setInterval(poll,5000);
  return()=>{mounted=false;controller.abort();window.clearInterval(timer)};
 },[order.id,status]);
 const expired=!!qr && Date.parse(qr.expires_at)<=Date.now();
 return <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Pago QR">
  <div className="bg-market-card text-market-white border border-market-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
   <div className="flex justify-between items-center"><h3 className="text-xl font-bold">Pagar pedido con QR</h3><button type="button" className="text-market-muted hover:text-white text-2xl" onClick={onClose} aria-label="Cerrar">×</button></div>
   <p className="text-xs text-market-muted">Pedido #{order.id.slice(0,8)} · {order.delivery_type === 'DELIVERY' ? 'Entrega a domicilio' : 'Recogida en tienda'}</p>
   <p className="text-2xl font-bold text-theme-primary">{formatBOB(qr?.amount??order.total)}</p>
   {status==='PAID'?<div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 font-semibold text-center">Pago confirmado. Tu pedido ya está registrado para preparación.</div>:
    <>
      <div className="bg-white p-3 rounded-xl mx-auto w-fit max-w-full min-h-[220px] flex items-center justify-center">
        {svg&&!expired?<div className="w-[260px] max-w-full [&>svg]:w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{__html:svg}}/>:<span className="text-slate-700 text-sm">{busy?'Generando QR…':expired?'QR vencido':'Preparando código QR…'}</span>}
      </div>
      <p className="text-xs text-market-muted text-center">Escanea el QR desde Solari Móvil y confirma con tu PIN. Nunca ingreses el PIN bancario en esta página.</p>
      {qr&&!expired&&<p className="text-sm text-center text-market-muted">Vence en {Math.floor(expiresIn/60)}:{String(expiresIn%60).padStart(2,'0')}</p>}
      {!synced&&<p className="text-amber-300 text-xs">No se pudo consultar el estado actualizado. Comprueba tus pedidos antes de intentar pagar nuevamente.</p>}
      {expired&&<p className="text-amber-300 text-xs">El QR venció. Verifica el pedido y su reserva; no se generará otro QR automáticamente.</p>}
      {error&&<p className="text-red-300 text-xs p-3 bg-red-500/10 border border-red-500/30 rounded-lg">{error}</p>}
    </>}
   <div className="grid grid-cols-2 gap-2">
    <button type="button" onClick={onClose} className="border border-market-border rounded-lg py-2 text-sm">Cerrar</button>
    <a href="/mis-pedidos" className="text-center bg-theme-primary text-white rounded-lg py-2 text-sm font-semibold">Mis pedidos</a>
   </div>
  </div>
 </div>
}
