import { useState, useEffect } from "react";
import { OrderService, type Order } from "../../lib/types/services";
import { formatBolivianos } from "./ProductList";
import { FiCheck, FiX, FiTruck, FiClock, FiPhone, FiMapPin, FiMessageSquare, FiInbox } from "react-icons/fi";

interface OrderManagerProps {
    token?: string | null;
}

export function OrderManager({ token }: OrderManagerProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        loadOrders();
    }, [filterStatus]);

    async function loadOrders() {
        setLoading(true);
        setError(null);
        const res = await OrderService.getStoreOrders(token ?? undefined, filterStatus || undefined);
        if (res.error) {
            setError(res.error);
        } else {
            setOrders(res.data ?? []);
        }
        setLoading(false);
    }

    async function handleStatusChange(orderId: string, nextStatus: "CONFIRMADO" | "CANCELADO" | "ENTREGADO") {
        setActionLoading(orderId);
        const res = await OrderService.updateOrderStatus(orderId, nextStatus, token ?? undefined);
        if (res.data) {
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
        } else if (res.error) {
            alert(`Error al actualizar estado: ${res.error}`);
        }
        setActionLoading(null);
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold panel-font-display flex items-center gap-2">
                        <FiInbox className="w-7 h-7" /> Gestión de Pedidos y Reservas
                        <span className="text-xs font-normal text-[var(--panel-muted)]">({orders.length})</span>
                    </h1>
                    <p className="text-sm text-[var(--panel-muted)] mt-0.5">
                        Coordina pagos, envíos y dinámica de reservas en vivo.
                    </p>
                </div>

                {/* Filtros de estado */}
                <div className="flex items-center gap-2">
                    {["", "PENDIENTE", "CONFIRMADO", "ENTREGADO", "CANCELADO"].map((status) => (
                        <button
                            key={status}
                            type="button"
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterStatus === status
                                    ? "bg-[var(--panel-primary)] text-white"
                                    : "border border-[var(--panel-border)] text-[var(--panel-muted)] hover:text-white"
                                }`}
                        >
                            {status === "" ? "Todos" : status}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="panel-card h-28 animate-pulse bg-white/5" />
                    ))}
                </div>
            ) : error ? (
                <div className="panel-card p-6 text-center text-red-400 text-sm">
                    Error al cargar pedidos: {error}
                </div>
            ) : orders.length === 0 ? (
                <div className="panel-card p-12 text-center text-[var(--panel-muted)]">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "color-mix(in srgb, var(--panel-primary) 15%, transparent)", color: "var(--panel-accent)" }}>
                        <FiInbox className="w-7 h-7" />
                    </div>
                    <p className="font-semibold text-[var(--panel-text)]">No hay pedidos registrados</p>
                    <p className="text-xs mt-1">Los pedidos realizados por compradores B2C aparecerán aquí.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => {
                        const isPending = order.status === "PENDIENTE";
                        const isConfirmed = order.status === "CONFIRMADO";

                        return (
                            <div key={order.id} className="panel-card p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--panel-border)] pb-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.status === "PENDIENTE"
                                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                    : order.status === "CONFIRMADO"
                                                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                        : order.status === "ENTREGADO"
                                                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                                                }`}
                                        >
                                            {order.status}
                                        </span>
                                        {order.is_live_order && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-600/30">
                                                🔴 Pedido en Live
                                            </span>
                                        )}
                                        <span className="text-xs text-[var(--panel-muted)]">
                                            {new Date(order.created_at).toLocaleString("es-BO")}
                                        </span>
                                    </div>

                                    <span className="text-base font-bold text-[var(--panel-accent)]">
                                        Total: {formatBolivianos(order.total_amount)}
                                    </span>
                                </div>

                                {/* Info del Cliente y Dirección */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <span className="text-[var(--panel-muted)] block">Cliente:</span>
                                        <strong className="text-sm text-[var(--panel-text)]">{order.customer_name}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[var(--panel-muted)] block">WhatsApp / Contacto:</span>
                                        <a
                                            href={`https://wa.me/${order.customer_contact.replace(/\D/g, "")}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[var(--panel-accent)] font-semibold inline-flex items-center gap-1.5 underline"
                                        >
                                            <FiPhone className="w-3.5 h-3.5" />
                                            {order.customer_contact}
                                        </a>
                                    </div>
                                    <div>
                                        <span className="text-[var(--panel-muted)] block">Dirección:</span>
                                        <span className="text-[var(--panel-text)] flex items-center gap-1">
                                            <FiMapPin className="w-3.5 h-3.5 text-[var(--panel-muted)] shrink-0" />
                                            {order.delivery_address || "Recojo en tienda"}
                                        </span>
                                    </div>
                                </div>

                                {/* Items del pedido */}
                                <div className="bg-black/30 rounded-lg p-3 space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase text-[var(--panel-muted)] block">
                                        Productos reservados:
                                    </span>
                                    {order.order_items?.map((item) => (
                                        <div key={item.id} className="flex justify-between text-xs">
                                            <span>
                                                {item.quantity}x <strong className="text-[var(--panel-text)]">{item.product_name}</strong>
                                            </span>
                                            <span className="text-[var(--panel-muted)]">
                                                {formatBolivianos(item.subtotal)} ({formatBolivianos(item.unit_price)} c/u)
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Acciones de cambio de estado */}
                                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
                                    {isPending && (
                                        <>
                                            <button
                                                type="button"
                                                disabled={actionLoading === order.id}
                                                onClick={() => handleStatusChange(order.id, "CONFIRMADO")}
                                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <FiCheck className="w-3.5 h-3.5" />
                                                Confirmar Pago
                                            </button>
                                            <button
                                                type="button"
                                                disabled={actionLoading === order.id}
                                                onClick={() => handleStatusChange(order.id, "CANCELADO")}
                                                className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <FiX className="w-3.5 h-3.5" />
                                                Cancelar y Liberar
                                            </button>
                                        </>
                                    )}

                                    {isConfirmed && (
                                        <button
                                            type="button"
                                            disabled={actionLoading === order.id}
                                            onClick={() => handleStatusChange(order.id, "ENTREGADO")}
                                            className="panel-btn-primary px-4 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                            <FiTruck className="w-3.5 h-3.5" />
                                            Marcar como Entregado
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}