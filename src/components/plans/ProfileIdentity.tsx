import { useEffect, useState } from 'react';

type Profile = { id:string; role:'B2B'|'B2C'; email:string|null; full_name:string|null };
export function ProfileIdentity(){
  const [data,setData]=useState<Profile|null>(null);
  const [name,setName]=useState('');
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    fetch('/api/profile/name',{credentials:'same-origin',cache:'no-store'}).then(async r=>{
      const j=await r.json();if(!r.ok||!j.success)throw new Error(j.error||'No se pudo cargar');return j.data as Profile;
    }).then(d=>{if(active){setData(d);setName(d.full_name??'')}}).catch(e=>{if(active)setError(e.message)});
    return()=>{active=false};
  },[]);
  async function save(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      const r=await fetch('/api/profile/name',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({full_name:name})});
      const j=await r.json();if(!r.ok||!j.success)throw new Error(j.error||'No se pudo guardar');
      const p=j.data as Profile;setData(p);setName(p.full_name??'');setEditing(false);setMessage('Nombre actualizado');
    }catch(e){setError(e instanceof Error?e.message:'Error al actualizar')}finally{setBusy(false)}
  }
  return <section className="rounded-2xl border border-market-border/60 bg-market-card/80 p-6 text-market-white space-y-4">
    <h2 className="text-lg font-bold">Datos personales</h2>
    {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
    {message&&<p className="text-emerald-300 text-sm">{message}</p>}
    <div><label className="block text-xs font-semibold text-market-muted mb-1">Correo electrónico</label><input readOnly value={data?.email??''} placeholder={data?'Correo no disponible':'Cargando…'} className="w-full rounded-xl bg-black/20 border border-market-border px-4 py-2 text-sm text-market-white/80"/></div>
    <form onSubmit={save} className="space-y-3">
      <label htmlFor="profileFullName" className="block text-xs font-semibold text-market-muted">Nombre completo</label>
      <input id="profileFullName" type="text" minLength={3} maxLength={120} required readOnly={!editing} value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-xl bg-black/20 border border-market-border px-4 py-2 text-sm text-market-white"/>
      {editing?<div className="flex gap-3"><button disabled={busy} type="submit" className="rounded-xl bg-theme-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Guardar nombre</button><button type="button" className="rounded-xl border border-market-border px-4 py-2 text-sm" onClick={()=>{setEditing(false);setName(data?.full_name??'')}}>Cancelar</button></div>:<button type="button" disabled={!data} onClick={()=>setEditing(true)} className="rounded-xl border border-market-border px-4 py-2 text-sm disabled:opacity-50">Editar nombre</button>}
    </form>
  </section>
}
