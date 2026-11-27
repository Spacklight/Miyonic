import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import worker from '../worker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');

function createMockAssets() {
  return {
    async fetch(req) {
      const url = new URL(req.url);
      const rel = url.pathname.replace(/^\/+/, '');
      const full = path.resolve(PUBLIC_DIR, rel);
      if (!full.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(full)) {
        return new Response('Not Found', { status: 404 });
      }
      return new Response(fs.readFileSync(full), {
        status: 200,
        headers: { 'Content-Type': rel.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' },
      });
    },
  };
}

function createSmartBaseMockFetch(state) {
  return async (url, init = {}) => {
    const u = String(url);
    const method = (init.method || 'GET').toUpperCase();

    if (u === 'https://smartemail.de5.net/api/v1/send-verification') {
      const body = JSON.parse(init.body || '{}');
      state.lastEmailSent = body.email;
      return new Response(JSON.stringify({ success: true, message: 'Sent' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (u === 'https://smartemail.de5.net/api/v1/verify-code') {
      const body = JSON.parse(init.body || '{}');
      const ok = body.code === '482910';
      return new Response(
        JSON.stringify(ok ? { success: true, verified: true } : { success: false, verified: false, error: 'Wrong code' }),
        { status: ok ? 200 : 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (u.includes('/apiv1/databases/') && u.endsWith('/tables')) {
      return new Response(
        JSON.stringify({
          tables: [
            { id: 't_posts', name: 'posts' },
            { id: 't_products', name: 'products' },
            { id: 't_categories', name: 'categories' },
            { id: 't_settings', name: 'site_settings' },
            { id: 't_media', name: 'media' },
            { id: 't_activity', name: 'admin_activity' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (u.includes('/tables/t_posts/records')) {
      if (method === 'GET') {
        return new Response(JSON.stringify({ records: state.posts }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (method === 'POST') {
        const payload = JSON.parse(init.body);
        const created = { id: state.posts.length + 10, ...payload };
        state.posts.unshift(created);
        return new Response(JSON.stringify({ record: created }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (u.includes('/tables/t_products/records') && method === 'GET') {
      return new Response(JSON.stringify({ records: state.products }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (u.includes('/tables/t_categories/records') && method === 'GET') {
      return new Response(JSON.stringify({ records: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (u.includes('/tables/t_settings/records') && method === 'GET') {
      return new Response(JSON.stringify({ records: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (u.includes('/tables/t_media/records')) {
      if (method === 'GET') {
        return new Response(JSON.stringify({ records: state.media }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (method === 'POST') {
        const rec = { id: state.media.length + 1, ...JSON.parse(init.body) };
        state.media.push(rec);
        return new Response(JSON.stringify({ record: rec }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (u.includes('/tables/t_activity/records')) {
      if (method === 'POST') {
        state.activity.push(JSON.parse(init.body));
        return new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ records: state.activity }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (u === 'https://smartbase.de5.net/apiv1/files' && method === 'POST') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (u.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
      if (u.includes('gemini-3.5-flash-lite')) {
        return new Response(JSON.stringify({ error: { message: 'Model not found', status: 'NOT_FOUND' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'Talkivo: A Modern Alternative to Omegle',
                      slug: 'talkivo-modern-alternative-to-omegle',
                      content_type: 'Product updates',
                      category_slug: 'product-updates',
                      excerpt: 'Talkivo offers a modern, fast alternative to Omegle under MIYONI.',
                      content_html:
                        '<h2>Why Talkivo</h2><p>Talkivo is built for instant, reliable conversation.</p><script>alert(9)</script>',
                      product_slug: 'talkivo',
                      product_url: 'https://talkivo.de5.net/',
                      tags: ['Talkivo', 'Omegle', 'Omegle Alternative', 'MIYONI'],
                      seo_title: 'Talkivo — Modern Omegle Alternative by MIYONI',
                      seo_description:
                        'Discover Talkivo at talkivo.de5.net as a clean, reliable Omegle alternative built by MIYONI.',
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ records: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

function extractCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

test('MIYONI Cloudflare Worker full security, SSR, SEO & CMS workflow', async () => {
  const mockState = {
    lastEmailSent: null,
    posts: [
      {
        id: 1,
        title: 'SmartBase Launch Article',
        slug: 'smartbase-launch-article',
        content_type: 'Product launches',
        excerpt: 'Official SmartBase announcement.',
        content_html: '<p>SmartBase cloud platform details.</p>',
        status: 'published',
        product_slug: 'smartbase',
        published_at: '2026-11-25T10:00:00.000Z',
        created_at: '2026-11-25T10:00:00.000Z',
        updated_at: '2026-11-25T10:00:00.000Z',
      },
      {
        id: 2,
        title: 'Secret Internal Draft',
        slug: 'secret-internal-draft',
        content_type: 'Company announcements',
        excerpt: 'Should never appear publicly.',
        content_html: '<p>Draft only</p>',
        status: 'draft',
        created_at: '2026-11-25T11:00:00.000Z',
        updated_at: '2026-11-25T11:00:00.000Z',
      },
    ],
    products: [],
    media: [],
    activity: [],
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createSmartBaseMockFetch(mockState);

  const env = {
    SITE_URL: 'https://miyoni.de5.net',
    ADMIN_EMAIL: 'roosevelt@miyoni.de5.net',
    SMARTBASE_EMAIL_API_KEY: 'test-email-key',
    SMARTBASE_READ_KEY: 'test-read-key',
    SMARTBASE_WRITE_KEY: 'test-write-key',
    SMARTBASE_DATABASE_ID: 'db_miyoni',
    GEMINI_API_KEY: 'test-gemini-key',
    SESSION_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ASSETS: createMockAssets(),
  };

  try {
    // 1. Public SSR Pages & SEO
    const homeRes = await worker.fetch(new Request('https://miyoni.de5.net/'), env, {});
    assert.equal(homeRes.status, 200);
    const homeHtml = await homeRes.text();
    assert.match(homeHtml, /We build functionality and quality/);
    assert.match(homeHtml, /Roosevelt Chikwende/);
    assert.match(homeHtml, /SmartBase/);
    assert.match(homeHtml, /application\/ld\+json/);
    assert.doesNotMatch(homeHtml, /Secret Internal Draft/);

    // 2. Sitemap, Robots, RSS, llms.txt (drafts excluded!)
    const sitemapRes = await worker.fetch(new Request('https://miyoni.de5.net/sitemap.xml'), env, {});
    const sitemapXml = await sitemapRes.text();
    assert.match(sitemapXml, /https:\/\/miyoni\.de5\.net\/news\/smartbase-launch-article\//);
    assert.doesNotMatch(sitemapXml, /secret-internal-draft/);
    assert.doesNotMatch(sitemapXml, /\/admin/);

    const robotsRes = await worker.fetch(new Request('https://miyoni.de5.net/robots.txt'), env, {});
    const robotsTxt = await robotsRes.text();
    assert.match(robotsTxt, /Disallow: \/admin/);
    assert.match(robotsTxt, /Sitemap: https:\/\/miyoni\.de5\.net\/sitemap\.xml/);

    const rssRes = await worker.fetch(new Request('https://miyoni.de5.net/rss.xml'), env, {});
    const rssXml = await rssRes.text();
    assert.match(rssXml, /SmartBase Launch Article/);
    assert.doesNotMatch(rssXml, /Secret Internal Draft/);

    const llmsRes = await worker.fetch(new Request('https://miyoni.de5.net/llms.txt'), env, {});
    const llmsTxt = await llmsRes.text();
    assert.match(llmsTxt, /MIYONI/);
    assert.match(llmsTxt, /Zapamubas/);

    // 3. Reject unauthorized admin email
    const badEmailRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Host: 'miyoni.de5.net' },
        body: JSON.stringify({ email: 'attacker@example.com' }),
      }),
      env,
      {}
    );
    assert.equal(badEmailRes.status, 403);
    assert.equal(mockState.lastEmailSent, null);

    // 4. Reject unauthenticated access to dashboard
    const unauthDash = await worker.fetch(new Request('https://miyoni.de5.net/api/admin/dashboard'), env, {});
    assert.equal(unauthDash.status, 401);

    // 5. Authorize matching ADMIN_EMAIL (case-insensitive normalization)
    const sendRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Host: 'miyoni.de5.net' },
        body: JSON.stringify({ email: '  ROOSEVELT@miyoni.de5.net ' }),
      }),
      env,
      {}
    );
    assert.equal(sendRes.status, 200);
    assert.equal(mockState.lastEmailSent, 'roosevelt@miyoni.de5.net');
    let cookieJar = extractCookies(sendRes);
    assert.match(cookieJar, /miyoni_verify_attempt=/);

    // 6. Reject wrong verification code
    const wrongCodeRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: 'miyoni.de5.net',
          Cookie: cookieJar,
        },
        body: JSON.stringify({ email: 'roosevelt@miyoni.de5.net', code: '000000' }),
      }),
      env,
      {}
    );
    assert.equal(wrongCodeRes.status, 401);

    // 7. Verify valid code -> receive HttpOnly session + CSRF token
    const verifyOkRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: 'miyoni.de5.net',
          Cookie: cookieJar,
        },
        body: JSON.stringify({ email: 'roosevelt@miyoni.de5.net', code: '482910' }),
      }),
      env,
      {}
    );
    assert.equal(verifyOkRes.status, 200);
    const sessionData = await verifyOkRes.json();
    assert.equal(sessionData.authenticated, true);
    assert.ok(sessionData.csrfToken);
    cookieJar = extractCookies(verifyOkRes);
    assert.match(cookieJar, /miyoni_admin_session=/);

    // 8. Reject POST without CSRF token
    const noCsrfRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Host: 'miyoni.de5.net', Cookie: cookieJar },
        body: JSON.stringify({ title: 'Blocked' }),
      }),
      env,
      {}
    );
    assert.equal(noCsrfRes.status, 403);

    // 9. Create & publish post with XSS payload + YouTube URL -> verify sanitization & SSR rendering
    const createRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: 'miyoni.de5.net',
          Cookie: cookieJar,
          'X-CSRF-Token': sessionData.csrfToken,
        },
        body: JSON.stringify({
          title: 'XOOL Study Release',
          content_type: 'Product updates',
          excerpt: 'AI-powered PDF study workflows.',
          content_html: '<p>Safe text</p><script>alert(1)</script><p onclick="evil()">More</p>',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          product_slug: 'xool',
          status: 'published',
        }),
      }),
      env,
      {}
    );
    assert.equal(createRes.status, 201);
    const createdJson = await createRes.json();
    assert.equal(createdJson.post.slug, 'xool-study-release');
    assert.doesNotMatch(createdJson.post.content_html, /<script|alert\(1\)|onclick/i);

    // 10. Newly published post immediately appears on /news/xool-study-release/ & /sitemap.xml
    const articleRes = await worker.fetch(
      new Request('https://miyoni.de5.net/news/xool-study-release/'),
      env,
      {}
    );
    assert.equal(articleRes.status, 200);
    const articleHtml = await articleRes.text();
    assert.match(articleHtml, /XOOL Study Release/);
    assert.match(articleHtml, /https:\/\/www\.youtube\.com\/embed\/dQw4w9WgXcQ/);
    assert.doesNotMatch(articleHtml, /<script>alert\(1\)<\/script>/);

    // 11. Reject invalid file upload MIME type
    const badForm = new FormData();
    badForm.append('file', new Blob(['#!/bin/sh'], { type: 'text/plain' }), 'evil.sh');
    const badUploadRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/media', {
        method: 'POST',
        headers: {
          Host: 'miyoni.de5.net',
          Cookie: cookieJar,
          'X-CSRF-Token': sessionData.csrfToken,
        },
        body: badForm,
      }),
      env,
      {}
    );
    assert.equal(badUploadRes.status, 400);

    // 12. AI Post Assistant (/api/admin/ai-draft) with CSRF, 3.5 -> 3.1 fallback, and HTML sanitization
    const aiNoCsrf = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Host: 'miyoni.de5.net', Cookie: cookieJar },
        body: JSON.stringify({ description: 'Talkivo Omegle alternative launch announcement' }),
      }),
      env,
      {}
    );
    assert.equal(aiNoCsrf.status, 403);

    const aiDraftRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/ai-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: 'miyoni.de5.net',
          Cookie: cookieJar,
          'X-CSRF-Token': sessionData.csrfToken,
        },
        body: JSON.stringify({
          description: 'Talkivo at talkivo.de5.net is a modern alternative to Omegle built by MIYONI',
          model: 'gemini-3.5-flash-lite',
        }),
      }),
      env,
      {}
    );
    assert.equal(aiDraftRes.status, 200);
    const aiJson = await aiDraftRes.json();
    assert.equal(aiJson.modelUsed, 'gemini-3.1-flash-lite');
    assert.equal(aiJson.fallbackUsed, true);
    assert.equal(aiJson.draft.slug, 'talkivo-modern-alternative-to-omegle');
    assert.doesNotMatch(aiJson.draft.content_html, /<script|alert\(9\)/i);

    // 13. Publish AI draft and verify /search/?q=Omegle ranks Articles FIRST and top-scoring article #1
    const publishAiRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: 'miyoni.de5.net',
          Cookie: cookieJar,
          'X-CSRF-Token': sessionData.csrfToken,
        },
        body: JSON.stringify({ ...aiJson.draft, status: 'published' }),
      }),
      env,
      {}
    );
    assert.equal(publishAiRes.status, 201);

    const searchRes = await worker.fetch(new Request('https://miyoni.de5.net/search/?q=Omegle'), env, {});
    assert.equal(searchRes.status, 200);
    const searchHtml = await searchRes.text();
    const articlesHeadingPos = searchHtml.indexOf('Articles &amp; Announcements');
    const talkivoArticlePos = searchHtml.indexOf('Talkivo: A Modern Alternative to Omegle');
    const productsHeadingPos = searchHtml.indexOf('Related Products');
    assert.ok(articlesHeadingPos !== -1);
    assert.ok(talkivoArticlePos > articlesHeadingPos);
    if (productsHeadingPos !== -1) {
      assert.ok(articlesHeadingPos < productsHeadingPos);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createD1Adapter() {
  const sqlite = new DatabaseSync(':memory:');
  const makeStatement = (sql, bound = []) => ({
    bind(...args) {
      return makeStatement(sql, args);
    },
    async first() {
      const stmt = sqlite.prepare(sql);
      return stmt.get(...bound) ?? null;
    },
    async all() {
      const stmt = sqlite.prepare(sql);
      return { results: stmt.all(...bound) };
    },
    async run() {
      const stmt = sqlite.prepare(sql);
      const info = stmt.run(...bound);
      return {
        success: true,
        meta: {
          last_row_id: Number(info.lastInsertRowid || 0),
          changes: Number(info.changes || 0),
        },
      };
    },
  });

  return {
    prepare(sql) {
      return makeStatement(sql, []);
    },
    async batch(statements) {
      const out = [];
      for (const s of statements) {
        out.push(await s.run());
      }
      return out;
    },
  };
}

test('MIYONI Cloudflare D1 (DB binding) full SQL CRUD, media upload, SEO settings & search workflow', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createSmartBaseMockFetch({
    lastEmailSent: null,
    posts: [],
    products: [],
    media: [],
    activity: [],
  });

  const env = {
    SITE_URL: 'https://miyoni.de5.net',
    ADMIN_EMAIL: 'prof200619@gmail.com',
    SMARTBASE_EMAIL_API_KEY: 'test-email-key',
    GEMINI_API_KEY: 'test-gemini-key',
    SESSION_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DB: createD1Adapter(),
    ASSETS: createMockAssets(),
  };

  try {
    // 1. Fresh D1 auto-initializes tables & seeds 4 MIYONI products + starter post
    const homeRes = await worker.fetch(new Request('https://miyoni.de5.net/'), env, {});
    assert.equal(homeRes.status, 200);
    const homeHtml = await homeRes.text();
    assert.match(homeHtml, /SmartBase/);
    assert.match(homeHtml, /Talkivo/);
    assert.match(homeHtml, /Introducing the Official MIYONI Digital Headquarters/);

    // 2. Authenticate admin via SmartBase Email OTP
    const sendRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Host: 'miyoni.de5.net' },
        body: JSON.stringify({ email: 'prof200619@gmail.com' }),
      }),
      env,
      {}
    );
    assert.equal(sendRes.status, 200);
    let cookieJar = extractCookies(sendRes);

    const verifyRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Host: 'miyoni.de5.net', Cookie: cookieJar },
        body: JSON.stringify({ email: 'prof200619@gmail.com', code: '482910' }),
      }),
      env,
      {}
    );
    assert.equal(verifyRes.status, 200);
    const authJson = await verifyRes.json();
    cookieJar = extractCookies(verifyRes);

    // 3. Dashboard reports cloudflare-d1 backend cleanly
    const dashRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/dashboard', {
        headers: { Cookie: cookieJar },
      }),
      env,
      {}
    );
    assert.equal(dashRes.status, 200);
    const dashJson = await dashRes.json();
    assert.equal(dashJson.source, 'cloudflare-d1');
    assert.equal(dashJson.dbErrors.length, 0);

    // 4. Upload PNG image (including chunked >450KB image path!) to D1 and fetch via /media/:name
    const smallPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
    const smallForm = new FormData();
    smallForm.append('file', new Blob([smallPng], { type: 'image/png' }), 'talkivo-cover.png');
    const smallUploadRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/media', {
        method: 'POST',
        headers: { Host: 'miyoni.de5.net', Cookie: cookieJar, 'X-CSRF-Token': authJson.csrfToken },
        body: smallForm,
      }),
      env,
      {}
    );
    assert.equal(smallUploadRes.status, 201);
    const smallMedia = (await smallUploadRes.json()).media;
    const fetchedSmall = await worker.fetch(new Request(`https://miyoni.de5.net${smallMedia.public_url}`), env, {});
    assert.equal(fetchedSmall.status, 200);
    assert.equal(fetchedSmall.headers.get('content-type'), 'image/png');
    assert.deepEqual(new Uint8Array(await fetchedSmall.arrayBuffer()), smallPng);

    // Large image (> 450KB base64 -> triggers media_chunks in D1)
    const largePng = new Uint8Array(400 * 1024);
    largePng.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    largePng[largePng.length - 1] = 0x7f;
    const largeForm = new FormData();
    largeForm.append('file', new Blob([largePng], { type: 'image/png' }), 'large-hero.png');
    const largeUploadRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/media', {
        method: 'POST',
        headers: { Host: 'miyoni.de5.net', Cookie: cookieJar, 'X-CSRF-Token': authJson.csrfToken },
        body: largeForm,
      }),
      env,
      {}
    );
    assert.equal(largeUploadRes.status, 201);
    const largeMedia = (await largeUploadRes.json()).media;
    const fetchedLarge = await worker.fetch(new Request(`https://miyoni.de5.net${largeMedia.public_url}`), env, {});
    assert.equal(fetchedLarge.status, 200);
    assert.deepEqual(new Uint8Array(await fetchedLarge.arrayBuffer()), largePng);

    // 5. Save SEO settings directly to D1 without error
    const seoSaveRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Host: 'miyoni.de5.net',
          Cookie: cookieJar,
          'X-CSRF-Token': authJson.csrfToken,
        },
        body: JSON.stringify({
          key: 'seo_settings',
          value: {
            siteTitle: 'MIYONI — D1 Verified Title',
            defaultDescription: 'Official MIYONI platform powered by Cloudflare D1.',
            googleSiteVerification: 'dj706lIIs5TcH4Lc-xOxQhoPcodmaqRL-CYhx7DGCSw',
            socialImage: smallMedia.public_url,
          },
        }),
      }),
      env,
      {}
    );
    assert.equal(seoSaveRes.status, 200);

    // 6. Publish a Talkivo Omegle alternative post in D1 and confirm /search/?q=Omegle ranks it first
    const createPostRes = await worker.fetch(
      new Request('https://miyoni.de5.net/api/admin/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: 'miyoni.de5.net',
          Cookie: cookieJar,
          'X-CSRF-Token': authJson.csrfToken,
        },
        body: JSON.stringify({
          title: 'Talkivo: The Modern Alternative to Omegle',
          content_type: 'Product updates',
          excerpt: 'Talkivo on talkivo.de5.net is a fast, clean Omegle alternative by MIYONI.',
          content_html: '<p>Meet Talkivo, a modern Omegle alternative built by MIYONI.</p>',
          cover_image: smallMedia.public_url,
          product_slug: 'talkivo',
          tags: ['Talkivo', 'Omegle', 'Omegle alternative'],
          status: 'published',
          is_featured: true,
        }),
      }),
      env,
      {}
    );
    assert.equal(createPostRes.status, 201);

    const d1SearchRes = await worker.fetch(new Request('https://miyoni.de5.net/search/?q=Omegle'), env, {});
    assert.equal(d1SearchRes.status, 200);
    const d1SearchHtml = await d1SearchRes.text();
    assert.match(d1SearchHtml, /Talkivo: The Modern Alternative to Omegle/);
    assert.match(d1SearchHtml, /Articles &amp; Announcements/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
