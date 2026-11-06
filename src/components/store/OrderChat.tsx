import { useEffect, useRef, useState, type FormEvent } from 'react';
import { commerceFetch } from '../../lib/commerce/client';

type Message = { id: string; sender_id: string; body: string; created_at: string };
type Page = { messages: Message[]; viewer_id: string; next_cursor: string | null };
type Notice = { id: string; read_at: string | null };
type Dispute = { id: string; status: string; escrow_sync_confirmed_at: string | null };
const json = { 'Content-Type': 'application/json' };

export function OrderChat({ orderId }: { orderId: string }) {
  const [chat, setChat] = useState<string | null>(null);
  const [page, setPage] = useState<Page | null>(null);
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
          setPage(result);
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setPage(null); setHistory([]); setCursor(null);
          setError(failure instanceof Error ? failure.message : 'Historial no disponible');
        }
      } finally { reading = false; }
    }
    events.onopen = () => setOnline(true);
    events.onerror = () => { setOnline(false); void refresh(); };
    events.addEventListener('refresh', () => void refresh());
    void refresh();
    return () => { controller.abort(); events.close(); };
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
      setHistory((previous) => [...previous, ...result.messages]);
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

  const messages = [...new Map([...(page?.messages ?? []), ...history].map((message) => [message.id, message])).values()].reverse();
  const unread = page ? notices.filter((notice) => !notice.read_at) : [];
  const dispute = page ? disputes?.[0] : null;
  return <section className="space-y-3 rounded-xl border border-current/20 p-3" aria-label="Conversación del pedido">
    {!chat && <button type="button" disabled={busy} onClick={() => void open()} className="underline">Abrir chat del pedido</button>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {chat && <>
      <p role="status" className="text-xs">{online ? 'Chat conectado' : 'Reconectando chat…'}</p>
      {unread.length > 0 && <button type="button" disabled={busy} onClick={() => void markRead(unread[0].id)} className="text-xs underline">
        Avisos sin leer ({unread.length}) · Marcar el más reciente como leído
      </button>}
      {dispute && <p className="text-xs">
        Disputa: {dispute.status === 'PENDING_ESCROW_SYNC' ? 'Pendiente de sincronización' : dispute.status}.
        {!dispute.escrow_sync_confirmed_at && ' La retención de fondos aún no está confirmada.'}
      </p>}
      {(cursor ?? page?.next_cursor) && <button type="button" disabled={busy} onClick={() => void older()} className="underline">Mensajes anteriores</button>}
      <ul aria-label="Mensajes" className="max-h-64 space-y-2 overflow-y-auto">
        {messages.map((message) => <li key={message.id} className="whitespace-pre-wrap break-words text-sm">
          <strong>{message.sender_id === page?.viewer_id ? 'Tú' : 'Participante'} </strong>{message.body}
        </li>)}
      </ul>
      <form onSubmit={send} className="space-y-2">
        <label className="block text-sm">Mensaje
          <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={1500}
            required className="block w-full rounded border border-current/20 bg-transparent p-2" />
        </label>
        <p className="text-xs">Evita compartir PIN, códigos QR o ubicación exacta. El chat no abre una disputa financiera.</p>
        <button disabled={busy || !page} className="underline">Enviar</button>
      </form>
    </>}
  </section>;
}
