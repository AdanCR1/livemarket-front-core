import type { AuthSession } from "../../lib/types";

/**
 * Guarda el access_token como cookie httpOnly (vía /api/session) y
 * devuelve a dónde redirigir según el rol. La usan LoginForm y, tras un
 * auto-login, los dos formularios de registro — mismo flujo, un solo lugar.
 */
export async function establishSession(
    session: AuthSession
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
    const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.access_token }),
    });

    if (!res.ok) {
        return {
            ok: false,
            error: "Se validaron tus credenciales pero no se pudo guardar la sesión. Reintentá.",
        };
    }

    return { ok: true, redirectTo: session.role === "B2B" ? "/panel" : "/" };
}