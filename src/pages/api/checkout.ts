import type { APIRoute } from "astro";
import { MS2_URL } from "../../lib/constants";

const MS4_URL = (import.meta.env.PUBLIC_MS4_URL || "http://localhost:8790").replace(/\/+$/, "");

interface CheckoutItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

interface CheckoutBody {
  store_id: string;
  customer_name: string;
  customer_contact: string;
  delivery_address?: string;
  is_live_order?: boolean;
  notes?: string;
  items: CheckoutItem[];
}

export const POST: APIRoute = async ({ request, locals }) => {
  const token = locals.token;
  const session = locals.session;

  // 1. Validar autenticación
  if (!token || !session) {
    return new Response(
      JSON.stringify({ success: false, error: "Debes iniciar sesión para realizar un pedido." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = (await request.json().catch(() => null)) as CheckoutBody;
  if (!body || !body.store_id || !Array.isArray(body.items) || body.items.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: "Datos del pedido incompletos o inválidos." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. FASE 1: Verificación de stock en MS2
  const catalogRes = await fetch(`${MS2_URL}/api/catalog/public/store/${body.store_id}/products`);
  const catalogJson = await catalogRes.json().catch(() => ({}));
  const storeProducts: any[] = catalogJson.data ?? [];

  for (const item of body.items) {
    const prod = storeProducts.find((p) => p.id === item.product_id);
    if (!prod) {
      return new Response(
        JSON.stringify({ success: false, error: `El producto "${item.product_name}" ya no existe.` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (prod.stock < item.quantity) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Stock insuficiente para "${prod.name}". Disponibles: ${prod.stock}, Solicitados: ${item.quantity}.`,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 3. FASE 2: Creación de la orden en MS4
  let orderData: any = null;
  try {
    const orderRes = await fetch(`${MS4_URL}/api/orders/b2c`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    orderData = await orderRes.json().catch(() => ({}));

    if (!orderRes.ok || !orderData.success) {
      throw new Error(orderData.error ?? "MS4 rechazó la creación de la orden.");
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al registrar el pedido en el servicio de órdenes.",
        detalle: err.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. FASE 3: Descontar stock en MS2 (usando el endpoint de actualización)
  // Nota: si el usuario no es el dueño, se intenta la actualización y si falla por permisos,
  // la orden ya queda registrada en MS4 como PENDIENTE para que el vendedor B2B la valide manualmente.
  for (const item of body.items) {
    const prod = storeProducts.find((p) => p.id === item.product_id);
    if (prod) {
      const updatedStock = Math.max(0, prod.stock - item.quantity);
      await fetch(`${MS2_URL}/api/catalog/private/products/${prod.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock: updatedStock }),
      }).catch((e) => console.warn(`[Checkout] Descuento de stock diferido: ${e.message}`));
    }
  }

  return new Response(JSON.stringify({ success: true, data: orderData.data }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};