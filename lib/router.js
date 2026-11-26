/**
 * MIYONI Unified Request Router (Pure Web Standards)
 * Shared by worker.js (Cloudflare Workers) and server.ts (AI Studio Preview).
 */

import {
  buildSessionCookie,
  checkRateLimit,
  clearSessionCookie,
  generateRandomHex,
  getClientIp,
  isSameOriginRequest,
  isValidEmailFormat,
  normalizeEmail,
  parseCookies,
  signToken,
  timingSafeEqualStr,
  verifyToken,
} from './security.js';
import {
  renderLlmsTxt,
  renderPublicPage,
  renderRobotsTxt,
  renderRssXml,
  renderSitemapXml,
} from './seo-render.js';
import {
  MiyoniDataStore,
  sendSmartBaseVerificationEmail,
  verifySmartBaseEmailCode,
} from './smartbase.js';

const SESSION_COOKIE = 'miyoni_admin_session';
const CHALLENGE_COOKIE = 'miyoni_verify_attempt';
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

let ephemeralFallbackSecret = null;

function getSessionSecret(env) {
  if (env?.SESSION_SECRET && String(env.SESSION_SECRET).length >= 16) {
    return String(env.SESSION_SECRET);
  }
  if (!ephemeralFallbackSecret) {
    ephemeralFallbackSecret = generateRandomHex(32);
  }
  return ephemeralFallbackSecret;
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function adminNoCacheHeaders(extra = {}) {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  };
}

function publicHtmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60, s-maxage=300' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}

async function authenticateAdmin(request, env) {
  const authorizedEmail = normalizeEmail(env?.ADMIN_EMAIL);
  if (!authorizedEmail) return null;

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const session = await verifyToken(token, getSessionSecret(env));
  if (!session || !session.email || !session.csrf) return null;

  if (!timingSafeEqualStr(normalizeEmail(session.email), authorizedEmail)) {
    return null;
  }
  return session;
}

