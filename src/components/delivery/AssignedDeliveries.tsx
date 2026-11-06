import { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { commerceFetch } from '../../lib/commerce/client';

type Assignment = { id: string; order_id: string; status: string; created_at: string };
const labels: Record<string, string> = {
  PENDING: 'Pendiente de asignación',
  PENDING_PAIRING:'Pendiente de vinculación',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En ruta',
  DELIVERED: 'Llegada registrada',
  CONFIRMED: 'Recepción confirmada',
  CONFIRMED_CUSTOMER:'Recepción confirmada',
  DISPUTED: 'En disputa',
};

export function AssignedDeliveries() {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    commerceFetch<Assignment[]>('/api/deliveries/assigned', { signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result)) throw new Error('Respuesta inválida de logística');
        if (!controller.signal.aborted) setAssignments(result);
      }).catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'No pudimos cargar tus envíos.');
      });
    return () => controller.abort();
  }, [attempt]);

  return <section className="space-y-4 py-4" aria-label="Asignaciones de reparto">
    <p className="text-sm text-market-muted">Consulta tus asignaciones mientras se valida el flujo de entrega.</p>
    <button type="button" className="rounded-lg border border-market-border px-4 py-2"
      onClick={() => setAttempt((value) => value + 1)}>Actualizar</button>
    {error ? <p role="alert" className="text-red-300">{error}</p>
      : assignments === null ? <p role="status">Cargando asignaciones…</p>
      : assignments.length === 0 ? <p role="status">No tienes envíos asignados.</p>
      : <ul className="space-y-3">
        {assignments.map((assignment) => <li key={assignment.id} className="rounded-xl border border-market-border bg-market-card p-4">
          <p className="font-semibold">Pedido #{assignment.order_id.slice(0, 8)}</p>
          <p className="text-sm text-market-muted">{labels[assignment.status] ?? assignment.status}</p>
          <time className="text-xs text-market-muted" dateTime={assignment.created_at}>
            {new Date(assignment.created_at).toLocaleString('es-BO')}
          </time>
        </li>)}
      </ul>}
  </section>;
}

