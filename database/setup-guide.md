# Cloudflare D1 Database Setup Guide for MIYONI

MIYONI is configured to use **Cloudflare D1** (`miyoni`, UUID `a78a2863-9153-46ca-9b78-9a59c88b3b3d`) via the `DB` binding in `wrangler.jsonc`.

---

## 1. D1 Binding (`wrangler.jsonc`)
`wrangler.jsonc` already binds Cloudflare D1 to `env.DB`:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "miyoni",
    "database_id": "a78a2863-9153-46ca-9b78-9a59c88b3b3d"
  }
]
```
If you deploy via Cloudflare Dashboard Git Integration, verify under **Worker Settings -> Bindings** that a D1 Database binding named **`DB`** is linked to **`miyoni`**.

---

## 2. Initialize Tables & Seed Data
You can initialize the D1 tables either from the terminal:
```bash
npx wrangler d1 execute miyoni --remote --file=database/schema.sql
```
Or paste the contents of [`database/schema.sql`](./schema.sql) into **Cloudflare Dashboard -> Storage & Databases -> D1 SQL Database -> `miyoni` -> Console**.

*(The Worker also automatically verifies tables and seeds initial categories/products on first request if empty.)*

---

## 3. Secrets Required on Cloudflare Worker
- `ADMIN_EMAIL` (set in `wrangler.jsonc` vars to `prof200619@gmail.com`)
- `SMARTBASE_EMAIL_API_KEY` (for admin one-time login verification codes via `smartemail.de5.net`)
- `SESSION_SECRET` (random 32+ byte hex secret for admin session signing)
- `GEMINI_API_KEY` (optional, enables the Gemini AI Post Assistant in `/admin`)
