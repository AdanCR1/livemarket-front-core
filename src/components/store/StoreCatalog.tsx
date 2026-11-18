import { useState, useEffect, useMemo, useRef } from "react";
import { FallbackImage } from "../ui/FallbackImage";
import { LiveBadge } from "../ui/LiveBadge";
import { SkeletonLoader } from "../ui/SkeletonLoader";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { InventoryService } from "../../lib/types/services";
import { commerceFetch, createPickupOrder } from "../../lib/commerce/client";
import { PaymentQR } from "./PaymentQR";
import type { PurchaseOrder } from "../../lib/types/commerce";
import { buildMediaUrl } from "../../lib/constants";
import type { ProductWithMedia } from "../../lib/types/types";
import { FiX, FiCheck, FiShoppingBag, FiMapPin, FiPhone, FiUser } from "react-icons/fi";

interface StoreCatalogProps {
  storeId: string;
  storeName: string;
  isLive: boolean;
  liveRequested?: boolean;
  buyerAccess: "guest" | "buyer" | "owner" | "restricted";
  loginUrl: string;
  productId?: string;
  initialProducts?: ProductWithMedia[];
}

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

type SortOption = "recent" | "price-asc" | "price-desc" | "name";

export function StoreCatalog({ storeId, storeName, isLive, liveRequested, buyerAccess, loginUrl, productId, initialProducts }: StoreCatalogProps) {
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveProducts, setLiveProducts] = useState<ProductWithMedia[]>([]);
  const [allProducts, setAllProducts] = useState<ProductWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del modal de producto seleccionado y checkout
  const openedFromLink = useRef(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithMedia | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const submittingOrder = useRef(false);
  const [orderFeedback, setOrderFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [payableOrder, setPayableOrder] = useState<PurchaseOrder | null>(null);
  const [pickupDeadline, setPickupDeadline] = useState("");
  const [deliveryType,setDeliveryType]=useState<'PICKUP'|'DELIVERY'>('PICKUP');
  const [deliveryAddress,setDeliveryAddress]=useState('');
  const [deliveryAvailable,setDeliveryAvailable]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();setDeliveryAvailable(false);setDeliveryType('PICKUP');
    if(buyerAccess==='buyer')commerceFetch<{delivery_available:boolean}>(`/api/checkout?store_id=${storeId}`,{signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted)setDeliveryAvailable(data.delivery_available===true);}).catch(()=>{});
    return()=>controller.abort();
  },[storeId,buyerAccess]);
  const [storeCanSell, setStoreCanSell] = useState<boolean | null>(null);
  const [availabilityFailed, setAvailabilityFailed] = useState(false);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());

  // Filtros
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (buyerAccess !== "buyer") return;
    const controller = new AbortController();
    fetch('/api/profile/name', {credentials:'same-origin', cache:'no-store', signal:controller.signal})
      .then(async res => {if (!res.ok) return null; const data = await res.json(); return data?.success ? data.data : null;})
      .then(p => {if (!controller.signal.aborted && p?.full_name) setCustomerName(p.full_name);})
      .catch(() => {});
    return () => controller.abort();
  }, [buyerAccess]);

  useEffect(() => {
    loadCatalog();
  }, [storeId, isLive]);

  useEffect(() => {
    const controller = new AbortController();
    setStoreCanSell(null);
    setAvailabilityFailed(false);
    fetch(`/api/stores/${encodeURIComponent(storeId)}`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
    })
      .then(async (response) => {
        const result = await response.json();
        const allowed = result?.data?.can_accept_orders;
        if (!response.ok || result?.success !== true || typeof allowed !== "boolean") {
          throw new Error("Disponibilidad no verificable");
        }
        if (!controller.signal.aborted) setStoreCanSell(allowed);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailabilityFailed(true);
      });
    return () => controller.abort();
  }, [storeId, availabilityAttempt]);

  async function loadCatalog() {
    setLoading(true);
    setError(null);

    const [liveResult, catalogResult] = await Promise.all([
      isLive ? InventoryService.getLiveProducts(storeId) : Promise.resolve({ data: [], error: null }),
      initialProducts ? Promise.resolve({ data: initialProducts, error: null }) : InventoryService.getProductsByStore(storeId),
    ]);

    if (catalogResult.error) {
      setError(catalogResult.error);
    } else {
      const products = (catalogResult.data ?? []).filter(product => product.business_model === "tecnologia" && product.store_id === storeId);
      setAllProducts(products);
      const target = products.find(product => product.id === productId);
      if (target && !openedFromLink.current) {
        openedFromLink.current = true;
        openProductDetail(target);
      }
    }

    setLiveError(liveResult.error);
    setLiveProducts((liveResult.data ?? []).filter(product => product.business_model === "tecnologia"));
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
    setDeliveryType('PICKUP');setDeliveryAddress('');
    setOrderFeedback(null);
    setRequestKey(crypto.randomUUID());
    const twoDays=new Date(Date.now()+48*60*60*1000);
    setPickupDeadline(localDateTime(twoDays));
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct || submittingOrder.current) return;
    if(storeCanSell!==true || buyerAccess !== "buyer"){setOrderFeedback({type:'error',message:'Compra no disponible'});return;}
    if(deliveryType==='PICKUP'&&!pickupDeadline){setOrderFeedback({type:'error',message:'Selecciona fecha límite de recogida'});return;}
    if (!customerName.trim()) {
      setOrderFeedback({ type: "error", message: "Completa tu nombre en el perfil antes de comprar." });
      return;
    }
    submittingOrder.current = true;
    setIsSubmittingOrder(true); setOrderFeedback(null);
    try {
      const notes = [
        customerContact.trim() && `Teléfono: ${customerContact.trim().slice(0,40)}`,
        orderNotes.trim().slice(0,250),
      ].filter(Boolean).join(" · ");
      const order = deliveryType==='PICKUP'
        ? await createPickupOrder(storeId,selectedProduct.id,orderQuantity,notes,requestKey,new Date(pickupDeadline).toISOString())
        : await commerceFetch<PurchaseOrder>('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestKey},
          body:JSON.stringify({store_id:storeId,delivery_type:'DELIVERY',delivery_address:deliveryAddress,items:[{product_id:selectedProduct.id,quantity:orderQuantity}],notes})});
      setPayableOrder(order);
      setOrderFeedback({type:'success',message:'Pedido registrado. Escanea el QR para pagar.'});
      // El inventario se reserva en MS2 por MS4. No descontamos stock localmente.
    } catch(err) {
      setOrderFeedback({type:'error',message:err instanceof Error ? err.message : 'No se pudo crear el pedido'});
    } finally {
      submittingOrder.current = false;
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
        {liveRequested && !isLive && <p role="status">Esta tienda no está transmitiendo ahora.</p>}
        {isLive && liveError && <p role="alert">No se pudieron cargar los productos fijados.</p>}
        {isLive && !liveError && liveProducts.length === 0 && <p role="status">No hay productos fijados para este Live.</p>}
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
        {payableOrder && (
          <PaymentQR order={payableOrder} onClose={() => {
            setPayableOrder(null); setSelectedProduct(null); void loadCatalog();
          }} />
        )}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            orderQuantity={orderQuantity}
            setOrderQuantity={setOrderQuantity}
            customerName={customerName}
            customerContact={customerContact}
            setCustomerContact={setCustomerContact}
            orderNotes={orderNotes}
            setOrderNotes={setOrderNotes}
            onSubmitOrder={handleCreateOrder}
            isSubmitting={isSubmittingOrder}
            feedback={orderFeedback}
            storeCanSell={storeCanSell}
            buyerAccess={buyerAccess}
            loginUrl={loginUrl}
            availabilityFailed={availabilityFailed}
            retryAvailability={() => setAvailabilityAttempt((attempt) => attempt + 1)}
            pickupDeadline={pickupDeadline}
            deliveryType={deliveryType} setDeliveryType={setDeliveryType} deliveryAddress={deliveryAddress} setDeliveryAddress={setDeliveryAddress} deliveryAvailable={deliveryAvailable}
            setPickupDeadline={setPickupDeadline}
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
  customerContact: string;
  setCustomerContact: (s: string) => void;
  orderNotes: string;
  setOrderNotes: (s: string) => void;
  onSubmitOrder: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  feedback: { type: "success" | "error"; message: string } | null;
  storeCanSell:boolean|null;
  buyerAccess: StoreCatalogProps["buyerAccess"];
  loginUrl: string;
  availabilityFailed: boolean;
  retryAvailability: () => void;
  pickupDeadline:string;
  deliveryType:'PICKUP'|'DELIVERY';setDeliveryType:(value:'PICKUP'|'DELIVERY')=>void;
  deliveryAddress:string;setDeliveryAddress:(value:string)=>void;deliveryAvailable:boolean;
  setPickupDeadline:(v:string)=>void;
}