// Shared buyer/seller delivery view; authority and GPS filtering remain in MS4.
type DeliveryDetail={id:string;status:string;driver_id?:string|null;driver_name?:string|null;last_latitude:number|null;last_longitude:number|null};
type FleetDriver={driver_user_id:string;full_name:string;is_active:boolean};
export function OrderDelivery({orderId,merchant=false,ready=false}:{orderId:string;merchant?:boolean;ready?:boolean}){
 const [delivery,setDelivery]=useState<DeliveryDetail|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [code,setCode]=useState(''),[drivers,setDrivers]=useState<FleetDriver[]|null>(null),[address,setAddress]=useState('');
 const [attempt,setAttempt]=useState(0);
 const mapNode=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const controller=new AbortController();let reading=false;
  async function load(){
   if(reading)return;reading=true;
   try{
    const order=await commerceFetch<{address_snapshot?:string;delivery_address?:string;deliveries?:{id:string}[]|{id:string}}>('/api/orders/'+orderId,{signal:controller.signal});
    const reference=Array.isArray(order.deliveries)?order.deliveries[0]:order.deliveries;
    const result=reference?await commerceFetch<DeliveryDetail>('/api/deliveries/'+reference.id,{signal:controller.signal}):null;
    if(!controller.signal.aborted){setDelivery(result);setAddress(order.address_snapshot??order.delivery_address??'');setError('');}
   }catch(failure){if(!controller.signal.aborted){setDelivery(null);setError(failure instanceof Error?failure.message:'No se pudo consultar la entrega');}}
   finally{reading=false;}
  }
  void load();const timer=window.setInterval(()=>void load(),8000);
  return()=>{controller.abort();window.clearInterval(timer);};
 },[orderId,attempt]);
 const lat=delivery?.last_latitude,lng=delivery?.last_longitude;
 const validGPS=delivery?.status==='IN_TRANSIT'&&typeof lat==='number'&&Number.isFinite(lat)&&Math.abs(lat)<=90&&typeof lng==='number'&&Number.isFinite(lng)&&Math.abs(lng)<=180;
 useEffect(()=>{
  if(!validGPS||!mapNode.current)return;
  const node=mapNode.current;let disposed=false,map:import('leaflet').Map|undefined;
  import('leaflet').then(L=>{
   if(disposed)return;
   map=L.map(node).setView([lat!,lng!],16);
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
   L.circleMarker([lat!,lng!],{radius:9,color:'#22c55e',fillOpacity:0.8}).addTo(map);
  }).catch(()=>{if(!disposed)setError('No se pudo cargar el mapa');});
  return()=>{disposed=true;map?.remove();};
 },[validGPS,lat,lng]);
 async function fleet(){
  setBusy(true);setError('');
  try{const result=await commerceFetch<FleetDriver[]>('/api/panel/drivers');if(!Array.isArray(result))throw Error('Respuesta de repartidores inválida');setDrivers(result.filter(driver=>driver.is_active===true));}
  catch(failure){setError(failure instanceof Error?failure.message:'No se pudieron consultar repartidores');}finally{setBusy(false);}
 }
 async function create(){
  if(busy)return;setBusy(true);setError('');
  try{
   // Refresh real fleet availability before creating; no browser participant IDs are accepted.
   const available=await commerceFetch<FleetDriver[]>('/api/panel/drivers');
   if(!Array.isArray(available)||!available.some(driver=>driver.is_active===true))throw Error('No hay repartidores activos');
   const result=await commerceFetch<{id:string;pairing_code:string}>('/api/deliveries/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_id:orderId})});
   if(!/^[A-Z0-9]{6}$/.test(result.pairing_code))throw Error('Entrega creada; actualiza para comprobar su estado');
   setCode(result.pairing_code);setAttempt(value=>value+1);
  }catch(failure){setError(failure instanceof Error?failure.message:'No se pudo crear la entrega');}finally{setBusy(false);}
 }
 async function confirm(){
  if(busy)return;setBusy(true);setError('');
  try{await commerceFetch('/api/deliveries/'+delivery!.id+'/confirm',{method:'POST'});setAttempt(value=>value+1);}
  catch(failure){setError(failure instanceof Error?failure.message:'Recepción no confirmada');}finally{setBusy(false);}
 }
 const deliveryLabels:Record<string,string>={PENDING_PAIRING:'Pendiente de vinculación',ASSIGNED:'Repartidor asignado',IN_TRANSIT:'En tránsito',DELIVERED:'Llegada registrada',CONFIRMED_CUSTOMER:'Recepción confirmada'};
 return <section aria-label="Entrega del pedido" className="space-y-3 rounded-xl border border-market-border p-3 text-sm">
  {address&&<p>Dirección: {address}</p>}
  {error&&<p role="alert" className="text-red-400">{error}</p>}
  <p role="status">{delivery?deliveryLabels[delivery.status]??delivery.status:'Entrega todavía no creada'}</p>
  {merchant&&<>
   <button type="button" disabled={busy} onClick={()=>void fleet()} className="text-xs underline">Consultar repartidores activos</button>
   {drivers&&<ul className="text-xs">{drivers.length?drivers.map(driver=><li key={driver.driver_user_id}>{driver.full_name}</li>):<li>No hay repartidores activos</li>}</ul>}
   {!delivery&&ready&&<button type="button" disabled={busy||!!error} onClick={()=>void create()} className="panel-btn-primary px-3 py-2">Crear entrega</button>}
   {code&&(!delivery||delivery.status==='PENDING_PAIRING')&&<p>Código de vinculación: <strong className="font-mono tracking-widest">{code}</strong> · vence en 15 minutos</p>}
  </>}
  {delivery?.driver_id&&<p>Repartidor: {delivery.driver_name??drivers?.find(driver=>driver.driver_user_id===delivery.driver_id)?.full_name??'#'+delivery.driver_id.slice(0,8)}</p>}
  {delivery?.status==='IN_TRANSIT'&&(validGPS?<div ref={mapNode} role="img" aria-label="Ubicación actual del repartidor" className="h-64 w-full rounded-lg overflow-hidden" />:<p>Esperando ubicación del repartidor</p>)}
  {!merchant&&delivery?.status==='DELIVERED'&&<button type="button" disabled={busy} onClick={()=>void confirm()} className="rounded-lg border border-market-border px-3 py-2">Confirmar recepción</button>}
  <button type="button" disabled={busy} className="text-xs underline" onClick={()=>setAttempt(value=>value+1)}>Actualizar entrega</button>
 </section>;
}
