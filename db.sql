-- db.sql (Supabase/Postgres schema)
-- See contents in previous cell; writing full schema again for completeness.

create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  material text check (material in ('fresh','artificial')) not null,
  in_stock boolean not null default true,
  made_to_order boolean default false,
  lead_time_days int,
  created_at timestamp with time zone default now()
);

create table if not exists product_images (
  id bigserial primary key,
  product_id uuid references products(id) on delete cascade,
  image_url text not null,
  sort_order int default 0
);

create table if not exists categories (
  id bigserial primary key,
  name text unique not null
);

create table if not exists product_categories (
  product_id uuid references products(id) on delete cascade,
  category_id bigint references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table if not exists variants (
  id bigserial primary key,
  product_id uuid references products(id) on delete cascade,
  variant_code text not null,
  name text not null,
  price_cents int not null check (price_cents >= 0)
);

create unique index if not exists variants_product_code_idx
  on variants(product_id, variant_code);

create table if not exists add_ons (
  id bigserial primary key,
  slug text unique not null,
  name text not null,
  price_cents int not null check (price_cents >= 0)
);

create table if not exists product_add_ons (
  product_id uuid references products(id) on delete cascade,
  add_on_id bigint references add_ons(id) on delete cascade,
  primary key (product_id, add_on_id)
);

create table if not exists perishable_rules (
  product_id uuid primary key references products(id) on delete cascade,
  earliest_days_ahead int not null default 0,
  blackout_weekdays int[] default '{}'::int[]
);

create table if not exists inventory (
  product_id uuid primary key references products(id) on delete cascade,
  stock_qty int not null default 0
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  delivery_date date not null,
  notes text,
  total_cents int not null check (total_cents >= 0),
  created_at timestamp with time zone default now(),
  status text not null default 'new'
);

create table if not exists order_items (
  id bigserial primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  variant_code text not null,
  qty int not null check (qty > 0),
  line_cents int not null check (line_cents >= 0)
);

create table if not exists order_item_add_ons (
  order_item_id bigint references order_items(id) on delete cascade,
  add_on_id bigint references add_ons(id),
  primary key (order_item_id, add_on_id)
);

create or replace view product_min_price as
select p.id, min(v.price_cents) as min_price_cents
from products p
join variants v on v.product_id = p.id
group by p.id;

insert into add_ons (slug, name, price_cents)
values ('card','Gift Card',600),
       ('vase','Glass Vase',2500),
       ('chocs','Chocolates',1500)
on conflict (slug) do nothing;

insert into categories (name) values
  ('bouquet'), ('roses'), ('romance'), ('birthday'),
  ('arrangement'), ('home-decor'), ('lasting')
on conflict (name) do nothing;

insert into products (slug, name, description, material, in_stock, made_to_order)
values
 ('12-red-roses','12 Red Roses','Classic bouquet of 12 premium long-stem red roses with seasonal foliage.','fresh', true, true),
 ('artificial-white-orchid-arrangement','Artificial White Orchid Arrangement','Lifelike phalaenopsis orchid in a ceramic pot.','artificial', true, false)
on conflict (slug) do nothing;

with prod as (select id, slug from products),
     cat as (select id, name from categories)
insert into product_categories (product_id, category_id)
select p.id, c.id from prod p, cat c
where (p.slug='12-red-roses' and c.name in ('bouquet','roses','romance'))
   or (p.slug='artificial-white-orchid-arrangement' and c.name in ('arrangement','home-decor','lasting'))
on conflict do nothing;

insert into variants (product_id, variant_code, name, price_cents)
select id, 'std','Standard', 8900 from products where slug='12-red-roses'
union all
select id, 'deluxe','Deluxe',11900 from products where slug='12-red-roses'
union all
select id, 'prem','Premium',14900 from products where slug='12-red-roses'
union all
select id, 'std','Standard', 7900 from products where slug='artificial-white-orchid-arrangement'
union all
select id, 'deluxe','Deluxe',10900 from products where slug='artificial-white-orchid-arrangement'
on conflict do nothing;

insert into product_images (product_id, image_url, sort_order)
select id, '/public/img/products/rose12-1.jpg', 0 from products where slug='12-red-roses'
union all
select id, '/public/img/products/art-orchid-1.jpg', 0 from products where slug='artificial-white-orchid-arrangement'
on conflict do nothing;

insert into perishable_rules (product_id, earliest_days_ahead, blackout_weekdays)
select id, 0, array[0] from products where slug='12-red-roses'
on conflict (product_id) do nothing;

insert into inventory (product_id, stock_qty)
select id, 10 from products where slug='artificial-white-orchid-arrangement'
on conflict (product_id) do nothing;

alter table products enable row level security;
alter table product_images enable row level security;
alter table categories enable row level security;
alter table product_categories enable row level security;
alter table variants enable row level security;
alter table add_ons enable row level security;
alter table product_add_ons enable row level security;
alter table perishable_rules enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_item_add_ons enable row level security;

create policy "Public read products" on products for select using (true);
create policy "Public read product_images" on product_images for select using (true);
create policy "Public read categories" on categories for select using (true);
create policy "Public read product_categories" on product_categories for select using (true);
create policy "Public read variants" on variants for select using (true);
create policy "Public read add_ons" on add_ons for select using (true);
create policy "Public read perishable_rules" on perishable_rules for select using (true);
create policy "Public read inventory" on inventory for select using (true);

create policy "Anon insert orders" on orders
  for insert
  with check (true);

create policy "Anon insert order_items" on order_items
  for insert
  with check (exists (select 1 from orders o where o.id = order_id));

create policy "Anon insert order_item_add_ons" on order_item_add_ons
  for insert
  with check (exists (select 1 from order_items oi where oi.id = order_item_id));