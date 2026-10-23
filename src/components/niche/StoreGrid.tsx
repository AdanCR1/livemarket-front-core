import { useState, useEffect } from "react";
import { StoreCard } from "./StoreCard";
import { FilterBar } from "./FilterBar";
import { SkeletonLoader } from "../ui/SkeletonLoader";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { StoreService } from "../../lib/types/services";
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
  const [filteredStores, setFilteredStores] = useState<B2BStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<number | null>(null);

  useEffect(() => {
    loadStores();
  }, [nicheSlug]);

  async function loadStores() {
    setLoading(true);
    setError(null);
    const result = await StoreService.getStoresByNiche(nicheSlug);
    if (result.error) {
      setError(result.error);
    } else {
      const data = result.data ?? [];
      setStores(data);
      setFilteredStores(data);
    }
    setLoading(false);
  }

  function handleFilter(deptId: number | null, cityId: number | null) {
    setSelectedDept(deptId);
    setSelectedCity(cityId);

    let filtered = stores;
    if (cityId) {
      filtered = stores.filter((s) => s.city_id === cityId);
    } else if (deptId) {
      filtered = stores.filter((s) => s.department_id === deptId);
    }
    setFilteredStores(filtered);
  }

  if (loading) {
    return <SkeletonLoader variant="grid" count={6} message="Cargando tiendas del mercado..." />;
  }

  if (error) {
    return (
      <SkeletonLoader
        variant="grid"
        count={6}
        isError
        message={`No pudimos conectar con el servicio de tiendas. Error: ${error}`}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar de filtros */}
        <aside className="w-full lg:w-72 shrink-0">
          <FilterBar
            onFilter={handleFilter}
            selectedDept={selectedDept}
            selectedCity={selectedCity}
          />
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
                No se encontraron tiendas con estos filtros. Intenta con otros criterios.
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
