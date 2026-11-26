/**
 * MIYONI Security, Sanitization, Crypto & Validation Utilities
 * Pure Web Standards (Cloudflare Workers + Node 22+ compatible)
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'code',
  'pre',
  'hr',
  'figure',
  'figcaption',
]);

const VOID_TAGS = new Set(['br', 'hr', 'img']);

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function slugify(input) {
  const clean = String(input ?? '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean.slice(0, 96) || 'update';
}

export function sanitizeUrl(rawUrl, { allowRelative = true } = {}) {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return '';
  if (allowRelative && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function extractYouTubeId(rawUrl) {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    let id = '';
    if (host === 'youtu.be') {
      id = u.pathname.slice(1).split('/')[0];
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') {
        id = u.searchParams.get('v') || '';
      } else if (u.pathname.startsWith('/embed/') || u.pathname.startsWith('/shorts/')) {
        id = u.pathname.split('/')[2] || '';
      }
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  } catch {
    return '';
  }
}

/**
 * Strict allowlist HTML sanitizer without DOM dependencies (Cloudflare Worker safe).
 * Strips dangerous tags (script, iframe, svg, style, form, object, embed),
 * strips all event handlers & inline styles, and validates href/src URLs.
 */
export function sanitizeHtml(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  // Remove script/style/iframe/svg/object/embed blocks including inner text
  let cleaned = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|noscript)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select)[^>]*\/?>/gi, '');

  const stack = [];
  const output = [];
  const tokenRegex = /<\/?([a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g;
  let match;

  while ((match = tokenRegex.exec(cleaned)) !== null) {
    if (match[3] !== undefined) {
      output.push(escapeHtml(match[3]));
      continue;
    }

    const fullToken = match[0];
    const tag = match[1].toLowerCase();
    const attrString = match[2] || '';
    const isClosing = fullToken.startsWith('</');

    if (!ALLOWED_TAGS.has(tag)) {
      continue;
    }

    if (isClosing) {
      if (VOID_TAGS.has(tag)) continue;
      const idx = stack.lastIndexOf(tag);
      if (idx !== -1) {
        while (stack.length > idx) {
          const popped = stack.pop();
          output.push(`</${popped}>`);
        }
      }
      continue;
    }

    const attrs = parseSafeAttributes(tag, attrString);
    output.push(`<${tag}${attrs}>`);
    if (!VOID_TAGS.has(tag) && !fullToken.endsWith('/>')) {
      stack.push(tag);
    }
  }

  while (stack.length > 0) {
    output.push(`</${stack.pop()}>`);
  }

  return output.join('');
}

function parseSafeAttributes(tag, attrString) {
  const attrs = [];
  const attrRegex = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let m;
  const collected = {};

  while ((m = attrRegex.exec(attrString)) !== null) {
    const name = m[1].toLowerCase();
    const value = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
    if (name.startsWith('on') || name === 'style' || name === 'srcdoc') continue;
    collected[name] = value;
  }

  if (tag === 'a') {
    const safeHref = sanitizeUrl(collected.href || '', { allowRelative: true });
    if (safeHref) {
      attrs.push(`href="${escapeHtml(safeHref)}"`);
      if (safeHref.startsWith('http://') || safeHref.startsWith('https://')) {
        attrs.push('target="_blank"');
        attrs.push('rel="noopener noreferrer"');
      }
    }
  } else if (tag === 'img') {
    const safeSrc = sanitizeUrl(collected.src || '', { allowRelative: true });
    if (safeSrc) {
      attrs.push(`src="${escapeHtml(safeSrc)}"`);
      attrs.push(`alt="${escapeHtml(collected.alt || '')}"`);
      attrs.push('loading="lazy"');
      attrs.push('referrerpolicy="no-referrer"');
    } else {
      return ' data-invalid="true"';
    }
  }

  return attrs.length ? ' ' + attrs.join(' ') : '';
}

function decodeEntities(str) {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripHtmlToText(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function timingSafeEqualStr(a, b) {
  const strA = String(a ?? '');
  const strB = String(b ?? '');
  const encoder = new TextEncoder();
  const bufA = encoder.encode(strA);
  const bufB = encoder.encode(strB);
  const len = Math.max(bufA.length, bufB.length);
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < len; i++) {
    diff |= (bufA[i] || 0) ^ (bufB[i] || 0);
  }
  return diff === 0;
}

export function generateRandomHex(bytes = 24) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken(payload, secret) {
  const encoder = new TextEncoder();
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sigStr] = parts;
  try {
    const encoder = new TextEncoder();
    const key = await importHmacKey(secret);
    const sigBytes = fromBase64Url(sigStr);
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body));
    if (!valid) return null;
    const payloadJson = new TextDecoder().decode(fromBase64Url(body));
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (name) {
      try {
        out[name] = decodeURIComponent(val);
      } catch {
        out[name] = val;
      }
    }
  }
  return out;
}

export function buildSessionCookie(name, value, { maxAge = 28800, request } = {}) {
  const url = request ? new URL(request.url) : null;
  const secFetchDest = request?.headers?.get('sec-fetch-dest') || '';
  const isHttps = url ? url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https' : true;
  const isIframeContext =
    secFetchDest === 'iframe' ||
    request?.headers?.get('sec-fetch-site') === 'cross-site' ||
    (url && url.hostname.endsWith('.run.app'));

  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAge}`,
  ];

  if (isIframeContext) {
    parts.push('SameSite=None');
    parts.push('Secure');
    parts.push('Partitioned');
  } else {
    parts.push('SameSite=Lax');
    if (isHttps) {
      parts.push('Secure');
    }
  }
  return parts.join('; ');
}

export function clearSessionCookie(name, request) {
  return buildSessionCookie(name, '', { maxAge: 0, request });
}

/**
 * Simple sliding-window in-memory rate limiter (complemented by signed challenge cookies)
 */
const rateBuckets = new Map();

export function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now > entry.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!origin || !host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
