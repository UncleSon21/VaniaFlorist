import { qsa } from "./utils";

export type CartItem = {
  productId: string;
  variantId: string;    // variant code
  addOnIds: string[];   // array of add-on IDs (as strings)
  qty: number;
};
const KEY = "vf_cart_v1";

export function loadCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
export function saveCart(c: CartItem[]){ localStorage.setItem(KEY, JSON.stringify(c)); }

export function addToCart(item: CartItem){
  const cart = loadCart();
  const i = cart.findIndex(ci => ci.productId===item.productId && ci.variantId===item.variantId && JSON.stringify(ci.addOnIds)===JSON.stringify(item.addOnIds));
  if (i>=0) cart[i].qty += item.qty;
  else cart.push(item);
  saveCart(cart);
  document.dispatchEvent(new CustomEvent("cart:changed"));
}

export function removeFromCart(index: number){
  const cart = loadCart();
  cart.splice(index,1);
  saveCart(cart);
  document.dispatchEvent(new CustomEvent("cart:changed"));
}

/** Optional: simple floating drawer */
export function mountCartDrawer() {
  const el = document.createElement("div");
  el.id = "cart-drawer";
  el.style.cssText = "position:fixed;right:16px;bottom:16px;background:#fff;border:1px solid #eee;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.12);padding:12px;max-width:320px;z-index:9999;";
  document.body.appendChild(el);

  const render = () => {
    const cart = loadCart();
    el.innerHTML = `
      <h3 style="margin:0 0 8px">Cart</h3>
      <ul style="padding-left:18px;margin:0 0 8px">
        ${
          cart.length
          ? cart.map((ci, idx) => `<li>${ci.qty}× ${ci.productId} (${ci.variantId})
              <button data-remove="${idx}" style="margin-left:8px">remove</button>
            </li>`).join("")
          : "<li>(empty)</li>"
        }
      </ul>
      <a href="product-details.html#order" style="text-decoration:none;border:1px solid #ddd;padding:6px 10px;border-radius:8px">Checkout</a>
    `;
    qsa<HTMLButtonElement>("button[data-remove]", el).forEach(btn=>{
      btn.addEventListener("click", () => removeFromCart(Number(btn.dataset.remove)));
    });
  };

  document.addEventListener("cart:changed", render);
  render();
}
