// src/scripts/checkout.ts — FIXED VERSION
// ✅ Replaced alert() on order failure with inline error banner

import { fetchProductById, createOrder } from "./db";
import { loadCart, saveCart } from "./cart";
import { formatPrice } from "./utils";

const FREE_DELIVERY_THRESHOLD_CENTS = 5000;
const DELIVERY_FEE_CENTS            = 1500;

function $(id: string) { return document.getElementById(id) as HTMLElement; }
function inp(id: string) { return document.getElementById(id) as HTMLInputElement; }
function fmt(cents: number) { return formatPrice(cents / 100); }

/* ─── Set minimum delivery date to today ─── */
function initDeliveryDate() {
  const el = inp("delivery-date");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  el.min = today.toISOString().split("T")[0] ?? "";
  if (!el.value) el.value = el.min;
}

/* ─── Delivery / Pickup toggle ─── */
function initDeliveryToggle() {
  const btnDelivery = $("btn-delivery");
  const btnPickup   = $("btn-pickup");
  const fields      = $("delivery-fields");
  const note        = $("pickup-note");

  btnDelivery.addEventListener("click", () => {
    btnDelivery.classList.add("active");
    btnPickup.classList.remove("active");
    fields.style.display = "block";
    note.style.display   = "none";
  });

  btnPickup.addEventListener("click", () => {
    btnPickup.classList.add("active");
    btnDelivery.classList.remove("active");
    fields.style.display = "none";
    note.style.display   = "block";
  });
}

/* ─── Enrich cart items from Supabase ─── */
type EnrichedLine = {
  name: string;
  variantName: string;
  image: string;
  priceCents: number;
  qty: number;
  productId: string;
  variantCode: string;
  addOnIds: string[];
  lineCents: number;
};

async function enrichCart(): Promise<EnrichedLine[]> {
  const cart = loadCart();
  const lines: EnrichedLine[] = [];

  for (const ci of cart) {
    try {
      const p = await fetchProductById(ci.productId);
      const variant = p.variants.find((v: any) => v.code === ci.variantId) || p.variants[0];
      let priceCents = variant?.priceCents ?? 0;

      for (const id of ci.addOnIds) {
        const ao = (p.addOns || []).find((a: any) => String(a.id) === String(id));
        if (ao) priceCents += ao.priceCents;
      }

      lines.push({
        name:        p.name,
        variantName: variant?.name ?? "",
        image:       p.images?.[0] ?? "",
        priceCents,
        qty:         ci.qty,
        productId:   ci.productId,
        variantCode: variant?.code ?? ci.variantId,
        addOnIds:    ci.addOnIds,
        lineCents:   priceCents * ci.qty,
      });
    } catch (err) {
      console.error("Failed to enrich cart item", ci.productId, err);
    }
  }

  return lines;
}

/* ─── Render order summary ─── */
function renderSummary(lines: EnrichedLine[]) {
  const subtotal  = lines.reduce((s, l) => s + l.lineCents, 0);
  const isFree    = subtotal >= FREE_DELIVERY_THRESHOLD_CENTS;
  const isPickup  = $("btn-pickup").classList.contains("active");
  const delivery  = (isFree || isPickup) ? 0 : DELIVERY_FEE_CENTS;
  const total     = subtotal + delivery;

  const itemsEl = $("summary-items");
  itemsEl.innerHTML = lines.map(l => `
    <div class="summary-line">
      <div class="summary-line-img">
        ${l.image
          ? `<img src="${l.image}" alt="${l.name}" onerror="this.style.display='none'">`
          : "🌹"}
      </div>
      <div class="summary-line-info">
        <div class="summary-line-name">${l.name}</div>
        <div class="summary-line-meta">${l.variantName}${l.qty > 1 ? ` × ${l.qty}` : ""}</div>
      </div>
      <div class="summary-line-price">${fmt(l.lineCents)}</div>
    </div>
  `).join("");

  $("co-subtotal").textContent  = fmt(subtotal);
  $("co-delivery").textContent  = (isFree || isPickup) ? "FREE" : fmt(delivery);
  $("co-total").textContent     = fmt(total);

  $("summary-loading").style.display = "none";
  $("summary-body").style.display    = "block";

  const placeBtn = $("btn-place-order") as HTMLButtonElement;
  placeBtn.disabled = false;

  return { subtotal, delivery, total };
}

/* ─── Validation ─── */
function validateField(fieldWrapperId: string, inputId: string, test: (v: string) => boolean): boolean {
  const wrap  = $(fieldWrapperId);
  const input = inp(inputId);
  const valid = test(input.value.trim());
  wrap.classList.toggle("has-error", !valid);
  return valid;
}

