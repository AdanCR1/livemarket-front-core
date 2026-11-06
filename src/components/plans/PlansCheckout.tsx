import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

type Subscription = {
  store_id: string; plan: string; status: string; can_accept_orders: boolean;
  current_period_end: string|null; trial_end_at: string|null;
  prices: { PRO: number | null }; currency:string; period_days:number;
};
type GeneratedQr = { payment_id:string; qr_token:string; amount:number|string; currency:string; expires_at:string };
type Payment = { id:string; status:string; requested_plan:string; amount:number|string; paid_at:string|null };

async function json<T>(url:string, init?:RequestInit):Promise<T>{
  const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...init,signal:init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)});
  const data=await r.json().catch(()=>null);
  if(!r.ok || !data?.success)throw new Error(typeof data?.error==='string'?data.error:`Error HTTP ${r.status}`);
  return data.data as T;
}
function money(n:number|string|null){return n===null?'No configurado':new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(Number(n));}
function date(v:string|null){return v?new Date(v).toLocaleString('es-BO'):'—';}

export function PlansCheckout({ checkoutEnabled, contactEmail }: { checkoutEnabled: boolean; contactEmail: string | null }){
  const [subscription,setSubscription]=useState<Subscription|null>(null);
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const [qr,setQr]=useState<GeneratedQr|null>(null);
  const [qrImage,setQrImage]=useState('');
  const generating = useRef(false);
  const storageKey = subscription ? `mc:subscription:${subscription.store_id}:PRO` : null;
  const [payment,setPayment]=useState<Payment|null>(null);
  const [syncError,setSyncError]=useState(false);
  const [now,setNow]=useState(Date.now());

  async function refresh(){
    try {setSubscription(await json<Subscription>('/api/plans'));setError('');}
    catch(e){setError(e instanceof Error?e.message:'No se pudo consultar el plan');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void refresh();},[]);
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = sessionStorage.getItem(`${storageKey}:qr`);
      if (saved) setQr(JSON.parse(saved) as GeneratedQr);
    } catch {
      // El reintento conserva la misma obligación mientras la pestaña pueda guardar la clave.
    }
  }, [storageKey]);
  useEffect(()=>{
    if(!qr)return;
    let cancelled=false;
    QRCode.toDataURL(qr.qr_token,{width:300,margin:2,errorCorrectionLevel:'M'})
      .then(img=>{if(!cancelled)setQrImage(img)}).catch(()=>{if(!cancelled)setError('Error al dibujar QR')});
    return()=>{cancelled=true};
  },[qr?.qr_token]);
  useEffect(()=>{
    if(!qr)return;
    const t=window.setInterval(()=>setNow(Date.now()),1000);
    return()=>window.clearInterval(t);
  },[qr?.payment_id]);
  useEffect(()=>{
    if(!qr || payment?.status==='PAID')return;
    let alive=true;
    let polling=false;
    const controller=new AbortController();
    const poll=async()=>{
      if(document.hidden || polling)return;
      polling=true;
      try {
        const p=await json<Payment>(`/api/plans/payment/${encodeURIComponent(qr.payment_id)}`, {signal: controller.signal});
        if(!alive)return;
        setPayment(p);setSyncError(false);
        if(p.status==='PAID'){
          if (storageKey) {
            sessionStorage.removeItem(storageKey);
            sessionStorage.removeItem(`${storageKey}:qr`);
          }
          await refresh();
        }
      }catch{if(alive)setSyncError(true)}finally{polling=false}
    };
    void poll();const id=window.setInterval(poll,5000);
    return()=>{alive=false;controller.abort();window.clearInterval(id)};
  },[qr?.payment_id,payment?.status,storageKey]);

  const priceVerified = subscription?.prices?.PRO === 59 &&
    subscription.currency === 'BOB' && subscription.period_days === 30;

  async function generate(){
    if (!checkoutEnabled || !priceVerified || !storageKey || generating.current) return;
    generating.current = true;
    setWorking(true);setError('');
    try {
      let key=sessionStorage.getItem(storageKey);
      if (!key || payment?.status === 'CANCELLED' || payment?.status === 'EXPIRED') {
        key=crypto.randomUUID();
        sessionStorage.setItem(storageKey,key);
        sessionStorage.removeItem(`${storageKey}:qr`);
      }
      const created=await json<GeneratedQr>('/api/plans/qr',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({plan:'PRO',idempotency_key:key}),
      });
      setNow(Date.now());setQrImage('');setPayment(null);setQr(created);
      sessionStorage.setItem(`${storageKey}:qr`,JSON.stringify(created));
    } catch(e) {
      setError(e instanceof Error?e.message:'No se pudo generar QR');
    } finally {
      generating.current=false;
      setWorking(false);
    }
  }
  const remaining=qr?Math.max(0,Math.ceil((Date.parse(qr.expires_at)-now)/1000)):0;
  const expired=!!qr && remaining===0;
  return <div className="space-y-6 text-market-white">
    {error&&<div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200 text-sm">{error} <button className="ml-3 underline" onClick={()=>void refresh()}>Reintentar</button></div>}
    <div className="rounded-xl border border-market-border/60 bg-market-card/80 p-5 flex flex-wrap justify-between gap-3">
      <div><div className="text-xs uppercase text-market-muted">Tu suscripción actual</div><div className="text-xl font-bold">{loading?'Consultando…':subscription?`${subscription.plan} · ${subscription.status}`:'No disponible'}</div><div className="text-xs text-market-muted mt-1">Vencimiento: {date(subscription?.status === 'TRIALING' ? subscription.trial_end_at : subscription?.current_period_end ?? null)}</div></div>
      <div className="flex items-center gap-2"><span className={subscription?.can_accept_orders?'text-emerald-400 font-semibold':'text-amber-300 font-semibold'}>{subscription?.can_accept_orders?'Compras habilitadas':'Compras deshabilitadas'}</span><button type="button" className="px-3 py-2 rounded-lg border border-market-border hover:bg-white/5 text-sm" onClick={()=>void refresh()}>Actualizar</button></div>
    </div>
    <div className="grid md:grid-cols-3 gap-4">
      <section className="rounded-2xl p-6 border border-market-border/60 bg-market-card/70 space-y-4">
        <h2 className="text-xl font-bold">FREE</h2>
        <p className="text-2xl font-extrabold">{money(0)}</p>
        <p className="text-sm text-market-muted">Catálogo público sin checkout.</p>
      </section>
      <section className="rounded-2xl p-6 border border-theme-primary bg-market-card space-y-4">
        <h2 className="text-xl font-bold">PRO</h2>
        <p className="text-2xl font-extrabold">{priceVerified ? money(subscription.prices.PRO) : 'Bs 59'} <span className="text-xs font-normal text-market-muted">/ 30 días</span></p>
        <p className="text-sm text-market-muted">Ventas con QR Solari y gestión de pedidos para recogida en tienda.</p>
        {!checkoutEnabled && <p className="text-xs text-amber-200">Cobro pendiente de validación en DEV.</p>}
        {checkoutEnabled && !loading && !priceVerified && <p className="text-xs text-amber-200">MS6 no confirmó la tarifa PRO.</p>}
        <button type="button" disabled={!checkoutEnabled || !priceVerified || working || (qr !== null && payment?.status !== 'PAID' && (!expired || !payment || syncError))}
          onClick={()=>void generate()} className="w-full bg-theme-primary hover:brightness-110 text-white font-semibold rounded-xl py-3 disabled:opacity-40">
          {working ? 'Generando…' : qr && payment?.status !== 'PAID' ? 'Reintentar QR' : subscription?.plan === 'PRO' && subscription.can_accept_orders ? 'Renovar con QR' : 'Pagar con QR'}
        </button>
      </section>
      <section className="rounded-2xl p-6 border border-market-border/60 bg-market-card/70 space-y-4">
        <h2 className="text-xl font-bold">ENTERPRISE</h2>
        <p className="text-sm text-market-muted">Consulta con el equipo comercial.</p>
        {contactEmail ? <a className="inline-block underline" href={`mailto:${contactEmail}`}>Contactar por correo</a>
          : <button type="button" disabled className="opacity-50">Contacto no disponible</button>}
      </section>
    </div>
    {qr&&<section aria-label="Pago de suscripción QR" className="rounded-2xl p-6 bg-market-card border border-market-border/70 max-w-xl mx-auto space-y-4 text-center">
      <h2 className="text-xl font-bold">Pago de plan PRO</h2>
      <p className="text-2xl font-bold text-theme-primary">{money(qr.amount)}</p>
      {payment?.status==='PAID'?<div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 p-4">Pago confirmado por MS6. Consulta arriba el estado y la vigencia del plan.</div>:<>
        {qrImage&&!expired&&checkoutEnabled?<img className="mx-auto rounded-xl bg-white p-3" width={300} height={300} src={qrImage} alt="QR de pago de suscripción"/>:<div className="p-12 text-amber-200">{!checkoutEnabled?'Cobro temporalmente deshabilitado':expired?'QR vencido':'Preparando QR…'}</div>}
        <p className="text-sm text-market-muted">Escanea desde Solari Móvil y autoriza el pago con tu PIN en la aplicación. Nunca introduzcas aquí tu PIN.</p>
        <p className="text-xs">Vence en {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</p>
        {syncError&&<p className="text-amber-200 text-sm">No se pudo comprobar el pago. Verifica tu saldo/historial antes de repetir una operación.</p>}
        {expired&&<p className="text-amber-200 text-sm">El QR venció. Consulta el estado del pago antes de generar otro.</p>}
      </>}
      <button type="button" onClick={()=>{void refresh()}} className="block mx-auto px-4 py-2 rounded-lg border border-market-border">Actualizar plan</button>
    </section>}
    <p className="text-xs text-market-muted">El plan se activa solamente cuando MS6 registra el pago. El frontend no puede activar ni modificar una suscripción directamente.</p>
  </div>;
}
