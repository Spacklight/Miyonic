/**
 * MIYONI Server-Side HTML Renderer & Advanced SEO Engine
 * Renders full semantic HTML, Open Graph, Twitter Cards, JSON-LD,
 * dynamic sitemap.xml, robots.txt, rss.xml, and llms.txt.
 */

import {
  escapeHtml,
  escapeXml,
  extractYouTubeId,
  sanitizeHtml,
  sanitizeUrl,
  stripHtmlToText,
} from './security.js';

function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function formatDateReadable(iso) {
  if (!iso) return 'Recent';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(iso);
  }
}

function resolveSiteUrl(env, requestUrl) {
  if (env?.SITE_URL) return String(env.SITE_URL).replace(/\/+$/, '');
  if (requestUrl) {
    try {
      const u = new URL(requestUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      // fall through
    }
  }
  return 'https://miyoni.de5.net';
}

function toAbsoluteUrl(pathOrUrl, siteUrl) {
  if (!pathOrUrl) return `${siteUrl}/assets/founder-office.png`;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  return `${siteUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

function getPublishedPosts(snapshot) {
  return (snapshot.posts || [])
    .filter((p) => p.status === 'published')
    .sort((a, b) =>
      String(b.published_at || b.created_at).localeCompare(String(a.published_at || a.created_at))
    );
}

function renderDocument({
  title,
  description,
  canonicalPath,
  siteUrl,
  ogType = 'website',
  ogImage = '/assets/founder-office.png',
  googleSiteVerification = '',
  jsonLdBlocks = [],
  activeNav = '',
  bodyHtml = '',
  snapshot,
}) {
  const company = snapshot.settings.company_info;
  const fullCanonical = `${siteUrl}${canonicalPath.startsWith('/') ? canonicalPath : '/' + canonicalPath}`;
  const fullOgImage = toAbsoluteUrl(ogImage, siteUrl);

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.brandName || 'MIYONI',
    url: `${siteUrl}/`,
    slogan: company.tagline || 'We build functionality and quality.',
    description: company.overview,
    founder: {
      '@type': 'Person',
      name: snapshot.settings.founder_info?.name || 'Roosevelt Chikwende',
      nationality: 'Malawi',
      url: `${siteUrl}/founder/`,
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'MW',
    },
    sameAs: (snapshot.products || []).map((p) => p.website_url).filter(Boolean),
  };

  const allJsonLd = [orgSchema, ...jsonLdBlocks];
  const jsonLdTags = allJsonLd
    .map((block) => `<script type="application/ld+json">${safeJsonLd(block)}</script>`)
    .join('\n  ');

  const navLink = (href, label, key) =>
    `<a href="${href}"${activeNav === key ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;

  const verificationToken =
    googleSiteVerification || 'dj706lIIs5TcH4Lc-xOxQhoPcodmaqRL-CYhx7DGCSw';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(fullCanonical)}" />
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
  <link rel="alternate" type="application/rss+xml" title="MIYONI News &amp; Updates RSS" href="${escapeHtml(siteUrl)}/rss.xml" />
  <meta name="google-site-verification" content="${escapeHtml(verificationToken)}" />

  <meta property="og:type" content="${escapeHtml(ogType)}" />
  <meta property="og:site_name" content="MIYONI" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(fullCanonical)}" />
  <meta property="og:image" content="${escapeHtml(fullOgImage)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(fullOgImage)}" />

  <link rel="stylesheet" href="/css/style.css" />
  ${jsonLdTags}
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand-wordmark">MIYONI<span>.</span></a>
      <nav class="primary-nav" aria-label="Main navigation">
        ${navLink('/about/', 'About', 'about')}
        ${navLink('/founder/', 'Founder', 'founder')}
        ${navLink('/products/', 'Products', 'products')}
        ${navLink('/news/', 'News', 'news')}
        ${navLink('/contact/', 'Contact', 'contact')}
      </nav>
      <div class="header-action-zone">
        <a href="/products/" class="btn btn-primary">Explore Products</a>
        <button type="button" class="mobile-menu-btn" aria-label="Toggle navigation menu" aria-expanded="false" data-mobile-toggle>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <div class="mobile-nav-drawer" data-mobile-drawer>
      <nav aria-label="Mobile navigation">
        ${navLink('/', 'Home', 'home')}
        ${navLink('/about/', 'About MIYONI', 'about')}
        ${navLink('/founder/', 'Founder Profile', 'founder')}
        ${navLink('/products/', 'Products', 'products')}
        ${navLink('/news/', 'News & Updates', 'news')}
        ${navLink('/gallery/', 'Media Gallery', 'gallery')}
        ${navLink('/search/', 'Search', 'search')}
        ${navLink('/contact/', 'Contact', 'contact')}
      </nav>
    </div>
  </header>

  <main id="main-content">
    ${bodyHtml}
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="brand-wordmark" style="margin-bottom: 12px;">MIYONI<span>.</span></div>
          <p style="margin: 0 0 12px; max-width: 36ch; color: var(--text-secondary);">
            ${escapeHtml(company.tagline || 'We build functionality and quality.')}
          </p>
          <p style="margin: 0; font-size: 0.85rem;">
            Independent technology brand founded by ${escapeHtml(snapshot.settings.founder_info?.name || 'Roosevelt Chikwende')} in ${escapeHtml(company.country || 'Malawi')}.
          </p>
        </div>
        <div>
          <h3 class="footer-heading">Company</h3>
          <ul class="footer-links">
            <li><a href="/about/">About MIYONI</a></li>
            <li><a href="/founder/">Founder Profile</a></li>
            <li><a href="/gallery/">Media &amp; Gallery</a></li>
            <li><a href="/contact/">Contact</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer-heading">Products</h3>
          <ul class="footer-links">
            ${(snapshot.products || [])
              .map(
                (p) =>
                  `<li><a href="/products/${escapeHtml(p.slug)}/">${escapeHtml(p.name)}</a></li>`
              )
              .join('')}
          </ul>
        </div>
        <div>
          <h3 class="footer-heading">Resources</h3>
          <ul class="footer-links">
            <li><a href="/news/">Latest News</a></li>
            <li><a href="/search/">Search Portal</a></li>
            <li><a href="/rss.xml">RSS Feed</a></li>
            <li><a href="/sitemap.xml">XML Sitemap</a></li>
            <li><a href="/llms.txt">llms.txt</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div>&copy; ${new Date().getFullYear()} MIYONI. All rights reserved.</div>
        <div>${escapeHtml(company.country || 'Malawi')} · <a href="https://miyoni.de5.net/">miyoni.de5.net</a></div>
      </div>
    </div>
  </footer>
  <script src="/js/main.js" defer></script>
</body>
</html>`;
}

function renderProductArchitectureGraphic(slug) {
  const accent = slug === 'smartbase' ? '#60a5fa' : slug === 'xool' ? '#d4a843' : '#93c5fd';
  return `<div class="product-blueprint" aria-hidden="true">
    <svg viewBox="0 0 400 110" width="100%" height="110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="14" width="112" height="82" rx="8" stroke="${accent}" stroke-opacity="0.45" fill="#060d1a"/>
      <rect x="22" y="30" width="64" height="6" rx="3" fill="${accent}" fill-opacity="0.7"/>
      <rect x="22" y="46" width="84" height="5" rx="2.5" fill="#94a3b8" fill-opacity="0.35"/>
      <rect x="22" y="59" width="70" height="5" rx="2.5" fill="#94a3b8" fill-opacity="0.25"/>
      <rect x="22" y="72" width="50" height="5" rx="2.5" fill="#d4a843" fill-opacity="0.65"/>
      <path d="M120 55 H160" stroke="${accent}" stroke-opacity="0.5" stroke-dasharray="4 4"/>
      <rect x="160" y="14" width="112" height="82" rx="8" stroke="#d4a843" stroke-opacity="0.45" fill="#060d1a"/>
      <circle cx="186" cy="40" r="10" stroke="#d4a843" stroke-width="1.5"/>
      <rect x="206" y="35" width="50" height="5" rx="2.5" fill="#f8fafc" fill-opacity="0.7"/>
      <rect x="176" y="62" width="80" height="5" rx="2.5" fill="#94a3b8" fill-opacity="0.35"/>
      <rect x="176" y="75" width="62" height="5" rx="2.5" fill="#94a3b8" fill-opacity="0.25"/>
      <path d="M272 55 H312" stroke="#d4a843" stroke-opacity="0.5" stroke-dasharray="4 4"/>
      <rect x="312" y="24" width="80" height="62" rx="8" stroke="${accent}" stroke-opacity="0.35" fill="#060d1a"/>
      <rect x="326" y="42" width="52" height="6" rx="3" fill="${accent}" fill-opacity="0.6"/>
      <rect x="326" y="58" width="38" height="6" rx="3" fill="#d4a843" fill-opacity="0.6"/>
    </svg>
  </div>`;
}

function renderArticleCard(post) {
  const safeSlug = encodeURIComponent(post.slug);
  const cover = sanitizeUrl(post.cover_image || '');
  const pubDate = formatDateReadable(post.published_at || post.created_at);
  return `<article class="article-card">
    <a href="/news/${escapeHtml(safeSlug)}/" class="article-thumb">
      ${
        cover
          ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(post.title)}" loading="lazy" referrerpolicy="no-referrer" />`
          : `<div class="article-thumb-fallback">${escapeHtml(post.content_type || 'MIYONI Update')}</div>`
      }
    </a>
    <div class="article-body">
      <div class="card-meta-line">
        <span class="card-meta-accent">${escapeHtml(post.content_type || 'News')}</span>
        <span aria-hidden="true">·</span>
        <time class="tabular-nums" datetime="${escapeHtml(post.published_at || post.created_at)}">${escapeHtml(pubDate)}</time>
        ${post.product_slug ? `<span aria-hidden="true">·</span><span>${escapeHtml(post.product_slug)}</span>` : ''}
      </div>
      <h3 class="article-title">
        <a href="/news/${escapeHtml(safeSlug)}/">${escapeHtml(post.title)}</a>
      </h3>
      <p class="article-excerpt">${escapeHtml(post.excerpt || stripHtmlToText(post.content_html).slice(0, 145) + '...')}</p>
      <div class="card-footer-links">
        <a href="/news/${escapeHtml(safeSlug)}/" class="link-blue">Read article</a>
        <span style="color: var(--text-muted); font-weight: 400;">${escapeHtml(post.author_name || 'Roosevelt Chikwende')}</span>
      </div>
    </div>
  </article>`;
}

export function renderPublicPage(pathname, searchParams, snapshot, env, requestUrl) {
  const siteUrl = resolveSiteUrl(env, requestUrl);
  const company = snapshot.settings.company_info;
  const founder = snapshot.settings.founder_info;
  const seo = snapshot.settings.seo_settings || {};
  const publishedPosts = getPublishedPosts(snapshot);
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '') + '/';

  // 1. HOMEPAGE
  if (cleanPath === '/') {
    const latestPosts = publishedPosts.slice(0, 6);
    const bodyHtml = `
      <section class="hero-section">
        <div class="container">
          <div class="split-grid">
            <div class="hero-copy-col">
              <p class="eyebrow">Independent Technology Brand · ${escapeHtml(company.country || 'Malawi')}</p>
              <h1 class="hero-title">${escapeHtml(company.tagline || 'We build functionality and quality.')}</h1>
              <p class="lead-copy">
                ${escapeHtml(company.overview)}
              </p>
              <div class="hero-actions">
                <a href="/products/" class="btn btn-primary">Explore Ecosystem</a>
                <a href="/founder/" class="btn btn-secondary">Meet Roosevelt Chikwende</a>
              </div>
            </div>
            <div class="hero-media-frame">
              <img src="/assets/founder-office.png" alt="Roosevelt Chikwende, Founder of MIYONI, in his workspace" referrerpolicy="no-referrer" />
              <div class="media-scrim-caption">
                <div class="caption-title">${escapeHtml(founder.name)}</div>
                <div class="caption-sub">${escapeHtml(founder.role)} · ${escapeHtml(company.country || 'Malawi')}</div>
              </div>
            </div>
          </div>

          <div class="identity-strip">
            <div>
              <div class="identity-item-label">Official Brand</div>
              <div class="identity-item-value">${escapeHtml(company.brandName || 'MIYONI')}</div>
            </div>
            <div>
              <div class="identity-item-label">Founder</div>
              <div class="identity-item-value">${escapeHtml(founder.name)}</div>
            </div>
            <div>
              <div class="identity-item-label">Country of Origin</div>
              <div class="identity-item-value">${escapeHtml(company.country || 'Malawi')}</div>
            </div>
            <div>
              <div class="identity-item-label">Core Ecosystem</div>
              <div class="identity-item-value tabular-nums">${(snapshot.products || []).length} Digital Products</div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          <div class="section-head">
            <div>
              <p class="eyebrow">Product Ecosystem</p>
              <h2 class="section-title">Practical platforms engineered under MIYONI</h2>
            </div>
            <a href="/products/" class="btn btn-secondary">View all products</a>
          </div>
          <div class="products-grid">
            ${(snapshot.products || [])
              .map(
                (p) => `<article class="card">
                  <div>
                    <div class="card-meta-line">
                      <span class="card-meta-accent">${escapeHtml(p.category_label)}</span>
                      <span aria-hidden="true">·</span>
                      <span>${escapeHtml(p.status_label)}</span>
                    </div>
                    <h3 class="card-title"><a href="/products/${escapeHtml(p.slug)}/">${escapeHtml(p.name)}</a></h3>
                    <p class="card-desc">${escapeHtml(p.summary)}</p>
                  </div>
                  <div class="card-footer-links">
                    <a href="/products/${escapeHtml(p.slug)}/" class="link-gold">Product details</a>
                    ${
                      p.website_url
                        ? `<a href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer" class="link-blue">Visit platform</a>`
                        : ''
                    }
                  </div>
                </article>`
              )
              .join('')}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="split-grid">
            <div class="hero-media-frame">
              <img src="/assets/founder-portrait.png" alt="Portrait of MIYONI founder Roosevelt Chikwende" loading="lazy" referrerpolicy="no-referrer" />
            </div>
            <div class="hero-copy-col">
              <p class="eyebrow">Founder &amp; Leadership</p>
              <h2 class="section-title">${escapeHtml(founder.name)}</h2>
              <p class="lead-copy">${escapeHtml(founder.introduction)}</p>
              <p style="color: var(--text-secondary); margin-top: 16px;">${escapeHtml(founder.philosophy)}</p>
              <div class="hero-actions">
                <a href="/founder/" class="btn btn-secondary">Read Founder Profile</a>
                <a href="/about/" class="btn btn-ghost">About MIYONI</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          <div class="section-head">
            <div>
              <p class="eyebrow">Latest Updates</p>
              <h2 class="section-title">Company news, product milestones, and articles</h2>
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <a href="/rss.xml" class="btn btn-secondary">RSS Feed</a>
              <a href="/news/" class="btn btn-primary">All Updates</a>
            </div>
          </div>
          ${
            latestPosts.length > 0
              ? `<div class="articles-grid">${latestPosts.map(renderArticleCard).join('')}</div>`
              : `<div class="card"><p style="margin:0; color: var(--text-secondary);">No articles have been published yet.</p></div>`
          }
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="split-grid">
            <div class="hero-copy-col">
              <p class="eyebrow">Mission &amp; Direction</p>
              <h2 class="section-title">Purpose-built software from Malawi</h2>
              <p class="lead-copy">${escapeHtml(company.mission)}</p>
              <div class="hero-actions">
                <a href="/contact/" class="btn btn-primary">Contact MIYONI</a>
                <a href="/gallery/" class="btn btn-secondary">Media &amp; Gallery</a>
              </div>
            </div>
            <div class="hero-media-frame">
              <img src="/assets/founder-quote.png" alt="Founder philosophy quote by Roosevelt Chikwende" loading="lazy" referrerpolicy="no-referrer" />
            </div>
          </div>
        </div>
      </section>
    `;

    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MIYONI',
      url: `${siteUrl}/`,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/search/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    return {
      status: 200,
      html: renderDocument({
        title: seo.siteTitle || 'MIYONI — We Build Functionality and Quality',
        description: seo.defaultDescription,
        canonicalPath: '/',
        siteUrl,
        ogImage: seo.socialImage || '/assets/founder-office.png',
        googleSiteVerification: seo.googleSiteVerification,
        jsonLdBlocks: [websiteSchema],
        activeNav: 'home',
        bodyHtml,
        snapshot,
      }),
    };
  }

  // 2. ABOUT MIYONI
  if (cleanPath === '/about/') {
    const history = snapshot.settings.company_history || [];
    const focusAreas = company.focusAreas || [];
    const bodyHtml = `
      <section class="section">
        <div class="container">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><span>About MIYONI</span>
          </nav>
          <p class="eyebrow">Corporate Overview · ${escapeHtml(company.country || 'Malawi')}</p>
          <h1 class="page-title">Building functionality and quality across digital systems</h1>
          <p class="lead-copy">${escapeHtml(company.overview)}</p>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          <div class="products-grid">
            <div class="card">
              <p class="eyebrow">Mission</p>
              <h2 class="card-title">Why MIYONI builds</h2>
              <p style="color: var(--text-secondary); margin: 0;">${escapeHtml(company.mission)}</p>
            </div>
            <div class="card">
              <p class="eyebrow">Vision</p>
              <h2 class="card-title">Long-term direction</h2>
              <p style="color: var(--text-secondary); margin: 0;">${escapeHtml(company.vision)}</p>
            </div>
          </div>

          <div style="margin-top: 48px;">
            <h2 class="section-title" style="margin-bottom: 20px;">Core Focus Areas</h2>
            <div class="feature-grid">
              ${focusAreas
                .map((area, i) => `<div class="feature-cell"><strong style="color: var(--accent-gold);">0${i + 1}.</strong> ${escapeHtml(area)}</div>`)
                .join('')}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <div>
              <p class="eyebrow">Company History</p>
              <h2 class="section-title">Milestones &amp; Development</h2>
            </div>
          </div>
          <div class="timeline-list">
            ${history
              .map(
                (item) => `<div class="timeline-item">
                  <div class="timeline-date">${escapeHtml(item.period || 'Milestone')}</div>
                  <div>
                    <h3 style="font-size: 1.15rem; margin-bottom: 6px;">${escapeHtml(item.title)}</h3>
                    <p style="margin: 0; color: var(--text-secondary);">${escapeHtml(item.description)}</p>
                  </div>
                </div>`
              )
              .join('')}
          </div>
        </div>
      </section>
    `;

    return {
      status: 200,
      html: renderDocument({
        title: 'About MIYONI — Company History, Mission & Vision',
        description: `Learn about MIYONI, an independent technology brand founded in Malawi by Roosevelt Chikwende, its mission, vision, and company milestones.`,
        canonicalPath: '/about/',
        siteUrl,
        googleSiteVerification: seo.googleSiteVerification,
        jsonLdBlocks: [
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
              { '@type': 'ListItem', position: 2, name: 'About MIYONI', item: `${siteUrl}/about/` },
            ],
          },
        ],
        activeNav: 'about',
        bodyHtml,
        snapshot,
      }),
    };
  }

  // 3. FOUNDER PROFILE
  if (cleanPath === '/founder/') {
    const founderPosts = publishedPosts.filter(
      (p) =>
        p.content_type === 'Founder announcements' ||
        p.category_slug === 'founder-announcements'
    );
    const bodyHtml = `
      <section class="section">
        <div class="container">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><span>Founder</span>
          </nav>
          <div class="split-grid">
            <div class="hero-copy-col">
              <p class="eyebrow">${escapeHtml(founder.role)} · ${escapeHtml(founder.country || 'Malawi')}</p>
              <h1 class="page-title">${escapeHtml(founder.name)}</h1>
              <p class="lead-copy">${escapeHtml(founder.introduction)}</p>
              <div class="hero-actions">
                <a href="/products/" class="btn btn-primary">Explore MIYONI Products</a>
                <a href="/about/" class="btn btn-secondary">Company Story</a>
              </div>
            </div>
            <div class="hero-media-frame">
              <img src="/assets/founder-portrait.png" alt="Roosevelt Chikwende, Founder of MIYONI" referrerpolicy="no-referrer" />
            </div>
          </div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          <div class="products-grid">
            <div class="card">
              <p class="eyebrow">Biography</p>
              <h2 class="card-title">Engineering &amp; Leadership</h2>
              <p style="color: var(--text-secondary); margin: 0;">${escapeHtml(founder.biography)}</p>
            </div>
            <div class="card">
              <p class="eyebrow">Origin Story</p>
              <h2 class="card-title">How MIYONI Began</h2>
              <p style="color: var(--text-secondary); margin: 0;">${escapeHtml(founder.originStory)}</p>
            </div>
            <div class="card">
              <p class="eyebrow">Vision</p>
              <h2 class="card-title">Technology with Purpose</h2>
              <p style="color: var(--text-secondary); margin: 0;">${escapeHtml(founder.vision)}</p>
            </div>
            <div class="card">
              <p class="eyebrow">Development Philosophy</p>
              <h2 class="card-title">Craft &amp; Discipline</h2>
              <p style="color: var(--text-secondary); margin: 0;">${escapeHtml(founder.philosophy)}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <div>
              <p class="eyebrow">Photography</p>
              <h2 class="section-title">Founder Gallery</h2>
            </div>
            <a href="/gallery/" class="btn btn-secondary">Full Media Gallery</a>
          </div>
          <div class="gallery-grid">
            <figure class="gallery-figure">
              <div class="gallery-figure-media">
                <img src="/assets/founder-office.png" alt="Roosevelt Chikwende in the MIYONI office" loading="lazy" referrerpolicy="no-referrer" />
              </div>
              <figcaption>Roosevelt Chikwende at the MIYONI workspace.</figcaption>
            </figure>
            <figure class="gallery-figure">
              <div class="gallery-figure-media">
                <img src="/assets/founder-portrait.png" alt="Studio portrait of Roosevelt Chikwende" loading="lazy" referrerpolicy="no-referrer" />
              </div>
              <figcaption>Official portrait of MIYONI founder Roosevelt Chikwende.</figcaption>
            </figure>
            <figure class="gallery-figure">
              <div class="gallery-figure-media">
                <img src="/assets/founder-quote.png" alt="Founder philosophy quote graphic" loading="lazy" referrerpolicy="no-referrer" />
              </div>
              <figcaption>Quote: Patience, silence, and self-belief.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      ${
        founderPosts.length > 0
          ? `<section class="section section-alt">
              <div class="container">
                <h2 class="section-title" style="margin-bottom: 28px;">Founder Announcements</h2>
                <div class="articles-grid">${founderPosts.map(renderArticleCard).join('')}</div>
              </div>
            </section>`
          : ''
      }
    `;

    const personSchema = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: founder.name,
      jobTitle: founder.role,
      worksFor: { '@type': 'Organization', name: 'MIYONI', url: `${siteUrl}/` },
      nationality: founder.country || 'Malawi',
      image: `${siteUrl}/assets/founder-portrait.png`,
      description: founder.biography,
      url: `${siteUrl}/founder/`,
    };

    return {
      status: 200,
      html: renderDocument({
        title: `${founder.name} — Founder of MIYONI`,
        description: founder.introduction.slice(0, 160),
        canonicalPath: '/founder/',
        siteUrl,
        ogImage: '/assets/founder-portrait.png',
        googleSiteVerification: seo.googleSiteVerification,
        jsonLdBlocks: [personSchema],
        activeNav: 'founder',
        bodyHtml,
        snapshot,
      }),
    };
  }

  // 4. PRODUCTS OVERVIEW
  if (cleanPath === '/products/') {
    const bodyHtml = `
      <section class="section">
        <div class="container">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><span>Products</span>
          </nav>
          <p class="eyebrow">MIYONI Ecosystem</p>
          <h1 class="page-title">Independent digital products built for reliability</h1>
          <p class="lead-copy">
            From SQL-powered cloud infrastructure to communication and student educational tools, each product reflects MIYONI’s standard of functionality and quality.
          </p>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          <div class="products-grid">
            ${(snapshot.products || [])
              .map(
                (p) => `<article class="card">
                  <div>
                    ${renderProductArchitectureGraphic(p.slug)}
                    <div class="card-meta-line">
                      <span class="card-meta-accent">${escapeHtml(p.category_label)}</span>
                      <span aria-hidden="true">·</span>
                      <span>${escapeHtml(p.status_label)}</span>
                    </div>
                    <h2 class="card-title"><a href="/products/${escapeHtml(p.slug)}/">${escapeHtml(p.name)}</a></h2>
                    <p style="color: var(--text-primary); font-weight: 500; margin: 0 0 10px;">${escapeHtml(p.tagline)}</p>
                    <p class="card-desc">${escapeHtml(p.summary)}</p>
                  </div>
                  <div class="card-footer-links">
                    <a href="/products/${escapeHtml(p.slug)}/" class="link-gold">Explore ${escapeHtml(p.name)}</a>
                    ${
                      p.website_url
                        ? `<a href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer" class="link-blue">${escapeHtml(p.website_url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>`
                        : ''
                    }
                  </div>
                </article>`
              )
              .join('')}
          </div>
        </div>
      </section>
    `;

    return {
      status: 200,
      html: renderDocument({
        title: 'MIYONI Products — SmartBase, Talkivo, XOOL & Zapamubas',
        description: 'Explore the MIYONI product ecosystem including SmartBase cloud SQL database, Talkivo communication platform, XOOL EdTech, and Zapamubas.',
        canonicalPath: '/products/',
        siteUrl,
        googleSiteVerification: seo.googleSiteVerification,
        activeNav: 'products',
        bodyHtml,
        snapshot,
      }),
    };
  }

  // 5. INDIVIDUAL PRODUCT PAGE (/products/:slug/)
  if (cleanPath.startsWith('/products/') && cleanPath.split('/').filter(Boolean).length === 2) {
    const slug = cleanPath.split('/').filter(Boolean)[1];
    const product = (snapshot.products || []).find((p) => p.slug === slug);
    if (!product) {
      return renderNotFoundPage(siteUrl, snapshot, seo);
    }

    const relatedPosts = publishedPosts.filter((p) => p.product_slug === product.slug).slice(0, 3);
    const bodyHtml = `
      <section class="section">
        <div class="container">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span>
            <a href="/products/">Products</a><span aria-hidden="true">/</span>
            <span>${escapeHtml(product.name)}</span>
          </nav>
          <div class="split-grid">
            <div class="hero-copy-col">
              <p class="eyebrow">${escapeHtml(product.category_label)} · ${escapeHtml(product.status_label)}</p>
              <h1 class="page-title">${escapeHtml(product.name)}</h1>
              <p class="lead-copy">${escapeHtml(product.tagline)}</p>
              <div class="hero-actions">
                ${
                  product.website_url
                    ? `<a href="${escapeHtml(product.website_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Visit ${escapeHtml(product.name)}</a>`
                    : ''
                }
                <a href="/products/" class="btn btn-secondary">All MIYONI Products</a>
              </div>
            </div>
            <div>
              ${renderProductArchitectureGraphic(product.slug)}
              <div class="card">
                <h2 style="font-size: 1.05rem; margin-bottom: 10px;">Official Product Overview</h2>
                <p style="color: var(--text-secondary); margin: 0;">${escapeHtml(product.summary)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          <h2 class="section-title" style="margin-bottom: 20px;">About ${escapeHtml(product.name)}</h2>
          <div class="prose">${sanitizeHtml(product.description)}</div>

          ${
            product.features && product.features.length > 0
              ? `<div style="margin-top: 44px;">
                  <h2 class="section-title" style="margin-bottom: 18px;">Key Capabilities &amp; Scope</h2>
                  <div class="feature-grid">
                    ${product.features
                      .map((f, idx) => `<div class="feature-cell"><strong style="color: var(--accent-gold);">0${idx + 1}.</strong> ${escapeHtml(f)}</div>`)
                      .join('')}
                  </div>
                </div>`
              : ''
          }

          ${
            product.screenshots && product.screenshots.length > 0
              ? `<div style="margin-top: 44px;">
                  <h2 class="section-title" style="margin-bottom: 18px;">Screenshots</h2>
                  <div class="gallery-grid">
                    ${product.screenshots
                      .map(
                        (src, idx) => `<figure class="gallery-figure">
                          <div class="gallery-figure-media">
                            <img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)} screenshot ${idx + 1}" loading="lazy" referrerpolicy="no-referrer" />
                          </div>
                        </figure>`
                      )
                      .join('')}
                  </div>
                </div>`
              : ''
          }
        </div>
      </section>

      ${
        relatedPosts.length > 0
          ? `<section class="section">
              <div class="container">
                <h2 class="section-title" style="margin-bottom: 28px;">Related ${escapeHtml(product.name)} Updates</h2>
                <div class="articles-grid">${relatedPosts.map(renderArticleCard).join('')}</div>
              </div>
            </section>`
          : ''
      }
    `;

    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: product.name,
      applicationCategory: product.category_label,
      operatingSystem: 'Web',
      url: product.website_url || `${siteUrl}/products/${product.slug}/`,
      description: product.summary,
      creator: {
        '@type': 'Organization',
        name: 'MIYONI',
        url: `${siteUrl}/`,
      },
    };

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Products', item: `${siteUrl}/products/` },
        { '@type': 'ListItem', position: 3, name: product.name, item: `${siteUrl}/products/${product.slug}/` },
      ],
    };

    return {
      status: 200,
      html: renderDocument({
        title: product.seo_title || `${product.name} — MIYONI Product Ecosystem`,
        description: product.seo_description || product.summary.slice(0, 160),
        canonicalPath: `/products/${product.slug}/`,
        siteUrl,
        googleSiteVerification: seo.googleSiteVerification,
        jsonLdBlocks: [productSchema, breadcrumbSchema],
        activeNav: 'products',
        bodyHtml,
        snapshot,
      }),
    };
  }

function scorePostForQuery(post, qLower, tokens) {
  const title = (post.title || '').toLowerCase();
  const seoTitle = (post.seo_title || '').toLowerCase();
  const excerpt = (post.excerpt || '').toLowerCase();
  const seoDesc = (post.seo_description || '').toLowerCase();
  const tags = (post.tags || []).join(' ').toLowerCase();
  const product = (post.product_slug || '').toLowerCase();
  const body = stripHtmlToText(post.content_html).toLowerCase();

  let score = 0;
  if (title.includes(qLower) || seoTitle.includes(qLower)) score += 120;
  if (tags.includes(qLower)) score += 90;
  if (excerpt.includes(qLower) || seoDesc.includes(qLower)) score += 60;
  if (body.includes(qLower)) score += 40;

  for (const tok of tokens) {
    if (title.includes(tok) || seoTitle.includes(tok)) score += 45;
    if (tags.includes(tok)) score += 35;
    if (excerpt.includes(tok) || seoDesc.includes(tok)) score += 25;
    if (product.includes(tok)) score += 20;
    if (body.includes(tok)) score += 12;
  }

  if (score > 0 && post.is_featured) score += 15;
  return score;
}

  // 6. NEWS & ANNOUNCEMENTS HUB (/news/)
  if (cleanPath === '/news/') {
    const activeCat = searchParams?.get('category') || '';
    const activeProduct = searchParams?.get('product') || '';
    const activeQuery = String(searchParams?.get('q') || '').trim();
    const page = Math.max(1, parseInt(searchParams?.get('page') || '1', 10) || 1);
    const perPage = 9;

    let filtered = publishedPosts.filter((p) => {
      if (activeCat && p.category_slug !== activeCat) return false;
      if (activeProduct && p.product_slug !== activeProduct) return false;
      return true;
    });

    if (activeQuery) {
      const qLower = activeQuery.toLowerCase();
      const tokens = qLower
        .split(/\s+/)
        .map((t) => t.replace(/[^a-z0-9._-]/g, ''))
        .filter((t) => t.length >= 2);
      filtered = filtered
        .map((p) => ({ post: p, score: scorePostForQuery(p, qLower, tokens) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return String(b.post.published_at || b.post.created_at).localeCompare(
            String(a.post.published_at || a.post.created_at)
          );
        })
        .map((item) => item.post);
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const currentPage = Math.min(page, totalPages);
    const pagedPosts = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

    const bodyHtml = `
      <section class="section">
        <div class="container">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><span>News &amp; Updates</span>
          </nav>
          <div class="section-head" style="margin-bottom: 20px;">
            <div>
              <p class="eyebrow">MIYONI Newsroom</p>
              <h1 class="page-title">News, announcements &amp; product updates</h1>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <a href="/rss.xml" class="btn btn-secondary">RSS Feed</a>
            </div>
          </div>

          <form class="search-form" action="/search/" method="get" style="margin-bottom: 24px;">
            <label for="news-search-q" class="hidden" style="position:absolute;left:-9999px;">Search articles</label>
            <input id="news-search-q" type="search" name="q" class="input" value="${escapeHtml(activeQuery)}" placeholder="Search articles, Talkivo, Omegle alternative, SmartBase..." />
            <button type="submit" class="btn btn-primary">Search</button>
          </form>

          <div class="filter-bar" role="navigation" aria-label="Filter updates by category">
            <a href="/news/" class="filter-tab${!activeCat ? ' active' : ''}">All Updates</a>
            ${(snapshot.categories || [])
              .map(
                (c) =>
                  `<a href="/news/?category=${encodeURIComponent(c.slug)}" class="filter-tab${activeCat === c.slug ? ' active' : ''}">${escapeHtml(c.name)}</a>`
              )
              .join('')}
          </div>

          ${
            pagedPosts.length > 0
              ? `<div class="articles-grid">${pagedPosts.map(renderArticleCard).join('')}</div>`
              : `<div class="card"><p style="margin:0; color: var(--text-secondary);">No published articles match this filter yet.</p></div>`
          }

          ${
            totalPages > 1
              ? `<nav class="pagination" aria-label="Pagination">
                  ${currentPage > 1 ? `<a class="btn btn-secondary" href="/news/?page=${currentPage - 1}${activeCat ? `&category=${encodeURIComponent(activeCat)}` : ''}${activeQuery ? `&q=${encodeURIComponent(activeQuery)}` : ''}">Previous</a>` : ''}
                  <span class="tabular-nums" style="color: var(--text-muted);">Page ${currentPage} of ${totalPages}</span>
                  ${currentPage < totalPages ? `<a class="btn btn-secondary" href="/news/?page=${currentPage + 1}${activeCat ? `&category=${encodeURIComponent(activeCat)}` : ''}${activeQuery ? `&q=${encodeURIComponent(activeQuery)}` : ''}">Next</a>` : ''}
                </nav>`
              : ''
          }
        </div>
      </section>
    `;

    return {
      status: 200,
      html: renderDocument({
        title: 'MIYONI News & Updates — Announcements and Product Releases',
        description: 'Read official MIYONI company announcements, SmartBase releases, Talkivo news, XOOL educational updates, and founder notes.',
        canonicalPath: '/news/',
        siteUrl,
        googleSiteVerification: seo.googleSiteVerification,
        activeNav: 'news',
        bodyHtml,
        snapshot,
      }),
    };
  }

  // 7. INDIVIDUAL ARTICLE PAGE (/news/:slug/)
  if (cleanPath.startsWith('/news/') && cleanPath.split('/').filter(Boolean).length === 2) {
    const slug = cleanPath.split('/').filter(Boolean)[1];
    const post = publishedPosts.find((p) => p.slug === slug);
    if (!post) {
      return renderNotFoundPage(siteUrl, snapshot, seo);
    }

    const ytId = extractYouTubeId(post.youtube_url);
    const relatedProduct = (snapshot.products || []).find((pr) => pr.slug === post.product_slug);
    const relatedArticles = publishedPosts.filter((p) => p.slug !== post.slug).slice(0, 3);
    const coverImg = sanitizeUrl(post.cover_image || '');
    const articleCanonical = post.canonical_url || `${siteUrl}/news/${post.slug}/`;
    const pubDateIso = post.published_at || post.created_at;
    const shareUrl = encodeURIComponent(articleCanonical);
    const shareTitle = encodeURIComponent(post.title);

    const bodyHtml = `
      <article class="section">
        <div class="container" style="max-width: 900px;">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span>
            <a href="/news/">News</a><span aria-hidden="true">/</span>
            <span>${escapeHtml(post.title)}</span>
          </nav>

          <div class="card-meta-line" style="margin-bottom: 14px;">
            <span class="card-meta-accent">${escapeHtml(post.content_type || 'Company announcements')}</span>
            <span aria-hidden="true">·</span>
            <time class="tabular-nums" datetime="${escapeHtml(pubDateIso)}">${escapeHtml(formatDateReadable(pubDateIso))}</time>
            <span aria-hidden="true">·</span>
            <span>By ${escapeHtml(post.author_name || 'Roosevelt Chikwende')}</span>
          </div>

          <h1 class="page-title" style="max-width: 24ch;">${escapeHtml(post.title)}</h1>
          ${post.excerpt ? `<p class="lead-copy">${escapeHtml(post.excerpt)}</p>` : ''}

          ${
            coverImg
              ? `<figure style="margin: 32px 0;">
                  <img src="${escapeHtml(coverImg)}" alt="${escapeHtml(post.title)}" style="width: 100%; max-height: 480px; object-fit: cover; border-radius: 14px; border: 1px solid var(--border-hairline);" referrerpolicy="no-referrer" />
                </figure>`
              : ''
          }

          <div class="prose" style="margin-top: 28px;">
            ${sanitizeHtml(post.content_html)}
          </div>

          ${
            ytId
              ? `<div class="video-embed">
                  <iframe src="https://www.youtube.com/embed/${escapeHtml(ytId)}" title="${escapeHtml(post.title)} video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
                </div>`
              : ''
          }

          ${
            post.gallery_images && post.gallery_images.length > 0
              ? `<section style="margin-top: 40px;">
                  <h2 style="font-size: 1.3rem; margin-bottom: 16px;">Article Gallery</h2>
                  <div class="gallery-grid">
                    ${post.gallery_images
                      .map(
                        (imgUrl, i) => `<figure class="gallery-figure">
                          <div class="gallery-figure-media">
                            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(post.title)} image ${i + 1}" loading="lazy" referrerpolicy="no-referrer" />
                          </div>
                        </figure>`
                      )
                      .join('')}
                  </div>
                </section>`
              : ''
          }

          ${
            post.external_urls && post.external_urls.length > 0
              ? `<div class="card" style="margin-top: 32px;">
                  <h2 style="font-size: 1.05rem; margin-bottom: 12px;">External References</h2>
                  <ul style="margin: 0; padding-left: 18px; color: var(--accent-blue);">
                    ${post.external_urls
                      .map((u) => `<li><a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer">${escapeHtml(u)}</a></li>`)
                      .join('')}
                  </ul>
                </div>`
              : ''
          }

          ${
            relatedProduct
              ? `<div class="card" style="margin-top: 28px;">
                  <div class="card-meta-line"><span class="card-meta-accent">Related MIYONI Product</span></div>
                  <h2 class="card-title">${escapeHtml(relatedProduct.name)}</h2>
                  <p class="card-desc">${escapeHtml(relatedProduct.summary)}</p>
                  <div class="card-footer-links">
                    <a href="/products/${escapeHtml(relatedProduct.slug)}/" class="link-gold">Explore ${escapeHtml(relatedProduct.name)}</a>
                    ${
                      relatedProduct.website_url
                        ? `<a href="${escapeHtml(relatedProduct.website_url)}" target="_blank" rel="noopener noreferrer" class="link-blue">Visit website</a>`
                        : ''
                    }
                  </div>
                </div>`
              : ''
          }

          <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--border-hairline); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
            <div style="color: var(--text-muted); font-size: 0.9rem;">
              ${post.tags && post.tags.length ? `Topics: ${post.tags.map((t) => escapeHtml(t)).join(' · ')}` : 'MIYONI Newsroom'}
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <a class="btn btn-secondary" href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}" target="_blank" rel="noopener noreferrer">Share on X</a>
              <a class="btn btn-secondary" href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" rel="noopener noreferrer">Share on LinkedIn</a>
            </div>
          </div>
        </div>
      </article>

      ${
        relatedArticles.length > 0
          ? `<section class="section section-alt">
              <div class="container">
                <h2 class="section-title" style="margin-bottom: 28px;">More from MIYONI</h2>
                <div class="articles-grid">${relatedArticles.map(renderArticleCard).join('')}</div>
              </div>
            </section>`
          : ''
      }
    `;

    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: post.title,
      description: post.seo_description || post.excerpt || stripHtmlToText(post.content_html).slice(0, 160),
      articleSection: post.content_type || 'Company announcements',
      keywords: (post.tags || []).join(', '),
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at || post.published_at || post.created_at,
      author: {
        '@type': 'Person',
        name: post.author_name || 'Roosevelt Chikwende',
      },
      publisher: {
        '@type': 'Organization',
        name: 'MIYONI',
        url: `${siteUrl}/`,
      },
      ...(relatedProduct
        ? {
            about: {
              '@type': 'SoftwareApplication',
              name: relatedProduct.name,
              url: relatedProduct.website_url || `${siteUrl}/products/${relatedProduct.slug}/`,
            },
          }
        : {}),
      mainEntityOfPage: articleCanonical,
      image: toAbsoluteUrl(post.social_image || post.cover_image || '/assets/founder-office.png', siteUrl),
    };

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}/news/` },
        { '@type': 'ListItem', position: 3, name: post.title, item: articleCanonical },
      ],
    };

    return {
      status: 200,
      html: renderDocument({
        title: post.seo_title || `${post.title} — MIYONI News`,
        description: post.seo_description || post.excerpt || stripHtmlToText(post.content_html).slice(0, 160),
        canonicalPath: `/news/${post.slug}/`,
        siteUrl,
        ogType: 'article',
        ogImage: post.social_image || post.cover_image || '/assets/founder-office.png',
        googleSiteVerification: seo.googleSiteVerification,
        jsonLdBlocks: [articleSchema, breadcrumbSchema],
        activeNav: 'news',
        bodyHtml,
        snapshot,
      }),
    };
  }

  // 8. MEDIA & GALLERY (/gallery/)
  if (cleanPath === '/gallery/') {
    const mediaItems = (snapshot.media || []).filter((m) => sanitizeUrl(m.public_url || ''));
    const bodyHtml = `
      <section class="section">
        <div class="container">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><span>Media &amp; Gallery</span>
          </nav>
          <p class="eyebrow">Official Visuals</p>
          <h1 class="page-title">MIYONI Media &amp; Founder Gallery</h1>
          <p class="lead-copy">Official photographs of founder Roosevelt Chikwende and media assets published across MIYONI.</p>

          <div class="gallery-grid" style="margin-top: 40px;">
            ${mediaItems
              .map(
                (m) => `<figure class="gallery-figure">
                  <div class="gallery-figure-media">
                    <img src="${escapeHtml(m.public_url)}" alt="${escapeHtml(m.alt_text || m.original_name)}" loading="lazy" referrerpolicy="no-referrer" />
                  </div>
                  <figcaption>${escapeHtml(m.caption || m.alt_text || m.original_name)}</figcaption>
                </figure>`
              )
              .join('')}
          </div>
        </div>
      </section>
    `;

    return {
      status: 200,
      html: renderDocument({
        title: 'Media & Gallery — MIYONI Official Photographs',
        description: 'Official media gallery and founder photography of MIYONI and Roosevelt Chikwende.',
        canonicalPath: '/gallery/',
        siteUrl,
        googleSiteVerification: seo.googleSiteVerification,
        activeNav: 'gallery',
        bodyHtml,
        snapshot,
      }),
    };
  }

  // 9. SEARCH PAGE (/search/) — Article-First Weighted Relevance Ranking
  if (cleanPath === '/search/') {
    const query = String(searchParams?.get('q') || '').trim();
    const qLower = query.toLowerCase();
    const tokens = qLower
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9._-]/g, ''))
      .filter((t) => t.length >= 2);

    const matchedPosts = qLower
      ? publishedPosts
          .map((p) => ({ post: p, score: scorePostForQuery(p, qLower, tokens) }))
          .filter((item) => item.score > 0)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return String(b.post.published_at || b.post.created_at).localeCompare(
              String(a.post.published_at || a.post.created_at)
            );
          })
          .map((item) => item.post)
      : [];

    const matchedProducts = qLower
      ? (snapshot.products || []).filter((p) => {
          const hay = `${p.name} ${p.tagline} ${p.summary} ${(p.features || []).join(' ')}`.toLowerCase();
          return hay.includes(qLower) || tokens.some((tok) => hay.includes(tok));
        })
      : [];

    const bodyHtml = `
      <section class="section">
        <div class="container">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><span>Search</span>
          </nav>
          <p class="eyebrow">Search MIYONI</p>
          <h1 class="page-title">Search articles &amp; products</h1>
          <form class="search-form" action="/search/" method="get" style="margin-top: 24px;">
            <label for="search-q" class="hidden" style="position:absolute;left:-9999px;">Search query</label>
            <input id="search-q" type="search" name="q" class="input" value="${escapeHtml(query)}" placeholder="Search Talkivo, Omegle alternative, SmartBase, XOOL..." />
            <button type="submit" class="btn btn-primary">Search</button>
          </form>

          ${
            query
              ? `<div style="margin-top: 40px;">
                  <p style="color: var(--text-muted); margin-bottom: 24px;">
                    Found ${matchedPosts.length + matchedProducts.length} results for "${escapeHtml(query)}"
                  </p>
                  ${
                    matchedPosts.length > 0
                      ? `<h2 class="section-title" style="margin-bottom: 18px;">Articles &amp; Announcements</h2>
                        <div class="articles-grid" style="margin-bottom: 44px;">${matchedPosts.map(renderArticleCard).join('')}</div>`
                      : ''
                  }
                  ${
                    matchedProducts.length > 0
                      ? `<h2 class="section-title" style="margin-bottom: 18px;">Related Products</h2>
                        <div class="products-grid">
                          ${matchedProducts
                            .map(
                              (p) => `<article class="card">
                                <h3 class="card-title"><a href="/products/${escapeHtml(p.slug)}/">${escapeHtml(p.name)}</a></h3>
                                <p class="card-desc">${escapeHtml(p.summary)}</p>
                                <div class="card-footer-links"><a href="/products/${escapeHtml(p.slug)}/" class="link-gold">View product</a></div>
                              </article>`
                            )
                            .join('')}
                        </div>`
                      : ''
                  }
                  ${
                    matchedProducts.length === 0 && matchedPosts.length === 0
                      ? `<div class="card"><p style="margin:0; color: var(--text-secondary);">No matching articles or products were found.</p></div>`
                      : ''
                  }
                </div>`
              : ''
          }
        </div>
      </section>
    `;

    return {
      status: 200,
      html: renderDocument({
        title: query ? `Search: ${query} — MIYONI` : 'Search — MIYONI Digital Headquarters',
        description: 'Search published news, announcements, and digital products across MIYONI.',
        canonicalPath: '/search/',
        siteUrl,
        googleSiteVerification: seo.googleSiteVerification,
        activeNav: 'search',
        bodyHtml,
        snapshot,
      }),
    };
  }

  // 10. CONTACT PAGE (/contact/)
  if (cleanPath === '/contact/') {
    const bodyHtml = `
      <section class="section">
        <div class="container">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><span>Contact</span>
          </nav>
          <p class="eyebrow">Official Contact</p>
          <h1 class="page-title">Connect with MIYONI</h1>
          <p class="lead-copy">
            Official inquiries regarding MIYONI, founder Roosevelt Chikwende, or any platform in the MIYONI product ecosystem.
          </p>

          <div class="products-grid" style="margin-top: 40px;">
            <div class="card">
              <p class="eyebrow">Direct Headquarters</p>
              <h2 class="card-title">MIYONI Official Details</h2>
              <p style="color: var(--text-secondary); margin: 0 0 12px;">
                <strong>Brand:</strong> ${escapeHtml(company.brandName || 'MIYONI')}<br />
                <strong>Founder:</strong> ${escapeHtml(founder.name)}<br />
                <strong>Country of Origin:</strong> ${escapeHtml(company.country || 'Malawi')}<br />
                <strong>Official Domain:</strong> <a href="https://miyoni.de5.net/" class="link-blue">https://miyoni.de5.net/</a><br />
                <strong>Email:</strong> <a href="mailto:${escapeHtml(company.contactEmail || 'contact@miyoni.de5.net')}" class="link-gold">${escapeHtml(company.contactEmail || 'contact@miyoni.de5.net')}</a>
              </p>
            </div>
            <div class="card">
              <p class="eyebrow">Ecosystem Domains</p>
              <h2 class="card-title">Product Websites</h2>
              <ul class="footer-links" style="color: var(--accent-blue);">
                ${(snapshot.products || [])
                  .map(
                    (p) =>
                      `<li><a href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.name)} — ${escapeHtml(p.website_url)}</a></li>`
                  )
                  .join('')}
              </ul>
            </div>
          </div>
        </div>
      </section>
    `;

    return {
      status: 200,
      html: renderDocument({
        title: 'Contact MIYONI — Official Information & Product Links',
        description: 'Official contact information, headquarters details, and product links for MIYONI in Malawi.',
        canonicalPath: '/contact/',
        siteUrl,
        googleSiteVerification: seo.googleSiteVerification,
        activeNav: 'contact',
        bodyHtml,
        snapshot,
      }),
    };
  }

  return renderNotFoundPage(siteUrl, snapshot, seo);
}

function renderNotFoundPage(siteUrl, snapshot, seo) {
  const bodyHtml = `
    <section class="section">
      <div class="container">
        <p class="eyebrow">404</p>
        <h1 class="page-title">Page not found</h1>
        <p class="lead-copy">The requested page does not exist or is no longer published.</p>
        <div class="hero-actions">
          <a href="/" class="btn btn-primary">Return Home</a>
          <a href="/news/" class="btn btn-secondary">Browse News</a>
        </div>
      </div>
    </section>
  `;
  return {
    status: 404,
    html: renderDocument({
      title: 'Page Not Found — MIYONI',
      description: 'The requested page could not be found on MIYONI.',
      canonicalPath: '/',
      siteUrl,
      googleSiteVerification: seo?.googleSiteVerification,
      bodyHtml,
      snapshot,
    }),
  };
}

export function renderSitemapXml(snapshot, env, requestUrl) {
  const siteUrl = resolveSiteUrl(env, requestUrl);
  const nowIso = new Date().toISOString();
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/about/', priority: '0.8', changefreq: 'monthly' },
    { path: '/founder/', priority: '0.8', changefreq: 'monthly' },
    { path: '/products/', priority: '0.9', changefreq: 'weekly' },
    { path: '/news/', priority: '0.9', changefreq: 'daily' },
    { path: '/gallery/', priority: '0.6', changefreq: 'monthly' },
    { path: '/contact/', priority: '0.6', changefreq: 'monthly' },
  ];

  const urls = staticPages.map(
    (p) => `  <url>
    <loc>${escapeXml(siteUrl + p.path)}</loc>
    <lastmod>${escapeXml(nowIso)}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  );

  for (const product of snapshot.products || []) {
    urls.push(`  <url>
    <loc>${escapeXml(`${siteUrl}/products/${encodeURIComponent(product.slug)}/`)}</loc>
    <lastmod>${escapeXml(product.updated_at || nowIso)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  for (const post of getPublishedPosts(snapshot)) {
    urls.push(`  <url>
    <loc>${escapeXml(`${siteUrl}/news/${encodeURIComponent(post.slug)}/`)}</loc>
    <lastmod>${escapeXml(post.updated_at || post.published_at || nowIso)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${post.is_featured ? '0.9' : '0.7'}</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

export function renderRobotsTxt(env, requestUrl) {
  const siteUrl = resolveSiteUrl(env, requestUrl);
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /api/admin/

Sitemap: ${siteUrl}/sitemap.xml
`;
}

export function renderRssXml(snapshot, env, requestUrl) {
  const siteUrl = resolveSiteUrl(env, requestUrl);
  const company = snapshot.settings.company_info;
  const posts = getPublishedPosts(snapshot).slice(0, 30);

  const items = posts
    .map((post) => {
      const link = `${siteUrl}/news/${encodeURIComponent(post.slug)}/`;
      const pubDate = new Date(post.published_at || post.created_at).toUTCString();
      const desc = post.excerpt || stripHtmlToText(post.content_html).slice(0, 260);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <author>${escapeXml(post.author_name || 'Roosevelt Chikwende')}</author>
      <category>${escapeXml(post.content_type || 'News')}</category>
      <description>${escapeXml(desc)}</description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(company.brandName || 'MIYONI')} — Official News &amp; Updates</title>
    <link>${escapeXml(siteUrl)}/news/</link>
    <description>${escapeXml(company.tagline || 'We build functionality and quality.')}</description>
    <language>en</language>
    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

export function renderLlmsTxt(snapshot, env, requestUrl) {
  const siteUrl = resolveSiteUrl(env, requestUrl);
  const company = snapshot.settings.company_info;
  const founder = snapshot.settings.founder_info;
  const published = getPublishedPosts(snapshot).slice(0, 15);

  const productLines = (snapshot.products || [])
    .map(
      (p) =>
        `- ${p.name} (${siteUrl}/products/${p.slug}/ | External: ${p.website_url}): ${p.summary}`
    )
    .join('\n');

  const postLines = published
    .map((p) => `- [${p.title}](${siteUrl}/news/${p.slug}/): ${p.excerpt || p.content_type}`)
    .join('\n');

  return `# MIYONI

> ${company.tagline || 'We build functionality and quality.'}

MIYONI is an independent technology brand founded by ${founder.name} in ${company.country || 'Malawi'}.
Official website: ${siteUrl}/

## Core Pages
- [Homepage](${siteUrl}/)
- [About MIYONI](${siteUrl}/about/)
- [Founder Profile: Roosevelt Chikwende](${siteUrl}/founder/)
- [Products Ecosystem](${siteUrl}/products/)
- [News & Updates](${siteUrl}/news/)
- [Media & Gallery](${siteUrl}/gallery/)
- [Contact](${siteUrl}/contact/)
- [RSS Feed](${siteUrl}/rss.xml)
- [XML Sitemap](${siteUrl}/sitemap.xml)

## MIYONI Product Ecosystem
${productLines}

## Recent Published Articles
${postLines || '- No published articles yet.'}
`;
}
