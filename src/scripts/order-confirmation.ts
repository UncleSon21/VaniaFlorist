// src/scripts/order-confirmation.ts
// Reads ?id= from the URL, fetches the order from Supabase,
// and renders the full confirmation view.

import { supabase } from "./db";
import { formatPrice } from "./utils";

const FREE_DELIVERY_THRESHOLD_CENTS = 5000;
const DELIVERY_FEE_CENTS            = 1500;

function $(id: string) { return document.getElementById(id) as HTMLElement; }
function fmt(cents: number) { return formatPrice(cents / 100); }

/* ── Fetch order + items + product names from Supabase ── */
async function fetchOrder(orderId: string) {
  const { data: order, error: e1 } = await supabase
    .from("orders")
    .select("id, customer_name, customer_phone, delivery_date, notes, total_cents, status, created_at")
    .eq("id", orderId)
    .single();

  if (e1 || !order) throw e1 ?? new Error("Order not found");

  const { data: items, error: e2 } = await supabase
    .from("order_items")
    .select(`
      id, qty, line_cents, variant_code,
      products ( name, product_images ( image_url, sort_order ) ),
      variants:variant_code ( name )
    `)
    .eq("order_id", orderId);

  if (e2) throw e2;

  return { order, items: items ?? [] };
}

/* ── Format date nicely ── */
function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/* ── Derive delivery fee from total (best-effort) ── */
function deriveDelivery(totalCents: number, items: any[]) {
  const itemsTotal = items.reduce((s: number, i: any) => s + i.line_cents, 0);
  // If total > itemsTotal, the difference is delivery (or rounding)
  const diff = totalCents - itemsTotal;
  if (diff > 0 && diff <= DELIVERY_FEE_CENTS) return diff;
  if (itemsTotal >= FREE_DELIVERY_THRESHOLD_CENTS) return 0;
  // If total equals itemsTotal, delivery was free
  if (totalCents === itemsTotal) return 0;
  return DELIVERY_FEE_CENTS;
}

/* ── Render ── */
function render(order: any, items: any[]) {
  // Parse notes for pickup/delivery hint
  const isPickup = (order.notes || "").toLowerCase().includes("pick up") ||
                   (order.notes || "").toLowerCase().includes("pickup");

  // Order ID
  $("order-id-display").textContent = order.id;

  // Copy button
  $("copy-id-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(order.id).then(() => {
      const btn = $("copy-id-btn");
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.classList.remove("copied");
      }, 2000);
    });
  });

  // Detail rows
  const detailData: Array<[string, string]> = [
    ["Name",          order.customer_name],
    ["Phone",         order.customer_phone],
    ["Delivery Date", fmtDate(order.delivery_date)],
    ["Delivery Type", isPickup ? "Pickup" : "Delivery"],
  ];

  if (order.notes) {
    // Strip the "Deliver to:" / "Customer will pick up." internal notes for display
    const displayNotes = order.notes
      .replace(/Deliver to:.*$/m, "")
      .replace(/Customer will pick up\./i, "")
      .replace(/Preferred time:.*$/m, "")
      .trim();
    if (displayNotes) detailData.push(["Notes", displayNotes]);
  }

  $("order-details").innerHTML = detailData.map(([k, v]) => `
    <div class="detail-row">
      <span class="detail-key">${k}</span>
      <span class="detail-val">${v}</span>
    </div>
  `).join("");

  // Items
  $("order-items-list").innerHTML = items.map((item: any) => {
    const productName  = item.products?.name ?? "Flower Arrangement";
    const variantName  = item.variants?.name ?? item.variant_code ?? "";
    const images       = item.products?.product_images ?? [];
    const sortedImages = [...images].sort((a: any, b: any) => a.sort_order - b.sort_order);
    const imgUrl       = sortedImages[0]?.image_url ?? "";

    return `
      <div class="order-item-row">
        <div class="order-item-img">
          ${imgUrl
            ? `<img src="${imgUrl}" alt="${productName}" onerror="this.style.display='none'">`
            : "🌹"}
        </div>
        <div class="order-item-info">
          <div class="order-item-name">${productName}</div>
          <div class="order-item-meta">${variantName}${item.qty > 1 ? ` × ${item.qty}` : ""}</div>
        </div>
        <div class="order-item-price">${fmt(item.line_cents)}</div>
      </div>
    `;
  }).join("");

  // Cost breakdown
  const subtotal  = items.reduce((s: number, i: any) => s + i.line_cents, 0);
  const delivery  = isPickup ? 0 : deriveDelivery(order.total_cents, items);
  const total     = order.total_cents;

  $("cost-rows").innerHTML = `
    <div class="cost-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div class="cost-row"><span>Delivery</span><span>${delivery === 0 ? "FREE" : fmt(delivery)}</span></div>
    <div class="cost-row total"><span>Total Paid</span><span>${fmt(total)}</span></div>
  `;

  // Show content
  $("conf-loading").style.display  = "none";
  $("conf-content").style.display  = "block";
}

/* ── Boot ── */
async function main() {
  const params  = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  if (!orderId) {
    $("conf-loading").style.display = "none";
    $("conf-error").style.display   = "block";
    return;
  }

  try {
    const { order, items } = await fetchOrder(orderId);
    render(order, items);
  } catch (err) {
    console.error("Failed to load order:", err);
    $("conf-loading").style.display = "none";
    $("conf-error").style.display   = "block";
  }
}

main();