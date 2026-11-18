import type { APIRoute } from "astro";
import { jsonError, noStore, protectMutation } from "../../../lib/server/profile-api";
import { serviceUrl } from "../../../lib/server/service-url";

export const prerender = false;

const operations = [
  { method: "PATCH", path: /^live$/, prefix: "/api/account/" },
  { method: "GET", path: /^drivers$/, prefix: "/api/b2b/" },
  { method: "POST", path: /^drivers\/create$/, prefix: "/api/b2b/" },
  { method: "PATCH", path: /^drivers\/[\w-]+\/toggle$/, prefix: "/api/b2b/" },
  { method: "POST", path: /^(products|products\/[\w-]+\/media|live\/toggle\/[\w-]+)$/, prefix: "/api/catalog/private/" },
  { method: "PUT", path: /^products\/[\w-]+$/, prefix: "/api/catalog/private/" },
  { method: "DELETE", path: /^products\/[\w-]+$/, prefix: "/api/catalog/private/" },
  { method: "POST", path: /^product-media$/, prefix: "/upload/" },
];


export const ALL: APIRoute = async ({ request, locals, params, url }) => {
  if (!locals.token || !locals.session) {
    return jsonError("Sesión requerida", 401);
  }

  if (locals.session.role !== "B2B") {
    return jsonError("Solo comercios B2B", 403);
  }

  if (request.method !== "GET") {
    const blocked = protectMutation(request);
    if (blocked) return blocked;
  }

  const path = params.operation ?? "";

  const operation = operations.find(
    (entry) =>
      entry.method === request.method &&
      entry.path.test(path)
  );

  if (!operation) {
    return jsonError("Operación no disponible", 404);
  }

  let base: string;
  const service = (path === 'live' || path.startsWith('drivers')) ? 'MS1' : path === 'product-media' ? 'MS3' : 'MS2';
  try { base = serviceUrl(service, url); }
  catch {
    console.error("[PANEL PROXY] URL de servicio inválida", {
      method: request.method,
      path,
    });

    return jsonError(
      "Configuración del servicio no disponible",
      503
    );
  }

  const target = `${base}${operation.prefix}${path}`;

  const headers = new Headers({
    Authorization: `Bearer ${locals.token}`,
    Accept: "application/json",
  });

  const contentType = request.headers.get("Content-Type");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : request.body,
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
    });

    if (response.status >= 300 && response.status < 400) {
      console.error("[PANEL PROXY] Redirección inesperada", {
        method: request.method,
        path,
        status: response.status,
      });

      return jsonError(
        "El microservicio respondió con una redirección inesperada",
        502
      );
    }

    const result = await response.json().catch(() => null);

    if (!result) {
      console.error("[PANEL PROXY] Respuesta no JSON", {
        method: request.method,
        path,
        status: response.status,
      });

      return jsonError(
        "Respuesta inválida del servicio",
        502
      );
    }

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: noStore,
    });

  } catch (error) {
    console.error("[PANEL PROXY] Error de comunicación", {
      method: request.method,
      path,
      target,
      message:
        error instanceof Error ? error.message : String(error),
    });

    return jsonError(
      "Servicio temporalmente no disponible",
      503
    );
  }
};
