import { FallbackImage } from "../ui/FallbackImage";
import { buildMediaUrl } from "../../lib/constants";
import { getPanelTheme } from "../../lib/panel-themes";
import type { ProductWithMedia } from "../../lib/types/types";

interface ProductListProps {
  products: ProductWithMedia[];
  niche: string;
  onAddClick: () => void;
  onEditClick: (product: ProductWithMedia) => void;
  onDeleteClick: (productId: string) => void;
}

export function formatBolivianos(amount: number): string {
  const formatted = new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Bs ${formatted}`;
}

export function ProductList({
  products,
  niche,
  onAddClick,
  onEditClick,
  onDeleteClick,
}: ProductListProps) {
  const theme = getPanelTheme(niche);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold panel-font-display flex items-center gap-2">
            <theme.icons.products className="w-6 h-6" style={{ color: theme.primaryColor }} />
            Mis Productos
            <span className="text-xs font-normal text-[var(--panel-muted)]">
              ({products.length})
            </span>
          </h1>
          <p className="text-sm text-[var(--panel-muted)] mt-0.5">
            Gestiona tu catálogo y stock para transmisiones live.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddClick}
          className="panel-btn-primary px-4 py-2.5 text-sm inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <theme.icons.add className="w-4 h-4" />
          <span>Nuevo producto</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 product-grid">
        {products.map((product) => {
          // 1. Soportar tanto product.media como product.product_media (directo de BD)
          const rawMedia = (product as any).media ?? (product as any).product_media ?? [];
          
          // 2. Ordenar por 'order' ascendente para garantizar que se pinte la imagen principal (slot 0)
          const sortedMedia = Array.isArray(rawMedia)
            ? [...rawMedia].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            : [];

          const firstMedia = sortedMedia[0]?.url
            ? buildMediaUrl(sortedMedia[0].url)
            : undefined;

          return (
            <div key={product.id} className="panel-card product-card flex flex-col">
              {/* Imagen */}
              <div className="relative h-40 md:h-44 bg-black/30 overflow-hidden">
                <FallbackImage
                  src={firstMedia}
                  alt={product.name}
                  fallbackName={product.name}
                  className="w-full h-full object-cover product-image"
                />
                {product.stock <= 5 && (
                  <span
                    className={`stock-badge ${product.stock === 0 ? "out" : "critical"}`}
                  >
                    {product.stock === 0 ? "Agotado" : `Stock: ${product.stock}`}
                  </span>
                )}
              </div>

              {/* Contenido */}
              <div className="p-4 flex-1">
                <h3 className="font-semibold text-sm md:text-base line-clamp-1">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-xs text-[var(--panel-muted)] line-clamp-2 mt-1">
                    {product.description}
                  </p>
                )}

                <div className="mt-3 flex items-baseline justify-between">
                  <span
                    className="text-base md:text-lg font-bold"
                    style={{ color: theme.accentColor }}
                  >
                    {formatBolivianos(product.price)}
                  </span>
                  <span className="text-xs text-[var(--panel-muted)]">
                    Stock:{" "}
                    <strong className="text-[var(--panel-text)]">{product.stock}</strong>
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div className="px-4 pb-4 pt-2 border-t border-[var(--panel-border)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEditClick(product)}
                  title="Editar producto"
                  className="p-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--panel-primary)] text-[var(--panel-muted)] hover:text-[var(--panel-text)] transition-colors"
                >
                  <theme.icons.edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteClick(product.id)}
                  title="Eliminar producto"
                  className="p-2 rounded-lg border border-[var(--panel-border)] hover:border-red-500/50 text-[var(--panel-muted)] hover:text-red-400 transition-colors"
                >
                  <theme.icons.delete className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Card agregar */}
        <button
          type="button"
          onClick={onAddClick}
          className="panel-card min-h-[220px] md:min-h-[260px] border-dashed flex flex-col items-center justify-center gap-3 p-6 text-[var(--panel-muted)] hover:text-[var(--panel-text)] transition-colors group"
          style={{ borderStyle: "dashed" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            style={{
              backgroundColor: `${theme.primaryColor}25`,
              color: theme.accentColor,
            }}
          >
            <theme.icons.add className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold">Agregar producto</span>
          <span className="text-xs text-center text-[var(--panel-muted)]">
            Configura atributos e imágenes
          </span>
        </button>
      </div>
    </div>
  );
}