function ProductDetailModal({
  product,
  onClose,
  orderQuantity,
  setOrderQuantity,
  customerName,
  customerContact,
  setCustomerContact,
  orderNotes,
  setOrderNotes,
  onSubmitOrder,
  isSubmitting,
  feedback,
  storeCanSell,
  buyerAccess,
  loginUrl,
  availabilityFailed,
  retryAvailability,
  pickupDeadline,
  deliveryType,setDeliveryType,deliveryAddress,setDeliveryAddress,deliveryAvailable,
  setPickupDeadline,
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
    <div role="dialog" aria-modal="true" aria-label={product.name} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
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
                className="w-full h-full object-contain"
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
                        className="w-full h-full object-contain"
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
                Compra con recogida en tienda
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

              {storeCanSell === true && buyerAccess === "buyer" && <>
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
                    Estimado: <strong className="text-theme-primary">{totalOrderPrice}</strong>
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
                      readOnly
                      placeholder="Nombre registrado en tu perfil"
                      value={customerName}
                      className="w-full bg-market-darker border border-market-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-market-white placeholder:text-market-muted/50 focus:outline-none focus:border-theme-primary"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <FiPhone className="w-4 h-4 text-market-muted absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="Teléfono de contacto (opcional)"
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      className="w-full bg-market-darker border border-market-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-market-white placeholder:text-market-muted/50 focus:outline-none focus:border-theme-primary"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <FiMapPin className="w-4 h-4 text-market-muted absolute left-3 top-3" />
                    <select aria-label="Tipo de entrega" value={deliveryType} onChange={event=>setDeliveryType(event.target.value as 'PICKUP'|'DELIVERY')}
                      className="w-full bg-market-darker border border-market-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-market-white">
                      <option value="PICKUP">Recoger en tienda</option>
                      <option value="DELIVERY" disabled={!deliveryAvailable}>Envío a domicilio{!deliveryAvailable?' — no disponible':''}</option>
                    </select>
                  </div>
                </div>
              </div>

              {deliveryType==='DELIVERY'?<label className="block text-xs text-market-muted">Dirección de entrega
                <textarea required minLength={10} maxLength={500} value={deliveryAddress} onChange={event=>setDeliveryAddress(event.target.value)}
                  placeholder="Ciudad, calle, número y referencia" className="block w-full rounded-xl bg-market-darker border border-market-border/60 text-market-white p-3 text-sm" />
              </label>:<div className="space-y-2">
                <label htmlFor="pickupDeadline" className="block text-xs text-market-muted">Fecha límite de recogida (entre 1 y 7 días)</label>
                <input id="pickupDeadline" type="datetime-local" required value={pickupDeadline}
                  min={localDateTime(new Date(Math.ceil((Date.now() + 86400000) / 60000) * 60000))}
                  max={localDateTime(new Date(Date.now() + 7 * 86400000))}
                  onChange={e=>setPickupDeadline(e.target.value)}
                  className="w-full rounded-xl bg-market-darker border border-market-border/60 text-market-white p-3 text-sm" />
              </div>}
              </>}
              {storeCanSell !== true && (
                <div className="space-y-2 text-xs text-amber-300" role="status">
                  <p>{availabilityFailed ? "No pudimos verificar si la tienda acepta compras."
                    : storeCanSell === false ? "Solo catálogo. Esta tienda no tiene un plan de ventas activo."
                    : "Comprobando disponibilidad de compras…"}</p>
                  {availabilityFailed && <button type="button" className="underline" onClick={retryAvailability}>Reintentar</button>}
                </div>
              )}
              {buyerAccess === "owner" && <a className="block text-xs underline" href="/planes">Gestionar plan de la tienda</a>}
              {storeCanSell === true && buyerAccess === "guest" && <a className="block text-xs underline" href={loginUrl}>Iniciar sesión para comprar</a>}
              {storeCanSell === true && buyerAccess === "restricted" && <p className="text-xs text-amber-300">Tu cuenta no puede crear pedidos.</p>}
              {storeCanSell === true && buyerAccess === "buyer" && (
              <button
                type="submit"
                disabled={isSubmitting || product.stock === 0 || storeCanSell!==true}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-theme-primary to-theme-accent text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? (
                  "Procesando pedido..."
                ) : product.stock === 0 ? (
                  "Producto Agotado"
                ) : (
                  <>
                    <FiCheck className="w-4 h-4" />
                    <span>Crear pedido y pagar</span>
                  </>
                )}
              </button>
              )}
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
  onClick?: () => void;
  href?: string;
}

export function ProductCard({ product, isLive = false, onClick, href }: ProductCardProps) {
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

  const Card = href ? "a" : "button";
  return (
    <Card
      href={href}
      type={href ? undefined : "button"}
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-xl border text-left no-underline transition-all duration-300 cursor-pointer backdrop-blur-md ${isLive
          ? "border-live-red/30 hover:border-live-red/60 bg-[var(--theme-surface-alt)]/70 shadow-lg shadow-live-red/5"
          : "border-[var(--theme-primary)]/20 hover:border-[var(--theme-primary)]/60 bg-[var(--theme-surface-alt)]/70 hover:bg-[var(--theme-surface-alt)]/90 hover:-translate-y-1 shadow-md"
        }`}
    >
      <div className="relative h-44 overflow-hidden bg-black/35">
        <FallbackImage
          src={imageUrl}
          alt={product.name}
          fallbackName={product.name}
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
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
    </Card>
  );
}
