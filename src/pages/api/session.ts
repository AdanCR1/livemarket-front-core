import type { APIRoute } from "astro";
import { decodeSession } from "../../lib/auth/decode";
import { MS1_URL } from "../../lib/constants";
import { jsonError, protectMutation } from "../../lib/server/profile-api";

export const prerender = false;

const COOKIE_NAME = "mc_session";

export const POST: APIRoute = async ({ request, cookies, url }) => {
    const blocked = protectMutation(request);
    if (blocked) return blocked;
    const body = await request.json().catch(() => null);
    const token = body?.token ?? body?.access_token;
    if (typeof token !== "string" || token.length > 8192 || body?.email !== undefined || body?.password !== undefined) {
        return jsonError("Envía únicamente el token de acceso.", 400);
    }
    const session = decodeSession(token);
    if (!session) return jsonError("Token inválido o expirado.", 401);

    try {
        const authUrl = new URL("/api/auth/session", MS1_URL);

        // Evita problemas de resolución IPv6 entre Node/Astro y Wrangler.
        if (authUrl.hostname === "localhost") {
            authUrl.hostname = "127.0.0.1";
        }

        const upstream = await fetch(authUrl.toString(), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            redirect: "manual",
            signal: AbortSignal.timeout(8000),
        });

        if (upstream.status >= 300 && upstream.status < 400) {
            console.error("[SESSION] MS1 devolvió una redirección inesperada.");
            return jsonError("Redirección inesperada de MS1.", 502);
        }

        if (upstream.status === 401 || upstream.status === 403) {
            return jsonError("Sesión inválida.", 401);
        }

        if (!upstream.ok) {
            console.error("[SESSION] MS1 respondió:", {
                url: authUrl.origin,
                status: upstream.status,
            });
            return jsonError("Error del servicio de verificación de MS1.", 503);
        }

        const result = await upstream.json().catch(() => null);

        if (result?.success !== true) {
            console.error("[SESSION] Respuesta inesperada de MS1:", {
                status: upstream.status,
                success: result?.success,
            });
            return jsonError("Respuesta de verificación inválida.", 502);
        }

    } catch (error) {
        console.error("[SESSION] No se pudo conectar a MS1:", {
            url: MS1_URL,
            cause: error instanceof Error ? error.message : String(error),
        });

        return jsonError("No se pudo verificar la sesión con MS1.", 503);
    }


    const isHttps = url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
    const maxAge = Math.max(0, Math.floor(session.exp - Date.now() / 1000));

    cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: "lax",
        path: "/",
        maxAge: Math.min(86400, maxAge),
    });

    const redirectTo = session.role === "B2B" ? "/panel" : session.role === "DRIVER" ? "/mis-envios" : "/";

    return new Response(
        JSON.stringify({
            success: true,
            data: {
                redirectTo,
                role: session.role,
                sub: session.sub,
            },
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
        }
    );
};

export const DELETE: APIRoute = async ({ cookies, request }) => {
    const blocked = protectMutation(request);
    if (blocked) return blocked;
    cookies.delete(COOKIE_NAME, { path: "/" });
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
};
