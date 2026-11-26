/**
 * MIYONI SmartBase Database, File Storage, and SmartBase Email Integration
 * Supports live SmartBase REST/SQL API (https://smartbase.de5.net/apiv1)
 * and clean local persistence adapter for AI Studio preview when env keys are unset.
 */

import { normalizeEmail, sanitizeHtml, sanitizeUrl, slugify } from './security.js';

export const SMARTBASE_API_BASE = 'https://smartbase.de5.net/apiv1';
export const SMARTBASE_EMAIL_BASE = 'https://smartemail.de5.net/api/v1';

export const DEFAULT_SITE_DATA = {
  settings: {
    company_info: {
      brandName: 'MIYONI',
      tagline: 'We build functionality and quality.',
      country: 'Malawi',
      domain: 'https://miyoni.de5.net/',
      overview:
        'MIYONI is an independent technology brand founded in Malawi by Roosevelt Chikwende. We bring together cloud infrastructure, software engineering, communication systems, and educational technology under one cohesive identity.',
      mission:
        'To build functional, dependable, and accessible digital technology that solves practical problems for developers, students, and organizations.',
      vision:
        'To establish an enduring independent technology ecosystem from Malawi capable of powering modern software infrastructure and learning experiences worldwide.',
      focusAreas: [
        'Software development',
        'Cloud infrastructure',
        'Educational technology',
        'Communication platforms',
        'Digital innovation',
        'Independent digital product engineering',
      ],
      contactEmail: 'contact@miyoni.de5.net',
      location: 'Malawi',
    },
    founder_info: {
      name: 'Roosevelt Chikwende',
      role: 'Founder, MIYONI',
      country: 'Malawi',
      introduction:
        'Roosevelt Chikwende is the founder of MIYONI, an independent technology brand established in Malawi around a straightforward engineering principle: build functionality and quality.',
      biography:
        'From cloud database infrastructure to educational tools and communication products, Roosevelt Chikwende leads the vision, software architecture, and product direction of MIYONI. His work focuses on creating practical, self-reliant digital systems that empower developers and students alike.',
      vision:
        'Technology should work reliably, remain accessible to builders and learners, and stand on genuine engineering quality rather than unnecessary complexity.',
      philosophy:
        'Patience, silence, and self-belief guide long-term engineering craft. Every product under MIYONI begins with a real problem and is refined through steady, purposeful iteration.',
      originStory:
        'MIYONI began as an independent initiative in Malawi to unify multiple digital software projects—spanning backend cloud tooling, education, and communication—under a single principled brand identity.',
      quote:
        'Not every battle is fought with weapons. Some are fought with patience, silence and self-belief.',
    },
    company_history: [
      {
        id: 'origin',
        period: 'Founding Milestone',
        title: 'Establishment of MIYONI in Malawi',
        description:
          'Roosevelt Chikwende establishes MIYONI as an independent technology brand dedicated to building functionality and quality across cloud, communication, and educational software.',
      },
      {
        id: 'ecosystem',
        period: 'Ecosystem Architecture',
        title: 'Bringing Core Digital Products Under One Identity',
        description:
          'MIYONI structures its product portfolio around SmartBase for cloud database infrastructure, Talkivo for communication, XOOL for AI-assisted student learning, and Zapamubas as a student platform concept associated with MUBAS.',
      },
    ],
    seo_settings: {
      siteTitle: 'MIYONI — We Build Functionality and Quality',
      defaultDescription:
        'Official digital headquarters of MIYONI, an independent technology company founded by Roosevelt Chikwende in Malawi building SmartBase, Talkivo, XOOL, and Zapamubas.',
      googleSiteVerification: '',
      socialImage: '/assets/founder-office.png',
    },
  },
  categories: [
    { id: 1, name: 'Company Announcements', slug: 'company-announcements', description: 'Official company news and announcements from MIYONI.' },
    { id: 2, name: 'Product Launches', slug: 'product-launches', description: 'New platform releases across the MIYONI product ecosystem.' },
    { id: 3, name: 'Product Updates', slug: 'product-updates', description: 'Engineering updates and feature announcements.' },
    { id: 4, name: 'Technical Articles', slug: 'technical-articles', description: 'Cloud infrastructure, database design, and software engineering notes.' },
    { id: 5, name: 'Founder Announcements', slug: 'founder-announcements', description: 'Updates and notes from founder Roosevelt Chikwende.' },
  ],
  products: [
    {
      id: 1,
      name: 'SmartBase',
      slug: 'smartbase',
      tagline: 'SQL-powered cloud database and backend platform.',
      summary:
        'Cloud database management, SQL editor, REST API, API key management, authentication, email infrastructure, file storage, and resource monitoring.',
      description:
        '<p>SmartBase is a SQL-powered cloud database and backend platform built under MIYONI. It helps developers launch and scale applications without provisioning or maintaining their own database servers.</p><p>Core capabilities include cloud database management, an interactive SQL editor, REST API access, scoped read and write API keys, built-in authentication, SmartBase Email verification infrastructure, file storage, and database resource monitoring.</p>',
      website_url: 'https://smartbase.de5.net/',
      status_label: 'Live Platform',
      category_label: 'Cloud Infrastructure',
      features: [
        'Cloud database management',
        'SQL editor',
        'REST API',
        'API key management',
        'Authentication',
        'Email infrastructure',
        'File storage',
        'Developer tools & resource monitoring',
      ],
      screenshots: [],
      sort_order: 1,
      is_featured: 1,
      seo_title: 'SmartBase by MIYONI — Cloud SQL Database & Backend Platform',
      seo_description:
        'SmartBase is MIYONI’s SQL-powered cloud database and backend platform featuring REST APIs, authentication, email infrastructure, and file storage.',
      updated_at: '2026-11-25T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Talkivo',
      slug: 'talkivo',
      tagline: 'Communication-oriented digital product under MIYONI.',
      summary:
        'A communication-oriented digital product developed under the MIYONI ecosystem, designed for reliable, structured digital connection.',
      description:
        '<p>Talkivo is a communication-oriented digital product developed under the MIYONI identity. Built with a focus on clarity and practical utility, Talkivo forms the communication pillar of the MIYONI ecosystem.</p><p>Official product announcements, feature milestones, and updates are published directly through this portal.</p>',
      website_url: 'https://talkivo.de5.net/',
      status_label: 'Ecosystem Product',
      category_label: 'Communication Platform',
      features: [
        'Communication-oriented digital product',
        'Integrated within the MIYONI ecosystem',
        'Administrator-maintained feature specifications & announcements',
      ],
      screenshots: [],
      sort_order: 2,
      is_featured: 1,
      seo_title: 'Talkivo by MIYONI — Communication Platform',
      seo_description:
        'Talkivo is a communication-oriented digital product developed under MIYONI in Malawi.',
      updated_at: '2026-11-25T00:00:00.000Z',
    },
    {
      id: 3,
      name: 'XOOL',
      slug: 'xool',
      tagline: 'Educational technology with AI study assistance & PDF learning.',
      summary:
        'An educational technology platform featuring AI-powered educational assistance, study materials, and PDF-based learning tools for students.',
      description:
        '<p>XOOL is MIYONI’s educational technology platform built to support students through AI-powered educational assistance, structured study materials, and PDF-based learning workflows.</p><p>As XOOL continues to evolve, new educational features and student learning developments are announced through MIYONI Updates.</p>',
      website_url: 'https://xool.de5.net/',
      status_label: 'EdTech Platform',
      category_label: 'Educational Technology',
      features: [
        'AI-powered educational assistance',
        'Structured study materials',
        'PDF-based learning tools',
        'Student-focused academic support workflows',
      ],
      screenshots: [],
      sort_order: 3,
      is_featured: 1,
      seo_title: 'XOOL by MIYONI — Educational Technology Platform',
      seo_description:
        'XOOL is MIYONI’s educational technology platform with AI-powered study assistance, study materials, and PDF-based learning.',
      updated_at: '2026-11-25T00:00:00.000Z',
    },
    {
      id: 4,
      name: 'Zapamubas',
      slug: 'zapamubas',
      tagline: 'Student-focused digital platform concept associated with MUBAS.',
      summary:
        'A student-focused digital platform concept associated with MUBAS, envisioning student communities, academic announcements, learning resources, and AI-powered educational experiences.',
      description:
        '<p>Zapamubas is a student-focused digital platform concept associated with MUBAS. Its intended ecosystem brings together student communities, social content, communication, academic announcements, learning resources, student connections, and AI-powered educational experiences.</p><p>In keeping with MIYONI’s commitment to transparency, Zapamubas is presented strictly as an intended platform concept while official milestones are published by the administrator.</p>',
      website_url: 'https://zapamubas.de5.net/',
      status_label: 'Platform Concept',
      category_label: 'Student Ecosystem Concept',
      features: [
        'Intended ecosystem: Student communities',
        'Intended ecosystem: Social content & communication',
        'Intended ecosystem: Academic announcements',
        'Intended ecosystem: Learning resources & student connections',
        'Intended ecosystem: AI-powered educational experiences',
      ],
      screenshots: [],
      sort_order: 4,
      is_featured: 1,
      seo_title: 'Zapamubas by MIYONI — MUBAS Student Platform Concept',
      seo_description:
        'Zapamubas is a student-focused digital platform concept associated with MUBAS developed under MIYONI.',
      updated_at: '2026-11-25T00:00:00.000Z',
    },
  ],
  posts: [
    {
      id: 1,
      title: 'Introducing the Official MIYONI Digital Headquarters',
      slug: 'introducing-official-miyoni-digital-headquarters',
      content_type: 'Company announcements',
      excerpt:
        'MIYONI launches its unified official web platform bringing together SmartBase, Talkivo, XOOL, Zapamubas, founder updates, and dynamic product news.',
      content_html:
        '<p>MIYONI is built on a single principle: <strong>We build functionality and quality.</strong> Founded in Malawi by Roosevelt Chikwende, MIYONI brings independent software engineering, cloud infrastructure, communication systems, and educational technology together under one permanent digital headquarters.</p><p>This platform serves as the central source for official product information, engineering updates, founder announcements, and technical documentation across the MIYONI ecosystem.</p><h3>Ecosystem Pillars</h3><ul><li><strong>SmartBase:</strong> SQL-powered cloud database, REST API, authentication, email infrastructure, and file storage.</li><li><strong>Talkivo:</strong> Communication-oriented digital product under MIYONI.</li><li><strong>XOOL:</strong> Educational technology featuring AI-powered assistance and PDF-based learning.</li><li><strong>Zapamubas:</strong> A student-focused digital platform concept associated with MUBAS.</li></ul>',
      cover_image: '/assets/founder-office.png',
      gallery_images: [],
      youtube_url: '',
      product_id: 1,
      product_slug: 'smartbase',
      product_url: 'https://smartbase.de5.net/',
      external_urls: ['https://smartbase.de5.net/'],
      category_id: 1,
      category_slug: 'company-announcements',
      tags: ['MIYONI', 'Malawi', 'Official Launch'],
      status: 'published',
      is_featured: 1,
      author_name: 'Roosevelt Chikwende',
      seo_title: 'Introducing the Official MIYONI Digital Headquarters',
      seo_description:
        'MIYONI launches its official digital headquarters featuring SmartBase, Talkivo, XOOL, Zapamubas, and updates from founder Roosevelt Chikwende.',
      canonical_url: 'https://miyoni.de5.net/news/introducing-official-miyoni-digital-headquarters/',
      social_image: '/assets/founder-office.png',
      published_at: '2026-11-25T10:00:00.000Z',
      created_at: '2026-11-25T10:00:00.000Z',
      updated_at: '2026-11-25T10:00:00.000Z',
    },
  ],
  media: [
    {
      id: 1,
      file_name: 'founder-office.png',
      original_name: 'founder-office.png',
      mime_type: 'image/png',
      size_bytes: 2100000,
      public_url: '/assets/founder-office.png',
      alt_text: 'Roosevelt Chikwende, Founder of MIYONI, in his workspace',
      caption: 'Roosevelt Chikwende at the MIYONI workspace',
      uploaded_by: 'system',
      created_at: '2026-11-25T00:00:00.000Z',
    },
    {
      id: 2,
      file_name: 'founder-portrait.png',
      original_name: 'founder-portrait.png',
      mime_type: 'image/png',
      size_bytes: 1800000,
      public_url: '/assets/founder-portrait.png',
      alt_text: 'Studio portrait of MIYONI founder Roosevelt Chikwende',
      caption: 'Official studio portrait — Roosevelt Chikwende',
      uploaded_by: 'system',
      created_at: '2026-11-25T00:00:00.000Z',
    },
    {
      id: 3,
      file_name: 'founder-quote.png',
      original_name: 'founder-quote.png',
      mime_type: 'image/png',
      size_bytes: 2200000,
      public_url: '/assets/founder-quote.png',
      alt_text: 'Roosevelt Chikwende quote on patience, silence, and self-belief',
      caption: 'Founder philosophy graphic — Patience, silence, and self-belief',
      uploaded_by: 'system',
      created_at: '2026-11-25T00:00:00.000Z',
    },
  ],
  admin_activity: [],
};

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SITE_DATA));
}

