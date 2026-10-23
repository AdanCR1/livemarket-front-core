import { useState, useEffect, useMemo } from "react";
import { FallbackImage } from "../ui/FallbackImage";
import { LiveBadge } from "../ui/LiveBadge";
import { SkeletonLoader } from "../ui/SkeletonLoader";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { InventoryService } from "../../lib/types/services";
import { buildMediaUrl } from "../../lib/constants";
import type { ProductWithMedia } from "../../lib/types/types";
import { FiX, FiCheck, FiShoppingBag, FiMapPin, FiPhone, FiUser } from "react-icons/fi";

interface StoreCatalogProps {
  storeId: string;
  storeName: string;
  isLive: boolean;
}

type SortOption = "recent" | "price-asc" | "price-desc" | "name";

export function StoreCatalog({ storeId, storeName, isLive }: StoreCatalogProps) {
  const [liveProducts, setLiveProducts] = useState<ProductWithMedia[]>([]);
  const [allProducts, setAllProducts] = useState<ProductWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del modal de producto seleccionado y checkout
  const [selectedProduct, setSelectedProduct] = useState<ProductWithMedia | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filtros
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCatalog();
  }, [storeId]);

  async function loadCatalog() {
    setLoading(true);
    setError(null);

    const [liveResult, catalogResult] = await Promise.all([
      isLive ? InventoryService.getLiveProducts(storeId) : Promise.resolve({ data: [], error: null }),
      InventoryService.getProductsByStore(storeId),
    ]);

    if (catalogResult.error) {
      setError(catalogResult.error);
    } else {
      setAllProducts(catalogResult.data ?? []);
    }

    if (liveResult.data) {
      setLiveProducts(liveResult.data);
    }

    setLoading(false);
  }

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach((p) => {
      const cat = p.attributes?.categoria;
      if (typeof cat === "string") cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (categoryFilter) {
      filtered = filtered.filter((p) => p.attributes?.categoria === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "recent":
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return sorted;
  }, [allProducts, categoryFilter, sortBy, searchQuery]);

  function openProductDetail(product: ProductWithMedia) {
    setSelectedProduct(product);
    setOrderQuantity(1);
    setOrderFeedback(null);
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!customerName.trim() || !customerContact.trim()) {
      setOrderFeedback({ type: "error", message: "Ingresa tu nombre y WhatsApp para coordinar la entrega." });
      return;
    }

    setIsSubmittingOrder(true);
    setOrderFeedback(null);

    try {
      const payload = {
        store_id: storeId,
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim(),
        delivery_address: deliveryAddress.trim() || "Recojo en local / Por acordar",
        is_live_order: isLive,
        notes: orderNotes.trim() || undefined,
        items: [
          {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            unit_price: selectedProduct.price,
            quantity: orderQuantity,
          },
        ],
      };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error ?? "No se pudo completar la reserva.");
      }

      setOrderFeedback({
        type: "success",
        message: "¡Pedido reservado con éxito! El negocio se pondrá en contacto por WhatsApp para confirmar.",
      });

      // Actualizar el stock del producto localmente
      setSelectedProduct((prev) => (prev ? { ...prev, stock: prev.stock - orderQuantity } : null));
      setAllProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...p, stock: p.stock - orderQuantity } : p))
      );
    } catch (err: any) {
      setOrderFeedback({
        type: "error",
        message: err.message || "Error al procesar la reserva.",
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  if (loading) return <SkeletonLoader variant="detail" />;
  if (error) {
    return (
      <SkeletonLoader
        variant="detail"
        isError
        message={`No pudimos cargar el catálogo de ${storeName}. Error de conexión.`}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* ═══════ SECCIÓN LIVE ═══════ */}
        {isLive && liveProducts.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <LiveBadge size="md" />
              <h2 className="text-lg font-bold text-market-white">Productos en vivo</h2>
              <span className="text-xs text-market-muted">({liveProducts.length} disponibles)</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {liveProducts.map((product) => (
                <ProductCard
                  key={`live-${product.id}`}
                  product={product}
                  isLive
                  onClick={() => openProductDetail(product)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ═══════ CATÁLOGO COMPLETO ═══════ */}
        <section className="animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-market-white flex items-center gap-2">
              📦 Catálogo Completo
              <span className="text-xs font-normal text-market-muted">
                ({filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""})
              </span>
            </h2>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full rounded-xl bg-market-darker border border-market-border/50 px-4 py-2.5 text-sm text-market-white placeholder:text-market-muted/50 focus:outline-none focus:ring-2 focus:ring-theme-primary/30"
              />
            </div>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl bg-market-darker border border-market-border/50 px-4 py-2.5 text-sm text-market-white cursor-pointer"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl bg-market-darker border border-market-border/50 px-4 py-2.5 text-sm text-market-white cursor-pointer"
            >
              <option value="recent">Más recientes</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name">Nombre A-Z</option>
            </select>
          </div>

          {/* Grilla */}
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-base font-semibold text-market-white mb-1">
                {allProducts.length === 0 ? "Esta tienda no tiene productos aún" : "Sin resultados"}
              </h3>
              <p className="text-sm text-market-muted">
                {allProducts.length === 0 ? "El catálogo estará disponible pronto." : "Intenta con otros filtros."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => openProductDetail(product)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ═══════ MODAL DETALLE DE PRODUCTO Y CHECKOUT B2C ═══════ */}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            orderQuantity={orderQuantity}
            setOrderQuantity={setOrderQuantity}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerContact={customerContact}
            setCustomerContact={setCustomerContact}
            deliveryAddress={deliveryAddress}
            setDeliveryAddress={setDeliveryAddress}
            orderNotes={orderNotes}
            setOrderNotes={setOrderNotes}
            onSubmitOrder={handleCreateOrder}
            isSubmitting={isSubmittingOrder}
            feedback={orderFeedback}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

// ─── Componente Interno: Modal Detalle y Checkout ───

interface ProductDetailModalProps {
  product: ProductWithMedia;
  onClose: () => void;
  orderQuantity: number;
  setOrderQuantity: (n: number) => void;
  customerName: string;
  setCustomerName: (s: string) => void;
  customerContact: string;
  setCustomerContact: (s: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (s: string) => void;
  orderNotes: string;
  setOrderNotes: (s: string) => void;
  onSubmitOrder: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  feedback: { type: "success" | "error"; message: string } | null;
}

function ProductDetailModal({
  product,
  onClose,
  orderQuantity,
  setOrderQuantity,
  customerName,
  setCustomerName,
  customerContact,
  setCustomerContact,
  deliveryAddress,
  setDeliveryAddress,
  orderNotes,
  setOrderNotes,
  onSubmitOrder,
  isSubmitting,
  feedback,
}: ProductDetailModalProps) {
  // Solo consideramos las imágenes que realmente existan y estén cargadas
  const rawMedia = (product as any).media ?? (product as any).product_media ?? [];
  const validMedia = Array.isArray(rawMedia)
    ? [...rawMedia].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const activeImageUrl = validMedia.length > 0 && validMedia[activeImageIndex]?.url
    ? buildMediaUrl(validMedia[activeImageIndex].url)
    : undefined;

  const formattedPrice = `Bs ${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: product.price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(product.price)}`;

  const totalOrderPrice = `Bs ${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: (product.price * orderQuantity) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(product.price * orderQuantity)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-market-card border border-market-border/60 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 text-market-muted hover:text-white transition-colors cursor-pointer"
        >
          <FiX className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8">
          {/* Columna Izquierda: Galería dinámica */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-market-darker border border-market-border/40">
              <FallbackImage
                src={activeImageUrl}
                alt={product.name}
                fallbackName={product.name}
                className="w-full h-full object-cover"
              />
              {product.stock <= 5 && (
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  {product.stock === 0 ? "Agotado" : `Últimas ${product.stock} und.`}
                </span>
              )}
            </div>

            {/* Miniaturas: Solo se renderizan si el producto tiene más de 1 imagen */}
            {validMedia.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {validMedia.map((m: any, idx: number) => {
                  const thumbUrl = buildMediaUrl(m.url);
                  return (
                    <button
                      key={m.id || idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${activeImageIndex === idx
                          ? "border-theme-primary scale-105"
                          : "border-market-border/40 opacity-70 hover:opacity-100"
                        }`}
                    >
                      <FallbackImage
                        src={thumbUrl}
                        alt=""
                        fallbackName={product.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Atributos del nicho */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="p-4 rounded-xl bg-market-darker/60 border border-market-border/30 space-y-2">
                <span className="text-xs font-semibold text-theme-primary uppercase tracking-wider block">
                  Detalles del producto
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(product.attributes).map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-market-muted capitalize">{k.replace(/_/g, " ")}:</span>
                      <span className="text-market-white font-medium">
                        {typeof v === "boolean" ? (v ? "Sí" : "No") : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Información y Formulario de Reserva */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-market-white">{product.name}</h2>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-2xl font-bold text-theme-primary">{formattedPrice}</span>
                <span className="text-xs text-market-muted">
                  Stock disponible: <strong className="text-market-white">{product.stock}</strong>
                </span>
              </div>
              {product.description && (
                <p className="text-sm text-market-muted mt-3 leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* Formulario de Checkout / Pedido */}
            <form onSubmit={onSubmitOrder} className="space-y-4 pt-4 border-t border-market-border/40">
              <span className="text-xs font-bold text-market-white uppercase tracking-wider block flex items-center gap-2">
                <FiShoppingBag className="w-4 h-4 text-theme-primary" />
                Completar Pedido / Reserva
              </span>

              {feedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${feedback.type === "success"
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/15 border border-red-500/30 text-red-300"
                    }`}
                >
                  {feedback.message}
                </div>
              )}

              {/* Cantidad */}
              <div>
                <label className="block text-[11px] font-semibold text-market-muted uppercase mb-1">
                  Cantidad a pedir
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                    disabled={orderQuantity <= 1 || product.stock === 0}
                    className="w-8 h-8 rounded-lg bg-market-darker border border-market-border/60 text-market-white flex items-center justify-center font-bold cursor-pointer disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="text-base font-bold text-market-white">{orderQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setOrderQuantity(Math.min(product.stock, orderQuantity + 1))}
                    disabled={orderQuantity >= product.stock || product.stock === 0}
                    className="w-8 h-8 rounded-lg bg-market-darker border border-market-border/60 text-market-white flex items-center justify-center font-bold cursor-pointer disabled:opacity-40"
                  >
                    +
                  </button>
                  <span className="text-xs text-market-muted ml-auto">
                    Total: <strong className="text-theme-primary">{totalOrderPrice}</strong>
                  </span>
                </div>
              </div>

              {/* Datos de contacto */}
              <div className="space-y-3">
                <div>
                  <div className="relative">
                    <FiUser className="w-4 h-4 text-market-muted absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Tu nombre completo *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-market-darker border border-market-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-market-white placeholder:text-market-muted/50 focus:outline-none focus:border-theme-primary"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <FiPhone className="w-4 h-4 text-market-muted absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="Número de WhatsApp para coordinar *"
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      className="w-full bg-market-darker border border-market-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-market-white placeholder:text-market-muted/50 focus:outline-none focus:border-theme-primary"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <FiMapPin className="w-4 h-4 text-market-muted absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Dirección de entrega (o Recojo en tienda)"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full bg-market-darker border border-market-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-market-white placeholder:text-market-muted/50 focus:outline-none focus:border-theme-primary"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || product.stock === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-theme-primary to-theme-accent text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? (
                  "Procesando pedido..."
                ) : product.stock === 0 ? (
                  "Producto Agotado"
                ) : (
                  <>
                    <FiCheck className="w-4 h-4" />
                    <span>Confirmar Pedido ({totalOrderPrice})</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Interno: Tarjeta de Producto ───

interface ProductCardProps {
  product: ProductWithMedia;
  isLive?: boolean;
  onClick: () => void;
}

function ProductCard({ product, isLive = false, onClick }: ProductCardProps) {
  const rawList = (product as any).media ?? (product as any).product_media ?? [];
  const sortedMedia = Array.isArray(rawList)
    ? [...rawList].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const imageUrl = sortedMedia.length > 0 && sortedMedia[0].url
    ? buildMediaUrl(sortedMedia[0].url)
    : undefined;

  const formattedPrice = `Bs ${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: product.price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(product.price)}`;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer backdrop-blur-md ${isLive
          ? "border-live-red/30 hover:border-live-red/60 bg-[var(--theme-surface-alt)]/70 shadow-lg shadow-live-red/5"
          : "border-[var(--theme-primary)]/20 hover:border-[var(--theme-primary)]/60 bg-[var(--theme-surface-alt)]/70 hover:bg-[var(--theme-surface-alt)]/90 hover:-translate-y-1 shadow-md"
        }`}
    >
      <div className="relative h-44 overflow-hidden bg-black/35">
        <FallbackImage
          src={imageUrl}
          alt={product.name}
          fallbackName={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {isLive && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full bg-live-red/20 border border-live-red/30 text-[9px] font-bold text-live-red uppercase tracking-wider">
              En vivo
            </span>
          </div>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-0.5 rounded-full bg-warning/20 border border-warning/30 text-[9px] font-bold text-warning uppercase">
              Últimas {product.stock} und.
            </span>
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-red-500/80 text-white font-bold text-xs uppercase tracking-wider">
              Agotado
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-1.5">
        <h4 className="text-sm font-semibold text-market-white line-clamp-2 group-hover:text-theme-primary transition-colors">
          {product.name}
        </h4>
        {product.description && (
          <p className="text-xs text-market-muted line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>

      <div className="px-4 pb-4 flex items-center justify-between">
        <span className="text-base font-bold text-theme-primary">{formattedPrice}</span>
        <span className="text-[11px] text-theme-primary/80 font-semibold group-hover:underline">
          Ver detalles →
        </span>
      </div>
    </div>
  );
}