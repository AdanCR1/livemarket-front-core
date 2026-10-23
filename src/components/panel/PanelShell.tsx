import { useState, useEffect } from "react";
import {
  FiMenu,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
} from "react-icons/fi";
import { ThemeProvider } from "./ThemeProvider";
import { PanelOverview } from "./PanelOverview";
import { ProductList } from "./ProductList";
import { ProductForm } from "./ProductForm";
import { LiveManager } from "./LiveManager";
import { getPanelTheme } from "../../lib/panel-themes";
import { InventoryService, MediaService } from "../../lib/types/services";
import { OrderManager } from "./OrderManager";
import { FiClipboard } from "react-icons/fi";
import type {
  ProductWithMedia,
  CreateProductPayload,
  MediaSlotInput,
} from "../../lib/types/types";

export interface PanelShellProps {
  storeId: string;
  storeName: string;
  niche: string;
  initialIsLive?: boolean;
  userEmail?: string;
  token?: string | null;
}

type PanelSection = "overview" | "products" | "product-form" | "live" | "orders" | "settings";

interface FeedbackNotice {
  type: "success" | "error" | "warning";
  title: string;
  message: string;
}

export function PanelShell({
  storeId,
  storeName,
  niche,
  initialIsLive = false,
  userEmail,
  token,
}: PanelShellProps) {
  const theme = getPanelTheme(niche);
  const NicheIcon = theme.icon;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<PanelSection>("overview");
  const [products, setProducts] = useState<ProductWithMedia[]>([]);
  const [pinnedProducts, setPinnedProducts] = useState<ProductWithMedia[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductWithMedia | null>(null);
  const [isLive, setIsLive] = useState(initialIsLive);
  const [loading, setLoading] = useState(true);

  // Estado para Modales / Alertas de Éxito y Error
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadStoreData();
  }, [storeId]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeSection]);

  // Auto-cerrar notificaciones de éxito después de 5 segundos
  useEffect(() => {
    if (!feedback || feedback.type === "error") return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function loadStoreData() {
    setLoading(true);
    const [catalogRes, liveRes] = await Promise.all([
      InventoryService.getProductsByStore(storeId),
      InventoryService.getLiveProducts(storeId),
    ]);

    if (catalogRes.error) {
      setFeedback({
        type: "error",
        title: "Error al cargar inventario",
        message: catalogRes.error,
      });
    } else {
      setProducts(catalogRes.data ?? []);
    }

    if (liveRes.error) {
      // El live es secundario: no bloquea la UI, pero avisamos.
      console.warn(`[PanelShell] Live no disponible: ${liveRes.error}`);
      setPinnedProducts([]);
    } else {
      setPinnedProducts(liveRes.data ?? []);
    }

    setLoading(false);
  }
  async function handleSaveProduct(
    payload: CreateProductPayload,
    mediaSlots: MediaSlotInput[]
  ) {
    let targetProduct: ProductWithMedia | null = null;
    let mediaWarning: string | null = null;
    const isEditing = !!editingProduct;

    // ─── Paso 1: crear o actualizar el producto ───
    if (editingProduct) {
      const res = await InventoryService.updateProduct(
        storeId,
        editingProduct.id,
        payload,
        token ?? undefined
      );
      if (res.error || !res.data) {
        setFeedback({
          type: "error",
          title: "No se pudo actualizar el producto",
          message: res.error ?? "Error desconocido en MS Catalog.",
        });
        throw new Error(res.error ?? "No se pudo actualizar el producto");
      }
      targetProduct = { ...editingProduct, ...res.data };
    } else {
      const res = await InventoryService.createProduct(payload, token ?? undefined);
      if (res.error || !res.data) {
        setFeedback({
          type: "error",
          title: "Error al crear el producto",
          message: res.error ?? "El microservicio de catálogo rechazó la solicitud.",
        });
        throw new Error(res.error ?? "Error al crear el producto");
      }
      targetProduct = res.data;
    }

    // ─── Paso 2: procesar media (subir nuevos a MS3, mantener existentes) ───
    if (mediaSlots.length > 0 && targetProduct) {
      const mediaRows: Array<{ order: number; url: string; media_type: "image" | "video" }> = [];

      for (const slot of mediaSlots) {
        if (slot.file) {
          // Subir nueva imagen a MS3
          const uploadRes = await MediaService.uploadProductFile(slot.file, token ?? undefined);
          if (uploadRes.error || !uploadRes.data) {
            mediaWarning = uploadRes.error ?? `No se pudo subir la imagen del slot ${slot.order}.`;
            continue;
          }
          mediaRows.push({
            order: slot.order,
            url: uploadRes.data.relative_url,
            media_type: uploadRes.data.media_type,
          });
        } else if (slot.existingUrl) {
          // Mantener la URL existente (sin subir nada)
          mediaRows.push({
            order: slot.order,
            url: slot.existingUrl,
            media_type: "image",
          });
        }
      }

      if (mediaRows.length > 0) {
        const attachRes = await InventoryService.attachProductMedia(
          targetProduct.id,
          mediaRows,
          token ?? undefined
        );
        if (!attachRes.error && attachRes.data) {
          targetProduct = {
            ...targetProduct,
            media: attachRes.data as any[],
          };
        } else if (attachRes.error) {
          mediaWarning = attachRes.error;
        }
      }
    }

    // ─── Paso 3: actualizar estado local ───
    if (isEditing) {
      const finalProduct = targetProduct!;
      setProducts((prev) => prev.map((p) => (p.id === finalProduct.id ? finalProduct : p)));
    } else {
      setProducts((prev) => [targetProduct!, ...prev]);
    }

    // ─── Paso 4: feedback ───
    if (mediaWarning) {
      setFeedback({
        type: "warning",
        title: isEditing
          ? "Producto actualizado (multimedia pendiente)"
          : "Producto creado (multimedia pendiente)",
        message: `"${targetProduct!.name}" se guardó, pero la subida multimedia reportó: ${mediaWarning}`,
      });
    } else {
      setFeedback({
        type: "success",
        title: isEditing ? "Producto actualizado" : "¡Producto publicado con éxito!",
        message: `"${targetProduct!.name}" se ${isEditing ? "actualizó" : "publicó"} correctamente.`,
      });
    }

    setEditingProduct(null);
    setActiveSection("products");
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return;
    const targetId = productToDelete;
    setProductToDelete(null);

    const res = await InventoryService.deleteProduct(storeId, targetId, token ?? undefined);
    if (res.error) {
      setFeedback({
        type: "error",
        title: "No se pudo eliminar el producto",
        message: res.error,
      });
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== targetId));
    setPinnedProducts((prev) => prev.filter((p) => p.id !== targetId));
    setFeedback({
      type: "success",
      title: "Producto eliminado",
      message: "El producto fue removido del inventario.",
    });
  }

  async function handleTogglePinProduct(product: ProductWithMedia) {
    const exists = pinnedProducts.some((p) => p.id === product.id);
    const res = await InventoryService.togglePinLiveProduct(
      storeId,
      product.id,
      !exists,
      token ?? undefined
    );

    if (res.error) {
      setFeedback({
        type: "error",
        title: "Error al actualizar producto en vivo",
        message: res.error,
      });
      return;
    }

    if (exists) {
      setPinnedProducts((prev) => prev.filter((p) => p.id !== product.id));
      setFeedback({
        type: "success",
        title: "Producto desanclado",
        message: `"${product.name}" se quitó de la transmisión en vivo.`,
      });
    } else {
      setPinnedProducts((prev) => [...prev, product]);
      setFeedback({
        type: "success",
        title: "Producto fijado en el Live",
        message: `"${product.name}" ahora aparece destacado en tu transmisión.`,
      });
    }
  }

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    window.location.href = "/login";
  }

  const navItems: { id: PanelSection; label: string; icon: any }[] = [
    { id: "overview", label: "Resumen", icon: theme.icons.dashboard },
    { id: "products", label: "Productos", icon: theme.icons.products },
    { id: "orders", label: "Pedidos", icon: FiClipboard },
    { id: "live", label: "Modo Live", icon: theme.icons.live },
    { id: "settings", label: "Configuración", icon: theme.icons.settings },
  ];

  const sectionLabels: Record<PanelSection, string> = {
    overview: "Resumen general",
    products: "Mis Productos",
    "product-form": editingProduct ? "Editar producto" : "Nuevo producto",
    orders: "Gestión de Pedidos",
    live: "Transmisión en vivo",
    settings: "Configuración de tienda",
  };

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 1024 : false
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 1024);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <ThemeProvider niche={niche}>
      <div className="min-h-screen flex flex-col">
        {/* ═══════ BANNER / MODAL FLOTANTE DE ÉXITO O ERROR ═══════ */}
        {feedback && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100%-2.5rem)] animate-slide-up">
            <div
              className={`p-4 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-3.5 ${feedback.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
                : feedback.type === "warning"
                  ? "bg-amber-950/90 border-amber-500/40 text-amber-100"
                  : "bg-red-950/90 border-red-500/40 text-red-100"
                }`}
            >
              <div className="mt-0.5 shrink-0">
                {feedback.type === "success" && (
                  <FiCheckCircle className="w-5 h-5 text-emerald-400" />
                )}
                {feedback.type === "warning" && (
                  <FiAlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                {feedback.type === "error" && (
                  <FiXCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold">{feedback.title}</h4>
                <p className="text-xs opacity-90 mt-1 leading-relaxed break-words">
                  {feedback.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════ MODAL DE CONFIRMACIÓN PARA ELIMINAR PRODUCTO ═══════ */}
        {productToDelete && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="panel-card max-w-sm w-full p-6 space-y-4 border border-red-500/30">
              <div className="flex items-center gap-3 text-red-400">
                <FiAlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-[var(--panel-text)]">
                  ¿Eliminar este producto?
                </h3>
              </div>
              <p className="text-xs text-[var(--panel-muted)] leading-relaxed">
                Esta acción eliminará el producto de tu catálogo en MS2 de forma permanente.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 rounded-lg border border-[var(--panel-border)] text-xs font-medium text-[var(--panel-muted)] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProduct}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ HEADER ═══════ */}
        <header className="panel-header h-16 px-4 lg:px-6 sticky top-0 z-30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                isMobile
                  ? setSidebarOpen(!sidebarOpen)
                  : setSidebarCollapsed(!sidebarCollapsed)
              }
              aria-label="Alternar menú lateral"
              className="p-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--panel-primary)] text-[var(--panel-muted)] hover:text-[var(--panel-text)] transition-colors"
            >
              {sidebarOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${theme.primaryColor}25, ${theme.accentColor}15)`,
                  color: theme.primaryColor,
                }}
              >
                <NicheIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base panel-font-display tracking-tight store-name truncate max-w-[150px] lg:max-w-none">
                    {storeName}
                  </span>
                  <span
                    className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${theme.primaryColor}22`,
                      color: theme.accentColor,
                    }}
                  >
                    <NicheIcon className="w-3 h-3" />
                    {theme.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 header-actions">
            <button
              type="button"
              onClick={() => setActiveSection("live")}
              className={`live-indicator ${isLive ? "live" : ""}`}
            >
              <span className="live-dot" />
              <span>{isLive ? "EN VIVO" : "OFFLINE"}</span>
            </button>

            <a
              href={`/${niche}/${storeId}`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--panel-border)] text-xs text-[var(--panel-muted)] hover:text-[var(--panel-text)] hover:border-[var(--panel-primary)] transition-colors view-store-link"
            >
              <span>Ver tienda</span>
              <theme.icons.external className="w-3.5 h-3.5" />
            </a>

            <div className="flex items-center gap-2 pl-2 border-l border-[var(--panel-border)]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: `linear-gradient(135deg, ${theme.primaryColor}30, ${theme.accentColor}20)`,
                  color: theme.accentColor,
                }}
              >
                <theme.icons.user className="w-4 h-4" />
              </div>
              <span className="hidden lg:inline text-xs font-medium text-[var(--panel-muted)] max-w-[140px] truncate user-email">
                {userEmail ?? "Perfil B2B"}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-lg text-[var(--panel-muted)] hover:text-red-400 transition-colors"
              >
                <theme.icons.logout className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ═══════ CUERPO ═══════ */}
        <div className="flex-1 flex relative">
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          <aside
            className={`panel-sidebar border-r border-[var(--panel-border)] bg-[var(--panel-surface)] flex flex-col justify-between ${sidebarCollapsed && !isMobile ? "collapsed" : ""
              } ${sidebarOpen ? "mobile-open" : ""}`}
          >
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const NavIcon = item.icon;
                const isActive =
                  activeSection === item.id ||
                  (activeSection === "product-form" && item.id === "products");
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setActiveSection(item.id);
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`panel-nav-item ${isActive ? "active" : ""}`}
                  >
                    <NavIcon className="nav-icon w-5 h-5" />
                    <span className="sidebar-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {!sidebarCollapsed && (
              <div className="p-4 m-3 rounded-xl bg-black/20 border border-[var(--panel-border)] text-xs space-y-2 sidebar-badge">
                <div
                  className="font-semibold flex items-center gap-2"
                  style={{ color: theme.accentColor }}
                >
                  <NicheIcon className="w-4 h-4" />
                  <span>Panel {theme.label}</span>
                </div>
                <p className="text-[11px] text-[var(--panel-muted)] leading-relaxed">
                  {theme.illustrationLabel}
                </p>
              </div>
            )}
          </aside>

          {/* Contenido Principal */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto panel-main">
            <div className="max-w-6xl mx-auto">
              {/* Breadcrumbs (solo navegación) */}
              <nav className="flex items-center gap-2 text-xs text-[var(--panel-muted)] mb-6 breadcrumbs">
                <span>Panel B2B</span>
                <span>/</span>
                <span>{theme.label}</span>
                <span>/</span>
                <span style={{ color: theme.accentColor }} className="font-medium">
                  {sectionLabels[activeSection]}
                </span>
              </nav>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 metric-grid">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="panel-card h-28 animate-pulse"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {activeSection === "overview" && (
                    <PanelOverview
                      niche={niche}
                      storeName={storeName}
                      products={products}
                      onNavigateProducts={() => setActiveSection("products")}
                      onNavigateNewProduct={() => {
                        setEditingProduct(null);
                        setActiveSection("product-form");
                      }}
                    />
                  )}

                  {activeSection === "products" && (
                    <ProductList
                      products={products}
                      niche={niche}
                      onAddClick={() => {
                        setEditingProduct(null);
                        setActiveSection("product-form");
                      }}
                      onEditClick={(product) => {
                        setEditingProduct(product);
                        setActiveSection("product-form");
                      }}
                      onDeleteClick={(productId) => setProductToDelete(productId)}
                    />
                  )}

                  {activeSection === "orders" && (
                    <OrderManager token={token} />
                  )}

                  {activeSection === "product-form" && (
                    <ProductForm
                      storeId={storeId}
                      niche={niche}
                      initialProduct={editingProduct}
                      onCancel={() => {
                        setEditingProduct(null);
                        setActiveSection("products");
                      }}
                      onSubmit={handleSaveProduct}
                    />
                  )}

                  {activeSection === "live" && (
                    <LiveManager
                      storeName={storeName}
                      isLive={isLive}
                      allProducts={products}
                      pinnedProducts={pinnedProducts}
                      onToggleLive={setIsLive}
                      onTogglePinProduct={handleTogglePinProduct}
                    />
                  )}

                  {activeSection === "settings" && (
                    <div className="panel-card p-6 space-y-4 max-w-xl animate-fade-in">
                      {/* Configuración */}
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}