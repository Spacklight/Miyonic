import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
  } finally {
    globalThis.fetch = originalFetch;
  }
});
