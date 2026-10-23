# MARKETCLOUD Front Core

Frontend de MARKETCLOUD, una plataforma multi-nicho para descubrir tiendas,
productos y transmisiones en vivo. Usa Astro para las páginas y el renderizado
server-side, y React para las islas interactivas.

## Requisitos

- Node.js `>=22.12.0`
- pnpm
- MS1 para autenticación, perfiles, tiendas y ubicaciones
- MS2 para inventario y productos de sesiones live
- MS3 para carga y servicio de archivos multimedia
- MS4 para gestión de pedidos

## Comandos

| Comando | Función |
| --- | --- |
| `pnpm install` | Instala las dependencias. |
| `pnpm dev` | Inicia Astro en `localhost:4321`. |
| `pnpm dev:cf` | Compila y sirve con el runtime local de Cloudflare Pages. |
| `pnpm build` | Genera la aplicación en `dist/`. |
| `pnpm preview` | Sirve `dist/` con Wrangler. |
| `pnpm deploy` | Compila y despliega en Cloudflare Pages. |
| `pnpm astro` | Ejecuta comandos de la CLI de Astro. |

## Mapa de la estructura

Cada entrada incluye un comentario breve sobre la función del archivo.

```text
/
├── AGENTS.md                         # Instrucciones de desarrollo para agentes.
├── CLAUDE.md                         # Instrucciones para asistentes de desarrollo.
├── astro.config.mjs                  # Configura Astro SSR, React, Tailwind y Cloudflare.
├── dbs.sql                           # Esquema SQL de referencia.
├── package.json                      # Metadatos, dependencias y scripts.
├── pnpm-lock.yaml                    # Versiones exactas resueltas por pnpm.
├── pnpm-workspace.yaml               # Configuración del workspace de pnpm.
├── tsconfig.json                     # TypeScript estricto y JSX para React.
├── wrangler.jsonc                    # Configuración de Cloudflare Pages y salida.
├── public/                           # Archivos estáticos servidos sin procesamiento.
│   ├── favicon.svg                   # Favicon vectorial.
│   ├── favicon.ico                   # Favicon alternativo.
│   ├── logo.webp                     # Logo principal.
│   ├── img/
│   │   ├── bg-gastronomia.webp       # Fondo del panel de Gastronomía.
│   │   ├── login-img.avif            # Imagen de la pantalla de autenticación.
│   │   ├── nichos-gastro.avif        # Imagen del nicho Gastronomía.
│   │   ├── nichos-jugueteria.avif    # Imagen del nicho Juguetería.
│   │   ├── nichos-moda.avif          # Imagen del nicho Moda.
│   │   ├── nichos-otros.avif         # Imagen del nicho Otros.
│   │   └── nichos-tech.avif          # Imagen del nicho Tecnología.
│   └── video/
│       └── video-hero.mp4            # Video principal de la landing.
├── src/
│   ├── middleware.ts                 # Expone token y sesión desde la cookie.
│   ├── assets/astro.svg              # Asset SVG heredado de Astro.
│   ├── assets/background.svg         # Fondo SVG del frontend.
│   ├── components/Navbar.astro       # Navbar, nichos y mega menús.
│   ├── components/landing/NicheCard.astro # Tarjeta de nicho activo o próximo.
│   ├── components/auth/
│   │   ├── establishSession.ts        # Guarda sesión y decide redirección.
│   │   ├── LoginForm.tsx              # Formulario React de inicio de sesión.
│   │   ├── RegisterB2BForm.tsx        # Registro React de tiendas.
│   │   └── RegisterB2CForm.tsx        # Registro React de compradores.
│   ├── components/niche/
│   │   ├── FilterBar.tsx              # Filtros de departamentos y ciudades.
│   │   ├── NicheIconRender.tsx        # Renderiza iconos según el nicho.
│   │   ├── StoreCard.tsx              # Tarjeta visual de una tienda B2B.
│   │   └── StoreGrid.tsx              # Carga, filtra y muestra tiendas.
│   ├── components/panel/
│   │   ├── LiveManager.tsx            # Gestión de productos destacados en live.
│   │   ├── OrderManager.tsx           # Consulta y actualización de pedidos.
│   │   ├── PanelOverview.tsx          # Resumen del panel de negocio.
│   │   ├── PanelShell.tsx             # Estructura y navegación del panel B2B.
│   │   ├── ProductForm.tsx            # Formulario de productos y media.
│   │   ├── ProductList.tsx            # Lista y acciones del inventario.
│   │   └── ThemeProvider.tsx          # Tema visual del panel.
│   ├── components/store/StoreCatalog.tsx # Catálogo y productos live.
│   ├── components/ui/
│   │   ├── ErrorBoundary.tsx          # Captura errores de islas React.
│   │   ├── FallbackImage.tsx          # Fallback visual de imágenes.
│   │   ├── LiveBadge.tsx              # Indicador animado de transmisión live.
│   │   └── SkeletonLoader.tsx         # Estados de carga y error.
│   ├── layouts/Layout.astro          # Layout base, SEO, fuentes y estilos.
│   ├── lib/
│   │   ├── constants.ts              # URLs, identidad y URLs de media.
│   │   ├── mock-data.ts              # Datos geográficos de respaldo en desarrollo.
│   │   ├── niches.ts                 # Configuración, temas e iconos de nichos.
│   │   ├── panel-themes.ts           # Temas visuales del panel por nicho.
│   │   ├── schemas.ts                # Esquemas de validación.
│   │   ├── auth/decode.ts            # Decodificación del payload JWT para UI.
│   │   └── types/
│   │       ├── services.ts           # Fetch seguro y servicios de MS1–MS4.
│   │       └── types.ts              # Tipos del dominio y autenticación.
│   ├── pages/index.astro             # Landing, búsqueda y presentación de nichos.
│   ├── pages/login.astro             # Página de inicio de sesión.
│   ├── pages/panel.astro             # Panel de gestión para negocios B2B.
│   ├── pages/tets.astro              # Página de prueba temporal.
│   ├── pages/[niche]/index.astro     # Exploración de tiendas por nicho.
│   ├── pages/[niche]/[store_id].astro # Detalle SSR y catálogo de tienda.
│   ├── pages/api/
│   │   ├── checkout.ts               # Validación de stock y creación de pedidos.
│   │   └── session.ts                # Alta y baja de cookie de sesión.
│   ├── pages/registro/index.astro    # Página de registro B2C.
│   ├── pages/registro/negocio.astro  # Página de registro B2B.
│   └── styles/
│       ├── global.css                # Tokens Tailwind, temas y animaciones.
│       └── panel.css                 # Estilos del panel de negocio.
└── README.md                          # Documentación general del frontend.
```

