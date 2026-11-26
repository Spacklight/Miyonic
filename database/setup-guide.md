# SmartBase Database Setup Guide for MIYONI

This guide explains how to initialize the **MIYONI Official Digital Headquarters** database on **SmartBase** (`https://smartbase.de5.net/`) and connect it cleanly to your Cloudflare Worker.

---

## 1. Create the Database in SmartBase

1. Sign in to your SmartBase console at `https://smartbase.de5.net/`.
2. Create a new SQL database (recommended name: `miyoni_hq`).
3. Copy your **Database ID** (`SMARTBASE_DATABASE_ID`). You can also retrieve it via:
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" https://smartbase.de5.net/apiv1/databases
   ```

---

## 2. Inspect SmartBase Table & Query Behavior

Before running bulk inserts in production, verify the exact response envelope returned by your SmartBase instance:

```bash
# List databases
curl -s -H "X-API-Key: YOUR_READ_KEY" \
  https://smartbase.de5.net/apiv1/databases

# List tables inside your database
curl -s -H "X-API-Key: YOUR_READ_KEY" \
  https://smartbase.de5.net/apiv1/databases/YOUR_DATABASE_ID/tables

# Test SQL query endpoint
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_READ_KEY" \
  -d '{"databaseId":"YOUR_DATABASE_ID","sql":"SELECT 1 AS ok"}' \
  https://smartbase.de5.net/apiv1/query
```

> **Note on SQL Parameterization & SmartBase `/query`**:
> SmartBase's `POST /apiv1/query` endpoint accepts `{ databaseId, sql, params }` (or `{ database_id, query }`). Our Worker client (`lib/miyoni-core.js`) adapts cleanly to both table REST endpoints (`/databases/:id/tables/:tableId/records`) and SQL queries (`/query`), and validates all identifiers and inputs strictly before sending requests. If your SmartBase instance uses a different body field name for parameterized bindings in `/query`, verify it with a quick `SELECT` test above and update `smartbaseQuery()` in `lib/miyoni-core.js` if needed.

---

## 3. Apply the SQL Schema

Open the **SQL Editor** inside SmartBase for your `miyoni_hq` database and execute the full contents of [`database/schema.sql`](./schema.sql).

This creates the following 6 tables with primary keys, foreign keys, timestamps, and indexes:

1. `categories` — News & announcement categories
2. `products` — SmartBase, Talkivo, XOOL, Zapamubas records
3. `posts` — Rich articles, product updates, drafts, SEO metadata, YouTube URLs, gallery arrays
4. `media` — Uploaded image metadata linked to SmartBase File Storage (`/apiv1/files`)
5. `site_settings` — Company details, mission/vision, founder Roosevelt Chikwende bio, editable history timeline, SEO defaults
6. `admin_activity` — Audit trail of authenticated admin operations

---

## 4. Create Scoped API Keys

In SmartBase API Key Management:

1. Create a **Read-Only Key** (`SMARTBASE_READ_KEY`) scoped strictly to reading tables and files.
2. Create a **Read/Write Key** (`SMARTBASE_WRITE_KEY`) for protected Cloudflare Worker admin mutations and file uploads.
3. Never expose `SMARTBASE_WRITE_KEY` in frontend JavaScript or commit it to Git.

---

## 5. Configure Cloudflare Worker Secrets

Set every secret via Wrangler CLI (never in `wrangler.jsonc`):

```bash
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put SMARTBASE_EMAIL_API_KEY
npx wrangler secret put SMARTBASE_READ_KEY
npx wrangler secret put SMARTBASE_WRITE_KEY
npx wrangler secret put SMARTBASE_DATABASE_ID
npx wrangler secret put SESSION_SECRET
```

Generate a strong 64-character hex `SESSION_SECRET`:
```bash
openssl rand -hex 32
```
