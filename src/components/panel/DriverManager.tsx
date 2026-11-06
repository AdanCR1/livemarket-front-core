import { useState, useEffect } from "react";
import { FiUsers, FiPlus, FiPhone, FiCheck, FiX, FiRefreshCw, FiTruck } from "react-icons/fi";

interface Driver {
  id: string;
  driver_user_id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  is_active: boolean;
  created_at: string;
}

export function DriverManager() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario de nuevo repartidor
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleType, setVehicleType] = useState<"MOTORCYCLE" | "BICYCLE" | "CAR">("MOTORCYCLE");

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/panel/drivers`);
      const json = await res.json();
      if (json.success) {
        setDrivers(json.data ?? []);
      } else {
        setError(json.error || "No se pudo cargar la flota.");
      }
    } catch {
      setError("Error de conexión al cargar repartidores.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDriver(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/panel/drivers/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          email,
          password,
          vehicle_type: vehicleType,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setFullName("");
        setPhone("");
        setEmail("");
        setPassword("");
        loadDrivers();
      } else {
        setError(json.error || "No se pudo registrar el repartidor.");
      }
    } catch {
      setError("Error de conexión al guardar repartidor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(driverUserId: string) {
    try {
      const res = await fetch(`/api/panel/drivers/${driverUserId}/toggle`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (json.success) {
        setDrivers((prev) =>
          prev.map((d) => (d.driver_user_id === driverUserId ? { ...d, is_active: !d.is_active } : d))
        );
      }
    } catch {
      alert("No se pudo actualizar el estado del repartidor.");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold panel-font-display flex items-center gap-2">
            <FiUsers className="w-7 h-7 text-[var(--panel-primary)]" /> Flota de Repartidores
            <span className="text-xs font-normal text-[var(--panel-muted)]">({drivers.length})</span>
          </h1>
          <p className="text-sm text-[var(--panel-muted)] mt-0.5">
            Registra a tus repartidores y asígnales pedidos mediante código PIN de 6 dígitos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="panel-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <FiPlus className="w-4 h-4" />
          Nuevo Repartidor
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="panel-card h-32 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="panel-card p-6 text-center text-red-400 text-sm">
          {error}
          <button
            type="button"
            onClick={loadDrivers}
            className="block mx-auto mt-2 text-xs underline text-white cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : drivers.length === 0 ? (
        <div className="panel-card p-12 text-center text-[var(--panel-muted)]">
          <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-[var(--panel-text)]">No tienes repartidores registrados</p>
          <p className="text-xs mt-1">Registra tu personal de entrega para coordinar los envíos en tiempo real.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <div key={driver.id} className="panel-card p-5 space-y-3 relative">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-[var(--panel-text)]">{driver.full_name}</h3>
                  <span className="text-xs text-[var(--panel-muted)] flex items-center gap-1.5 mt-0.5">
                    <FiPhone className="w-3.5 h-3.5" /> {driver.phone}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    driver.is_active
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {driver.is_active ? "Activo" : "Pausado"}
                </span>
              </div>

              <div className="pt-2 border-t border-[var(--panel-border)] flex items-center justify-between text-xs">
                <span className="text-[var(--panel-muted)] flex items-center gap-1">
                  <FiTruck className="w-3.5 h-3.5" />
                  {driver.vehicle_type === "MOTORCYCLE"
                    ? "Motocicleta"
                    : driver.vehicle_type === "BICYCLE"
                    ? "Bicicleta"
                    : "Automóvil"}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(driver.driver_user_id)}
                  className="text-xs text-[var(--panel-accent)] hover:underline cursor-pointer"
                >
                  {driver.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para crear Repartidor */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="panel-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-[var(--panel-text)] flex items-center gap-2">
              <FiUsers className="w-5 h-5 text-[var(--panel-primary)]" /> Registrar Repartidor
            </h3>
            <p className="text-xs text-[var(--panel-muted)]">
              Crea las credenciales con las que el repartidor iniciará sesión en la app Solari Repartos.
            </p>

            <form onSubmit={handleCreateDriver} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-[var(--panel-muted)] block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Mamani"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--panel-border)] text-xs text-[var(--panel-text)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--panel-muted)] block mb-1">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 71234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--panel-border)] text-xs text-[var(--panel-text)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[var(--panel-muted)] block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="repartidor@tienda.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--panel-border)] text-xs text-[var(--panel-text)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--panel-muted)] block mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--panel-border)] text-xs text-[var(--panel-text)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--panel-muted)] block mb-1">Tipo de Vehículo</label>
                <select
                  value={vehicleType}
                  onChange={(e: any) => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-[var(--panel-border)] text-xs text-[var(--panel-text)]"
                >
                  <option value="MOTORCYCLE">Motocicleta</option>
                  <option value="BICYCLE">Bicicleta</option>
                  <option value="CAR">Automóvil</option>
                </select>
              </div>

              {error && <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--panel-border)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-xs text-[var(--panel-muted)] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="panel-btn-primary px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Registrando..." : "Crear Repartidor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}