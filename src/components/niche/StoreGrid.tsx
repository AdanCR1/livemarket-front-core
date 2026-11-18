import { useState, useEffect } from "react";
import { StoreCard } from "./StoreCard";

import { SkeletonLoader } from "../ui/SkeletonLoader";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { StoreService, SUCRE_CITY_ID, normalizeSearch } from "../../lib/types/services";
import type { B2BStore } from "../../lib/types/types";
import { FiSearch } from "react-icons/fi";

interface StoreGridProps {
  /** Slug del nicho (ej: "gastronomia") */
  nicheSlug: string;
}

/**
 * Isla React que compone FilterBar + grilla de StoreCards.
 * Maneja el estado compartido de filtros y la lista de tiendas.
 * Se monta como `client:load` en la página de nicho.
 */
export function StoreGrid({ nicheSlug }: StoreGridProps) {
  const [stores, setStores] = useState<B2BStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zone, setZone] = useState("");
  const [liveOnly, setLiveOnly] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setZone(params.get("zona") ?? "");
    setLiveOnly(params.get("vivo") === "1");
    let active = true;
    let reading = false;
    async function refresh() {
      if (reading || document.hidden) return;
      reading = true;
      const result = await StoreService.getStoresByNiche(nicheSlug);
      reading = false;
      if (!active) return;
      setStores((result.data ?? []).filter(store => store.business_model === nicheSlug && store.city_id === SUCRE_CITY_ID));
      setError(Boolean(result.error));
      setLoading(false);
    }
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [nicheSlug]);
  function changeFilters(address: string, live: boolean) {
    setZone(address);
    setLiveOnly(live);
    const url = new URL(window.location.href);
    if (address) url.searchParams.set("zona", address); else url.searchParams.delete("zona");
    if (live) url.searchParams.set("vivo", "1"); else url.searchParams.delete("vivo");
    window.history.replaceState(window.history.state, "", url);
  }
  const filteredStores = stores.filter(store =>
    normalizeSearch(store.local_address ?? "").includes(normalizeSearch(zone)) &&
    (!liveOnly || store.is_live === true));
  if (loading) {
    return <SkeletonLoader variant="grid" count={6} message="Cargando tiendas del mercado..." />;
  }

  if (error) {
    return <p role="alert">No pudimos consultar las tiendas. <button type="button" className="underline" onClick={() => window.location.reload()}>Reintentar</button></p>;
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar de filtros */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="space-y-4 rounded-xl border border-market-border p-4">
            <label className="block text-sm">Buscar por dirección o zona
              <input type="search" value={zone} maxLength={120} onChange={event => changeFilters(event.target.value, liveOnly)}
                className="mt-2 w-full rounded-lg border border-market-border bg-market-card p-3" />
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={liveOnly}
              onChange={event => changeFilters(zone, event.target.checked)} /> En vivo ahora</label>
            <button type="button" className="text-sm underline" onClick={() => changeFilters("", false)}>Limpiar filtros</button>
          </div>
        </aside>

        {/* Grilla de tiendas */}
        <main className="flex-1">
          {/* Contador de resultados */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-market-muted">
              <span className="text-market-white font-semibold">{filteredStores.length}</span>
              {" "}tienda{filteredStores.length !== 1 ? "s" : ""} encontrada{filteredStores.length !== 1 ? "s" : ""}
            </p>
            {/* Indicador de tiendas en vivo */}
            {filteredStores.some((s) => s.is_live) && (
              <span className="text-xs text-live-red font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-live-red animate-pulse-live" />
                {filteredStores.filter((s) => s.is_live).length} en vivo
              </span>
            )}
          </div>

          {filteredStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <FiSearch className="w-12 h-12 text-market-muted mb-4" />
              <h3 className="text-lg font-semibold text-market-white mb-2">
                Sin resultados
              </h3>
              <p className="text-market-muted text-sm text-center max-w-sm">
                {liveOnly ? "No hay tiendas en vivo con estos filtros." : "No se encontraron tiendas con estos filtros."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {/* Tiendas en vivo primero */}
              {filteredStores
                .sort((a, b) => (b.is_live ? 1 : 0) - (a.is_live ? 1 : 0))
                .map((store) => (
                  <StoreCard
                    key={store.profile_id}
                    store={store}
                    nicheSlug={nicheSlug}
                  />
                ))}
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
