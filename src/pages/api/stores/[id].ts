
import type { APIRoute } from 'astro';
import { apiError, isUuid } from '../../../lib/server/commerce-proxy';
import { serviceUrl } from '../../../lib/server/service-url';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const id = params.id;

  if (!isUuid(id)) {
    return apiError('ID de tienda inválido', 400);
  }

  // MS4 es la autoridad para determinar si la tienda
  // puede aceptar pedidos.
  let base: string;
  try { base = serviceUrl('MS4', url); }
  catch {
    console.error(
      '[STORE ACCESS] PUBLIC_MS4_URL ausente o inválida'
    );

    return apiError(
      'Servicio de verificación de tiendas no configurado',
      503
    );
  }

  const target = `${base}/api/store-access/${id}`;

  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400) {
      console.error('[STORE ACCESS] Redirección inesperada', {
        status: res.status,
      });

      return apiError(
        'Respuesta inesperada del servicio de tiendas',
        502
      );
    }

    const result = await res.json().catch(() => null);

    if (!res.ok || result?.success !== true) {
      console.error('[STORE ACCESS] MS4 rechazó consulta', {
        status: res.status,
        error: result?.error ?? null,
      });

      return apiError(
        'Estado del plan no disponible',
        503
      );
    }

    const canSell = result?.data?.can_accept_orders;

    if (typeof canSell !== 'boolean') {
      console.error(
        '[STORE ACCESS] Respuesta sin can_accept_orders'
      );

      return apiError(
        'Respuesta de verificación inválida',
        502
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('[STORE ACCESS] Error de comunicación', {
      message:
        error instanceof Error ? error.message : String(error),
    });

    return apiError(
      'Estado del plan no disponible',
      503
    );
  }
};
