import { AuthService } from "../../lib/types/services";
import type { LoginPayload } from "../../lib/types/types";

export async function establishSession(
    credentials: LoginPayload
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
    try {
        const { data, error } = await AuthService.login(credentials);
        if (!data?.access_token) return { ok: false, error: error ?? "Credenciales incorrectas." };

        const response = await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: data.access_token }),
            signal: AbortSignal.timeout(12000),
        });

        const result = await response.json().catch(() => null);

        if (response.ok && result?.success === true) {
            const destination = result.data?.redirectTo || (data.role === "B2B" ? "/panel" : "/");
            return { ok: true, redirectTo: destination };
        }

        return {
            ok: false,
            error: typeof result?.error === "string" ? result.error : "No se pudo establecer la sesión.",
        };
    } catch {
        return { ok: false, error: "Error de red al establecer sesión." };
    }
}