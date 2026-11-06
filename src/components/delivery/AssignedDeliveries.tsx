import { useEffect, useState } from 'react';
import { commerceFetch } from '../../lib/commerce/client';

type Assignment = { id: string; order_id: string; status: string; created_at: string };
const labels: Record<string, string> = {
  PENDING: 'Pendiente de asignación',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En ruta',
  DELIVERED: 'Llegada registrada',
  CONFIRMED: 'Recepción confirmada',
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