function validateMagicBytes(mime, bytes) {
  if (bytes.length < 4) return false;
  if (mime === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (mime === 'image/gif') {
    return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  }
  if (mime === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  if (mime === 'image/svg+xml') {
    const text = new TextDecoder().decode(bytes.slice(0, 8192)).toLowerCase();
    if (!text.includes('<svg')) return false;
    if (text.includes('<script') || /\son[a-z]+\s*=/.test(text) || text.includes('javascript:')) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * @param {Request} request
 * @param {Record<string, any>} env
 * @param {((req: Request) => Promise<Response>) | null} [assetsFetcher]
 * @param {{ read: () => Promise<any>, write: (data: any) => Promise<void> } | null} [localPersistence]
 * @returns {Promise<Response>}
 */
export async function handleWorkerRequest(request, env, assetsFetcher = null, localPersistence = null) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  const store = new MiyoniDataStore(env, localPersistence);

  // 1. Static asset passthrough for CSS, JS, images, favicon
  if (
    pathname.startsWith('/css/') ||
    pathname.startsWith('/js/') ||
    pathname.startsWith('/assets/') ||
    pathname === '/favicon.ico'
  ) {
    if (assetsFetcher) {
      const assetRes = await assetsFetcher(request);
      if (assetRes && assetRes.status !== 404) {
        return assetRes;
      }
    }
  }

  // 2. SmartBase Media File Proxy (/media/:name)
  if (pathname.startsWith('/media/') && method === 'GET') {
    const fileName = decodeURIComponent(pathname.slice('/media/'.length));
    const mediaRes = await store.getMediaFileResponse(fileName);
    if (mediaRes) return mediaRes;
    return new Response('Media not found', { status: 404 });
  }

  // 3. SEO & Machine-Readable Endpoints
  if (pathname === '/robots.txt' && method === 'GET') {
    return new Response(renderRobotsTxt(env, request.url), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  if (pathname === '/sitemap.xml' && method === 'GET') {
    const snapshot = await store.getSiteSnapshot();
    return new Response(renderSitemapXml(snapshot, env, request.url), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  if (pathname === '/rss.xml' && method === 'GET') {
    const snapshot = await store.getSiteSnapshot();
    return new Response(renderRssXml(snapshot, env, request.url), {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  if (pathname === '/llms.txt' && method === 'GET') {
    const snapshot = await store.getSiteSnapshot();
    return new Response(renderLlmsTxt(snapshot, env, request.url), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    });
  }

  // 4. Private Admin UI Entry (/admin)
  if (pathname === '/admin' || pathname === '/admin/') {
    if (assetsFetcher) {
      const adminUrl = new URL('/admin.html', url.origin);
      const assetRes = await assetsFetcher(new Request(adminUrl.toString(), { method: 'GET' }));
      if (assetRes && assetRes.status === 200) {
        const html = await assetRes.text();
        return new Response(html, {
          status: 200,
          headers: adminNoCacheHeaders({
            'Content-Type': 'text/html; charset=utf-8',
          }),
        });
      }
    }
    return new Response('Admin interface unavailable', { status: 404, headers: adminNoCacheHeaders() });
  }

  // 5. Admin Authentication & Protected APIs (/api/admin/*)
  if (pathname.startsWith('/api/admin/')) {
    // Public registration is strictly prohibited; only single ADMIN_EMAIL login flow is permitted.
    if (pathname === '/api/admin/session' && method === 'GET') {
      const configured = Boolean(normalizeEmail(env?.ADMIN_EMAIL) && env?.SMARTBASE_EMAIL_API_KEY);
      const session = await authenticateAdmin(request, env);
      if (!session) {
        return jsonResponse(
          {
            authenticated: false,
            configured,
            smartbaseConnected: store.hasSmartBaseRead() && store.hasSmartBaseWrite(),
          },
          200,
          adminNoCacheHeaders()
        );
      }
      return jsonResponse(
        {
          authenticated: true,
          configured,
          email: session.email,
          csrfToken: session.csrf,
          smartbaseConnected: store.hasSmartBaseRead() && store.hasSmartBaseWrite(),
        },
        200,
        adminNoCacheHeaders()
      );
    }

    if (pathname === '/api/admin/send-verification' && method === 'POST') {
      if (!isSameOriginRequest(request)) {
        return jsonResponse({ error: 'Invalid request origin.' }, 403, adminNoCacheHeaders());
      }
      const authorizedEmail = normalizeEmail(env?.ADMIN_EMAIL);
      if (!authorizedEmail || !env?.SMARTBASE_EMAIL_API_KEY) {
        return jsonResponse(
          {
            error:
              'Admin authentication is not configured. Set ADMIN_EMAIL and SMARTBASE_EMAIL_API_KEY in environment secrets.',
          },
          503,
          adminNoCacheHeaders()
        );
      }

      const ip = getClientIp(request);
      const ipLimit = checkRateLimit(`send:${ip}`, 8, 15 * 60 * 1000);
      if (!ipLimit.allowed) {
        return jsonResponse(
          { error: 'Too many verification requests. Please wait before trying again.' },
          429,
          adminNoCacheHeaders()
        );
      }

      const body = await request.json().catch(() => ({}));
      const submittedEmail = normalizeEmail(body.email);

      if (!isValidEmailFormat(submittedEmail)) {
        return jsonResponse({ error: 'Please enter a valid email address.' }, 400, adminNoCacheHeaders());
      }

      const emailLimit = checkRateLimit(`send-email:${submittedEmail}`, 5, 15 * 60 * 1000);
      if (!emailLimit.allowed) {
        return jsonResponse(
          { error: 'Verification code request limit reached. Try again later.' },
          429,
          adminNoCacheHeaders()
        );
      }

      if (!timingSafeEqualStr(submittedEmail, authorizedEmail)) {
        await store.logActivity(
          submittedEmail,
          'rejected_admin_email',
          'auth',
          '',
          'Unauthorized email attempted admin verification',
          ip
        );
        return jsonResponse(
          { error: 'Access denied. This email address is not authorized for MIYONI administration.' },
          403,
          adminNoCacheHeaders()
        );
      }

      const result = await sendSmartBaseVerificationEmail(env, authorizedEmail);
      if (!result.ok) {
        return jsonResponse(
          { error: result.error || 'Failed to dispatch verification email.' },
          result.status || 502,
          adminNoCacheHeaders()
        );
      }

      const challengeToken = await signToken(
        {
          email: authorizedEmail,
          attempts: 0,
          iat: Date.now(),
          exp: Date.now() + 10 * 60 * 1000, // 10 minutes
        },
        getSessionSecret(env)
      );

      return jsonResponse(
        { ok: true, message: 'Verification code sent via SmartBase Email.' },
        200,
        adminNoCacheHeaders({
          'Set-Cookie': buildSessionCookie(CHALLENGE_COOKIE, challengeToken, {
            maxAge: 600,
            request,
          }),
        })
      );
    }

    if (pathname === '/api/admin/verify-code' && method === 'POST') {
      if (!isSameOriginRequest(request)) {
        return jsonResponse({ error: 'Invalid request origin.' }, 403, adminNoCacheHeaders());
      }
      const authorizedEmail = normalizeEmail(env?.ADMIN_EMAIL);
      if (!authorizedEmail || !env?.SMARTBASE_EMAIL_API_KEY) {
        return jsonResponse(
          { error: 'Admin verification is not configured.' },
          503,
          adminNoCacheHeaders()
        );
      }

      const ip = getClientIp(request);
      const ipLimit = checkRateLimit(`verify:${ip}`, 12, 10 * 60 * 1000);
      if (!ipLimit.allowed) {
        return jsonResponse(
          { error: 'Too many verification attempts. Please wait and request a new code.' },
          429,
          adminNoCacheHeaders()
        );
      }

      const cookies = parseCookies(request.headers.get('cookie'));
      const challengeToken = cookies[CHALLENGE_COOKIE];
      const challenge = await verifyToken(challengeToken, getSessionSecret(env));
      if (!challenge || !timingSafeEqualStr(normalizeEmail(challenge.email), authorizedEmail)) {
        return jsonResponse(
          { error: 'Verification session expired. Please request a new code.' },
          401,
          adminNoCacheHeaders()
        );
      }

      if ((challenge.attempts || 0) >= 5) {
        return jsonResponse(
          { error: 'Maximum code attempts exceeded. Please request a new verification code.' },
          429,
          adminNoCacheHeaders({
            'Set-Cookie': clearSessionCookie(CHALLENGE_COOKIE, request),
          })
        );
      }

      const body = await request.json().catch(() => ({}));
      const submittedEmail = normalizeEmail(body.email);
      const code = String(body.code || '').trim();

      if (!timingSafeEqualStr(submittedEmail, authorizedEmail)) {
        return jsonResponse({ error: 'Authorized email mismatch.' }, 403, adminNoCacheHeaders());
      }

      if (!code || code.length < 4 || code.length > 16) {
        return jsonResponse({ error: 'Please enter a valid verification code.' }, 400, adminNoCacheHeaders());
      }

      const verifyRes = await verifySmartBaseEmailCode(env, authorizedEmail, code);
      if (!verifyRes.ok) {
        const nextAttempts = (challenge.attempts || 0) + 1;
        const headers = adminNoCacheHeaders();
        if (nextAttempts >= 5) {
          headers['Set-Cookie'] = clearSessionCookie(CHALLENGE_COOKIE, request);
        } else {
          const updatedChallenge = await signToken(
            { ...challenge, attempts: nextAttempts },
            getSessionSecret(env)
          );
          headers['Set-Cookie'] = buildSessionCookie(CHALLENGE_COOKIE, updatedChallenge, {
            maxAge: 600,
            request,
          });
        }
        await store.logActivity(
          authorizedEmail,
          'failed_code_verification',
          'auth',
          '',
          `Attempt ${nextAttempts}/5 failed`,
          ip
        );
        return jsonResponse(
          { error: verifyRes.error || 'Verification failed.' },
          verifyRes.status || 401,
          headers
        );
      }

      const csrfToken = generateRandomHex(24);
      const sessionToken = await signToken(
        {
          email: authorizedEmail,
          csrf: csrfToken,
          jti: generateRandomHex(12),
          iat: Date.now(),
          exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
        },
        getSessionSecret(env)
      );

      await store.logActivity(
        authorizedEmail,
        'admin_login',
        'auth',
        '',
        'Authenticated via SmartBase Email verification',
        ip
      );

      const resHeaders = new Headers(adminNoCacheHeaders());
      resHeaders.append(
        'Set-Cookie',
        buildSessionCookie(SESSION_COOKIE, sessionToken, { maxAge: 28800, request })
      );
      resHeaders.append('Set-Cookie', clearSessionCookie(CHALLENGE_COOKIE, request));
      resHeaders.set('Content-Type', 'application/json; charset=utf-8');

      return new Response(
        JSON.stringify({
          authenticated: true,
          email: authorizedEmail,
          csrfToken,
        }),
        { status: 200, headers: resHeaders }
      );
    }

    // All remaining /api/admin/* endpoints require a valid authenticated session
    const session = await authenticateAdmin(request, env);
    if (!session) {
      return jsonResponse({ error: 'Unauthorized. Admin authentication required.' }, 401, adminNoCacheHeaders());
    }

    // CSRF & Origin protection on all state-changing routes
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (!isSameOriginRequest(request)) {
        return jsonResponse({ error: 'Origin mismatch.' }, 403, adminNoCacheHeaders());
      }
      const headerCsrf = request.headers.get('x-csrf-token') || '';
      if (!timingSafeEqualStr(headerCsrf, session.csrf)) {
        return jsonResponse({ error: 'Invalid CSRF token.' }, 403, adminNoCacheHeaders());
      }
    }

    const ip = getClientIp(request);

    if (pathname === '/api/admin/logout' && method === 'POST') {
      await store.logActivity(session.email, 'admin_logout', 'auth', '', 'Administrator signed out', ip);
      return jsonResponse(
        { ok: true },
        200,
        adminNoCacheHeaders({
          'Set-Cookie': clearSessionCookie(SESSION_COOKIE, request),
        })
      );
    }

    if (pathname === '/api/admin/dashboard' && method === 'GET') {
      const [snapshot, activity] = await Promise.all([
        store.getSiteSnapshot(),
        store.getActivityLogs(),
      ]);
      const publishedCount = snapshot.posts.filter((p) => p.status === 'published').length;
      const draftCount = snapshot.posts.filter((p) => p.status !== 'published').length;
      return jsonResponse(
        {
          stats: {
            totalPosts: snapshot.posts.length,
            publishedPosts: publishedCount,
            draftPosts: draftCount,
            totalProducts: snapshot.products.length,
            uploadedMedia: snapshot.media.length,
          },
          source: snapshot.source,
          recentActivity: activity.slice(0, 15),
          posts: snapshot.posts,
          products: snapshot.products,
          categories: snapshot.categories,
          media: snapshot.media,
          settings: snapshot.settings,
        },
        200,
        adminNoCacheHeaders()
      );
    }

    // Posts CRUD
    if (pathname === '/api/admin/posts' && method === 'GET') {
      const snapshot = await store.getSiteSnapshot();
      return jsonResponse({ posts: snapshot.posts }, 200, adminNoCacheHeaders());
    }

    if (pathname === '/api/admin/posts' && method === 'POST') {
      try {
        const body = await request.json();
        const post = await store.upsertPost(body, null);
        await store.logActivity(session.email, 'create_post', 'post', post.id, post.title, ip);
        return jsonResponse({ post }, 201, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 400, adminNoCacheHeaders());
      }
    }

    if (pathname.startsWith('/api/admin/posts/') && method === 'PUT') {
      const id = pathname.slice('/api/admin/posts/'.length);
      try {
        const body = await request.json();
        const post = await store.upsertPost(body, id);
        await store.logActivity(session.email, 'update_post', 'post', id, post.title, ip);
        return jsonResponse({ post }, 200, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 400, adminNoCacheHeaders());
      }
    }

    if (pathname.startsWith('/api/admin/posts/') && method === 'DELETE') {
      const id = pathname.slice('/api/admin/posts/'.length);
      try {
        await store.deletePost(id);
        await store.logActivity(session.email, 'delete_post', 'post', id, `Deleted post #${id}`, ip);
        return jsonResponse({ ok: true }, 200, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 404, adminNoCacheHeaders());
      }
    }

    // Products CRUD
    if (pathname === '/api/admin/products' && method === 'GET') {
      const snapshot = await store.getSiteSnapshot();
      return jsonResponse({ products: snapshot.products }, 200, adminNoCacheHeaders());
    }

    if (pathname === '/api/admin/products' && method === 'POST') {
      try {
        const body = await request.json();
        const product = await store.upsertProduct(body, null);
        await store.logActivity(session.email, 'create_product', 'product', product.id, product.name, ip);
        return jsonResponse({ product }, 201, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 400, adminNoCacheHeaders());
      }
    }

    if (pathname.startsWith('/api/admin/products/') && method === 'PUT') {
      const id = pathname.slice('/api/admin/products/'.length);
      try {
        const body = await request.json();
        const product = await store.upsertProduct(body, id);
        await store.logActivity(session.email, 'update_product', 'product', id, product.name, ip);
        return jsonResponse({ product }, 200, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 400, adminNoCacheHeaders());
      }
    }

    if (pathname.startsWith('/api/admin/products/') && method === 'DELETE') {
      const id = pathname.slice('/api/admin/products/'.length);
      try {
        await store.deleteProduct(id);
        await store.logActivity(session.email, 'delete_product', 'product', id, `Deleted product #${id}`, ip);
        return jsonResponse({ ok: true }, 200, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 400, adminNoCacheHeaders());
      }
    }

    // Categories CRUD
    if (pathname === '/api/admin/categories' && method === 'POST') {
      try {
        const body = await request.json();
        const category = await store.createCategory(body);
        await store.logActivity(session.email, 'create_category', 'category', category.id, category.name, ip);
        return jsonResponse({ category }, 201, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 400, adminNoCacheHeaders());
      }
    }

    if (pathname.startsWith('/api/admin/categories/') && method === 'DELETE') {
      const id = pathname.slice('/api/admin/categories/'.length);
      try {
        await store.deleteCategory(id);
        await store.logActivity(session.email, 'delete_category', 'category', id, `Deleted category #${id}`, ip);
        return jsonResponse({ ok: true }, 200, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 400, adminNoCacheHeaders());
      }
    }

    // Site Settings (Company, Founder, History, SEO)
    if (pathname === '/api/admin/settings' && method === 'PUT') {
      try {
        const body = await request.json();
        const saved = await store.updateSetting(body.key, body.value);
        await store.logActivity(session.email, 'update_settings', 'settings', body.key, `Updated ${body.key}`, ip);
        return jsonResponse({ ok: true, key: body.key, value: saved }, 200, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 400, adminNoCacheHeaders());
      }
    }

    // Media Upload & Delete
    if (pathname === '/api/admin/media' && method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || typeof file.arrayBuffer !== 'function') {
          return jsonResponse({ error: 'No image file provided.' }, 400, adminNoCacheHeaders());
        }
        const mimeType = String(file.type || '').toLowerCase();
        if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
          return jsonResponse(
            { error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, SVG.' },
            400,
            adminNoCacheHeaders()
          );
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          return jsonResponse(
            { error: 'File exceeds maximum 5 MB upload limit.' },
            413,
            adminNoCacheHeaders()
          );
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!validateMagicBytes(mimeType, bytes)) {
          return jsonResponse(
            { error: 'File content failed security signature validation.' },
            400,
            adminNoCacheHeaders()
          );
        }

        const item = await store.uploadMediaFile({
          fileName: file.name || 'image.png',
          mimeType,
          bytes,
          altText: formData.get('alt_text') || '',
          caption: formData.get('caption') || '',
          uploadedBy: session.email,
        });
        await store.logActivity(session.email, 'upload_media', 'media', item.file_name, item.original_name, ip);
        return jsonResponse({ media: item }, 201, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message || 'Upload failed.' }, 400, adminNoCacheHeaders());
      }
    }

    if (pathname.startsWith('/api/admin/media/') && method === 'DELETE') {
      const name = decodeURIComponent(pathname.slice('/api/admin/media/'.length));
      try {
        await store.deleteMedia(name);
        await store.logActivity(session.email, 'delete_media', 'media', name, `Deleted ${name}`, ip);
        return jsonResponse({ ok: true }, 200, adminNoCacheHeaders());
      } catch (err) {
        return jsonResponse({ error: err.message }, 400, adminNoCacheHeaders());
      }
    }

    if (pathname === '/api/admin/activity' && method === 'GET') {
      const activity = await store.getActivityLogs();
      return jsonResponse({ activity }, 200, adminNoCacheHeaders());
    }

    return jsonResponse({ error: 'Admin endpoint not found.' }, 404, adminNoCacheHeaders());
  }

  // 6. Server-Side Rendered Public HTML Pages
  if (method === 'GET') {
    const snapshot = await store.getSiteSnapshot();
    const { status, html } = renderPublicPage(pathname, url.searchParams, snapshot, env, request.url);
    return publicHtmlResponse(html, status);
  }

  return new Response('Method Not Allowed', { status: 405 });
}
