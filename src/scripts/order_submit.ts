import { createOrder, fetchProductById } from "./db";
import { loadCart } from "./cart";

async function computeTotalsFromDb() {
  const cart = loadCart();
  let total_cents = 0;
  const items: any[] = [];

  for (const line of cart) {
    const p = await fetchProductById(line.productId);
    const v = p.variants.find((x:any)=>x.code===line.variantId)!;
    let line_cents = v.priceCents;
    // If you later map add-ons to numeric IDs, add them here:
    // for (const addId of line.addOnIds) {
    //   const a = p.addOns.find((x:any)=>String(x.id)===String(addId));
    //   if (a) line_cents += a.priceCents;
    // }
    line_cents *= line.qty;
    total_cents += line_cents;

    items.push({
      product_id: p.id,
      variant_code: v.code,
      qty: line.qty,
      line_cents
      // add_on_ids: [...] // if mapped
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
  const id = await createOrder({ customer_name: name, customer_phone: phone, delivery_date, notes, total_cents, items });
  alert(`Thanks! Order received: ${id}`);
}
