import type { APIRoute } from 'astro';
import { MS3_URL } from '../../../lib/constants';

export const prerender = false;

function json(status: number, error: string): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** BFF protegido: nunca expone el JWT httpOnly al navegador. */
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  // Evitar que sitios de terceros utilicen la cookie de sesión para subir archivos.
  const origin = request.headers.get('Origin');
  const requestedOrigin = new URL(request.url).origin;
  if (!origin || origin !== requestedOrigin) return json(403, 'Origen no autorizado.');

  const token = locals.token ?? cookies.get('mc_session')?.value;
  if (!token || !locals.session) return json(401, 'Debes iniciar sesión.');

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return json(415, 'Se requiere multipart/form-data.');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, 'El formulario no se pudo leer.');
  }
  const file = form.get('file');
  if (!(file instanceof File)) return json(400, 'Selecciona una imagen.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return json(415, 'Solo se permite JPEG, PNG o WebP.');
  }
  if (file.size < 1 || file.size > 5 * 1024 * 1024) {
    return json(413, 'La imagen debe tener entre 1 byte y 5 MB.');
  }

  // Nunca aceptamos un token aportado por el cliente: exclusivamente mc_session.
  const outgoing = new FormData();
  outgoing.set('file', file, file.name);

  try {
    const upstream = await fetch(`${MS3_URL}/api/media/payout-qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload || payload.success !== true) {
      const message = typeof payload?.error === 'string'
        ? payload.error
        : 'MS3 no pudo subir la imagen.';
      return json(upstream.status >= 400 ? upstream.status : 502, message);
    }
    return new Response(JSON.stringify(payload), {
      status: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[upload-payout-qr] Error de comunicación con MS3:', error);
    return json(502, 'No se pudo contactar con el servicio de imágenes.');
  }
};