function safeJsonParse(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.records)) return payload.records;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.tables)) return payload.tables;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.files)) return payload.files;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.result)) return payload.result;
  if (payload.data && Array.isArray(payload.data.records)) return payload.data.records;
  if (payload.data && Array.isArray(payload.data.rows)) return payload.data.rows;
  if (payload.data && Array.isArray(payload.data.tables)) return payload.data.tables;
  return [];
}

/**
 * SmartBase Email Verification Client
 */
export async function sendSmartBaseVerificationEmail(env, email) {
  const apiKey = env?.SMARTBASE_EMAIL_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 503, error: 'SMARTBASE_EMAIL_API_KEY is not configured.' };
  }

  try {
    const res = await fetch(`${SMARTBASE_EMAIL_BASE}/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smartbase-Key': apiKey,
      },
      body: JSON.stringify({
        email,
        name: 'Miyoni Administrator',
      }),
    });

    const data = await res.json().catch(() => ({}));
    const explicitlyFailed =
      data?.success === false || data?.ok === false || Boolean(data?.error);
    const explicitlySucceeded =
      data?.success === true ||
      data?.ok === true ||
      data?.sent === true ||
      data?.status === 'sent' ||
      data?.status === 'success' ||
      (res.ok && !explicitlyFailed && typeof data?.message === 'string');

    if (!res.ok || explicitlyFailed || !explicitlySucceeded) {
      return {
        ok: false,
        status: res.status || 502,
        error: data?.error || data?.message || 'SmartBase Email rejected the verification request.',
        raw: data,
      };
    }

    return { ok: true, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: `Failed to reach SmartBase Email service: ${err?.message || 'Network error'}`,
    };
  }
}

export async function verifySmartBaseEmailCode(env, email, code) {
  const apiKey = env?.SMARTBASE_EMAIL_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 503, error: 'SMARTBASE_EMAIL_API_KEY is not configured.' };
  }

  try {
    const res = await fetch(`${SMARTBASE_EMAIL_BASE}/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smartbase-Key': apiKey,
      },
      body: JSON.stringify({
        email,
        code: String(code || '').trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    const explicitlyFailed =
      data?.success === false ||
      data?.verified === false ||
      data?.valid === false ||
      data?.ok === false ||
      Boolean(data?.error);

    const explicitlyVerified =
      data?.success === true ||
      data?.verified === true ||
      data?.valid === true ||
      data?.status === 'verified' ||
      data?.status === 'success';

    if (!res.ok || explicitlyFailed || !explicitlyVerified) {
      return {
        ok: false,
        status: res.status >= 500 ? res.status : 401,
        error: data?.error || data?.message || 'Invalid or expired verification code.',
        raw: data,
      };
    }

    return { ok: true, status: 200, data };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: `Failed to verify code with SmartBase Email: ${err?.message || 'Network error'}`,
    };
  }
}

