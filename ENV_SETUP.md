# Environment setup (Supabase)

**Option A — Using a bundler (Vite)**
Add to `.env`:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```
Use `import.meta.env.VITE_*` in code.

**Option B — Plain HTML**
Before your scripts in each HTML page, inject:
```html
<script>
  window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
  window.SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
</script>
```

**Install**
```
npm i @supabase/supabase-js
```

**Run the SQL**
- In Supabase → SQL editor → paste `db.sql` → Run.
- Upload product images to Supabase Storage or host them statically; set `image_url` accordingly.

**Security**
- The provided RLS policies allow public reads of the catalogue and anonymous inserts for orders only.
- For admin views/updates, create a service role API (server-side) or Supabase Edge Functions.