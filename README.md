# MIYONI Official Digital Headquarters

Official website, product ecosystem showcase, dynamic newsroom, SEO engine, and private administration CMS for **MIYONI** (*"We build functionality and quality."*), founded by **Roosevelt Chikwende** in Malawi.

Target Domain: `https://miyoni.de5.net/`  
Runtime: **Cloudflare Workers** + **Worker Assets**  
Database & Storage: **SmartBase** (`https://smartbase.de5.net/`)  
Admin Verification: **SmartBase Email** (`https://smartemail.de5.net/`)

---

## Architecture & Project Structure

```text
miyoni/
├── worker.js                 # Cloudflare Worker fetch entry point
├── wrangler.jsonc            # Cloudflare Workers + Static Assets binding config
├── server.ts                 # Local/preview Express adapter sharing lib/router.js
├── package.json
├── .env.example              # Secret placeholders (never commit real secrets)
├── lib/
│   ├── router.js             # Unified Web-Standard router (SSR + SEO + Admin APIs)
│   ├── security.js           # Allowlist HTML sanitizer, Web Crypto HMAC, CSRF, rate limiter
│   ├── smartbase.js          # SmartBase REST/File API + SmartBase Email client
│   └── seo-render.js         # Server-rendered HTML, JSON-LD, sitemap, robots, RSS, llms.txt
├── public/
│   ├── admin.html            # Private administration dashboard UI (noindex)
│   ├── css/
│   │   ├── style.css         # Public dark navy, gold & steel blue design system
│   │   └── admin.css         # Private dashboard stylesheet
│   ├── js/
│   │   ├── main.js           # Progressive mobile nav drawer
│   │   └── admin.js          # Authenticated CMS, rich editor, media & settings UI
│   └── assets/
│       ├── founder-office.png
│       ├── founder-portrait.png
│       ├── founder-quote.png
│       └── favicon.svg
├── database/
│   ├── schema.sql            # SmartBase SQL schema & authentic seed data
│   └── setup-guide.md        # Step-by-step SmartBase initialization guide
└── scripts/
    └── test-worker.mjs       # Automated security, SSR, SEO & CMS test suite
```

### Architectural Note on Server-Side Rendering
Instead of relying on empty client-only SPA shells, `worker.js` server-renders complete semantic HTML for every public route (`/`, `/about/`, `/founder/`, `/products/`, `/products/:slug/`, `/news/`, `/news/:slug/`, `/gallery/`, `/contact/`, `/search/`). Search engines and social crawlers receive complete content, `<link rel="canonical">`, Open Graph, Twitter cards, and JSON-LD structured data on the initial HTTP response.

---

## 1. SmartBase Database Setup

Follow [`database/setup-guide.md`](./database/setup-guide.md):
1. Create a database in SmartBase (`https://smartbase.de5.net/`) and copy its `SMARTBASE_DATABASE_ID`.
2. Execute [`database/schema.sql`](./database/schema.sql) in the SmartBase SQL Editor to create:
   - `categories`
   - `products` (seeded with SmartBase, Talkivo, XOOL, Zapamubas)
   - `posts`
   - `media`
   - `site_settings`
   - `admin_activity`
3. Generate a read-only API key (`SMARTBASE_READ_KEY`) and a read/write API key (`SMARTBASE_WRITE_KEY`).

---

## 2. Configure Cloudflare Worker Secrets

Install Wrangler if not already installed (`npm i -D wrangler` or `npx wrangler`):

```bash
npx wrangler login
```

Set all required secrets in Cloudflare Workers (never place secrets inside `wrangler.jsonc` or Git):

```bash
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put SMARTBASE_EMAIL_API_KEY
npx wrangler secret put SMARTBASE_READ_KEY
npx wrangler secret put SMARTBASE_WRITE_KEY
npx wrangler secret put SMARTBASE_DATABASE_ID
npx wrangler secret put SESSION_SECRET
```

Recommended `SESSION_SECRET` generation:
```bash
openssl rand -hex 32
```

---

## 3. Deploy to Cloudflare Workers & Connect `miyoni.de5.net`

Deploy the Worker and static assets (`./public`):

```bash
npx wrangler deploy
```

### Configure Custom Domain (`miyoni.de5.net`)
1. Open the **Cloudflare Dashboard** -> **Workers & Pages** -> select **`miyoni-hq`**.
2. Open **Settings** -> **Domains & Routes** -> **Add** -> **Custom Domain**.
3. Enter `miyoni.de5.net` (and optionally `www.miyoni.de5.net` with a redirect rule to `https://miyoni.de5.net/`).
4. Cloudflare automatically provisions SSL/TLS certificates and routes all traffic to `worker.js`.

---

## 4. Verification & Testing

Run the automated Cloudflare Worker test suite:

```bash
npm run test:worker
```

Run TypeScript validation and Vite build check:

```bash
npm run lint
npm run build
```

### Production Testing Checklist
- [ ] Public routes (`/`, `/about/`, `/founder/`, `/products/`, `/products/smartbase/`, `/news/`, `/gallery/`, `/contact/`, `/search/`) return `200 OK` with full SSR HTML and JSON-LD.
- [ ] `/sitemap.xml`, `/robots.txt`, `/rss.xml`, and `/llms.txt` return valid XML/text and exclude drafts and `/admin`.
- [ ] `/admin` displays the single-admin email verification gate and includes `X-Robots-Tag: noindex, nofollow`.
- [ ] Unauthorized emails are rejected with `403` before calling SmartBase Email.
- [ ] Authorized `ADMIN_EMAIL` receives a verification code via SmartBase Email and signs in with `HttpOnly; Secure` session cookies and CSRF protection.
- [ ] Publishing a new post in `/admin` immediately makes `/news/:slug/`, `/`, `/sitemap.xml`, and `/rss.xml` reflect the article without redeployment.
- [ ] Image uploads validate MIME type, magic bytes, and size (`<= 5 MB`) before uploading to SmartBase Storage.