function isPickupMode() {
  return $("btn-pickup").classList.contains("active");
}

function validate(): boolean {
  const results = [
    validateField("field-name",  "name",  v => v.length >= 2),
    validateField("field-phone", "phone", v => /^[\d\s\+\-\(\)]{8,}$/.test(v)),
    validateField("field-delivery-date", "delivery-date", v => !!(v)),
  ];

  if (!isPickupMode()) {
    results.push(validateField("field-address", "address", v => v.length >= 5));
    results.push(validateField("field-suburb",  "suburb",  v => v.length >= 2));
  }

  return results.every(Boolean);
}

/* ─── Inline error banner (replaces alert) ─── */
function showOrderError(message: string) {
  // Remove existing error banner if any
  const existing = document.getElementById("order-error-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "order-error-banner";
  banner.style.cssText = `
    background: #fff5f5;
    border: 1px solid #f0c0c0;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    animation: fadeSlideIn 0.3s ease;
  `;
  banner.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e05252" stroke-width="2" style="flex-shrink:0;margin-top:2px;">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <div>
      <div style="font-weight:700;color:#c53030;font-size:0.9rem;margin-bottom:4px;">Order could not be placed</div>
      <div style="color:#9b2c2c;font-size:0.85rem;line-height:1.5;">${message}</div>
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#ccc;font-size:1.2rem;margin-left:auto;padding:0;" aria-label="Dismiss">✕</button>
  `;

  // Insert before the checkout form
  const formPanel = document.querySelector(".checkout-form-panel");
  if (formPanel && formPanel.parentElement) {
    formPanel.parentElement.insertBefore(banner, formPanel);
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/* ─── Submit ─── */
async function handleSubmit(lines: EnrichedLine[], totals: { subtotal: number; delivery: number; total: number }) {
  if (!validate()) return;

  // Clear any previous error
  const existing = document.getElementById("order-error-banner");
  if (existing) existing.remove();

  const btn = $("btn-place-order") as HTMLButtonElement;
  btn.disabled    = true;
  btn.textContent = "Placing order…";
  btn.classList.add("loading");

  const pickup = isPickupMode();

  const addressParts = pickup
    ? ["Pickup"]
    : [inp("address").value, inp("suburb").value, inp("postcode").value].filter(Boolean).join(", ");

  const deliveryTimeEl = document.getElementById("delivery-time") as HTMLSelectElement | null;
  const deliveryTime = deliveryTimeEl?.value || "";

  const notes = [
    inp("notes").value,
    deliveryTime ? `Preferred time: ${deliveryTime}` : "",
    pickup ? "Customer will pick up." : `Deliver to: ${addressParts}`,
  ].filter(Boolean).join("\n");

  const items = lines.map(l => ({
    product_id:   l.productId,
    variant_code: l.variantCode,
    qty:          l.qty,
    line_cents:   l.lineCents,
  }));

  try {
    const orderId = await createOrder({
      customer_name:  inp("name").value.trim(),
      customer_phone: inp("phone").value.trim(),
      delivery_date:  inp("delivery-date").value,
      notes,
      total_cents:    totals.total,
      items,
    });

    saveCart([]);
    window.location.href = `order-confirmation.html?id=${orderId}`;

  } catch (err: any) {
    console.error("Order submission failed:", err);
    btn.disabled    = false;
    btn.textContent = "Place Order";
    btn.classList.remove("loading");

    // ✅ FIX: Show inline error instead of alert()
    showOrderError(
      "Something went wrong placing your order. Please try again, or call us directly at <strong>(02) 9123-4567</strong>."
    );
  }
}

/* ─── Boot ─── */
async function main() {
  initDeliveryDate();
  initDeliveryToggle();

  const cart = loadCart();

  if (cart.length === 0) {
    $("checkout-empty").style.display = "block";
    $("checkout-main").style.display  = "none";
    return;
  }

  $("checkout-empty").style.display = "none";
  $("checkout-main").style.display  = "grid";

  const lines = await enrichCart();
  renderSummary(lines);

  $("btn-delivery").addEventListener("click", () => renderSummary(lines));
  $("btn-pickup").addEventListener("click",   () => renderSummary(lines));

  $("btn-place-order").addEventListener("click", () => handleSubmit(lines, renderSummary(lines)));

  ["name", "phone", "delivery-date", "address", "suburb"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("blur", () => validate());
  });
}

main().catch(console.error);