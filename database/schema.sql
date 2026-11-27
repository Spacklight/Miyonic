-- ============================================================================
-- MIYONI OFFICIAL DIGITAL HEADQUARTERS — CLOUDFLARE D1 (SQLite) SCHEMA
-- Database: miyoni (UUID: a78a2863-9153-46ca-9b78-9a59c88b3b3d)
-- Run via Cloudflare D1 Console or:
--   npx wrangler d1 execute miyoni --remote --file=database/schema.sql
-- ============================================================================

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  summary TEXT,
  description TEXT,
  website_url TEXT,
  status_label TEXT,
  category_label TEXT,
  features_json TEXT,
  screenshots_json TEXT,
  sort_order INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 3. Posts / News & Announcements Table
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_type TEXT,
  excerpt TEXT,
  content_html TEXT,
  cover_image TEXT,
  gallery_images_json TEXT,
  youtube_url TEXT,
  product_id INTEGER,
  product_slug TEXT,
  product_url TEXT,
  external_urls_json TEXT,
  category_id INTEGER,
  category_slug TEXT,
  tags_json TEXT,
  status TEXT DEFAULT 'draft',
  is_featured INTEGER DEFAULT 0,
  author_name TEXT,
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  social_image TEXT,
  published_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 4. Media Library & D1 Image Storage Tables
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  uploaded_by TEXT,
  data_base64 TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS media_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_data TEXT NOT NULL
);

-- 5. Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value_json TEXT NOT NULL,
  updated_at TEXT
);

-- 6. Admin Activity Table
CREATE TABLE IF NOT EXISTS admin_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT
);

-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

INSERT OR IGNORE INTO categories (id, name, slug, description, created_at) VALUES
  (1, 'Company Announcements', 'company-announcements', 'Official corporate announcements and company updates from MIYONI.', '2026-11-25T00:00:00Z'),
  (2, 'Product Launches', 'product-launches', 'New digital products and platform releases across the MIYONI ecosystem.', '2026-11-25T00:00:00Z'),
  (3, 'Product Updates', 'product-updates', 'Feature releases, improvements, and engineering updates for MIYONI products.', '2026-11-25T00:00:00Z'),
  (4, 'Technical Articles', 'technical-articles', 'Engineering architecture notes, cloud infrastructure insights, and developer guides.', '2026-11-25T00:00:00Z'),
  (5, 'Founder Announcements', 'founder-announcements', 'Direct communications and perspectives from founder Roosevelt Chikwende.', '2026-11-25T00:00:00Z');

INSERT OR IGNORE INTO products (
  id, name, slug, tagline, summary, description, website_url, status_label, category_label, features_json, screenshots_json, sort_order, is_featured, seo_title, seo_description, created_at, updated_at
) VALUES
(
  1,
  'SmartBase',
  'smartbase',
  'SQL-powered cloud database and backend infrastructure.',
  'SmartBase provides cloud database management, SQL editor, REST APIs, authentication, email infrastructure, and file storage so developers can build applications without managing database servers.',
  '<p>SmartBase is a SQL-powered cloud database and backend platform engineered under MIYONI. It eliminates server provisioning overhead by bringing relational database tooling, API generation, user authentication, transactional email delivery, and object file storage into one unified developer console.</p>',
  'https://smartbase.de5.net/',
  'Live Platform',
  'Cloud Infrastructure',
  '["Cloud database management","Browser-based SQL editor","Instant REST API endpoints","Scoped read & write API key management","Built-in authentication services","SmartBase email infrastructure","Cloud file storage","Developer tools & resource monitoring"]',
  '[]',
  1,
  1,
  'SmartBase by MIYONI — Cloud SQL Database & Backend Platform',
  'Explore SmartBase, MIYONI''s SQL-powered cloud database and backend platform with REST APIs, authentication, email infrastructure, and file storage.',
  '2026-11-25T00:00:00Z',
  '2026-11-25T00:00:00Z'
),
(
  2,
  'Talkivo',
  'talkivo',
  'Communication-oriented digital product under MIYONI.',
  'Talkivo is a modern communication platform developed within the MIYONI ecosystem to deliver structured, dependable digital interaction.',
  '<p>Talkivo is a communication-oriented digital product built under the MIYONI identity. Designed around clarity, responsiveness, and dependable connectivity, Talkivo reflects MIYONI''s commitment to functional, quality-driven software.</p>',
  'https://talkivo.de5.net/',
  'Ecosystem Product',
  'Communication Platform',
  '["Communication-focused digital product architecture","Seamless integration with the MIYONI ecosystem","Dedicated web presence at talkivo.de5.net"]',
  '[]',
  2,
  1,
  'Talkivo by MIYONI — Communication Platform',
  'Discover Talkivo, a communication-oriented digital product developed under MIYONI in Malawi.',
  '2026-11-25T00:00:00Z',
  '2026-11-25T00:00:00Z'
),
(
  3,
  'XOOL',
  'xool',
  'AI-powered educational technology and PDF learning platform.',
  'XOOL delivers AI-powered educational assistance, structured study materials, and PDF-based learning tools designed to support students.',
  '<p>XOOL is MIYONI''s educational technology platform built to make studying more effective and accessible with AI-assisted study workflows and PDF-based learning tools.</p>',
  'https://xool.de5.net/',
  'Active EdTech Platform',
  'Educational Technology',
  '["AI-powered educational assistance","Structured digital study materials","PDF-based learning workflows","Student comprehension tools"]',
  '[]',
  3,
  1,
  'XOOL by MIYONI — Educational Technology Platform',
  'Learn about XOOL, MIYONI''s educational technology platform offering AI-powered study assistance, study materials, and PDF-based learning.',
  '2026-11-25T00:00:00Z',
  '2026-11-25T00:00:00Z'
),
(
  4,
  'Zapamubas',
  'zapamubas',
  'Student-focused digital platform concept associated with MUBAS.',
  'Zapamubas is a student-centered digital platform concept associated with MUBAS, envisioned around student communities, academic announcements, learning resources, and AI-powered educational experiences.',
  '<p>Zapamubas is a student-focused digital platform concept associated with MUBAS. Its intended ecosystem brings together student communities, social content, structured communication, academic announcements, learning resources, peer connections, and AI-powered educational experiences.</p>',
  'https://zapamubas.de5.net/',
  'Platform Concept',
  'Student Ecosystem Concept',
  '["Intended: Student communities & peer connections","Intended: Academic announcements & structured communication","Intended: Shared learning resources & social content","Intended: AI-powered educational experiences"]',
  '[]',
  4,
  1,
  'Zapamubas by MIYONI — MUBAS Student Platform Concept',
  'Explore Zapamubas, a student-focused digital platform concept associated with MUBAS developed under MIYONI.',
  '2026-11-25T00:00:00Z',
  '2026-11-25T00:00:00Z'
);