## Flujo principal

1. Astro renderiza las páginas y el `Layout`; `StoreGrid` y `StoreCatalog` se
	hidratan como islas React con `client:load`.
2. `services.ts` consume MS1–MS4 con timeout y devuelve `{ data, error }`.
	MS3 gestiona la carga de media; el checkout valida el inventario en MS2 y
	registra pedidos en MS4. En desarrollo, departamentos y ciudades tienen
	fallback a `mock-data.ts`.
3. El login obtiene el token de MS1 y `establishSession.ts` lo envía a
	`/api/session`, que lo guarda como cookie `httpOnly`.
4. `middleware.ts` lee la cookie y deja la sesión disponible en
	`Astro.locals`. `decode.ts` solo sirve para UI; la autorización real debe
	validarse en los microservicios.

## Dependencias y dónde se aplican

| Dependencia | Aplicación |
| --- | --- |
| `astro` | Páginas, SSR, rutas dinámicas, layouts, middleware y API routes. |
| `@astrojs/cloudflare` | Adapter de producción configurado en `astro.config.mjs`. |
| `@astrojs/react` | Integración de componentes React e islas `client:load`. |
| `react` / `react-dom` | Formularios, filtros, catálogos y componentes UI. |
| `tailwindcss` | Clases utilitarias y estilos del frontend. |
| `@tailwindcss/vite` | Plugin de Tailwind v4 para Vite. |
| `react-icons` | Iconos en navbar, landing, autenticación y nichos. |
| `wrangler` | Desarrollo local, preview y deploy de Cloudflare Pages. |
| `@types/react` / `@types/react-dom` | Tipos TypeScript de React y React DOM. |

## Variables de entorno

Se leen en `src/lib/constants.ts`:

| Variable | Uso | Valor por defecto |
| --- | --- | --- |
| `PUBLIC_MS1_URL` | Autenticación, perfiles, tiendas y ubicaciones. | `http://localhost:8787` |
| `PUBLIC_MS2_URL` | Inventario y sesiones live. | `http://localhost:8788` |
| `PUBLIC_MS3_URL` | Carga y servicio de archivos multimedia. | `http://localhost:8789` |
| `PUBLIC_MS4_URL` | Gestión de pedidos. | `http://localhost:8790` |
| `PUBLIC_R2_DOMAIN` | Dominio público de logos y media. | `http://localhost:8789/media` |

## Despliegue

La aplicación usa `output: "server"` y el adapter de Cloudflare. Wrangler
publica `dist/` según `wrangler.jsonc`.

```sh
pnpm build
pnpm deploy
```

Para probar el runtime de Pages localmente:

```sh
pnpm dev:cf
```
