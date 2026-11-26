-- ============================================================================
-- MIYONI OFFICIAL DIGITAL HEADQUARTERS — SMARTBASE SQL SCHEMA
-- Target Platform: SmartBase Cloud Database (https://smartbase.de5.net/)
-- Standard ANSI/SQLite-compatible DDL with explicit types, PKs, FKs, & Indexes
-- ============================================================================

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  status_label TEXT NOT NULL DEFAULT 'Active Platform',
  category_label TEXT NOT NULL DEFAULT 'Digital Product',
  features_json TEXT NOT NULL DEFAULT '[]',
  screenshots_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 1,
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_order ON products(sort_order);

-- 3. Posts / News & Announcements Table
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'Company announcements',
  excerpt TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  cover_image TEXT DEFAULT '',
  gallery_images_json TEXT NOT NULL DEFAULT '[]',
  youtube_url TEXT DEFAULT '',
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_slug TEXT DEFAULT '',
  product_url TEXT DEFAULT '',
  external_urls_json TEXT NOT NULL DEFAULT '[]',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  category_slug TEXT DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_featured INTEGER NOT NULL DEFAULT 0,
  author_name TEXT NOT NULL DEFAULT 'Roosevelt Chikwende',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  canonical_url TEXT DEFAULT '',
  social_image TEXT DEFAULT '',
  published_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status_pub ON posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_slug);
CREATE INDEX IF NOT EXISTS idx_posts_product ON posts(product_slug);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured, status);

-- 4. Media Library Table (references SmartBase File Storage objects)
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  public_url TEXT NOT NULL,
  alt_text TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  uploaded_by TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);

-- 5. Site Settings Table (Key-Value JSON Store for Company, Founder, History, SEO)
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- 6. Admin Activity Audit Log Table
CREATE TABLE IF NOT EXISTS admin_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'system',
  entity_id TEXT DEFAULT '',
  details TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON admin_activity(created_at DESC);

-- ============================================================================
-- INITIAL SEED DATA (Strictly Official Miyoni Facts Only)
-- ============================================================================

INSERT OR IGNORE INTO categories (name, slug, description) VALUES
  ('Company Announcements', 'company-announcements', 'Official corporate announcements and company updates from MIYONI.'),
  ('Product Launches', 'product-launches', 'New digital products and platform releases across the MIYONI ecosystem.'),
  ('Product Updates', 'product-updates', 'Feature releases, improvements, and engineering updates for MIYONI products.'),
  ('Technical Articles', 'technical-articles', 'Engineering architecture notes, cloud infrastructure insights, and developer guides.'),
  ('Founder Announcements', 'founder-announcements', 'Direct communications and perspectives from founder Roosevelt Chikwende.');

INSERT OR IGNORE INTO products (
  name, slug, tagline, summary, description, website_url, status_label, category_label, features_json, sort_order, is_featured, seo_title, seo_description
) VALUES
(
  'SmartBase',
  'smartbase',
  'SQL-powered cloud database and backend infrastructure.',
  'SmartBase provides cloud database management, SQL editor, REST APIs, authentication, email infrastructure, and file storage so developers can build applications without managing database servers.',
  '<p>SmartBase is a SQL-powered cloud database and backend platform engineered under MIYONI. It eliminates server provisioning overhead by bringing relational database tooling, API generation, user authentication, transactional email delivery, and object file storage into one unified developer console.</p><p>Designed for reliability and clean developer ergonomics, SmartBase empowers teams and independent builders to launch full-stack applications rapidly with separate read/write API key permissions and built-in resource monitoring.</p>',
  'https://smartbase.de5.net/',
  'Live Platform',
  'Cloud Infrastructure',
  '["Cloud database management","Browser-based SQL editor","Instant REST API endpoints","Scoped read & write API key management","Built-in authentication services","SmartBase transactional & verification email infrastructure","Cloud file storage & asset management","Developer tooling & resource monitoring"]',
  1,
  1,
  'SmartBase by MIYONI — Cloud SQL Database & Backend Platform',
  'Explore SmartBase, MIYONI''s SQL-powered cloud database and backend platform with REST APIs, authentication, email infrastructure, and file storage.'
),
(
  'Talkivo',
  'talkivo',
  'Communication-oriented digital product under MIYONI.',
  'Talkivo is a modern communication platform developed within the MIYONI ecosystem to deliver structured, dependable digital interaction.',
  '<p>Talkivo is a communication-oriented digital product built under the MIYONI identity. Designed around clarity, responsiveness, and dependable connectivity, Talkivo reflects MIYONI''s commitment to functional, quality-driven software.</p><p>Administrators can manage official feature announcements, product milestones, visual screenshots, and release notes directly from the MIYONI administration dashboard.</p>',
  'https://talkivo.de5.net/',
  'Ecosystem Product',
  'Communication Platform',
  '["Communication-focused digital product architecture","Seamless integration with the MIYONI ecosystem","Maintainable feature specifications and release notes","Dedicated web presence at talkivo.de5.net"]',
  2,
  1,
  'Talkivo by MIYONI — Communication Platform',
  'Discover Talkivo, a communication-oriented digital product developed under MIYONI in Malawi.'
),
(
  'XOOL',
  'xool',
  'AI-powered educational technology and PDF learning platform.',
  'XOOL delivers AI-powered educational assistance, structured study materials, and PDF-based learning tools designed to support students.',
  '<p>XOOL is MIYONI''s educational technology platform built to make studying more effective and accessible. Its ongoing development centers on AI-assisted study workflows, curated learning materials, and interactive PDF-based study tools tailored for students.</p><p>As XOOL evolves, new educational modules and learning capabilities are published directly through the MIYONI news and product portal.</p>',
  'https://xool.de5.net/',
  'Active EdTech Platform',
  'Educational Technology',
  '["AI-powered educational assistance","Structured digital study materials","PDF-based learning workflows","Purpose-built tools supporting student comprehension"]',
  3,
  1,
  'XOOL by MIYONI — Educational Technology Platform',
  'Learn about XOOL, MIYONI''s educational technology platform offering AI-powered study assistance, study materials, and PDF-based learning.'
),
(
  'Zapamubas',
  'zapamubas',
  'Student-focused digital platform concept associated with MUBAS.',
  'Zapamubas is a student-centered digital platform concept associated with MUBAS, envisioned around student communities, academic announcements, learning resources, and AI-powered educational experiences.',
  '<p>Zapamubas is a student-focused digital platform concept associated with the Malawi University of Business and Applied Sciences (MUBAS) community. Its intended ecosystem brings together student communities, social content, structured communication, academic announcements, learning resources, peer connections, and AI-powered educational experiences.</p><p>This product is presented transparently as an evolving platform concept. Official development progress and feature updates are managed directly by the MIYONI administrator.</p>',
  'https://zapamubas.de5.net/',
  'Platform Concept',
  'Student Ecosystem Concept',
  '["Intended: Student communities & peer connections","Intended: Academic announcements & structured communication","Intended: Shared learning resources & social content","Intended: AI-powered educational experiences"]',
  4,
  1,
  'Zapamubas by MIYONI — MUBAS Student Platform Concept',
  'Explore Zapamubas, a student-focused digital platform concept associated with MUBAS developed under MIYONI.'
);
