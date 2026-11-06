import { useState, useEffect } from "react";
import { getPanelTheme } from "../../lib/panel-themes";
import { listSales } from "../../lib/commerce/client";
import { type PurchaseOrder, formatBOB } from "../../lib/types/commerce";
import type { ProductWithMedia } from "../../lib/types/types";

interface PanelOverviewProps {
  niche: string;
  storeName: string;
  products: ProductWithMedia[];
  onNavigateProducts: () => void;
  onNavigateNewProduct: () => void;
}

export function PanelOverview({
  niche,
  storeName,
  products,
  onNavigateProducts,
  onNavigateNewProduct,
}: PanelOverviewProps) {
  const theme = getPanelTheme(niche);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [ordersFailed, setOrdersFailed] = useState(false);
  useEffect(() => {
    let active = true;
    listSales()
      .then((sales) => { if (active) setOrders(sales); })
      .catch(() => { if (active) setOrdersFailed(true); })
      .finally(() => { if (active) setLoadingOrders(false); });
    return () => { active = false; };
  }, []);

  const paidOrders = orders.filter((order) => order.payment_status === "PAID");
  const pendingOrders = orders.filter((order) => ["CONFIRMED", "PREPARING", "READY"].includes(order.status));
  const totalSalesBs = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const lowStockCount = products.filter((p) => p.stock <= 5).length;

  const metrics = [
    {
      icon: theme.icons.sales,
      label: "Importe de pedidos pagados",
      value: ordersFailed || loadingOrders ? "—" : formatBOB(totalSalesBs),
      delta: `${paidOrders.length} pagados`,
    },
    {
      icon: theme.icons.activity,
      label: "Pedidos Pendientes",
      value: ordersFailed || loadingOrders ? "—" : String(pendingOrders.length),
      delta: pendingOrders.length > 0 ? "Por despachar" : "Al día",
    },
    {
      icon: theme.icons.products,
      label: "Productos en Catálogo",
      value: String(products.length),
      delta: lowStockCount > 0 ? `${lowStockCount} con stock bajo` : "Stock saludable",
    },
    {
      icon: theme.icons.rating,
      label: "Total Pedidos",
      value: ordersFailed || loadingOrders ? "—" : String(orders.length),
      delta: "Ventas de la tienda",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold panel-font-display text-[var(--panel-text)]">
            Bienvenido, {theme.roleGreeting}
          </h1>
          <p className="text-sm text-[var(--panel-muted)] mt-1">
            Resumen en tiempo real de <span className="text-[var(--panel-text)] font-semibold">{storeName}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateNewProduct}
          className="panel-btn-primary px-4 py-2.5 text-sm inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <theme.icons.add className="w-4 h-4" />
          <span>Nuevo producto</span>
        </button>
      </div>

      {/* Métricas Reales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 metric-grid">
        {metrics.map((m) => {
          const MetricIcon = m.icon;
          return (
            <div key={m.label} className="panel-card metric-card p-4 md:p-5 border border-[var(--panel-border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="metric-icon p-2 rounded-lg bg-white/5 text-[var(--panel-primary)]">
                  <MetricIcon className="w-5 h-5" />
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${theme.primaryColor}20`,
                    color: theme.accentColor,
                  }}
                >
                  {m.delta}
                </span>
              </div>
              <div className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight metric-value text-[var(--panel-text)]">
                {m.value}
              </div>
              <div className="text-xs text-[var(--panel-muted)] mt-1">{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* Grid: Pedidos Recientes y Alertas de Inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Últimos Pedidos Recibidos */}
        <div className="panel-card p-4 md:p-6 lg:col-span-3 border border-[var(--panel-border)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--panel-border)]">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2 text-[var(--panel-text)]">
                <theme.icons.trend className="w-4 h-4 text-[var(--panel-accent)]" />
                Últimos Pedidos Registrados
              </h2>
              <p className="text-xs text-[var(--panel-muted)] mt-0.5">Actividad reciente de compras</p>
            </div>
            <span className="text-xs font-semibold text-[var(--panel-muted)]">{orders.length} pedidos</span>
          </div>

          {loadingOrders ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : ordersFailed ? (
            <p role="alert" className="py-4 text-xs text-red-400">No se pudieron cargar las ventas.</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-[var(--panel-muted)] text-xs">
              No hay pedidos registrados todavía.
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.slice(0, 5).map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 rounded-xl bg-black/20 border border-[var(--panel-border)] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[var(--panel-text)] block">Pedido #{ord.id.slice(0, 8)}</span>
                    <span className="text-[11px] text-[var(--panel-muted)]">
                      {new Date(ord.created_at).toLocaleDateString("es-BO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[var(--panel-accent)] block">
                      {formatBOB(ord.total)}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        ord.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : ord.status === "CONFIRMED"
                          ? "bg-blue-500/20 text-blue-400"
                          : ord.status === "PENDING_PAYMENT"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de Inventario Real */}
        <div className="panel-card p-4 md:p-6 lg:col-span-2 border border-[var(--panel-border)] flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2 mb-3 text-[var(--panel-text)]">
              <theme.icons.activity className="w-4 h-4 text-[var(--panel-accent)]" />
              Estado del Inventario
            </h2>

            {products.filter((p) => p.stock <= 5).length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                Todos tus productos cuentan con stock suficiente para atender pedidos.
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-[var(--panel-muted)] mb-2">Productos que requieren reposición:</p>
                {products
                  .filter((p) => p.stock <= 5)
                  .slice(0, 4)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg bg-black/20 border border-[var(--panel-border)] flex items-center justify-between text-xs"
                    >
                      <span className="truncate max-w-[140px] text-[var(--panel-text)]">{p.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          p.stock === 0 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {p.stock === 0 ? "Agotado" : `${p.stock} und.`}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onNavigateProducts}
            className="mt-5 w-full py-2.5 text-xs font-semibold text-center rounded-lg border border-[var(--panel-border)] hover:border-[var(--panel-primary)] text-[var(--panel-muted)] hover:text-white transition-colors cursor-pointer"
          >
            Ver catálogo completo ({products.length}) →
          </button>
        </div>
      </div>
    </div>
  );
}