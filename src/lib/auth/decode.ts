/** Payload del JWT enriquecido que firma MS1 */
export interface DecodedSession {
    sub: string;
    store_id: string;
    role: "B2B" | "B2C" | "DRIVER";
    business_model?: string;
    iss: string;
    iat: number;
    exp: number;
    email?: string;
    name?: string;
}

export function decodeSession(token: string): DecodedSession | null {
    try {
        if (!token || typeof token !== "string") return null;
        const parts = token.split(".");
        if (parts.length < 2) return null;

        let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        // Asegurar padding de 4 caracteres para atob
        while (base64.length % 4 !== 0) {
            base64 += "=";
        }

        const json = atob(base64);
        const parsed = JSON.parse(json) as DecodedSession;

        if (!Number.isFinite(parsed.exp) || parsed.exp * 1000 <= Date.now()) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}