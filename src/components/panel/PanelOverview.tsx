import { getPanelTheme } from "../../lib/panel-themes";
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
  const outOfStockProduct = products.find((p) => p.stock <= 5);

  const metrics = [
    {
      icon: theme.icons.sales,
      label: "Ventas",
      value: "Bs 1,240",
      delta: "+12% hoy",
    },
    {
      icon: theme.icons.visits,
      label: "Visitas",
      value: "89",
      delta: "+5% hoy",
    },
    {
      icon: theme.icons.products,
      label: "Productos",
      value: String(products.length),
      delta: `${Math.min(products.length, 2)} nuevos`,
    },
    {
      icon: theme.icons.rating,
      label: "Rating",
      value: "4.8",
      delta: "+0.2 este mes",
    },
  ];

  const recentActivity = [
    {
      id: "act-1",
      icon: theme.icons.trend,
      color: theme.primaryColor,
      text: "Pedido nuevo #123 confirmado (Bs 145)",
      time: "Hace 12 min",
    },
    {
      id: "act-2",
      icon: theme.icons.activity,
      color: "#f59e0b",
      text: outOfStockProduct
        ? `Stock bajo (${outOfStockProduct.stock} und.): ${outOfStockProduct.name}`
        : "Alerta de inventario: revisa tus productos estrella",
      time: "Hace 45 min",
    },
    {
      id: "act-3",
      icon: theme.icons.heart,
      color: "#22c55e",
      text: "Review 5 estrellas de María en tu última transmisión live",
      time: "Hace 2 horas",
    },
    {
      id: "act-4",
      icon: theme.icons.products,
      color: theme.accentColor,
      text: `Catálogo de ${storeName} sincronizado`,
      time: "Hoy, 09:15",
    },
  ];

  const weeklySales = [
    { day: "Lun", amount: 620, height: 45 },
    { day: "Mar", amount: 890, height: 62 },
    { day: "Mié", amount: 740, height: 52 },
    { day: "Jue", amount: 1120, height: 78 },
    { day: "Vie", amount: 1450, height: 95 },
    { day: "Sáb", amount: 1580, height: 100 },
    { day: "Dom", amount: 1240, height: 84 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold panel-font-display">
            Buenos días, {theme.roleGreeting}
          </h1>
          <p className="text-sm text-[var(--panel-muted)] mt-1">
            Resumen de{" "}
            <span className="text-[var(--panel-text)] font-medium">{storeName}</span>{" "}
            hoy
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateNewProduct}
          className="panel-btn-primary px-4 py-2.5 text-sm inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <theme.icons.add className="w-4 h-4" />
          <span>Nuevo producto</span>
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 metric-grid">
        {metrics.map((m) => {
          const MetricIcon = m.icon;
          return (
            <div key={m.label} className="panel-card metric-card p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="metric-icon">
                  <MetricIcon className="w-5 h-5" />
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${theme.primaryColor}20`,
                    color: theme.accentColor,
                  }}
                >
                  {m.delta}
                </span>
              </div>
              <div className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight metric-value">
                {m.value}
              </div>
              <div className="text-xs text-[var(--panel-muted)] mt-1">{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* Gráfico + Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Ventas semanales */}
        <div className="panel-card p-4 md:p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <theme.icons.trend className="w-4 h-4" style={{ color: theme.accentColor }} />
                Ventas semanales
              </h2>
              <p className="text-xs text-[var(--panel-muted)] mt-0.5">
                Rendimiento de los últimos 7 días
              </p>
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: theme.accentColor }}
            >
              Total: Bs 7,640
            </span>
          </div>

          {/* Chart */}
          <div className="h-36 md:h-44 flex items-end justify-between gap-2 md:gap-3 pt-4 px-1 border-b border-[var(--panel-border)] chart-container">
            {weeklySales.map((item) => (
              <div
                key={item.day}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
              >
                <span className="text-[9px] text-[var(--panel-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                  Bs {item.amount}
                </span>
                <div
                  className="chart-bar w-full max-w-[32px] md:max-w-[38px]"
                  style={{
                    height: `${item.height}%`,
                    background: `linear-gradient(180deg, ${theme.accentColor} 0%, ${theme.primaryColor} 100%)`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between px-1 pt-2 text-[10px] md:text-xs text-[var(--panel-muted)]">
            {weeklySales.map((item) => (
              <span key={item.day} className="flex-1 text-center">
                {item.day}
              </span>
            ))}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="panel-card p-4 md:p-6 lg:col-span-2">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <theme.icons.activity className="w-4 h-4" style={{ color: theme.accentColor }} />
            Actividad reciente
          </h2>
          <ul className="space-y-3 md:space-y-4">
            {recentActivity.map((act) => {
              const ActIcon = act.icon;
              return (
                <li key={act.id} className="flex items-start gap-3 text-sm">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${act.color}15`,
                      color: act.color,
                    }}
                  >
                    <ActIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--panel-text)] leading-snug text-sm">
                      {act.text}
                    </p>
                    <span className="text-xs text-[var(--panel-muted)]">{act.time}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={onNavigateProducts}
            className="mt-5 w-full py-2.5 text-xs font-medium text-center rounded-lg border border-[var(--panel-border)] hover:border-[var(--panel-primary)] text-[var(--panel-muted)] hover:text-[var(--panel-text)] transition-colors"
          >
            Ver inventario completo →
          </button>
        </div>
      </div>
    </div>
  );
}