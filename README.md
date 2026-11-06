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
- MS5 para chat (opcional, requiere habilitación explícita)
- MS6 para perfiles bancarios, suscripciones y pagos QR

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
│   ├── middleware.ts                 # Expone token y sesión en Astro.locals.
│   ├── cloudflare-runtime.d.ts       # Tipos del runtime de Cloudflare.
│   ├── env.d.ts                      # Tipos del entorno de Astro.
│   ├── assets/
│   │   ├── astro.svg                 # Asset SVG heredado de Astro.
│   │   └── background.svg            # Fondo SVG del frontend.
│   ├── components/
│   │   ├── Navbar.astro              # Navbar, nichos y mega menús.
│   │   ├── account/AccountSettings.tsx # Edición y ajustes de la cuenta.
│   │   ├── auth/
│   │   │   ├── establishSession.ts   # Establece sesión y decide redirección.
│   │   │   ├── LoginForm.tsx         # Inicio de sesión.
│   │   │   ├── RegisterB2BForm.tsx   # Registro de tiendas.
│   │   │   └── RegisterB2CForm.tsx   # Registro de compradores.
│   │   ├── delivery/AssignedDeliveries.tsx # Consulta de asignaciones de reparto.
│   │   ├── landing/NicheCard.astro   # Tarjeta de nicho activo o próximo.
│   │   ├── nav/AccountNavLink.astro  # Enlace de navegación de cuenta.
│   │   ├── niche/
│   │   │   ├── FilterBar.tsx         # Filtros de departamentos y ciudades.
│   │   │   ├── NicheIconRender.tsx   # Iconos según el nicho.
│   │   │   ├── StoreCard.tsx         # Tarjeta visual de una tienda B2B.
│   │   │   └── StoreGrid.tsx         # Carga, filtra y muestra tiendas.
│   │   ├── panel/
│   │   │   ├── DriverManager.tsx     # Gestión de repartidores.
│   │   │   ├── LiveManager.tsx       # Gestión de productos destacados en live.
│   │   │   ├── OrderManager.tsx      # Consulta y actualización de pedidos.
│   │   │   ├── PanelOverview.tsx     # Resumen del panel de negocio.
│   │   │   ├── PanelShell.tsx        # Estructura y navegación B2B.
│   │   │   ├── ProductForm.tsx       # Formulario de productos y media.
│   │   │   ├── ProductList.tsx       # Lista y acciones del inventario.
│   │   │   └── ThemeProvider.tsx     # Tema visual del panel.
│   │   ├── plans/
│   │   │   ├── PlansCheckout.tsx     # Consulta de plan y pago PRO por QR.
│   │   │   └── ProfileIdentity.tsx   # Identidad y perfil asociado a planes.
│   │   ├── store/
│   │   │   ├── MyOrders.tsx          # Historial y seguimiento de pedidos.
│   │   │   ├── OrderChat.tsx         # Chat, avisos y disputas del pedido.
│   │   │   ├── PaymentQR.tsx         # Visualización del QR de pago.
│   │   │   └── StoreCatalog.tsx      # Catálogo y productos live.
│   │   └── ui/
│   │       ├── ErrorBoundary.tsx     # Captura errores de islas React.
│   │       ├── FallbackImage.tsx     # Fallback visual de imágenes.
│   │       ├── LiveBadge.tsx         # Indicador de transmisión live.
│   │       └── SkeletonLoader.tsx    # Estados de carga y error.
│   ├── layouts/Layout.astro          # Layout base, SEO, fuentes y estilos.
│   ├── lib/
│   │   ├── auth/decode.ts            # Decodificación del payload JWT para UI.
│   │   ├── commerce/client.ts        # Cliente de pedidos y errores de comercio.
│   │   ├── constants.ts              # URLs, identidad y URLs de media.
│   │   ├── mock-data.ts              # Datos geográficos de respaldo.
│   │   ├── niches.ts                 # Configuración, temas e iconos de nichos.
│   │   ├── panel-themes.ts           # Temas visuales del panel por nicho.
│   │   ├── schemas.ts                # Esquemas JSON y campos dinámicos por nicho.
│   │   ├── server/
│   │   │   ├── commerce-proxy.ts     # Proxy autenticado y validadores de comercio.
│   │   │   ├── plan-settings.ts      # Habilitación de checkout y contacto enterprise.
│   │   │   ├── profile-api.ts        # Proxy de perfil, sesión y protección de mutaciones.
│   │   │   ├── service-config.ts     # Resolución y validación de URLs de servicios.
│   │   │   └── service-url.ts        # URLs de MS1–MS4 y MS6 para runtime/build.
│   │   └── types/
│   │       ├── commerce.ts           # Contratos de pedidos, QR y respuestas.
│   │       ├── services.ts           # Fetch seguro y servicios de microservicios.
│   │       └── types.ts              # Tipos del dominio y autenticación.
│   ├── pages/
│   │   ├── index.astro               # Landing, búsqueda y presentación de nichos.
│   │   ├── login.astro               # Página de inicio de sesión.
│   │   ├── mis-envios.astro          # Vista de asignaciones del repartidor.
│   │   ├── mis-pedidos.astro         # Historial y seguimiento de compras.
│   │   ├── panel.astro               # Panel de gestión para negocios B2B.
│   │   ├── perfil.astro              # Perfil y configuración de cuenta.
│   │   ├── planes.astro              # Planes y checkout para negocios.
│   │   ├── tets.astro                # Página de prueba temporal.
│   │   ├── [niche]/
│   │   │   ├── index.astro           # Exploración de tiendas por nicho.
│   │   │   └── [store_id].astro      # Detalle SSR y catálogo de tienda.
│   │   ├── api/
│   │   │   ├── checkout.ts           # Validación y creación de pedidos PICKUP.
│   │   │   ├── chat/[...path].ts     # Proxy de rutas permitidas de MS5.
│   │   │   ├── deliveries/assigned.ts # Asignaciones del repartidor desde MS4.
│   │   │   ├── orders/
│   │   │   │   ├── index.ts          # Lista de compras o ventas del actor.
│   │   │   │   ├── [id].ts           # Consulta de pedido.
│   │   │   │   └── [id]/
│   │   │   │       └── status.ts     # Actualización permitida del estado B2B.
│   │   │   ├── panel/[...operation].ts # Proxy B2B con operaciones permitidas.
│   │   │   ├── payments/qr.ts        # Solicitud de QR para pagar pedidos.
│   │   │   ├── plans/
│   │   │   │   ├── index.ts          # Consulta de suscripción B2B.
│   │   │   │   ├── payment/[id].ts   # Consulta de pago de suscripción.
│   │   │   │   └── qr.ts             # Solicitud y validación del QR PRO.
│   │   │   ├── profile/
│   │   │   │   ├── me.ts             # Identidad de cuenta y sesión.
│   │   │   │   ├── name.ts           # Lectura y cambio de nombre.
│   │   │   │   ├── receiving-qr.ts   # Consulta y actualización de QR receptor.
│   │   │   │   ├── upload-payout-qr.ts # Carga protegida de QR mediante MS3.
│   │   │   │   └── verify-password.ts # Reautenticación de la cuenta en MS1.
│   │   │   ├── session.ts            # Verifica sesión y gestiona cookie httpOnly.
│   │   │   └── stores/[id].ts        # Consulta disponibilidad de venta de tienda.
│   │   └── registro/
│   │       ├── index.astro           # Página de registro B2C.
│   │       └── negocio.astro         # Página de registro B2B.
│   └── styles/
│       ├── global.css                # Tokens Tailwind, temas y animaciones.
│       └── panel.css                 # Estilos del panel de negocio.
└── README.md                          # Documentación general del frontend.
```

## Flujo principal

1. Astro renderiza las páginas y el `Layout`; `StoreGrid` y `StoreCatalog` se
	hidratan como islas React con `client:load`.
2. `lib/types/services.ts` consume MS1–MS4 con timeout y devuelve
	`{ data, error }`; `lib/commerce/client.ts` consume las rutas BFF de pedidos
	y pagos. MS3 gestiona la carga de media. El checkout valida la solicitud y
	envía el pedido a MS4, que coordina la validación de inventario en MS2. MS6
	gestiona perfiles bancarios, suscripciones y QR. En desarrollo, departamentos
	y ciudades tienen fallback a `mock-data.ts`.
3. El login obtiene el token de MS1 y `establishSession.ts` lo envía a
	`/api/session`, que lo guarda como cookie `httpOnly`.
4. `middleware.ts` lee la cookie y deja la sesión disponible en
	`Astro.locals`. `decode.ts` solo sirve para UI; la autorización real debe
	validarse en los microservicios.
5. El chat de pedidos usa MS5 detrás de `/api/chat`; requiere configuración y
	habilitación tanto del proxy como de la interfaz.

## Algoritmos y reglas de negocio en `src/`

- **Creación de pedidos (`api/checkout.ts`):** solo admite sesión B2B/B2C y
  modalidad `PICKUP`; rechaza `DELIVERY`. Valida UUID de tienda/producto y
  variante, entre 1 y 30 artículos, cantidad entera de 1 a 100 por artículo,
  fecha límite de recogida entre 1 y 7 días, y `Idempotency-Key` de 8 a 128
  caracteres alfanuméricos, `_` o `-`. Normaliza los campos enviados y limita
  las notas a 500 caracteres. El frontend no determina el precio ni el stock:
  MS2/MS4 son la autoridad durante el procesamiento del pedido. Si hay timeout,
  se indica consultar pedidos antes de reintentar porque el resultado puede ser
  incierto; se conserva la clave idempotente para evitar duplicados.
- **Lectura y estado de pedidos (`api/orders/`):** al solicitar `scope=sales`
  o `scope=purchases`, el servidor filtra ventas por `store_id` de la sesión
  B2B y compras por `customer_id` del actor, respectivamente.
  La actualización desde el panel solo acepta `PREPARING` o `READY`; la
  autorización y transición final corresponden a MS4.
- **Pagos QR y planes (`api/payments/qr.ts`, `api/plans/qr.ts`):** el QR de un
  pedido se genera por referencia e idempotency key, sin aceptar importe ni
  tienda destino desde el navegador. El checkout PRO requiere la bandera
  `PRO_CHECKOUT_VERIFIED=true`, una sesión B2B y una tienda identificada;
  únicamente acepta `plan: PRO`, rechaza campos adicionales y valida que MS6
  devuelva el propósito esperado, importe de 59 BOB, moneda BOB, identificadores
  y fecha de expiración futura. Una respuesta incompatible se trata como error,
  no como pago exitoso.
- **Resolución de microservicios (`lib/server/service-config.ts`):** selecciona
  primero los bindings del Worker (`MSx_URL` o `PUBLIC_MSx_URL`) y luego la URL
  incorporada al build. Rechaza credenciales, query, fragmento, rutas o HTTP
  fuera de localhost; también impide dirigir un entorno no local a localhost.
  Las llamadas server-side usan esta resolución antes de proxyar solicitudes a
  MS1–MS4 o MS6.
- **Proxies BFF:** las rutas del panel y comercio requieren sesión/rol, limitan
  las operaciones a patrones permitidos, validan mutaciones por origen y no
  almacenan respuestas en caché. Los errores de configuración, formato,
  redirección o timeout se exponen como errores HTTP explícitos.
- **Chat de pedidos (`api/chat/[...path].ts`, `OrderChat.tsx`):** solo reenvía
  rutas y métodos permitidos para conversaciones, mensajes, eventos, avisos y
  disputas. El cliente actualiza el historial al recibir eventos, pagina
  mensajes con cursor, deduplica por ID al combinar páginas y conserva el
  `client_message_id` si un envío falla para permitir un reintento idempotente.
- **Sesión y perfil (`api/session.ts`, `lib/server/profile-api.ts`):** valida
  el token localmente y también lo verifica con MS1 antes de emitir la cookie
  `httpOnly`; limita la duración de cookie al vencimiento del token y a un día.
  Las mutaciones rechazan orígenes cruzados y las operaciones sensibles de
  perfil requieren sesión, validación de entrada y respuesta sin caché.

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

Las URLs base se definen en `src/lib/constants.ts`; las banderas del servidor
y del chat se leen en sus módulos de configuración y rutas:

| Variable | Uso | Valor por defecto |
| --- | --- | --- |
| `PUBLIC_MS1_URL` | Autenticación, perfiles, tiendas y ubicaciones. | `http://localhost:8787` |
| `PUBLIC_MS2_URL` | Inventario y sesiones live. | `http://localhost:8788` |
| `PUBLIC_MS3_URL` | Carga y servicio de archivos multimedia. | `http://localhost:8789` |
| `PUBLIC_MS4_URL` | Gestión de pedidos. | `http://localhost:8790` |
| `PUBLIC_MS6_URL` | Perfiles bancarios, suscripciones y generación de QR. | Configurar como binding o URL de build para el proxy server-side. |
| `PUBLIC_R2_DOMAIN` | Dominio público de logos y media. | `http://localhost:8789/media` |
| `MS5_URL` | Servicio de mensajería detrás del proxy de chat. | Sin valor por defecto. |
| `MS5_CHAT_ENABLED` | Habilita las rutas proxy del chat cuando vale `true`. | Deshabilitado. |
| `PUBLIC_MS5_CHAT_ENABLED` | Muestra la interfaz de chat cuando vale `true`. | Deshabilitado. |
| `PRO_CHECKOUT_VERIFIED` | Habilita checkout PRO cuando vale `true`. | Deshabilitado. |
| `ENTERPRISE_CONTACT_EMAIL` | Email de contacto empresarial validado por formato. | Sin valor por defecto. |
