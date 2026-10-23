/** Payload del JWT enriquecido que firma MS1 (ver livemarket-ms-auth/routes/auth.ts) */
export interface DecodedSession {
    sub: string;
    store_id: string;
    role: "B2B" | "B2C";
    business_model?: string;
    iss: string;
    iat: number;
    exp: number;
}

/**
 * Decodifica el payload del JWT SIN verificar la firma.
 * Sirve solo para UI (mostrar rol, saludar por nombre, redirigir).
 * La verificación real de la firma —la que importa para seguridad—
 * la hace MS2 con el mismo JWT_SECRET. Nunca uses esto para decidir
 * si algo se muestra u oculta por razones de autorización real.
 */
export function decodeSession(token: string): DecodedSession | null {
    try {
        const payload = token.split(".")[1];
        const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        const parsed = JSON.parse(json) as DecodedSession;

        if (parsed.exp * 1000 < Date.now()) return null; // expirado

        return parsed;
    } catch {
        return null;
    }
}