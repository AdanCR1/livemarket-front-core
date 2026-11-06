import { useEffect, useState } from 'react';
import { getPurchase, listPurchases } from '../../lib/commerce/client';
import { formatBOB, type PurchaseOrder } from '../../lib/types/commerce';
import { PaymentQR } from './PaymentQR';
import { OrderChat } from './OrderChat';
import { 
  FiShoppingBag, 
  FiClock, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiPackage, 
  FiMapPin, 
  FiRefreshCw, 
  FiChevronRight 
} from 'react-icons/fi';

export function MyOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<PurchaseOrder | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setError('');
      setOrders(await listPurchases());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al obtener tus pedidos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PENDING_PAYMENT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
            <FiClock className="w-3 h-3" /> Pendiente de pago
          </span>
        );
      case 'PAID':
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center gap-1">
            <FiCheckCircle className="w-3 h-3" /> Pago confirmado
          </span>
        );
      case 'PREPARING':
        return <span className="text-xs text-blue-300">En preparación</span>;
      case 'READY':
      case 'READY_FOR_PICKUP':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center gap-1">
            <FiPackage className="w-3 h-3" /> Listo para recogida
          </span>
        );
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
            <FiCheckCircle className="w-3 h-3" /> Entregado
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-300 flex items-center gap-1">
            <FiAlertTriangle className="w-3 h-3" /> Cancelado
          </span>
        );
      case 'DISPUTED':
        return <span className="text-xs text-red-300">En disputa</span>;
      case 'EXPIRED':
        return <span className="text-xs text-amber-300">Vencido</span>;
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-market-muted">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-market-white space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-market-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <FiShoppingBag className="w-7 h-7 text-theme-primary" /> Mis Pedidos y Reservas
          </h1>
          <p className="text-xs text-market-muted mt-1">
            Historial de compras, estado del pedido y pagos de Solari.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-market-border/80 hover:bg-white/5 active:scale-95 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Estados de carga y error */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-36 rounded-2xl bg-white/5 border border-market-border/30 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <FiAlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="rounded-2xl border border-market-border/60 bg-market-card/50 p-12 text-center space-y-3">
          <FiPackage className="w-12 h-12 text-market-muted/40 mx-auto" />
          <h3 className="text-base font-semibold text-white">No tienes compras registradas</h3>
          <p className="text-xs text-market-muted max-w-sm mx-auto">
            Explora las tiendas y productos en vivo de MarketCloud para realizar tu primer pedido.
          </p>
        </div>
      )}

      {/* Listado de Pedidos */}
      <div className="space-y-4">
        {orders.map(o => {
          const isAwaitingPayment =
            o.status === 'PENDING_PAYMENT' &&
            o.payment_status === 'PENDING' &&
            (!o.reservation_expires_at || Date.parse(o.reservation_expires_at) > Date.now());

          return (
            <article
              key={o.id}
              className="rounded-2xl border border-market-border/60 bg-market-card/80 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-lg hover:border-market-border transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-market-border/40 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-white">
                    Pedido #{o.id.slice(0, 8).toUpperCase()}
                  </span>
                  {getStatusBadge(o.status)}
                </div>
                <span className="text-xs text-market-muted">
                  {new Date(o.created_at).toLocaleString('es-BO', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>

              {/* Items del pedido */}
              <div className="space-y-2 py-1">
                {o.order_items?.map((item, i) => (
                  <div key={item.id || i} className="flex justify-between items-center text-xs">
                    <span className="text-white/90">
                      <strong className="text-theme-primary mr-1.5">{item.quantity}x</strong> 
                      {item.name_snapshot || item.product_name || item.name || `Producto ${item.product_id}`}
                    </span>
                    <span className="text-market-muted font-medium">
                      {formatBOB(item.subtotal ?? Number(item.unit_price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {import.meta.env.PUBLIC_MS5_CHAT_ENABLED === 'true' && <OrderChat orderId={o.id} />}
              {/* Footer con Total y Acciones */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-market-border/40">
                <div className="flex items-center gap-4 text-xs text-market-muted">
                  <span className="flex items-center gap-1">
                    <FiMapPin className="w-3.5 h-3.5 text-theme-primary" /> {o.delivery_type === 'DELIVERY' ? 'Entrega a domicilio' : 'Recojo en tienda'}
                  </span>
                  <span className="text-sm font-bold text-white">
                    Total: <strong className="text-theme-primary">{formatBOB(o.total)}</strong>
                  </span>
                </div>

                {isAwaitingPayment && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setPaying(await getPurchase(o.id));
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Error al cargar pago');
                      }
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-theme-primary to-theme-accent text-white text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer self-end sm:self-auto"
                  >
                    <span>Pagar con QR</span>
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {paying && (
        <PaymentQR
          order={paying}
          onClose={() => {
            setPaying(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}
