// src/scripts/db.ts
import { createClient } from "@supabase/supabase-js";

const _meta = import.meta as any;

export const supabase = createClient(
  (window as any).SUPABASE_URL || _meta.env?.VITE_SUPABASE_URL,
  (window as any).SUPABASE_ANON_KEY || _meta.env?.VITE_SUPABASE_ANON_KEY
);

export async function fetchCatalog() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, slug, name, description, material, in_stock, made_to_order, lead_time_days,
      product_images ( image_url, sort_order ),
      variants ( id, variant_code, name, price_cents ),
      product_categories ( categories:category_id ( name ) )
    `)
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    material: p.material,
    inStock: p.in_stock,
    madeToOrder: p.made_to_order ?? false,
    leadTimeDays: p.lead_time_days ?? 0,
    images: (p.product_images || [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((x: any) => x.image_url),
    variants: (p.variants || []).map((v: any) => ({
      code: v.variant_code,
      name: v.name,
      priceCents: v.price_cents,
    })),
    categories: (p.product_categories || [])
      .map((pc: any) => pc.categories?.name)
      .filter(Boolean),
  }));
}

export async function fetchProductById(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, slug, name, description, material, in_stock, made_to_order, lead_time_days,
      product_images ( image_url, sort_order ),
      variants ( id, variant_code, name, price_cents ),
      product_add_ons ( add_ons ( id, slug, name, price_cents ) ),
      perishable_rules ( earliest_days_ahead, blackout_weekdays )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  // FIX: perishable_rules comes back as an array from Supabase — grab first element
  const perishableRaw = Array.isArray(data.perishable_rules)
    ? data.perishable_rules[0]
    : data.perishable_rules;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    material: data.material,
    inStock: data.in_stock,
    madeToOrder: data.made_to_order ?? false,
    leadTimeDays: data.lead_time_days ?? 0,
    images: (data.product_images || [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((x: any) => x.image_url),
    variants: (data.variants || []).map((v: any) => ({
      code: v.variant_code,
      name: v.name,
      priceCents: v.price_cents,
    })),
    addOns: (data.product_add_ons || []).map((pa: any) => ({
      id: pa.add_ons.id,
      slug: pa.add_ons.slug,
      name: pa.add_ons.name,
      priceCents: pa.add_ons.price_cents,
    })),
    perishable: perishableRaw
      ? {
          earliestDaysAhead: perishableRaw.earliest_days_ahead,
          blackoutWeekdays: perishableRaw.blackout_weekdays || [],
        }
      : null,
  };
}

export type OrderDraft = {
  customer_name: string;
  customer_phone: string;
  delivery_date: string;
  notes?: string;
  total_cents: number;
  items: Array<{
    product_id: string;
    variant_code: string;
    qty: number;
    add_on_ids?: number[];
    line_cents: number;
  }>;
};

export async function createOrder(draft: OrderDraft) {
  const { data: order, error: e1 } = await supabase
    .from("orders")
    .insert([{
      customer_name: draft.customer_name,
      customer_phone: draft.customer_phone,
      delivery_date: draft.delivery_date,
      notes: draft.notes || null,
      total_cents: draft.total_cents,
    }])
    .select("id")
    .single();

  if (e1) throw e1;

  for (const it of draft.items) {
    const { data: oi, error: e2 } = await supabase
      .from("order_items")
      .insert([{
        order_id: order.id,
        product_id: it.product_id,
        variant_code: it.variant_code,
        qty: it.qty,
        line_cents: it.line_cents,
      }])
      .select("id")
      .single();

    if (e2) throw e2;

    if (it.add_on_ids?.length) {
      const rows = it.add_on_ids.map(aid => ({ order_item_id: oi.id, add_on_id: aid }));
      const { error: e3 } = await supabase.from("order_item_add_ons").insert(rows);
      if (e3) throw e3;
    }
  }

  return (order as any).id as string;
}