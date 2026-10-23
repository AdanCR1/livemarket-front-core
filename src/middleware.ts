import { defineMiddleware } from "astro:middleware";
import { decodeSession } from "./lib/auth/decode";

// Requiere output: 'server' o 'hybrid'.
// Deja la sesión disponible en cualquier .astro vía Astro.locals.session,
// sin que cada página tenga que leer y decodificar la cookie a mano.
export const onRequest = defineMiddleware((context, next) => {
    const token = context.cookies.get("mc_session")?.value ?? null;

    context.locals.token = token;
    context.locals.session = token ? decodeSession(token) : null;

    return next();
});