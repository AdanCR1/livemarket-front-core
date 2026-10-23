import { useState } from "react";
import { getPanelTheme } from "../../lib/panel-themes";
import { formatBolivianos } from "./ProductList";
import type { ProductWithMedia } from "../../lib/types/types";

interface LiveManagerProps {
  storeName: string;
  niche: string;
  isLive: boolean;
  allProducts: ProductWithMedia[];
  pinnedProducts: ProductWithMedia[];
  onToggleLive: (nextLiveState: boolean) => void;
  onTogglePinProduct: (product: ProductWithMedia) => void;
}

export function LiveManager({
  storeName,
  niche,
  isLive,
  allProducts,
  pinnedProducts,
  onToggleLive,
  onTogglePinProduct,
}: LiveManagerProps) {
  const theme = getPanelTheme(niche);
  const [showPinSelector, setShowPinSelector] = useState(false);

  const pinnedIds = new Set(pinnedProducts.map((p) => p.id));
  const unpinnedProducts = allProducts.filter((p) => !pinnedIds.has(p.id));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold panel-font-display flex items-center gap-2.5">
          <theme.icons.live
            className="w-6 h-6"
            style={{ color: isLive ? "#ef4444" : theme.primaryColor }}
          />
          Modo Live
        </h1>
        <p className="text-sm text-[var(--panel-muted)] mt-0.5">
          Gestiona los productos que se muestran en tu sección "En Live" cuando transmitís por TikTok.
        </p>
      </div>

      {/* Estado y toggle */}
      <div className="panel-card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isLive ? "bg-red-500/15" : "bg-white/5"
            }`}
          >
            <theme.icons.live
              className="w-6 h-6"
              style={{ color: isLive ? "#ef4444" : "var(--panel-muted)" }}
            />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {isLive ? "Estás en vivo" : "No estás en vivo"}
            </p>
            <p className="text-xs text-[var(--panel-muted)]">
              {isLive
                ? "Tu sección 'En Live' está visible para los compradores"
                : "Activá el modo live cuando empieces a transmitir en TikTok"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleLive(!isLive)}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            isLive
              ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25"
              : "panel-btn-primary"
          }`}
        >
          {isLive ? "Finalizar live" : "Iniciar live"}
        </button>
      </div>

      {/* Info para TikTok */}
      {isLive && (
        <div
          className="panel-card p-4 border-l-4"
          style={{ borderLeftColor: theme.primaryColor }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: `${theme.primaryColor}20`,
                color: theme.accentColor,
              }}
            >
              <theme.icons.external className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1">Enlace para tu live de TikTok</p>
              <p className="text-xs text-[var(--panel-muted)] mb-2">
                Compartí este enlace en tu transmisión de TikTok para que los espectadores vean tus productos:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-xs truncate">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/${niche}/${storeName.toLowerCase().replace(/\s+/g, "-")}?live=true`
                    : `/${niche}/[tu-tienda]?live=true`}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/${niche}/${storeName.toLowerCase().replace(/\s+/g, "-")}?live=true`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: `${theme.primaryColor}20`,
                    color: theme.accentColor,
                  }}
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Productos anclados */}
      <div className="panel-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <theme.icons.products
                className="w-4 h-4"
                style={{ color: theme.accentColor }}
              />
              Productos en live
            </h2>
            <p className="text-xs text-[var(--panel-muted)] mt-0.5">
              {pinnedProducts.length} producto{pinnedProducts.length !== 1 ? "s" : ""} anclado{pinnedProducts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Lista de productos anclados */}
        <div className="space-y-2.5">
          {pinnedProducts.length === 0 ? (
            <div className="text-center py-10">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{
                  background: `${theme.primaryColor}15`,
                  color: theme.accentColor,
                }}
              >
                <theme.icons.products className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-[var(--panel-text)] mb-1">
                No hay productos anclados
              </p>
              <p className="text-xs text-[var(--panel-muted)] max-w-sm mx-auto">
                Anclá productos de tu catálogo para que aparezcan en la sección "En Live" de tu tienda.
              </p>
            </div>
          ) : (
            pinnedProducts.map((prod, index) => (
              <div
                key={prod.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-[var(--panel-border)]"
              >
                {/* Número de orden */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: `${theme.primaryColor}25`,
                    color: theme.accentColor,
                  }}
                >
                  {index + 1}
                </div>

                {/* Info producto */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{prod.name}</p>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: theme.accentColor }}
                  >
                    {formatBolivianos(prod.price)}
                  </p>
                </div>

                {/* Stock */}
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    prod.stock <= 5
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {prod.stock} und.
                </span>

                {/* Quitar */}
                <button
                  type="button"
                  onClick={() => onTogglePinProduct(prod)}
                  title="Quitar de live"
                  className="p-2 rounded-lg text-[var(--panel-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <theme.icons.close className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Selector para anclar */}
        <div className="mt-4 pt-4 border-t border-[var(--panel-border)]">
          {!showPinSelector ? (
            <button
              type="button"
              onClick={() => setShowPinSelector(true)}
              className="w-full py-3 rounded-lg border border-dashed text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              style={{
                borderColor: `${theme.primaryColor}50`,
                color: theme.accentColor,
              }}
            >
              <theme.icons.add className="w-4 h-4" />
              Anclar producto del catálogo
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[var(--panel-muted)]">
                  Seleccioná un producto para anclar:
                </p>
                <button
                  type="button"
                  onClick={() => setShowPinSelector(false)}
                  className="p-1 text-[var(--panel-muted)] hover:text-[var(--panel-text)]"
                >
                  <theme.icons.close className="w-4 h-4" />
                </button>
              </div>

              {unpinnedProducts.length === 0 ? (
                <p className="text-xs text-[var(--panel-muted)] text-center py-4">
                  Todos tus productos ya están anclados al live.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {unpinnedProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onTogglePinProduct(p);
                        setShowPinSelector(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-white/5 flex items-center justify-between gap-3 transition-colors border border-transparent hover:border-[var(--panel-border)]"
                    >
                      <span className="truncate">{p.name}</span>
                      <span
                        className="text-xs font-semibold shrink-0"
                        style={{ color: theme.accentColor }}
                      >
                        {formatBolivianos(p.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vista previa */}
      {isLive && pinnedProducts.length > 0 && (
        <div className="panel-card p-4 md:p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <theme.icons.eye className="w-4 h-4" style={{ color: theme.accentColor }} />
            Vista previa de "En Live"
          </h3>
          <p className="text-xs text-[var(--panel-muted)] mb-4">
            Así ven los compradores tu sección de productos en live:
          </p>

          <div className="rounded-xl overflow-hidden border border-[var(--panel-border)] bg-black/30 p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-400 uppercase">En Live</span>
              <span className="text-xs text-[var(--panel-muted)]">— {storeName}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pinnedProducts.slice(0, 6).map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-lg overflow-hidden bg-[var(--panel-surface)] border border-[var(--panel-border)]"
                >
                  <div className="h-20 bg-black/40 flex items-center justify-center">
                    <theme.icons.products
                      className="w-6 h-6 opacity-30"
                      style={{ color: theme.accentColor }}
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{prod.name}</p>
                    <p
                      className="text-xs font-bold"
                      style={{ color: theme.accentColor }}
                    >
                      {formatBolivianos(prod.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {pinnedProducts.length > 6 && (
              <p className="text-xs text-[var(--panel-muted)] text-center mt-3">
                + {pinnedProducts.length - 6} productos más
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}