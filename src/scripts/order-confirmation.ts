// src/scripts/order-confirmation.ts
// UPDATED: Now handles both direct order ID and Stripe session ID redirects.
// After Stripe checkout, the URL contains ?session_id=cs_xxx
// We poll Supabase for the order (webhook may take a moment to create it).

import { supabase } from "./db";
import { formatPrice } from "./utils";

const FREE_DELIVERY_THRESHOLD_CENTS = 5000;
const DELIVERY_FEE_CENTS            = 1500;

function $(id: string) { return document.getElementById(id) as HTMLElement; }
function fmt(cents: number) { return formatPrice(cents / 100); }

/* ── Fetch order by ID ── */
async function fetchOrderById(orderId: string) {
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

/* ── Fetch order by Stripe session ID (with retry/polling) ── */
async function fetchOrderBySessionId(sessionId: string, retries = 8): Promise<{ order: any; items: any[] }> {
  for (let i = 0; i < retries; i++) {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, delivery_date, notes, total_cents, status, created_at")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (order) {
      // Found the order — now fetch items
      const { data: items } = await supabase
        .from("order_items")
        .select(`
          id, qty, line_cents, variant_code,
          products ( name, product_images ( image_url, sort_order ) ),
          variants:variant_code ( name )
        `)
        .eq("order_id", order.id);

      return { order, items: items ?? [] };
    }

    // Webhook hasn't fired yet — wait and retry
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 1500)); // wait 1.5s between retries
    }
  }

  throw new Error("Order not found — the payment was successful but the order is still being processed. Please check back in a moment.");
}

/* ── Format date nicely ── */
function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/* ── Derive delivery fee ── */
function deriveDelivery(totalCents: number, items: any[]) {
  const itemsTotal = items.reduce((s: number, i: any) => s + i.line_cents, 0);
  const diff = totalCents - itemsTotal;
  if (diff > 0 && diff <= DELIVERY_FEE_CENTS) return diff;
  if (itemsTotal >= FREE_DELIVERY_THRESHOLD_CENTS) return 0;
  if (totalCents === itemsTotal) return 0;
  return DELIVERY_FEE_CENTS;
}

/* ── Render ── */
function render(order: any, items: any[]) {
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
    ["Payment",       order.status === "paid" ? "__PAID__" : order.status],
  ];

  if (order.notes) {
    const displayNotes = order.notes
      .replace(/Deliver to:.*$/m, "")
      .replace(/Customer will pick up\./i, "")
      .replace(/Preferred time:.*$/m, "")
      .trim();
    if (displayNotes) detailData.push(["Notes", displayNotes]);
  }

  $("order-details").innerHTML = detailData.map(([k, v]) => {
    const isPaid = v === "__PAID__";
    const valHtml = isPaid
      ? `<span class="detail-val paid"><span class="paid-dot"></span> Paid</span>`
      : `<span class="detail-val">${v}</span>`;
    return `
    <div class="detail-row">
      <span class="detail-key">${k}</span>
      ${valHtml}
    </div>
  `;
  }).join("");

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

  // Show content (hero already visible, loading hidden by main())
  $("conf-content").style.display  = "block";
}

/* ── Boot ── */
async function main() {
  const params    = new URLSearchParams(window.location.search);
  const orderId   = params.get("id");
  const sessionId = params.get("session_id");

  // No params at all — show error immediately
  if (!orderId && !sessionId) {
    $("conf-error").style.display = "block";
    return;
  }

  // ✅ Show hero checkmark + loading card IMMEDIATELY
  // User sees "Order Confirmed!" right away instead of blank screen
  $("conf-hero").style.display    = "block";
  $("conf-loading").style.display = "block";

  try {
    let result;

    if (orderId) {
      result = await fetchOrderById(orderId);
    } else {
      result = await fetchOrderBySessionId(sessionId!);
    }

    // Hide loading, show full order details
    $("conf-loading").style.display = "none";
    render(result.order, result.items);

    // Clean up URL
    if (sessionId && result.order.id) {
      window.history.replaceState({}, "", `order-confirmation.html?id=${result.order.id}`);
    }
  } catch (err: any) {
    console.error("Failed to load order:", err);
    $("conf-loading").style.display = "none";
    $("conf-error").style.display   = "block";
  }
}

main();