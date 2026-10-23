import { useState, useEffect } from "react";
import { StoreService } from "../../lib/types/services";
import type { Department, City } from "../../lib/types/types";

interface FilterBarProps {
  onFilter: (deptId: number | null, cityId: number | null) => void;
  selectedDept: number | null;
  selectedCity: number | null;
}

export function FilterBar({ onFilter, selectedDept, selectedCity }: FilterBarProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDepartments() {
      const result = await StoreService.getDepartments();
      if (result.data) setDepartments(result.data);
      setLoading(false);
    }
    loadDepartments();
  }, []);

  useEffect(() => {
    if (!selectedDept) {
      setCities([]);
      return;
    }
    async function loadCities() {
      const result = await StoreService.getCitiesByDepartment(selectedDept!);
      if (result.data) setCities(result.data);
    }
    loadCities();
  }, [selectedDept]);

  function handleDeptChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value ? Number(e.target.value) : null;
    onFilter(value, null);
  }

  function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value ? Number(e.target.value) : null;
    onFilter(selectedDept, value);
  }

  return (
    <div
      className="rounded-2xl border p-5 space-y-5 sticky top-20 backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in srgb, var(--theme-surface-alt) 80%, transparent)",
        borderColor: "color-mix(in srgb, var(--theme-primary) 22%, transparent)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros
        </h3>
        {(selectedDept || selectedCity) && (
          <button
            onClick={() => onFilter(null, null)}
            className="text-xs text-theme-primary hover:underline font-medium cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="filter-dept" className="block text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
          Departamento
        </label>
        <select
          id="filter-dept"
          value={selectedDept ?? ""}
          onChange={handleDeptChange}
          disabled={loading}
          className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-theme-primary cursor-pointer disabled:opacity-50"
        >
          <option value="" className="bg-[#140b06] text-white">Todos los departamentos</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id} className="bg-[#140b06] text-white">
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="filter-city" className="block text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
          Ciudad
        </label>
        <select
          id="filter-city"
          value={selectedCity ?? ""}
          onChange={handleCityChange}
          disabled={!selectedDept || cities.length === 0}
          className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-theme-primary cursor-pointer disabled:opacity-50"
        >
          <option value="" className="bg-[#140b06] text-white">
            {!selectedDept ? "Selecciona departamento" : "Todas las ciudades"}
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id} className="bg-[#140b06] text-white">
              {city.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}