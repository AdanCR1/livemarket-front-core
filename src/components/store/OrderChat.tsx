import { useEffect, useRef, useState, type FormEvent } from 'react';
import { commerceFetch, CommerceError } from '../../lib/commerce/client';

type Message = { id: string; sender_id: string; body: string; created_at: string };
type Page = { messages: Message[]; viewer_id: string; next_cursor: string | null };
type Notice = { id: string; read_at: string | null };
type Dispute = { id: string; status: string; escrow_sync_confirmed_at: string | null; resolution_notes?:string|null };
const json = { 'Content-Type': 'application/json' };

export function OrderChat({ orderId, peerName='Participante del pedido' }: { orderId: string;peerName?:string }) {
  const [chat, setChat] = useState<string | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const pageRef=useRef<Page|null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [disputes, setDisputes] = useState<Dispute[] | null>(null);
  const pending = useRef<{ text: string; id: string } | null>(null);
  const request = useRef(false);
  const refreshRef=useRef<()=>Promise<void>>(async()=>{});
  const bottom=useRef<HTMLLIElement>(null);
  const [report,setReport]=useState(false);

  async function open() {
    if (request.current) return;
    request.current = true;
    setBusy(true); setError('');
    try {
      const result = await commerceFetch<{ id: string }>('/api/chat/conversations', {
        method: 'POST', headers: json, body: JSON.stringify({ order_id: orderId }),
      });
      setChat(result.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Chat no disponible');
    } finally { request.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (!chat) return;
    const controller = new AbortController();
    let reading = false;
    const endpoint = `/api/chat/conversations/${chat}`;
    const events = new EventSource(`${endpoint}/events`);
    async function refresh() {
      if (reading || controller.signal.aborted) return;
      reading = true;
      try {
        const result = await commerceFetch<Page>(`${endpoint}/messages`, { signal: controller.signal });
        if (!controller.signal.aborted) {
          const previousPage=pageRef.current;
          setHistory(previous=>[...new Map([...previous,...(previousPage?.messages??[])].map(message=>[message.id,message])).values()]);
          pageRef.current=result;
          setPage(result);
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          if(failure instanceof CommerceError&&[401,403,404].includes(failure.status)){
            pageRef.current=null;setPage(null);setHistory([]);setCursor(null);events.close();setOnline(false);
          }
          setError(failure instanceof Error ? failure.message : 'Historial no disponible');
        }
      } finally { reading = false; }
    }
    refreshRef.current=refresh;
    events.onopen = () => {setOnline(true);void refresh();};
    events.onerror = () => { setOnline(false); void refresh(); };
    events.addEventListener('refresh', () => void refresh());
    void refresh();
    return () => { controller.abort(); events.close();refreshRef.current=async()=>{}; };
  }, [chat]);

  useEffect(() => {
    if (!chat || !page) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    commerceFetch<Notice[]>(`/api/chat/notifications?conversation_id=${chat}`, options)
      .then((result) => { if (!controller.signal.aborted) setNotices(result); })
      .catch(() => { if (!controller.signal.aborted) setNotices([]); });
    commerceFetch<Dispute[]>(`/api/chat/disputes?order_id=${orderId}`, options)
      .then((result) => { if (!controller.signal.aborted) setDisputes(result); })
      .catch(() => { if (!controller.signal.aborted) setDisputes(null); });
    return () => controller.abort();
  }, [chat, orderId, page]);

  async function older() {
    const next = cursor ?? page?.next_cursor;
    if (!next || !chat || request.current) return;
    request.current = true;
    setBusy(true); setError('');
    try {
      const result = await commerceFetch<Page>(`/api/chat/conversations/${chat}/messages?cursor=${encodeURIComponent(next)}`);
      setHistory((previous) => [...new Map([...previous,...result.messages].map(message=>[message.id,message])).values()]);
      setCursor(result.next_cursor ?? '');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Historial no disponible');
    } finally { request.current = false; setBusy(false); }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chat || !text.trim() || request.current) return;
    request.current = true;
    const content = text.trim();
    if (pending.current?.text !== content) pending.current = { text: content, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      await commerceFetch(`/api/chat/conversations/${chat}/messages`, {
        method: 'POST', headers: json,
        body: JSON.stringify({ client_message_id: pending.current.id, text: content }),
      });
      pending.current = null;
      setText('');
      await refreshRef.current();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo enviar');
    } finally { request.current = false; setBusy(false); }
  }

  async function markRead(id: string) {
    if (request.current) return;
    request.current = true;
    setBusy(true); setError('');
    try {
      await commerceFetch(`/api/chat/notifications/${id}/read`, { method: 'PATCH' });
      setNotices((previous) => previous.filter((notice) => notice.id !== id));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo marcar el aviso');
    } finally { request.current = false; setBusy(false); }
  }

  const messages = [...new Map([...history,...(page?.messages ?? [])].map((message) => [message.id, message])).values()]
    .sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id.localeCompare(b.id));
  const lastId=messages.at(-1)?.id;
  useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[lastId]);
  const unread = page ? notices.filter((notice) => !notice.read_at) : [];
  const dispute = page ? disputes?.[0] : null;
  return <section className="space-y-3 rounded-xl border border-market-border bg-market-darker p-3 text-market-white" aria-label="Conversación del pedido">
    {!chat && <button type="button" disabled={busy} onClick={() => void open()} className="rounded-lg border border-market-border px-3 py-2 text-sm">{busy?'Abriendo chat…':'Abrir chat del pedido'}</button>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {chat && <>
      <header className="border-b border-market-border pb-2"><strong>{peerName}</strong><p className="text-xs text-market-muted">Pedido #{orderId.slice(0,8)}</p></header>
      <p role="status" className="text-xs">{online ? 'Chat conectado' : 'Reconectando chat…'}</p>
      {unread.length > 0 && <button type="button" disabled={busy} onClick={() => void markRead(unread[0].id)} className="text-xs underline">
        Avisos sin leer ({unread.length}) · Marcar el más reciente como leído
      </button>}
      {dispute && <p className="text-xs">
        Disputa: {dispute.status === 'PENDING_ESCROW_SYNC' ? 'Pendiente de sincronización' : dispute.status}.
        {!dispute.escrow_sync_confirmed_at && ' La retención de fondos aún no está confirmada.'}
        {dispute.resolution_notes&&<span className="block">Resolución: {dispute.resolution_notes}</span>}
      </p>}
      {(cursor ?? page?.next_cursor) && <button type="button" disabled={busy} onClick={() => void older()} className="underline">Mensajes anteriores</button>}
      {!page&&<p role="status" className="text-sm text-market-muted">Cargando historial…</p>}
      {page&&messages.length===0&&<p className="py-5 text-center text-sm text-market-muted">Aún no hay mensajes. Inicia la conversación.</p>}
      <ul aria-label="Mensajes" className="max-h-80 min-h-20 space-y-2 overflow-y-auto p-2">
        {messages.map((message) => <li key={message.id} className={`w-fit max-w-[90%] sm:max-w-[80%] rounded-xl px-3 py-2 whitespace-pre-wrap break-words text-sm ${message.sender_id===page?.viewer_id?'ml-auto bg-theme-primary/20 border border-theme-primary/30':'mr-auto bg-market-card border border-market-border'}`}>
          <strong className="block text-xs text-market-muted">{message.sender_id === page?.viewer_id ? 'Tú' : peerName}</strong>{message.body}
          <time dateTime={message.created_at} className="block text-right text-[10px] text-market-muted">{new Date(message.created_at).toLocaleString('es-BO',{dateStyle:'short',timeStyle:'short'})}</time>
        </li>)}
        <li ref={bottom} aria-hidden="true" />
      </ul>
      <form onSubmit={send} className="space-y-2">
        <label className="block text-sm">Mensaje
          <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={1500}
            required className="block w-full rounded border border-current/20 bg-transparent p-2" />
        </label>
        <p className="text-xs">Evita compartir PIN, códigos QR o ubicación exacta. El chat no abre una disputa financiera.</p>
        <button disabled={busy || !page || !text.trim()} className="rounded-lg bg-theme-primary px-4 py-2 text-sm disabled:opacity-50">{busy?'Enviando…':'Enviar'}</button>
      </form>
      <button type="button" className="text-xs underline" onClick={()=>setReport(value=>!value)}>Reportar un problema</button>
      {report&&<fieldset className="space-y-2 rounded-lg border border-market-border p-3">
        <legend className="text-sm">Problema con el pedido</legend>
        <label className="block text-sm">Motivo<input maxLength={120} className="block w-full rounded border border-market-border bg-transparent p-2" /></label>
        <label className="block text-sm">Descripción<textarea maxLength={3000} className="block w-full rounded border border-market-border bg-transparent p-2" /></label>
        <p className="text-xs text-amber-300">MS5 todavía no admite crear disputas con sincronización financiera verificada. Este formulario no envía ni congela fondos.</p>
        <button type="button" disabled className="rounded border border-market-border px-3 py-2 text-sm opacity-50">Enviar disputa (no disponible)</button>
      </fieldset>}
    </>}
  </section>;
}
