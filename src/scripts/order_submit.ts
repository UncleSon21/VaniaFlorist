// src/scripts/order_submit.ts — FIXED VERSION
// ✅ Removed alert(), redirects to confirmation page instead

import { createOrder, fetchProductById } from "./db";
import { loadCart, saveCart } from "./cart";

async function computeTotalsFromDb() {
  const cart = loadCart();
  let total_cents = 0;
  const items: any[] = [];

  for (const line of cart) {
    const p = await fetchProductById(line.productId);
    const v = p.variants.find((x: any) => x.code === line.variantId)!;
    let line_cents = v.priceCents;
    line_cents *= line.qty;
    total_cents += line_cents;

    items.push({
      product_id: p.id,
      variant_code: v.code,
      qty: line.qty,
      line_cents
    });
  }
  return { total_cents, items };
}

export async function submitOrder() {
  const name = (document.getElementById("name") as HTMLInputElement).value;
  const phone = (document.getElementById("phone") as HTMLInputElement).value;
  const delivery_date = (document.getElementById("delivery-date") as HTMLInputElement).value;
  const notes = (document.getElementById("notes") as HTMLTextAreaElement)?.value || "";

  const { total_cents, items } = await computeTotalsFromDb();
  const orderId = await createOrder({
    customer_name: name,
    customer_phone: phone,
    delivery_date,
    notes,
    total_cents,
    items,
  });

  // ✅ FIX: Clear cart and redirect instead of alert()
  saveCart([]);
  window.location.href = `order-confirmation.html?id=${orderId}`;
}