/**
 * SmartBase Cloud Database & File Storage Adapter
 */
export class MiyoniDataStore {
  constructor(env = {}, localPersistence = null) {
    this.env = env;
    this.localPersistence = localPersistence;
    this.tableIdCache = new Map();
    this.tableCacheExpiresAt = 0;
  }

  hasSmartBaseRead() {
    return Boolean(this.env?.SMARTBASE_READ_KEY && this.env?.SMARTBASE_DATABASE_ID);
  }

  hasSmartBaseWrite() {
    return Boolean(this.env?.SMARTBASE_WRITE_KEY && this.env?.SMARTBASE_DATABASE_ID);
  }

  async smartbaseFetch(path, { method = 'GET', write = false, body = null, rawBody = null, headers = {} } = {}) {
    const apiKey = write ? this.env.SMARTBASE_WRITE_KEY : this.env.SMARTBASE_READ_KEY;
    if (!apiKey) {
      throw new Error(write ? 'SMARTBASE_WRITE_KEY is missing' : 'SMARTBASE_READ_KEY is missing');
    }

    const reqHeaders = {
      'X-API-Key': apiKey,
      Authorization: `Bearer ${apiKey}`,
      ...headers,
    };

    let fetchBody = rawBody;
    if (body !== null && rawBody === null) {
      reqHeaders['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(body);
    }

    const res = await fetch(`${SMARTBASE_API_BASE}${path}`, {
      method,
      headers: reqHeaders,
      body: fetchBody,
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`SmartBase HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      return res;
    }

    const json = await res.json();
    if (!res.ok || json?.error) {
      throw new Error(json?.error || json?.message || `SmartBase HTTP ${res.status}`);
    }
    return json;
  }

  async resolveTableMap(write = false) {
    if (Date.now() < this.tableCacheExpiresAt && this.tableIdCache.size > 0) {
      return this.tableIdCache;
    }
    const dbId = encodeURIComponent(this.env.SMARTBASE_DATABASE_ID);
    const json = await this.smartbaseFetch(`/databases/${dbId}/tables`, { write });
    const rows = extractRows(json);
    const next = new Map();
    for (const t of rows) {
      const name = String(t.name || t.table_name || t.tableName || '').toLowerCase();
      const id = t.id || t.tableId || t.table_id || name;
      if (name) next.set(name, String(id));
    }
    this.tableIdCache = next;
    this.tableCacheExpiresAt = Date.now() + 60_000;
    return next;
  }

  async getTableRecords(tableName) {
    const dbId = encodeURIComponent(this.env.SMARTBASE_DATABASE_ID);
    const map = await this.resolveTableMap(false);
    const tableId = encodeURIComponent(map.get(tableName.toLowerCase()) || tableName);
    const json = await this.smartbaseFetch(`/databases/${dbId}/tables/${tableId}/records`, { write: false });
    return extractRows(json);
  }

  async createTableRecord(tableName, record) {
    const dbId = encodeURIComponent(this.env.SMARTBASE_DATABASE_ID);
    const map = await this.resolveTableMap(true);
    const tableId = encodeURIComponent(map.get(tableName.toLowerCase()) || tableName);
    return this.smartbaseFetch(`/databases/${dbId}/tables/${tableId}/records`, {
      method: 'POST',
      write: true,
      body: record,
    });
  }

  async updateTableRecord(tableName, recordId, record) {
    const dbId = encodeURIComponent(this.env.SMARTBASE_DATABASE_ID);
    const map = await this.resolveTableMap(true);
    const tableId = encodeURIComponent(map.get(tableName.toLowerCase()) || tableName);
    return this.smartbaseFetch(`/databases/${dbId}/tables/${tableId}/records/${encodeURIComponent(recordId)}`, {
      method: 'PUT',
      write: true,
      body: record,
    });
  }

  async deleteTableRecord(tableName, recordId) {
    const dbId = encodeURIComponent(this.env.SMARTBASE_DATABASE_ID);
    const map = await this.resolveTableMap(true);
    const tableId = encodeURIComponent(map.get(tableName.toLowerCase()) || tableName);
    return this.smartbaseFetch(`/databases/${dbId}/tables/${tableId}/records/${encodeURIComponent(recordId)}`, {
      method: 'DELETE',
      write: true,
    });
  }

  async loadLocal() {
    if (this.localPersistence) {
      const data = await this.localPersistence.read();
      if (data) return data;
      const seeded = cloneDefaults();
      await this.localPersistence.write(seeded);
      return seeded;
    }
    return cloneDefaults();
  }

  async saveLocal(data) {
    if (this.localPersistence) {
      await this.localPersistence.write(data);
    }
  }

  normalizePostRow(row) {
    return {
      id: Number(row.id) || row.id,
      title: String(row.title || ''),
      slug: String(row.slug || ''),
      content_type: String(row.content_type || 'Company announcements'),
      excerpt: String(row.excerpt || ''),
      content_html: String(row.content_html || ''),
      cover_image: String(row.cover_image || ''),
      gallery_images: Array.isArray(row.gallery_images)
        ? row.gallery_images
        : safeJsonParse(row.gallery_images_json, []),
      youtube_url: String(row.youtube_url || ''),
      product_id: row.product_id ? Number(row.product_id) : null,
      product_slug: String(row.product_slug || ''),
      product_url: String(row.product_url || ''),
      external_urls: Array.isArray(row.external_urls)
        ? row.external_urls
        : safeJsonParse(row.external_urls_json, []),
      category_id: row.category_id ? Number(row.category_id) : null,
      category_slug: String(row.category_slug || ''),
      tags: Array.isArray(row.tags) ? row.tags : safeJsonParse(row.tags_json, []),
      status: row.status === 'published' ? 'published' : 'draft',
      is_featured: Number(row.is_featured) ? 1 : 0,
      author_name: String(row.author_name || 'Roosevelt Chikwende'),
      seo_title: String(row.seo_title || ''),
      seo_description: String(row.seo_description || ''),
      canonical_url: String(row.canonical_url || ''),
      social_image: String(row.social_image || ''),
      published_at: row.published_at || null,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    };
  }

  normalizeProductRow(row) {
    return {
      id: Number(row.id) || row.id,
      name: String(row.name || ''),
      slug: String(row.slug || ''),
      tagline: String(row.tagline || ''),
      summary: String(row.summary || ''),
      description: String(row.description || ''),
      website_url: String(row.website_url || ''),
      status_label: String(row.status_label || 'Ecosystem Product'),
      category_label: String(row.category_label || 'Digital Product'),
      features: Array.isArray(row.features) ? row.features : safeJsonParse(row.features_json, []),
      screenshots: Array.isArray(row.screenshots) ? row.screenshots : safeJsonParse(row.screenshots_json, []),
      sort_order: Number(row.sort_order) || 0,
      is_featured: Number(row.is_featured) ? 1 : 0,
      seo_title: String(row.seo_title || ''),
      seo_description: String(row.seo_description || ''),
      updated_at: row.updated_at || new Date().toISOString(),
    };
  }

  async getSiteSnapshot() {
    if (!this.hasSmartBaseRead()) {
      const local = await this.loadLocal();
      return {
        source: this.localPersistence ? 'local-preview' : 'seed-fallback',
        settings: { ...cloneDefaults().settings, ...(local.settings || {}) },
        categories: local.categories || [],
        products: (local.products || []).map((p) => this.normalizeProductRow(p)).sort((a, b) => a.sort_order - b.sort_order),
        posts: (local.posts || []).map((p) => this.normalizePostRow(p)),
        media: local.media || [],
        admin_activity: local.admin_activity || [],
      };
    }

    const defaults = cloneDefaults();
    const [postsRes, productsRes, categoriesRes, settingsRes, mediaRes] = await Promise.allSettled([
      this.getTableRecords('posts'),
      this.getTableRecords('products'),
      this.getTableRecords('categories'),
      this.getTableRecords('site_settings'),
      this.getTableRecords('media'),
    ]);

    const settings = { ...defaults.settings };
    if (settingsRes.status === 'fulfilled') {
      for (const row of settingsRes.value) {
        if (row.setting_key && row.setting_value_json) {
          settings[row.setting_key] = safeJsonParse(row.setting_value_json, settings[row.setting_key]);
        }
      }
    }

    const productsRaw =
      productsRes.status === 'fulfilled' && productsRes.value.length > 0
        ? productsRes.value
        : defaults.products;
    const categoriesRaw =
      categoriesRes.status === 'fulfilled' && categoriesRes.value.length > 0
        ? categoriesRes.value
        : defaults.categories;
    const postsRaw = postsRes.status === 'fulfilled' ? postsRes.value : defaults.posts;
    const mediaRaw = mediaRes.status === 'fulfilled' ? mediaRes.value : defaults.media;

    return {
      source: 'smartbase',
      settings,
      categories: categoriesRaw,
      products: productsRaw.map((p) => this.normalizeProductRow(p)).sort((a, b) => a.sort_order - b.sort_order),
      posts: postsRaw.map((p) => this.normalizePostRow(p)),
      media: mediaRaw,
      admin_activity: [],
    };
  }

  async getActivityLogs() {
    if (!this.hasSmartBaseRead()) {
      const local = await this.loadLocal();
      return (local.admin_activity || []).slice(0, 100);
    }
    const rows = await this.getTableRecords('admin_activity').catch(() => []);
    return rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 100);
  }

  async logActivity(actorEmail, action, entityType, entityId, details, ipAddress = '') {
    const entry = {
      actor_email: normalizeEmail(actorEmail),
      action: String(action),
      entity_type: String(entityType),
      entity_id: String(entityId || ''),
      details: String(details || ''),
      ip_address: String(ipAddress || ''),
      created_at: new Date().toISOString(),
    };

    if (!this.hasSmartBaseWrite()) {
      const local = await this.loadLocal();
      const nextId = (local.admin_activity[0]?.id || 0) + 1;
      local.admin_activity.unshift({ id: nextId, ...entry });
      local.admin_activity = local.admin_activity.slice(0, 200);
      await this.saveLocal(local);
      return;
    }

    await this.createTableRecord('admin_activity', entry).catch(() => {});
  }

  async upsertPost(input, existingId = null) {
    const now = new Date().toISOString();
    const title = String(input.title || '').trim();
    if (!title) throw new Error('Post title is required.');

    const cleanSlug = slugify(input.slug || title);
    const status = input.status === 'published' ? 'published' : 'draft';
    const cleanHtml = sanitizeHtml(input.content_html || '');
    const gallery = Array.isArray(input.gallery_images)
      ? input.gallery_images.map((u) => sanitizeUrl(u)).filter(Boolean)
      : [];
    const externalUrls = Array.isArray(input.external_urls)
      ? input.external_urls.map((u) => sanitizeUrl(u, { allowRelative: false })).filter(Boolean)
      : [];
    const tags = Array.isArray(input.tags)
      ? input.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 15)
      : [];

    const record = {
      title,
      slug: cleanSlug,
      content_type: String(input.content_type || 'Company announcements').trim(),
      excerpt: String(input.excerpt || '').trim().slice(0, 420),
      content_html: cleanHtml,
      cover_image: sanitizeUrl(input.cover_image || ''),
      gallery_images_json: JSON.stringify(gallery),
      youtube_url: sanitizeUrl(input.youtube_url || '', { allowRelative: false }),
      product_slug: String(input.product_slug || '').trim(),
      product_url: sanitizeUrl(input.product_url || '', { allowRelative: false }),
      external_urls_json: JSON.stringify(externalUrls),
      category_slug: String(input.category_slug || 'company-announcements').trim(),
      tags_json: JSON.stringify(tags),
      status,
      is_featured: input.is_featured ? 1 : 0,
      author_name: String(input.author_name || 'Roosevelt Chikwende').trim(),
      seo_title: String(input.seo_title || '').trim(),
      seo_description: String(input.seo_description || '').trim(),
      canonical_url: sanitizeUrl(input.canonical_url || '', { allowRelative: false }),
      social_image: sanitizeUrl(input.social_image || ''),
      published_at:
        status === 'published'
          ? input.published_at || now
          : input.published_at || null,
      updated_at: now,
    };

    if (!this.hasSmartBaseWrite()) {
      const local = await this.loadLocal();
      if (existingId !== null) {
        const idx = local.posts.findIndex((p) => String(p.id) === String(existingId));
        if (idx === -1) throw new Error('Post not found.');
        const current = local.posts[idx];
        const duplicateSlug = local.posts.some((p) => p.slug === cleanSlug && String(p.id) !== String(existingId));
        if (duplicateSlug) record.slug = `${cleanSlug}-${existingId}`;
        const updated = {
          ...current,
          ...record,
          gallery_images: gallery,
          external_urls: externalUrls,
          tags,
          published_at:
            status === 'published' ? current.published_at || now : current.published_at,
        };
        local.posts[idx] = updated;
        await this.saveLocal(local);
        return this.normalizePostRow(updated);
      } else {
        const nextId = local.posts.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
        if (local.posts.some((p) => p.slug === cleanSlug)) {
          record.slug = `${cleanSlug}-${nextId}`;
        }
        const created = {
          id: nextId,
          ...record,
          gallery_images: gallery,
          external_urls: externalUrls,
          tags,
          created_at: now,
        };
        local.posts.unshift(created);
        await this.saveLocal(local);
        return this.normalizePostRow(created);
      }
    }

    if (existingId !== null) {
      await this.updateTableRecord('posts', existingId, record);
      return this.normalizePostRow({ id: existingId, ...record });
    }
    const created = await this.createTableRecord('posts', { ...record, created_at: now });
    const row = extractRows(created)[0] || created?.record || created?.data || created;
    return this.normalizePostRow({ ...record, ...(row || {}), created_at: now });
  }

  async deletePost(id) {
    if (!this.hasSmartBaseWrite()) {
      const local = await this.loadLocal();
      const before = local.posts.length;
      local.posts = local.posts.filter((p) => String(p.id) !== String(id));
      if (local.posts.length === before) throw new Error('Post not found.');
      await this.saveLocal(local);
      return true;
    }
    await this.deleteTableRecord('posts', id);
    return true;
  }

  async upsertProduct(input, existingId = null) {
    const now = new Date().toISOString();
    const name = String(input.name || '').trim();
    if (!name) throw new Error('Product name is required.');
    const slug = slugify(input.slug || name);
    const features = Array.isArray(input.features)
      ? input.features.map((f) => String(f).trim()).filter(Boolean)
      : [];
    const screenshots = Array.isArray(input.screenshots)
      ? input.screenshots.map((u) => sanitizeUrl(u)).filter(Boolean)
      : [];

    const record = {
      name,
      slug,
      tagline: String(input.tagline || '').trim(),
      summary: String(input.summary || '').trim(),
      description: sanitizeHtml(input.description || ''),
      website_url: sanitizeUrl(input.website_url || '', { allowRelative: false }),
      status_label: String(input.status_label || 'Ecosystem Product').trim(),
      category_label: String(input.category_label || 'Digital Product').trim(),
      features_json: JSON.stringify(features),
      screenshots_json: JSON.stringify(screenshots),
      sort_order: Number(input.sort_order) || 10,
      is_featured: input.is_featured ? 1 : 0,
      seo_title: String(input.seo_title || '').trim(),
      seo_description: String(input.seo_description || '').trim(),
      updated_at: now,
    };

    if (!this.hasSmartBaseWrite()) {
      const local = await this.loadLocal();
      if (existingId !== null) {
        const idx = local.products.findIndex((p) => String(p.id) === String(existingId));
        if (idx === -1) throw new Error('Product not found.');
        local.products[idx] = { ...local.products[idx], ...record, features, screenshots };
        await this.saveLocal(local);
        return this.normalizeProductRow(local.products[idx]);
      } else {
        const nextId = local.products.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
        const created = { id: nextId, ...record, features, screenshots, created_at: now };
        local.products.push(created);
        await this.saveLocal(local);
        return this.normalizeProductRow(created);
      }
    }

    if (existingId !== null) {
      await this.updateTableRecord('products', existingId, record);
      return this.normalizeProductRow({ id: existingId, ...record });
    }
    const created = await this.createTableRecord('products', { ...record, created_at: now });
    const row = extractRows(created)[0] || created?.record || created?.data || created;
    return this.normalizeProductRow({ ...record, ...(row || {}) });
  }

  async deleteProduct(id) {
    if (!this.hasSmartBaseWrite()) {
      const local = await this.loadLocal();
      local.products = local.products.filter((p) => String(p.id) !== String(id));
      await this.saveLocal(local);
      return true;
    }
    await this.deleteTableRecord('products', id);
    return true;
  }

  async createCategory(input) {
    const name = String(input.name || '').trim();
    if (!name) throw new Error('Category name is required.');
    const slug = slugify(input.slug || name);
    const description = String(input.description || '').trim();
    const record = { name, slug, description, created_at: new Date().toISOString() };

    if (!this.hasSmartBaseWrite()) {
      const local = await this.loadLocal();
      if (local.categories.some((c) => c.slug === slug)) {
        throw new Error('Category slug already exists.');
      }
      const nextId = local.categories.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0) + 1;
      const created = { id: nextId, ...record };
      local.categories.push(created);
      await this.saveLocal(local);
      return created;
    }

    const res = await this.createTableRecord('categories', record);
    return extractRows(res)[0] || { ...record };
  }

  async deleteCategory(id) {
    if (!this.hasSmartBaseWrite()) {
      const local = await this.loadLocal();
      local.categories = local.categories.filter((c) => String(c.id) !== String(id));
      await this.saveLocal(local);
      return true;
    }
    await this.deleteTableRecord('categories', id);
    return true;
  }

  async updateSetting(key, value) {
    const allowedKeys = new Set(['company_info', 'founder_info', 'company_history', 'seo_settings']);
    if (!allowedKeys.has(key)) throw new Error('Invalid settings key.');

    if (!this.hasSmartBaseWrite()) {
      const local = await this.loadLocal();
      local.settings[key] = value;
      await this.saveLocal(local);
      return value;
    }

    const existing = await this.getTableRecords('site_settings').catch(() => []);
    const match = existing.find((r) => r.setting_key === key);
    const payload = {
      setting_key: key,
      setting_value_json: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    };
    if (match && match.id !== undefined) {
      await this.updateTableRecord('site_settings', match.id, payload);
    } else {
      await this.createTableRecord('site_settings', payload);
    }
    return value;
  }

  async uploadMediaFile({ fileName, mimeType, bytes, altText = '', caption = '', uploadedBy = 'admin' }) {
    const safeName = `${Date.now()}-${slugify(fileName.replace(/\.[^.]+$/, ''))}.${mimeTypeToExt(mimeType)}`;

    if (!this.hasSmartBaseWrite()) {
      // Store data URL fallback only in local preview mode when SmartBase storage is not yet configured
      if (!this.localPersistence) {
        throw new Error('SmartBase file storage requires SMARTBASE_WRITE_KEY.');
      }
      const local = await this.loadLocal();
      const base64 = bytesToBase64(bytes);
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const nextId = local.media.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
      const item = {
        id: nextId,
        file_name: safeName,
        original_name: fileName,
        mime_type: mimeType,
        size_bytes: bytes.byteLength,
        public_url: `/media/${safeName}`,
        local_data_url: dataUrl,
        alt_text: String(altText || ''),
        caption: String(caption || ''),
        uploaded_by: uploadedBy,
        created_at: new Date().toISOString(),
      };
      local.media.unshift(item);
      await this.saveLocal(local);
      return item;
    }

    const formData = new FormData();
    formData.append('file', new Blob([bytes], { type: mimeType }), safeName);
    formData.append('name', safeName);

    const apiKey = this.env.SMARTBASE_WRITE_KEY;
    const uploadRes = await fetch(`${SMARTBASE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      throw new Error(`SmartBase file upload failed (${uploadRes.status}): ${errText.slice(0, 180)}`);
    }

    const record = {
      file_name: safeName,
      original_name: fileName,
      mime_type: mimeType,
      size_bytes: bytes.byteLength,
      public_url: `/media/${safeName}`,
      alt_text: String(altText || ''),
      caption: String(caption || ''),
      uploaded_by: uploadedBy,
      created_at: new Date().toISOString(),
    };
    const dbRes = await this.createTableRecord('media', record).catch(() => null);
    return extractRows(dbRes)[0] || record;
  }

  async getMediaFileResponse(fileName) {
    const cleanName = String(fileName || '').replace(/[^a-zA-Z0-9._-]/g, '');
    if (!cleanName) return null;

    if (!this.hasSmartBaseRead()) {
      const local = await this.loadLocal();
      const item = local.media.find((m) => m.file_name === cleanName);
      if (!item || !item.local_data_url) return null;
      const [meta, b64] = item.local_data_url.split(',');
      const mime = meta.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
      const bytes = base64ToBytes(b64);
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    const apiKey = this.env.SMARTBASE_READ_KEY;
    const res = await fetch(`${SMARTBASE_API_BASE}/files/${encodeURIComponent(cleanName)}`, {
      headers: {
        'X-API-Key': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) return null;
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  async deleteMedia(fileName) {
    const cleanName = String(fileName || '').replace(/[^a-zA-Z0-9._-]/g, '');
    if (!cleanName) throw new Error('Invalid file name.');

    if (!this.hasSmartBaseWrite()) {
      const local = await this.loadLocal();
      local.media = local.media.filter((m) => m.file_name !== cleanName);
      await this.saveLocal(local);
      return true;
    }

    await this.smartbaseFetch(`/files/${encodeURIComponent(cleanName)}`, {
      method: 'DELETE',
      write: true,
    });
    const rows = await this.getTableRecords('media').catch(() => []);
    const match = rows.find((r) => r.file_name === cleanName);
    if (match?.id) {
      await this.deleteTableRecord('media', match.id).catch(() => {});
    }
    return true;
  }
}

function mimeTypeToExt(mime) {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
