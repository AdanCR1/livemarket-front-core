import {useEffect,useState} from 'react';
import {listSales,setMerchantOrderStatus} from '../../lib/commerce/client';
import {formatBOB,type PurchaseOrder} from '../../lib/types/commerce';
import { OrderChat } from '../store/OrderChat';
export function OrderManager(){
 const [orders,setOrders]=useState<PurchaseOrder[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(''),[filter,setFilter]=useState('');
 async function refresh(){setLoading(true);try{setOrders(await listSales());setError('')}catch(e){setError(e instanceof Error?e.message:'Error consultando pedidos')}finally{setLoading(false)}}
 useEffect(()=>{void refresh()},[]);
 async function transition(id:string,status:'PREPARING'|'READY'){
  setBusy(id);try{await setMerchantOrderStatus(id,status);await refresh()}catch(e){setError(e instanceof Error?e.message:'No se pudo cambiar el estado')}finally{setBusy('')}
 }
 const shown=filter?orders.filter(o=>o.status===filter):orders;
 return <div className="space-y-6 animate-fade-in">
  <div className="flex gap-3 items-center justify-between flex-wrap"><div><h1 className="text-xl md:text-2xl font-bold panel-font-display">Gestión de pedidos</h1><p className="text-sm text-[var(--panel-muted)]">Pedidos de tu comercio. Recogida en tienda habilitada.</p></div><button type="button" onClick={()=>void refresh()} className="panel-btn-secondary px-4 py-2 text-sm">Actualizar</button></div>
  <div className="flex flex-wrap gap-2">{['','PENDING_PAYMENT','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED'].map(s=><button key={s} type="button" onClick={()=>setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs border border-[var(--panel-border)] ${filter===s?'bg-[var(--panel-primary)] text-white':'text-[var(--panel-muted)]'}`}>{s||'Todos'}</button>)}</div>
  {loading&&<p className="text-[var(--panel-muted)]">Cargando pedidos…</p>}{error&&<p className="text-red-400 text-sm">{error}</p>}
  {!loading&&!error&&shown.length===0&&<div className="panel-card p-8 text-center text-[var(--panel-muted)]">No hay pedidos en este estado.</div>}
  <div className="space-y-3">{shown.map(o=><article key={o.id} className="panel-card p-5 space-y-3">
   <div className="flex gap-2 justify-between flex-wrap"><strong>Pedido #{o.id.slice(0,8)}</strong><span className="font-bold text-[var(--panel-accent)]">{formatBOB(o.total)}</span></div>
   <p className="text-xs text-[var(--panel-muted)]">Estado: {o.status} · Pago: {o.payment_status} · {o.delivery_type==='PICKUP'?'Recogida en tienda':'Envío'} · {new Date(o.created_at).toLocaleString('es-BO')}</p>
   {o.notes&&<p className="text-xs text-[var(--panel-muted)] whitespace-pre-wrap">Notas: {o.notes}</p>}
   {import.meta.env.PUBLIC_MS5_CHAT_ENABLED === 'true' && <OrderChat orderId={o.id} />}
   <div className="bg-black/20 p-3 rounded-lg space-y-1">{o.order_items?.map((i,j)=><div key={i.id||j} className="flex justify-between gap-2 text-xs"><span>{i.quantity}× {i.name_snapshot||i.product_name||i.name||i.product_id}</span><span>{formatBOB(i.subtotal??Number(i.unit_price)*i.quantity)}</span></div>)}</div>
   {o.delivery_type==='PICKUP'&&o.payment_status==='PAID'&&<div className="flex gap-2 justify-end">
    {o.status==='CONFIRMED'&&<button type="button" disabled={busy===o.id} className="panel-btn-primary px-4 py-2 text-xs" onClick={()=>void transition(o.id,'PREPARING')}>Iniciar preparación</button>}
    {o.status==='PREPARING'&&<button type="button" disabled={busy===o.id} className="panel-btn-primary px-4 py-2 text-xs" onClick={()=>void transition(o.id,'READY')}>Marcar listo para recoger</button>}
    {o.status==='READY'&&<span className="text-xs text-emerald-400">Esperando recogida del comprador</span>}
   </div>}
  </article>)}</div>
 </div>
}
