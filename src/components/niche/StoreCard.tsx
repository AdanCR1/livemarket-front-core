import { FallbackImage } from "../ui/FallbackImage";
import { LiveBadge } from "../ui/LiveBadge";
import { buildMediaUrl } from "../../lib/constants";
import type { B2BStore } from "../../lib/types/types";

interface StoreCardProps {
  store: B2BStore;
  nicheSlug: string;
}

export function StoreCard({ store, nicheSlug }: StoreCardProps) {
  const logoUrl = buildMediaUrl(store.logo_url);

  return (
    <a
      href={`/${nicheSlug}/${store.profile_id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl no-underline animate-scale-in backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in srgb, var(--theme-surface-alt) 75%, transparent)",
        borderColor: "color-mix(in srgb, var(--theme-primary) 20%, transparent)",
      }}
    >
      {/* Logo / Portada */}
      <div className="relative h-44 overflow-hidden bg-black/40">
        <FallbackImage
          src={logoUrl}
          alt={`Logo de ${store.store_name}`}
          fallbackName={store.store_name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Sombra gradual inferior */}
        <div 
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent"
          style={{ backgroundImage: `linear-gradient(to top, var(--theme-surface-alt), transparent)` }}
        />

        {store.is_live && (
          <div className="absolute top-3 right-3">
            <LiveBadge />
          </div>
        )}
      </div>

      {/* Información */}
      <div className="flex-1 p-5 space-y-2">
        <h3 className="text-base font-bold text-white group-hover:text-theme-primary transition-colors line-clamp-1">
          {store.store_name}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-theme-text-muted">
          <svg className="w-3.5 h-3.5 shrink-0 opacity-70 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">
            {store.city_name || "Ciudad"}{store.department_name ? `, ${store.department_name}` : ""}
          </span>
        </div>

        {store.local_address && (
          <p className="text-xs text-theme-text-muted/60 truncate">
            {store.local_address}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-theme-primary font-medium inline-flex items-center gap-1.5">
            {store.is_live ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Transmitiendo ahora
              </>
            ) : (
              "Ver catálogo"
            )}
          </span>
          <svg className="w-4 h-4 text-theme-text-muted group-hover:text-theme-primary group-hover:translate-x-1 transition-all"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </a>
  );
}