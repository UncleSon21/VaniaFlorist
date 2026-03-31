// src/scripts/cart.ts — FIXED VERSION
// Cart drawer now shows proper product names instead of raw UUIDs

import { qsa } from "./utils";
import { fetchProductById } from "./db";

export type CartItem = {
  productId: string;
  variantId: string;
  addOnIds: string[];
  qty: number;
};

const KEY = "vf_cart_v1";

export function loadCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function saveCart(c: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(c));
}

export function addToCart(item: CartItem) {
  const cart = loadCart();
  const i = cart.findIndex(ci =>
    ci.productId === item.productId &&
    ci.variantId === item.variantId &&
    JSON.stringify(ci.addOnIds) === JSON.stringify(item.addOnIds)
  );
  if (i >= 0) {
    const existing = cart[i];
    if (existing) existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);
  document.dispatchEvent(new CustomEvent("cart:changed"));
}

export function removeFromCart(index: number) {
  const cart = loadCart();
  cart.splice(index, 1);
  saveCart(cart);
  document.dispatchEvent(new CustomEvent("cart:changed"));
}

/* ── Product name cache to avoid repeated Supabase calls ── */
const nameCache: Map<string, { name: string; variantName: string; image: string }> = new Map();

async function resolveProduct(productId: string, variantId: string): Promise<{ name: string; variantName: string; image: string }> {
  const cacheKey = `${productId}|${variantId}`;
  if (nameCache.has(cacheKey)) return nameCache.get(cacheKey)!;

  try {
    const p = await fetchProductById(productId);
    const variant = p.variants.find((v: any) => v.code === variantId) || p.variants[0];
    const result = {
      name: p.name || "Flower Arrangement",
      variantName: variant?.name || "",
      image: p.images?.[0] || "",
    };
    nameCache.set(cacheKey, result);
    return result;
  } catch {
    return { name: "Flower Arrangement", variantName: "", image: "" };
  }
}

/* ── Cart Drawer ── */
export function mountCartDrawer() {
  const el = document.createElement("div");
  el.id = "cart-drawer";
  el.innerHTML = `<div class="cart-drawer-loading">Loading cart…</div>`;
  document.body.appendChild(el);

  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
    #cart-drawer {
      position: fixed;
      right: 16px;
      bottom: 16px;
      background: #fff;
      border: 1px solid #f0e8dd;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04);
      padding: 0;
      max-width: 340px;
      min-width: 280px;
      z-index: 9999;
      overflow: hidden;
      font-family: 'Georgia', serif;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    #cart-drawer .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid #f0e8dd;
      background: #faf8f5;
    }
    #cart-drawer .drawer-header h3 {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #8b7355;
    }
    #cart-drawer .drawer-header .drawer-count {
      font-size: 0.75rem;
      color: #999;
    }
    #cart-drawer .drawer-body {
      padding: 12px 18px;
      max-height: 260px;
      overflow-y: auto;
    }
    #cart-drawer .drawer-empty {
      text-align: center;
      padding: 20px 0;
      color: #bbb;
      font-size: 0.85rem;
    }
    #cart-drawer .drawer-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #f8f4ef;
    }
    #cart-drawer .drawer-item:last-child {
      border-bottom: none;
    }
    #cart-drawer .drawer-item-img {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      overflow: hidden;
      background: #faf8f5;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    #cart-drawer .drawer-item-img img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    #cart-drawer .drawer-item-info {
      flex: 1;
      min-width: 0;
    }
    #cart-drawer .drawer-item-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #2b2b2b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #cart-drawer .drawer-item-variant {
      font-size: 0.75rem;
      color: #999;
    }
    #cart-drawer .drawer-item-qty {
      font-size: 0.8rem;
      color: #8b7355;
      font-weight: 600;
      flex-shrink: 0;
    }
    #cart-drawer .drawer-item-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: #ccc;
      padding: 4px;
      border-radius: 4px;
      font-size: 0.75rem;
      transition: color 0.2s;
      flex-shrink: 0;
    }
    #cart-drawer .drawer-item-remove:hover {
      color: #e05252;
    }
    #cart-drawer .drawer-footer {
      padding: 14px 18px;
      border-top: 1px solid #f0e8dd;
    }
    #cart-drawer .drawer-footer a {
      display: block;
      text-align: center;
      background: #8b7355;
      color: white;
      text-decoration: none;
      padding: 10px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.85rem;
      transition: background 0.2s;
    }
    #cart-drawer .drawer-footer a:hover {
      background: #6d5a44;
    }
    .cart-drawer-loading {
      padding: 20px;
      text-align: center;
      color: #bbb;
      font-size: 0.85rem;
    }
  `;
  document.head.appendChild(style);

  const render = async () => {
    const cart = loadCart();

    if (cart.length === 0) {
      el.innerHTML = `
        <div class="drawer-header">
          <h3>Cart</h3>
          <span class="drawer-count">0 items</span>
        </div>
        <div class="drawer-body">
          <div class="drawer-empty">Your cart is empty</div>
        </div>
        <div class="drawer-footer">
          <a href="shop.html">Browse Flowers</a>
        </div>
      `;
      return;
    }

    // Show loading while resolving names
    el.innerHTML = `
      <div class="drawer-header">
        <h3>Cart</h3>
        <span class="drawer-count">${cart.reduce((s, ci) => s + ci.qty, 0)} items</span>
      </div>
      <div class="drawer-body">
        <div class="cart-drawer-loading">Loading…</div>
      </div>
    `;

    // Resolve all product names
    const resolved = await Promise.all(
      cart.map(async (ci, idx) => {
        const info = await resolveProduct(ci.productId, ci.variantId);
        return { ci, idx, ...info };
      })
    );

    const itemsHTML = resolved.map(r => `
      <div class="drawer-item">
        <div class="drawer-item-img">
          ${r.image
            ? `<img src="${r.image}" alt="${r.name}" onerror="this.style.display='none';this.parentElement.textContent='🌹'">`
            : '🌹'
          }
        </div>
        <div class="drawer-item-info">
          <div class="drawer-item-name">${r.name}</div>
          ${r.variantName ? `<div class="drawer-item-variant">${r.variantName}</div>` : ''}
        </div>
        <span class="drawer-item-qty">×${r.ci.qty}</span>
        <button class="drawer-item-remove" data-remove="${r.idx}" title="Remove">✕</button>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="drawer-header">
        <h3>Cart</h3>
        <span class="drawer-count">${cart.reduce((s, ci) => s + ci.qty, 0)} items</span>
      </div>
      <div class="drawer-body">${itemsHTML}</div>
      <div class="drawer-footer">
        <a href="cart.html">View Cart &amp; Checkout</a>
      </div>
    `;

    qsa<HTMLButtonElement>("button[data-remove]", el).forEach(btn => {
      btn.addEventListener("click", () => {
        removeFromCart(Number(btn.dataset["remove"]));
      });
    });
  };

  document.addEventListener("cart:changed", () => render());
  render();
}