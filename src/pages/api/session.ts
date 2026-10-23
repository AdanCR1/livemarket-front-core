import type { APIRoute } from "astro";

// Server endpoint — requiere output: 'server' o 'hybrid' en astro.config.mjs.
export const prerender = false;

const COOKIE_NAME = "mc_session";

/**
 * Recibe el access_token que ya devolvió MS1 (obtenido client-side vía
 * AuthService.login) y lo guarda como cookie httpOnly. El front nunca
 * vuelve a tocar el token en JS después de esto — cualquier llamada
 * autenticada a MS2 se resuelve server-side leyendo esta cookie.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const body = await request.json().catch(() => null);
    const token = body?.token;

    if (!token || typeof token !== "string") {
        return new Response(JSON.stringify({ success: false, error: "Token faltante." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24h — igual a la expiración que firma MS1
    });

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};

/** Logout: borra la cookie de sesión. */
export const DELETE: APIRoute = async ({ cookies }) => {
    cookies.delete(COOKIE_NAME, { path: "/" });
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};