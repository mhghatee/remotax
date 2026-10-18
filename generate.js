/**
 * REMOTAX PROGRAMMATIC SEO STATIC GENERATOR (generate.js)
 * Conforms to Remotax Platform Architecture Spec (Wave 1)
 * 
 * Zero-framework Node script generating clean-URL static pages:
 * - 5 Country Hubs: /countries/<slug>/index.html
 * - 5 Regimes: /regimes/<slug>/index.html
 * - 10 Comparisons: /comparisons/<slug>/index.html
 * - 3 Rankings: /best/<slug>/index.html
 * - 1 Methodology: /methodology/index.html
 * 
 * Supports:
 * - node generate.js
 * - node generate.js --emit-htaccess
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const CONFIG_PATH = path.join(ROOT_DIR, 'generator.config.json');
const SEO_PAGES_PATH = path.join(ROOT_DIR, 'data', 'seo-pages.json');
const COUNTRIES_PATH = path.join(ROOT_DIR, 'data', 'countries.js');
const ENGINE_PATH = path.join(ROOT_DIR, 'engine', 'taxEngine.js');
const REDIRECTS_CSV_PATH = path.join(ROOT_DIR, 'redirects.csv');
const HTACCESS_PATH = path.join(ROOT_DIR, '.htaccess');
const ROBOTS_PATH = path.join(ROOT_DIR, 'robots.txt');
const FX_PATH = path.join(ROOT_DIR, 'data', 'fx.json');

// Load Config & Single Sources of Truth
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const seoPages = JSON.parse(fs.readFileSync(SEO_PAGES_PATH, 'utf8'));
const fxData = JSON.parse(fs.readFileSync(FX_PATH, 'utf8'));
const activeSeoPages = seoPages.filter(p => p.status !== 'deferred-wave-2');
const countriesModule = require(COUNTRIES_PATH);
const REMOTAX_COUNTRIES = countriesModule.REMOTAX_COUNTRIES || countriesModule;
const taxEngine = require(ENGINE_PATH);
const { interpolate } = require('./data/placeholders');

console.log('======================================================================');
console.log('               REMOTAX PROGRAMMATIC SEO GENERATOR                     ');
console.log(` BASE_URL : ${config.BASE_URL}`);
console.log(` INDEXING : ${config.INDEXING}`);
console.log(` PAGES    : ${activeSeoPages.length} Active Wave-1 Target Pages (${seoPages.length - activeSeoPages.length} deferred)`);
console.log('======================================================================\n');

// Map country codes to folder slugs
const COUNTRY_SLUGS = {
  ES: 'spain',
  PT: 'portugal',
  AE: 'uae',
  IT: 'italy',
  TH: 'thailand'
};

// Load Evidence Audit Trail
const EVIDENCE_PATH = path.join(ROOT_DIR, 'review', 'evidence.csv');
const evidenceMap = new Map();
let latestEvidenceDate = '2026-10-18';
if (fs.existsSync(EVIDENCE_PATH)) {
  const evLines = fs.readFileSync(EVIDENCE_PATH, 'utf8').trim().split('\n').slice(1);
  for (const l of evLines) {
    if (!l) continue;
    const parts = l.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g).map(c => c.replace(/^,/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    if (parts.length >= 7) {
      evidenceMap.set(parts[0], {
        field: parts[0],
        claimed_value: parts[1],
        url: parts[2],
        status_code: parts[3],
        found: parts[4],
        excerpt: parts[5],
        fetchedAt: parts[6]
      });
      if (parts[6]) {
        const d = parts[6].split('T')[0];
        if (d > latestEvidenceDate) latestEvidenceDate = d;
      }
    }
  }
}

/**
 * Compute honest verification badge per page dynamically from evidence.csv.
 * Strictly lists verified groups (tax tables, regime rules, social security, residency days)
 * and estimate groups (social security, living costs, etc.).
 */
function computeVerificationBadge(page) {
  const pType = page.pageType;
  let codes = [];
  if (pType === 'country' || pType === 'regime') {
    codes = [page.countryCode];
  } else if (pType === 'comparison') {
    codes = page.countryCodes || [];
  } else {
    codes = ['ES', 'PT', 'IT', 'AE', 'TH'];
  }

  const isTaxTablesVerified = (c) => {
    let allFound = true;
    let checkedCount = 0;
    for (let i = 0; i <= 5; i++) {
      const fieldKey = (c === 'ES' || c === 'PT') ? `${c}.taxBracket.${i}.rate` : `${c}.taxBrackets.${i}.rate`;
      if (evidenceMap.has(fieldKey)) {
        checkedCount++;
        if (evidenceMap.get(fieldKey).found !== 'yes') allFound = false;
      }
    }
    return checkedCount > 0 && allFound;
  };

  const isSocialSecurityVerified = (c) => {
    const ssKeys = [
      `${c}.socialSecurity.employeeRate`,
      `${c}.socialSecurity.contractorRate`,
      `${c}.socialSecurity.employeeMaxMonthlyBase`,
      `${c}.socialSecurity.employeeMaxAnnualBase`,
      `${c}.socialSecurity.iasValue2026`,
      `${c}.socialSecurity.primaFascia`
    ];
    let allFound = true;
    let checkedCount = 0;
    for (const k of ssKeys) {
      if (evidenceMap.has(k)) {
        checkedCount++;
        if (evidenceMap.get(k).found !== 'yes') allFound = false;
      }
    }
    return checkedCount > 0 && allFound;
  };

  const isRegimeRulesVerified = (c) => {
    const rKeys = [
      `${c}.regimes.beckhamFlatRate`,
      `${c}.regimes.beckhamCap`,
      `${c}.regimes.impatriatiExemption`,
      `${c}.regimes.impatriatiCap`,
      `${c}.regimes.d8FlatRate`
    ];
    let allFound = true;
    let checkedCount = 0;
    for (const k of rKeys) {
      if (evidenceMap.has(k)) {
        checkedCount++;
        if (evidenceMap.get(k).found !== 'yes') allFound = false;
      }
    }
    return checkedCount > 0 && allFound;
  };

  const isResidencyVerified = (c) => {
    const k = `${c}.daysResidency`;
    return evidenceMap.has(k) && evidenceMap.get(k).found === 'yes';
  };

  if (pType === 'country') {
    const c = page.countryCode;
    const tt = isTaxTablesVerified(c);
    const ss = isSocialSecurityVerified(c);
    const res = isResidencyVerified(c);

    const verified = [];
    const estimates = [];

    if (tt) verified.push('Tax tables');
    else estimates.push('tax tables');

    if (ss) verified.push('Social Security');
    else estimates.push('social security');

    if (res) verified.push('residency days');
    else estimates.push('residency rules');

    estimates.push('living costs');
    if (c === 'TH') estimates.push('offshore 0% rule');

    let text = `${verified.join(' & ')} verified ${latestEvidenceDate}`;
    if (estimates.length > 0) {
      text += ` · ${estimates.join(' & ')}: Remotax estimates`;
    }
    return text;
  }

  if (pType === 'regime') {
    const c = page.countryCode;
    const tt = isTaxTablesVerified(c);
    const reg = isRegimeRulesVerified(c);
    const ss = isSocialSecurityVerified(c);

    const verified = [];
    const estimates = [];

    if (tt) verified.push('Tax tables');
    else estimates.push('tax tables');

    if (reg) verified.push('Regime rules');
    else estimates.push('regime conditions');

    if (ss) verified.push('Social Security');
    else estimates.push('social security');

    estimates.push('living costs');

    let text = `${verified.join(' & ')} verified ${latestEvidenceDate}`;
    if (estimates.length > 0) {
      text += ` · ${estimates.join(' & ')}: Remotax estimates`;
    }
    return text;
  }

  if (pType === 'comparison') {
    const allTT = codes.every(isTaxTablesVerified);
    const allSS = codes.every(isSocialSecurityVerified);
    const verified = [];
    const estimates = [];

    if (allTT) verified.push('Tax tables');
    else estimates.push('tax tables');

    if (allSS) verified.push('Social Security');
    else {
      const unverifiedSS = codes.filter(c => !isSocialSecurityVerified(c));
      estimates.push(`${unverifiedSS.join(' & ')} social security`);
    }

    estimates.push('living costs');

    let text = `${verified.join(' & ')} verified ${latestEvidenceDate}`;
    if (estimates.length > 0) {
      text += ` · ${estimates.join(' & ')}: Remotax estimates`;
    }
    return text;
  }

  return `Tax tables verified ${latestEvidenceDate} · Social security & living costs: Remotax estimates`;
}

// Standard salary tiers for build-time calculations
const SALARY_TIERS = [30000, 50000, 75000, 100000, 125000, 150000, 200000];

// Helpers
function formatEUR(val) {
  return '€' + Math.round(val).toLocaleString('en-US');
}

function getRelativeDepth(pagePath) {
  const clean = pagePath.replace(/^\/+|\/+$/g, '');
  const segments = clean.split('/').filter(Boolean);
  return segments.map(() => '..').join('/') + '/';
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generate Related Links Block (Max 6, data-driven, prevents orphan pages)
function getRelatedLinks(currentPage, allPages, rel) {
  const links = [];
  const type = currentPage.pageType;
  const slug = currentPage.slug;

  if (type === 'country') {
    // 1. Own regime
    const regime = allPages.find(p => p.pageType === 'regime' && p.countryCode === currentPage.countryCode);
    if (regime) links.push({ title: `${REMOTAX_COUNTRIES[currentPage.countryCode].country} Special Regime Guide`, url: `${rel}${regime.path}` });
    // 2. Comparisons with this country
    const comps = allPages.filter(p => p.pageType === 'comparison' && p.countryCodes && p.countryCodes.includes(currentPage.countryCode));
    comps.slice(0, 4).forEach(c => {
      links.push({ title: `${c.primaryKeyword}`, url: `${rel}${c.path}` });
    });
    // 3. Relevant ranking
    links.push({ title: 'Best Digital Nomad Tax Countries 2026', url: `${rel}best/digital-nomad-taxes/` });
    // 4. Interactive Calculator
    links.push({ title: 'Interactive Take Home Pay Calculator', url: `${rel}calculators/take-home-pay.html` });
  } else if (type === 'regime') {
    // 1. Country Hub
    const country = allPages.find(p => p.pageType === 'country' && p.countryCode === currentPage.countryCode);
    if (country) links.push({ title: `${REMOTAX_COUNTRIES[currentPage.countryCode].country} Tax Calculator Hub`, url: `${rel}${country.path}` });
    // 2. Peer regimes
    const peers = allPages.filter(p => p.pageType === 'regime' && p.slug !== slug);
    peers.slice(0, 2).forEach(r => {
      links.push({ title: r.primaryKeyword, url: `${rel}${r.path}` });
    });
    // 3. Comparisons
    const comps = allPages.filter(p => p.pageType === 'comparison' && p.countryCodes && p.countryCodes.includes(currentPage.countryCode));
    comps.slice(0, 2).forEach(c => {
      links.push({ title: c.primaryKeyword, url: `${rel}${c.path}` });
    });
    // 4. Rankings
    links.push({ title: 'Best Digital Nomad Tax Countries 2026', url: `${rel}best/digital-nomad-taxes/` });
  } else if (type === 'comparison') {
    const [c1, c2] = currentPage.countryCodes;
    const country1 = allPages.find(p => p.pageType === 'country' && p.countryCode === c1);
    const country2 = allPages.find(p => p.pageType === 'country' && p.countryCode === c2);
    if (country1) links.push({ title: `${REMOTAX_COUNTRIES[c1].country} Remote Tax Guide`, url: `${rel}${country1.path}` });
    if (country2) links.push({ title: `${REMOTAX_COUNTRIES[c2].country} Remote Tax Guide`, url: `${rel}${country2.path}` });
    const reg1 = allPages.find(p => p.pageType === 'regime' && p.countryCode === c1);
    const reg2 = allPages.find(p => p.pageType === 'regime' && p.countryCode === c2);
    if (reg1) links.push({ title: reg1.primaryKeyword, url: `${rel}${reg1.path}` });
    if (reg2) links.push({ title: reg2.primaryKeyword, url: `${rel}${reg2.path}` });
    links.push({ title: 'Best Digital Nomad Tax Countries 2026', url: `${rel}best/digital-nomad-taxes/` });
    links.push({ title: 'Interactive Take Home Pay Calculator', url: `${rel}calculators/take-home-pay.html` });
  } else if (type === 'ranking') {
    const hubs = allPages.filter(p => p.pageType === 'country');
    hubs.slice(0, 3).forEach(h => {
      links.push({ title: `${REMOTAX_COUNTRIES[h.countryCode].country} Remote Tax Calculator`, url: `${rel}${h.path}` });
    });
    const rankPeers = allPages.filter(p => p.pageType === 'ranking' && p.slug !== slug);
    rankPeers.slice(0, 2).forEach(r => {
      links.push({ title: r.primaryKeyword, url: `${rel}${r.path}` });
    });
    links.push({ title: 'Tax Calculation Methodology', url: `${rel}methodology/` });
  } else {
    // Methodology
    const hubs = allPages.filter(p => p.pageType === 'country');
    hubs.slice(0, 5).forEach(h => {
      links.push({ title: `${REMOTAX_COUNTRIES[h.countryCode].country} Tax Calculator`, url: `${rel}${h.path}` });
    });
    links.push({ title: 'Best Digital Nomad Tax Countries 2026', url: `${rel}best/digital-nomad-taxes/` });
  }

  return links.slice(0, 6);
}

// Shell Layout Generator
function renderLayout({ page, content, bodyHtml, rel, canonicalUrl }) {
  const robotsMeta = config.INDEXING
    ? '<meta name="robots" content="index,follow">'
    : '<meta name="robots" content="noindex,follow">\n    <meta name="googlebot" content="noindex,follow">';

  // Breadcrumbs items
  const breadcrumbItems = [{ name: 'Home', url: config.BASE_URL }];
  if (page.pageType === 'country') {
    breadcrumbItems.push({ name: 'Countries', url: `${config.BASE_URL}destinations.html` });
    breadcrumbItems.push({ name: REMOTAX_COUNTRIES[page.countryCode].country, url: canonicalUrl });
  } else if (page.pageType === 'regime') {
    breadcrumbItems.push({ name: 'Special Regimes', url: `${config.BASE_URL}destinations.html` });
    breadcrumbItems.push({ name: content.h1, url: canonicalUrl });
  } else if (page.pageType === 'comparison') {
    breadcrumbItems.push({ name: 'Comparisons', url: `${config.BASE_URL}comparisons/spain-vs-portugal/` });
    breadcrumbItems.push({ name: content.h1, url: canonicalUrl });
  } else if (page.pageType === 'ranking') {
    breadcrumbItems.push({ name: 'Rankings', url: `${config.BASE_URL}best/digital-nomad-taxes/` });
    breadcrumbItems.push({ name: content.h1, url: canonicalUrl });
  } else {
    breadcrumbItems.push({ name: 'Methodology', url: canonicalUrl });
  }

  // BreadcrumbList JSON-LD
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems.map((item, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  // Organization JSON-LD
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": config.SITE_NAME,
    "url": config.BASE_URL,
    "logo": `${config.BASE_URL}assets/brand/mark.svg`
  };

  // WebApplication JSON-LD (for calculators, hubs, comparisons, rankings)
  let webAppSchema = null;
  if (['country', 'comparison', 'ranking'].includes(page.pageType)) {
    webAppSchema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": `Remotax ${content.h1}`,
      "url": canonicalUrl,
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "description": content.metaDescription
    };
  }

  // FAQPage JSON-LD (strictly matching visible FAQ items)
  let faqSchema = null;
  if (content.faqs && content.faqs.length > 0) {
    faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": content.faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.a
        }
      }))
    };
  }

  // Breadcrumbs UI HTML
  const breadcrumbHtml = `
        <nav class="breadcrumb-nav" aria-label="Breadcrumbs">
            <a href="${rel}index.html">Home</a>
            ${breadcrumbItems.slice(1, -1).map(b => `<span class="breadcrumb-sep">/</span><a href="${b.url}">${escapeHTML(b.name)}</a>`).join('')}
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-current">${escapeHTML(breadcrumbItems[breadcrumbItems.length - 1].name)}</span>
        </nav>`;

  // Related Links HTML
  const relatedLinks = getRelatedLinks(page, activeSeoPages, rel);
  const relatedLinksHtml = `
        <section class="glass-panel" style="margin-top: 3.5rem; padding: 2.25rem 2rem;">
            <h2>Related Tax Regimes & Comparisons</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-top: 1.25rem;">
                ${relatedLinks.map(l => `
                <a href="${l.url}" class="glass-card" style="padding: 1.15rem 1.25rem; display: flex; align-items: center; justify-content: space-between; text-decoration: none; color: inherit; transition: border-color 0.2s ease;">
                    <span style="font-weight: 500; font-size: 0.92rem; color: #fff;">${escapeHTML(l.title)}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="color: var(--color-tax); min-width: 16px;"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </a>`).join('')}
            </div>
        </section>`;

  // Editorial Byline & Disclaimer Card
  const editorialCardHtml = `
        <section class="glass-panel" style="margin-top: 2.5rem; padding: 1.75rem 2rem; border-left: 3px solid var(--color-tax);">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; color: var(--color-tax); font-weight: 700; font-size: 0.85rem;">RT</div>
                    <div>
                        <div style="font-weight: 600; font-size: 0.95rem; color: #fff;">Authored by ${escapeHTML(config.AUTHOR)}</div>
                        <div style="font-size: 0.82rem; color: var(--color-text-secondary);"><a href="${rel}methodology/" style="color: var(--color-tax); text-decoration: underline;">Review our Calculation Methodology</a> • Updated for Tax Year 2026</div>
                    </div>
                </div>
            </div>
            <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 1.25rem; margin-bottom: 0; line-height: 1.6;">
                <strong>Statutory Notice & Disclaimer:</strong> Remotax is an independent financial technology intelligence platform. Calculations and simulations are for preliminary educational benchmarking only and do not constitute formal legal, accounting, or tax advice. Consult a certified cross-border tax specialist in your destination jurisdiction before executing international tax or relocation actions.
            </p>
        </section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(content.metaTitle)}</title>
    <meta name="description" content="${escapeHTML(content.metaDescription)}">
    <meta name="keywords" content="${escapeHTML(page.secondaryKeywords ? page.secondaryKeywords.join(', ') : page.primaryKeyword)}">
    <meta name="author" content="${escapeHTML(config.AUTHOR)}">
    
    <link rel="canonical" href="${canonicalUrl}">
    ${robotsMeta}
    
    <!-- Favicon & Brand Icons -->
    <link rel="icon" href="${rel}assets/brand/favicon.svg" type="image/svg+xml">
    <link rel="alternate icon" href="${rel}assets/brand/favicon.ico">
    <link rel="apple-touch-icon" href="${rel}assets/brand/apple-touch-icon.png">
    <meta name="theme-color" content="#070B0F">
    <link rel="manifest" href="${rel}manifest.webmanifest">
    
    <!-- Open Graph & Social Cards -->
    <meta property="og:title" content="${escapeHTML(content.metaTitle)}">
    <meta property="og:description" content="${escapeHTML(content.metaDescription)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:image" content="${config.BASE_URL}assets/brand/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${config.BASE_URL}assets/brand/og-image.png">
    
    <!-- Structured Data JSON-LD -->
    <script type="application/ld+json">
    ${JSON.stringify(breadcrumbSchema, null, 2)}
    </script>
    <script type="application/ld+json">
    ${JSON.stringify(orgSchema, null, 2)}
    </script>
    ${webAppSchema ? `<script type="application/ld+json">\n    ${JSON.stringify(webAppSchema, null, 2)}\n    </script>` : ''}
    ${faqSchema ? `<script type="application/ld+json">\n    ${JSON.stringify(faqSchema, null, 2)}\n    </script>` : ''}

    <!-- Critical Font Preload (Depth <= 2, Zero CLS) -->
    <link rel="preload" href="${rel}fonts/instrument-serif-italic.woff2" as="font" type="font/woff2" crossorigin>
    
    <!-- Anti-White-Flash & Master Liquid Glass Stylesheet -->
    <style>html{background:#070B0F;color-scheme:dark;}</style>
    <link rel="stylesheet" href="${rel}css/remotax.min.css?v=4.5.0">
</head>
<body>
    <a href="#main-content" class="skip-to-content">Skip to main content</a>

    <div class="noise-overlay" aria-hidden="true"></div>
    <div class="horizon-ambiance" aria-hidden="true"><div class="horizon-sun" style="transform: translateX(-50%) translateY(25px);"></div></div>

    <!-- Floating Glass Navbar -->
    <header class="navbar-floating">
        <nav class="nav-pill">
            <a href="${rel}index.html" class="nav-brand">
                <div class="nav-brand-mark">
                    <img src="${rel}assets/brand/mark.svg" width="40" height="40" alt="" aria-hidden="true">
                </div>
                <span class="nav-brand-title"><span>Remo</span><span class="brand-tax">tax</span></span>
                <span class="nav-brand-tag">2026</span>
            </a>

            <ul class="nav-menu">
                <li><a href="${rel}calculator.html" class="nav-link">Calculator</a></li>
                <li><a href="${rel}calculators/take-home-pay.html" class="nav-link">Take Home</a></li>
                <li><a href="${rel}calculators/freelancer-tax.html" class="nav-link">Freelancer</a></li>
                <li><a href="${rel}comparisons/spain-vs-portugal/" class="nav-link">Comparisons</a></li>
                <li><a href="${rel}destinations.html" class="nav-link">Destinations</a></li>
                <li><a href="${rel}blog.html" class="nav-link">Blog</a></li>
                <li><a href="${rel}faq.html" class="nav-link">FAQ</a></li>
            </ul>

            <div class="nav-actions">
                <a href="${rel}quiz.html" class="btn-primary nav-cta">Find Match</a>
                <button type="button" class="nav-mobile-toggle" id="mobile-menu-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-drawer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            </div>
        </nav>
    </header>

    <!-- Mobile Drawer / Full-Screen Glass Sheet -->
    <div class="mobile-drawer" id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Site navigation" aria-hidden="true" inert>
        <div class="mobile-drawer-sheet">
            <div class="mobile-drawer-header">
                <a href="${rel}index.html" style="display: flex; align-items: center; gap: 8px; text-decoration: none;" aria-label="Remotax">
                    <div class="nav-brand-mark" style="width: 28px; height: 28px; min-width: 28px; min-height: 28px;">
                        <img src="${rel}assets/brand/mark.svg" width="28" height="28" alt="" aria-hidden="true">
                    </div>
                    <span class="nav-brand-title" style="font-size: 1.05rem;"><span>Remo</span><span class="brand-tax">tax</span></span>
                </a>
                <button type="button" id="mobile-drawer-close" class="btn-glass mobile-drawer-close-btn" aria-label="Close navigation menu">Close</button>
            </div>
            <div class="mobile-nav-links">
                <a href="${rel}calculator.html" class="mobile-nav-link"><span>Tax Calculator</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></a>
                <a href="${rel}calculators/take-home-pay.html" class="mobile-nav-link"><span>Take Home Pay</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></a>
                <a href="${rel}calculators/freelancer-tax.html" class="mobile-nav-link"><span>Freelancer Tax</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></a>
                <a href="${rel}comparisons/spain-vs-portugal/" class="mobile-nav-link"><span>Spain vs Portugal</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></a>
                <a href="${rel}destinations.html" class="mobile-nav-link"><span>Destinations Directory</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></a>
                <a href="${rel}blog.html" class="mobile-nav-link"><span>Tax Guides & Blog</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></a>
                <a href="${rel}faq.html" class="mobile-nav-link"><span>Tax Residency FAQ</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></a>
            </div>
            <div class="mobile-drawer-footer">
                <a href="${rel}quiz.html" class="btn-primary" style="width: 100%; justify-content: center; text-decoration: none;">Take Tax Strategy Quiz</a>
            </div>
        </div>
    </div>

    <!-- Main Content Container -->
    <main id="main-content" class="container">
        ${breadcrumbHtml}
        ${bodyHtml}
        ${relatedLinksHtml}
        ${editorialCardHtml}
    </main>

    <!-- Unified Liquid Glass Footer -->
    <footer class="footer-unified">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand-col">
                    <a href="${rel}index.html" class="nav-brand" style="padding: 0; text-decoration: none;">
                        <div class="nav-brand-mark" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px;">
                            <img src="${rel}assets/brand/mark.svg" width="32" height="32" alt="" aria-hidden="true">
                        </div>
                        <span class="nav-brand-title" style="font-size: 1.15rem;"><span>Remo</span><span class="brand-tax">tax</span></span>
                        <span class="nav-brand-tag">2026</span>
                    </a>
                    <p>Global Remote Work Financial Intelligence Platform. Precision cross-border tax, net pay, and relocation intelligence.</p>
                    <div class="footer-status-badge">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-net);"></span>
                        Tax Year 2026 Statutory Engine
                    </div>
                </div>

                <div class="footer-col">
                    <div class="footer-heading">Calculators</div>
                    <ul class="footer-links-list">
                        <li><a href="${rel}calculators/take-home-pay.html">Take Home Pay</a></li>
                        <li><a href="${rel}calculators/freelancer-tax.html">Freelancer Tax</a></li>
                        <li><a href="${rel}comparisons/spain-vs-portugal/">Spain vs Portugal</a></li>
                        <li><a href="${rel}best/digital-nomad-taxes/">Best Nomad Taxes</a></li>
                        <li><a href="${rel}comparisons/spain-vs-italy/">Spain vs Italy</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <div class="footer-heading">Country Engines</div>
                    <ul class="footer-links-list">
                        <li><a href="${rel}countries/spain/">Spain Beckham Law</a></li>
                        <li><a href="${rel}countries/portugal/">Portugal IFICI</a></li>
                        <li><a href="${rel}countries/uae/">Dubai (UAE) 0% Income Tax</a></li>
                        <li><a href="${rel}countries/italy/">Italy Regime Impatriati</a></li>
                        <li><a href="${rel}countries/thailand/">Thailand DTV Visa</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <div class="footer-heading">Transparency & Legal</div>
                    <ul class="footer-links-list">
                        <li><a href="${rel}methodology/">Calculation Methodology</a></li>
                        <li><a href="${rel}faq.html">Tax Residency FAQ</a></li>
                        <li><a href="${rel}destinations.html">Destinations Directory</a></li>
                        <li><a href="${rel}privacy.html">Privacy Policy</a></li>
                        <li><a href="${rel}terms.html">Terms of Service</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-bottom-bar">
                <div>© 2026 Remotax. All rights reserved. Global Remote Work Financial Intelligence Platform.</div>
                <div style="font-family: var(--font-mono); font-size: 0.8rem;">Statutory Sources: AEAT • AT • FTA • MEF • INPS • RD Thailand</div>
            </div>
        </div>
    </footer>

    <!-- Core Architecture: Data & Pure Engine -->
    <script src="${rel}data/countries.min.js?v=4.0.0" defer></script>
    <script src="${rel}engine/taxEngine.min.js?v=4.0.0" defer></script>
    <!-- Liquid Glass UI Controller -->
    <script src="${rel}app.min.js?v=4.0.0" defer></script>
    <script src="${rel}js/nav.min.js?v=4.0.0" defer></script>
</body>
</html>`;
}

// 1. Country Hub Body Renderer
function renderCountryHub({ page, content, country, rel }) {
  const livingCostEUR = country.livingCostEUR || country.livingCost;
  const tableRows = SALARY_TIERS.map(gross => {
    const emp = taxEngine.calculateTax({ grossIncome: gross, countryCode: page.countryCode, workerType: 'employee', useSpecialRegime: false });
    const empReg = taxEngine.calculateTax({ grossIncome: gross, countryCode: page.countryCode, workerType: 'employee', useSpecialRegime: true });
    const con = taxEngine.calculateTax({ grossIncome: gross, countryCode: page.countryCode, workerType: 'contractor', useSpecialRegime: false });
    const leftoverEmp = emp.netMonthly - livingCostEUR;
    const leftoverReg = empReg.netMonthly - livingCostEUR;

    return {
      gross,
      emp,
      empReg,
      con,
      leftoverEmp,
      leftoverReg
    };
  });

  const bench = tableRows.find(r => r.gross === 100000);
  const maxSS = country.socialSecurity.employeeRate === 0 && country.socialSecurity.contractorRate === 0
    ? '€0 (Zero SS)'
    : country.socialSecurity.employeeMaxAnnual
      ? `€${Math.round(country.socialSecurity.employeeMaxAnnual).toLocaleString('en-US')} / yr`
      : page.countryCode === 'PT' ? '11% Uncapped' : '0%';

  const statusBadgeText = computeVerificationBadge(page);

  const hasSpecialRegime = country.regimes && country.regimes.length > 0 && country.regimes[0].id !== 'th_offshore_unremitted';

  const faqsHtml = content.faqs.map(f => `
        <div class="faq-item glass-card" style="margin-bottom: 0.85rem; padding: 1.25rem 1.5rem;">
            <div class="faq-question" style="font-weight: 600; font-size: 1.05rem; color: #fff; display: flex; align-items: center; justify-content: space-between;">
                <span>${escapeHTML(f.q)}</span>
            </div>
            <div class="faq-answer" style="margin-top: 0.75rem; color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.65;">
                <p style="margin: 0;">${escapeHTML(f.a)}</p>
            </div>
        </div>`).join('');

  return `
    <header class="article-hero-header" style="text-align: left; margin-top: 1.5rem; margin-bottom: 2.5rem;">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
            <span class="country-code-badge">${escapeHTML(country.countryCode)}</span>
            <span class="footer-status-badge"><span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-net);"></span>${escapeHTML(content.heroBadge)}</span>
            <span class="footer-status-badge">${statusBadgeText}</span>
        </div>
        <h1>${escapeHTML(content.h1)}</h1>
        <p style="font-size: 1.15rem; color: var(--color-text-secondary); line-height: 1.7; max-width: 850px; margin-top: 1rem;">
            ${escapeHTML(content.intro)}
        </p>
    </header>

    <!-- Key Metrics Stat Callout Grid -->
    <div class="stat-callout-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 3rem;">
        <div class="stat-callout-card glass-card" style="padding: 1.25rem;">
            <div class="stat-callout-label" style="font-size: 0.82rem; color: var(--color-text-secondary); text-transform: uppercase; font-family: var(--font-mono);">Effective Tax (€100k)</div>
            <div class="stat-callout-num" style="font-size: 1.85rem; font-weight: 700; color: var(--color-net); margin-top: 0.35rem;">${bench.emp.effectiveTaxRate}%</div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">Standard Employee</div>
        </div>
        ${hasSpecialRegime ? `
        <div class="stat-callout-card glass-card" style="padding: 1.25rem;">
            <div class="stat-callout-label" style="font-size: 0.82rem; color: var(--color-text-secondary); text-transform: uppercase; font-family: var(--font-mono);">Special Regime Rate</div>
            <div class="stat-callout-num" style="font-size: 1.85rem; font-weight: 700; color: var(--color-tax); margin-top: 0.35rem;">${bench.empReg.effectiveTaxRate}%</div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">${escapeHTML(country.regimes[0].name.split('(')[0].trim())}</div>
        </div>` : ''}
        <div class="stat-callout-card glass-card" style="padding: 1.25rem;">
            <div class="stat-callout-label" style="font-size: 0.82rem; color: var(--color-text-secondary); text-transform: uppercase; font-family: var(--font-mono);">Employee SS Ceiling</div>
            <div class="stat-callout-num" style="font-size: 1.85rem; font-weight: 700; color: #fff; margin-top: 0.35rem;">${maxSS}</div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">Statutory Annual Cap</div>
        </div>
        <div class="stat-callout-card glass-card" style="padding: 1.25rem;">
            <div class="stat-callout-label" style="font-size: 0.82rem; color: var(--color-text-secondary); text-transform: uppercase; font-family: var(--font-mono);">Living Cost (${escapeHTML(country.city)})</div>
            <div class="stat-callout-num" style="font-size: 1.85rem; font-weight: 700; color: #fff; margin-top: 0.35rem;">${country.currency === 'EUR' ? `${formatEUR(country.livingCost)} / mo` : `${country.currency === 'THB' ? '฿' : '$'}${country.livingCost.toLocaleString('en-US')} (~${formatEUR(livingCostEUR)}) / mo`}</div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">Baseline Single Expat</div>
        </div>
        <div class="stat-callout-card glass-card" style="padding: 1.25rem;">
            <div class="stat-callout-label" style="font-size: 0.82rem; color: var(--color-text-secondary); text-transform: uppercase; font-family: var(--font-mono);">Disposable Leftover (€100k)</div>
            <div class="stat-callout-num" style="font-size: 1.85rem; font-weight: 700; color: var(--color-net); margin-top: 0.35rem;">${formatEUR(bench.leftoverEmp)} / mo</div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">Net Savings Margin</div>
        </div>
    </div>

    <!-- Embedded Interactive Calculator Widget -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Interactive ${escapeHTML(country.country)} Tax Simulator</h2>
        <p style="margin-top: 0.5rem; margin-bottom: 2rem;">Simulate real-time net take-home salary, income tax brackets, and social contributions for 2026.</p>
        
        <div class="app-layout" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
            <div class="calculator-card glass-card" style="padding: 2rem;">
                <form id="tax-form" onsubmit="return false;">
                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label for="currency-select" style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">Input Currency</label>
                        <select id="currency-select" class="form-select" style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.15);">
                            <option value="EUR" selected>EUR (€) - European Single Basis</option>
                            <option value="USD">USD ($) - US Dollar</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label for="country-select" style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">Tax Jurisdiction</label>
                        <select id="country-select" class="form-select" style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.15);">
                            <option value="${country.countryCode}" selected>${escapeHTML(country.country)}</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label for="income-input" id="income-label" style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">Annual Gross Compensation (EUR €)</label>
                        <input type="number" id="income-input" class="form-input" value="100000" min="5000" max="1000000" step="5000" style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.15);">
                        <input type="range" id="income-slider" class="glass-slider" min="10000" max="300000" step="5000" value="100000" style="width: 100%; margin-top: 0.75rem;" aria-label="Annual income slider">
                    </div>

                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <span style="display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">Worker Classification</span>
                        <div style="display: flex; gap: 0.75rem;">
                            <label style="flex: 1; padding: 0.75rem; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="radio" name="worker-type" value="employee" checked id="worker-employee"> <span>Employee</span>
                            </label>
                            <label style="flex: 1; padding: 0.75rem; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="radio" name="worker-type" value="contractor" id="worker-contractor"> <span>Contractor</span>
                            </label>
                        </div>
                    </div>

                    ${country.regimes && country.regimes.length > 0 ? `
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.65rem; cursor: pointer;">
                            <input type="checkbox" id="regime-toggle" ${page.countryCode === 'TH' ? '' : 'checked'}>
                            <span style="font-size: 0.92rem; font-weight: 500;">Apply ${escapeHTML(country.regimes[0].name)}</span>
                        </label>
                    </div>` : ''}
                </form>
            </div>

            <div class="output-hero-card glass-card" style="padding: 2rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.85rem; color: var(--color-text-secondary); text-transform: uppercase; font-family: var(--font-mono);">Estimated Monthly Take-Home</div>
                    <div id="output-net-monthly" style="font-size: 3rem; font-weight: 800; color: var(--color-net); margin: 0.5rem 0;">${formatEUR(bench.emp.netMonthly)}</div>
                    <div style="font-size: 0.95rem; color: var(--color-text-secondary);">Annual Net: <span id="output-net-annual" style="color: #fff; font-weight: 600;">${formatEUR(bench.emp.netAnnual)}</span></div>
                </div>

                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem; margin-top: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Income Tax</div>
                        <div id="output-tax-annual" style="font-size: 1.25rem; font-weight: 700; color: var(--color-tax);">${formatEUR(bench.emp.incomeTax)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Social Security</div>
                        <div id="output-ss-annual" style="font-size: 1.25rem; font-weight: 700; color: #fff;">${formatEUR(bench.emp.socialSecurity)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Effective Tax Rate</div>
                        <div id="output-effective-rate" style="font-size: 1.25rem; font-weight: 700; color: var(--color-tax);">${bench.emp.effectiveTaxRate}%</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Monthly Rent & Living</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #fff;">${country.currency === 'EUR' ? formatEUR(country.livingCost) : `${country.currency === 'THB' ? '฿' : '$'}${country.livingCost.toLocaleString('en-US')} (~${formatEUR(livingCostEUR)})`}</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Build-Time Pre-Computed Salary Table -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>2026 Net Salary & Tax Breakdown Table</h2>
        <p style="margin-top: 0.5rem; margin-bottom: 1.5rem;">
            Static statutory benchmark across standard salary bands for ${escapeHTML(country.country)}. All calculations incorporate 2026 tax tables, standard allowances, and mandatory social security ceilings.
        </p>

        <div class="table-responsive" style="overflow-x: auto;">
            <table class="data-table-glass" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr>
                        <th style="padding: 1rem;">Gross Salary</th>
                        <th style="padding: 1rem;">Income Tax</th>
                        <th style="padding: 1rem;">Social Security</th>
                        <th style="padding: 1rem;">Net Annual</th>
                        <th style="padding: 1rem;">Net Monthly</th>
                        <th style="padding: 1rem;">Effective Rate</th>
                        ${hasSpecialRegime ? `<th style="padding: 1rem;">Special Regime Net</th>` : ''}
                        <th style="padding: 1rem;">Monthly Savings Leftover</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows.map(row => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <td style="padding: 1rem; font-weight: 700; font-family: var(--font-mono); color: #fff;">${formatEUR(row.gross)}</td>
                        <td style="padding: 1rem; color: var(--color-tax);">${formatEUR(row.emp.incomeTax)}</td>
                        <td style="padding: 1rem; color: var(--color-text-secondary);">${formatEUR(row.emp.socialSecurity)}</td>
                        <td style="padding: 1rem; font-weight: 600; color: #fff;">${formatEUR(row.emp.netAnnual)}</td>
                        <td style="padding: 1rem; font-weight: 600; color: var(--color-net);">${formatEUR(row.emp.netMonthly)}</td>
                        <td style="padding: 1rem;"><span class="badge-effective-tax">${row.emp.effectiveTaxRate}%</span></td>
                        ${hasSpecialRegime ? `<td style="padding: 1rem; color: var(--color-tax); font-weight: 600;">${formatEUR(row.empReg.netAnnual)}</td>` : ''}
                        <td style="padding: 1rem; color: ${row.leftoverEmp > 0 ? 'var(--color-net)' : 'var(--color-tax)'}; font-weight: 600;">${formatEUR(row.leftoverEmp)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
        ${page.countryCode === 'TH' ? `
        <div class="callout-box" style="margin-top: 1.5rem;">
            <div class="callout-title">Statutory Note on Thailand 0% Offshore Scenario</div>
            <p style="margin: 0; font-size: 0.92rem;">
                Under Thai Revenue Department Instructions Por. 161/2566 & 162/2566, the table above models assessable remitted income. If your earnings remain strictly in overseas accounts and are never transferred, withdrawn, or spent in Thailand, Thai personal income tax liability is 0.00%.
            </p>
        </div>` : ''}
    </section>

    <!-- Detailed Statutory Analysis Sections -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Statutory Tax System Overview (2026)</h2>
        <p style="margin-top: 1rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.taxSystemOverview)}</p>
        
        <h3 style="margin-top: 2rem;">Social Security & Mandatory Deductions</h3>
        <p style="margin-top: 0.75rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.socialSecurityAnalysis)}</p>

        <h3 style="margin-top: 2rem;">Special Expatriate Tax Regimes</h3>
        <p style="margin-top: 0.75rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.specialRegimeSummary)}</p>

        <h3 style="margin-top: 2rem;">Cost of Living & Purchasing Power in ${escapeHTML(country.city)}</h3>
        <p style="margin-top: 0.75rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.costOfLivingAnalysis)}</p>
    </section>

    <!-- Exclusions and Model Limitations Box -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2rem 2.25rem;">
        <h2>What This Statutory Estimate Does Not Include</h2>
        <div class="callout-box" style="margin-top: 1rem;">
            <div class="callout-title">Documented Exclusions & Edge Cases (from modelNotes)</div>
            <p style="font-size: 0.95rem; line-height: 1.7; margin: 0; color: #fff;">
                ${escapeHTML(content.whatEstimateExcludes)}
            </p>
        </div>
    </section>

    <!-- Statutory Sources & Regulatory Authority -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2rem 2.25rem;">
        <h2>Statutory Sources & Regulatory Authority</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
            ${country.sources.filter(s => !s.url.includes('methodology')).map(s => `
            <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="glass-card" style="padding: 1.25rem; text-decoration: none; color: inherit; display: block; border-left: 3px solid var(--color-tax);">
                <div style="font-size: 0.8rem; color: var(--color-tax); text-transform: uppercase; font-family: var(--font-mono);">${escapeHTML(s.org || 'Official Authority')}</div>
                <div style="font-weight: 600; font-size: 0.95rem; color: #fff; margin-top: 0.35rem;">${escapeHTML(s.title)}</div>
                <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">
                    <span>Visit official government document</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </div>
            </a>`).join('')}
        </div>

        ${country.sources.find(s => s.url.includes('methodology')) ? `
        <div style="margin-top: 2rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem;">
            <div style="font-size: 0.82rem; font-weight: 600; color: #fbbf24; margin-bottom: 0.75rem; text-transform: uppercase; font-family: var(--font-mono);">Cost of Living Benchmark • Remotax Research</div>
            <a href="${rel}methodology/#living-costs" class="glass-card" style="padding: 1.25rem; text-decoration: none; color: inherit; display: block; border-left: 3px solid #fbbf24;">
                <div style="font-size: 0.8rem; color: #fbbf24; text-transform: uppercase; font-family: var(--font-mono);">${escapeHTML(country.sources.find(s => s.url.includes('methodology')).org || 'Remotax Research')}</div>
                <div style="font-weight: 600; font-size: 0.95rem; color: #fff; margin-top: 0.35rem;">${escapeHTML(country.sources.find(s => s.url.includes('methodology')).title)}</div>
                <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: #fbbf24;">Remotax estimate (see methodology)</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </a>
        </div>` : ''}
    </section>

    <!-- Verified FAQs -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Frequently Asked Questions: ${escapeHTML(country.country)} Taxes (2026)</h2>
        <div class="faq-accordion" style="margin-top: 1.5rem;">
            ${faqsHtml}
        </div>
    </section>`;
}

// 2. Regime Page Body Renderer
function renderRegimePage({ page, content, country, rel }) {
  const calcTiers = [50000, 100000, 150000];
  const tableRows = calcTiers.map(gross => {
    const std = taxEngine.calculateTax({ grossIncome: gross, countryCode: page.countryCode, workerType: 'employee', useSpecialRegime: false });
    const reg = taxEngine.calculateTax({ grossIncome: gross, countryCode: page.countryCode, workerType: 'employee', useSpecialRegime: true });
    const savings = reg.netAnnual - std.netAnnual;

    return {
      gross,
      std,
      reg,
      savings
    };
  });

  const faqsHtml = content.faqs.map(f => `
        <div class="faq-item glass-card" style="margin-bottom: 0.85rem; padding: 1.25rem 1.5rem;">
            <div class="faq-question" style="font-weight: 600; font-size: 1.05rem; color: #fff;">
                <span>${escapeHTML(f.q)}</span>
            </div>
            <div class="faq-answer" style="margin-top: 0.75rem; color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.65;">
                <p style="margin: 0;">${escapeHTML(f.a)}</p>
            </div>
        </div>`).join('');

  const statusBadgeText = computeVerificationBadge(page);

  return `
    <header class="article-hero-header" style="text-align: left; margin-top: 1.5rem; margin-bottom: 2.5rem;">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
            <span class="country-code-badge">${escapeHTML(country.countryCode)}</span>
            <span class="footer-status-badge"><span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-net);"></span>${escapeHTML(content.heroBadge)}</span>
            <span class="footer-status-badge">${statusBadgeText}</span>
        </div>
        <h1>${escapeHTML(content.h1)}</h1>
        <p style="font-size: 1.15rem; color: var(--color-text-secondary); line-height: 1.7; max-width: 850px; margin-top: 1rem;">
            ${escapeHTML(content.intro)}
        </p>
    </header>

    <!-- Statutory Checklist -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Statutory Eligibility Checklist (2026)</h2>
        <p style="color: var(--color-text-secondary); margin-top: 0.5rem; margin-bottom: 1.5rem;">
            To successfully qualify for ${escapeHTML(content.h1)}, applicants must meet all mandatory statutory conditions codified in legislation:
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${content.eligibilityChecklist.map((item, i) => `
            <div class="glass-card" style="padding: 1.15rem 1.35rem; display: flex; align-items: flex-start; gap: 0.85rem;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(56, 189, 248, 0.2); color: var(--color-tax); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; min-width: 24px; margin-top: 2px;">${i + 1}</div>
                <div style="font-size: 0.95rem; color: #fff; line-height: 1.6;">${escapeHTML(item)}</div>
            </div>`).join('')}
        </div>
    </section>

    <!-- Net Pay Comparison Table: With vs Without Regime -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Net Pay Comparison: Standard vs Special Regime</h2>
        <p style="color: var(--color-text-secondary); margin-top: 0.5rem; margin-bottom: 1.5rem;">
            Direct financial modeling comparing standard progressive tax against the special regime at €50,000, €100,000, and €150,000 annual compensation:
        </p>
        <div class="table-responsive" style="overflow-x: auto;">
            <table class="data-table-glass" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr>
                        <th style="padding: 1rem;">Gross Income</th>
                        <th style="padding: 1rem;">Standard Tax</th>
                        <th style="padding: 1rem;">Regime Tax</th>
                        <th style="padding: 1rem;">Social Security</th>
                        <th style="padding: 1rem;">Net Take-Home Pay</th>
                        <th style="padding: 1rem;">Annual Tax Savings</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows.map(row => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <td style="padding: 1rem; font-weight: 700; font-family: var(--font-mono); color: #fff;">${formatEUR(row.gross)}</td>
                        <td style="padding: 1rem; color: var(--color-tax);">${formatEUR(row.std.incomeTax)}</td>
                        <td style="padding: 1rem; color: var(--color-tax); font-weight: 600;">${formatEUR(row.reg.incomeTax)}</td>
                        <td style="padding: 1rem; color: var(--color-text-secondary);">${formatEUR(row.reg.socialSecurity)}</td>
                        <td style="padding: 1rem; font-weight: 700; color: var(--color-net);">${formatEUR(row.reg.netAnnual)}</td>
                        <td style="padding: 1rem; font-weight: 700; color: ${row.savings > 0 ? 'var(--color-net)' : 'var(--color-text-secondary)'};">
                            ${row.savings > 0 ? `+${formatEUR(row.savings)}` : formatEUR(row.savings)}
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
        ${country.socialSecurityStatus !== 'verified' ? `
        <div class="callout-box" style="margin-top: 1.5rem; border-color: rgba(245, 158, 11, 0.4);">
            <div class="callout-title" style="color: #fbbf24;">Estimate Disclosure: Social Security Modeling</div>
            <p style="font-size: 0.9rem; line-height: 1.6; margin: 0; color: #fff;">
                Social security contributions for ${escapeHTML(country.country)} are modelled as estimates based on published statutory schedules while official online verification is maintained.
            </p>
        </div>` : ''}
    </section>

    <!-- Who It Suits vs Who It Does Not Suit -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Candidate Suitability Analysis</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
            <div class="glass-card" style="padding: 1.75rem; border-top: 3px solid var(--color-net);">
                <div style="font-weight: 700; font-size: 1.15rem; color: var(--color-net); margin-bottom: 0.75rem;">Who It Suits</div>
                <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.7; margin: 0;">${escapeHTML(content.whoItSuits)}</p>
            </div>
            <div class="glass-card" style="padding: 1.75rem; border-top: 3px solid var(--color-tax);">
                <div style="font-weight: 700; font-size: 1.15rem; color: var(--color-tax); margin-bottom: 0.75rem;">Who It Does Not Suit</div>
                <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.7; margin: 0;">${escapeHTML(content.whoItDoesNotSuit)}</p>
            </div>
        </div>
    </section>

    <!-- Pitfalls and Traps -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2rem 2.25rem;">
        <h2>Common Statutory Pitfalls & Administrative Traps</h2>
        <div class="callout-box" style="margin-top: 1rem;">
            <div class="callout-title">Critical Compliance Warnings</div>
            <p style="font-size: 0.95rem; line-height: 1.7; margin: 0; color: #fff;">
                ${escapeHTML(content.commonPitfalls)}
            </p>
        </div>
    </section>

    <!-- Statutory Citations -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2rem 2.25rem;">
        <h2>Statutory Framework & Official Citations</h2>
        <p style="color: var(--color-text-secondary); line-height: 1.7; margin-top: 0.5rem; margin-bottom: 1.5rem;">
            ${escapeHTML(content.statutoryFramework)}
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            ${country.sources.filter(s => !s.url.includes('methodology')).map(s => `
            <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="glass-card" style="padding: 1.25rem; text-decoration: none; color: inherit; display: block; border-left: 3px solid var(--color-tax);">
                <div style="font-size: 0.8rem; color: var(--color-tax); text-transform: uppercase; font-family: var(--font-mono);">${escapeHTML(s.org || 'Official Authority')}</div>
                <div style="font-weight: 600; font-size: 0.95rem; color: #fff; margin-top: 0.35rem;">${escapeHTML(s.title)}</div>
                <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">
                    <span>Visit official government document</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </div>
            </a>`).join('')}
        </div>

        ${country.sources.find(s => s.url.includes('methodology')) ? `
        <div style="margin-top: 2rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem;">
            <div style="font-size: 0.82rem; font-weight: 600; color: #fbbf24; margin-bottom: 0.75rem; text-transform: uppercase; font-family: var(--font-mono);">Cost of Living Benchmark • Remotax Research</div>
            <a href="${rel}methodology/#living-costs" class="glass-card" style="padding: 1.25rem; text-decoration: none; color: inherit; display: block; border-left: 3px solid #fbbf24;">
                <div style="font-size: 0.8rem; color: #fbbf24; text-transform: uppercase; font-family: var(--font-mono);">${escapeHTML(country.sources.find(s => s.url.includes('methodology')).org || 'Remotax Research')}</div>
                <div style="font-weight: 600; font-size: 0.95rem; color: #fff; margin-top: 0.35rem;">${escapeHTML(country.sources.find(s => s.url.includes('methodology')).title)}</div>
                <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">
                    <span style="color: #fbbf24;">Remotax estimate (see methodology)</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </a>
        </div>` : ''}
    </section>

    <!-- FAQs -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Frequently Asked Questions: ${escapeHTML(content.h1)}</h2>
        <div class="faq-accordion" style="margin-top: 1.5rem;">
            ${faqsHtml}
        </div>
    </section>`;
}

// 3. Comparison Page Body Renderer
function renderComparisonPage({ page, content, countryA, countryB, rel }) {
  const codeA = page.countryCodes[0];
  const codeB = page.countryCodes[1];

  const hasSpecialA = ['ES', 'IT', 'PT'].includes(codeA);
  const hasSpecialB = ['ES', 'IT', 'PT'].includes(codeB);

  const regimeMeta = {
    ES: {
      standardTitle: 'Spain Standard IRPF',
      standardDesc: 'Progressive scale (19%–47%)',
      specialTitle: 'Spain Beckham Law',
      specialDesc: 'Only if you qualify* (24% flat)',
      contractorLabel: 'Spain Contractor<br><span style="font-size:0.75rem;font-weight:normal;color:var(--color-text-secondary)">Standard IRPF + min autónomo cuota</span>'
    },
    PT: {
      standardTitle: 'Portugal Standard IRS',
      standardDesc: 'Progressive scale (12.5%–48%)',
      specialTitle: 'Portugal IFICI',
      specialDesc: 'Only if you qualify* (20% flat)',
      contractorLabel: 'Portugal Contractor<br><span style="font-size:0.75rem;font-weight:normal;color:var(--color-text-secondary)">Simplified Regime (75% coef)</span>'
    },
    IT: {
      standardTitle: 'Italy Standard IRPEF',
      standardDesc: 'Progressive scale (23%–43%)',
      specialTitle: 'Italy Impatriati',
      specialDesc: 'Only if you qualify* (50% exempt)',
      contractorLabel: 'Italy Contractor<br><span style="font-size:0.75rem;font-weight:normal;color:var(--color-text-secondary)">Gestione Separata (26.07%)</span>'
    },
    AE: {
      standardTitle: 'UAE Standard',
      standardDesc: '0% Personal Income Tax',
      specialTitle: null,
      specialDesc: null,
      contractorLabel: 'UAE Contractor<br><span style="font-size:0.75rem;font-weight:normal;color:var(--color-text-secondary)">0% PIT / CT Exempt</span>'
    },
    TH: {
      standardTitle: 'Thailand Remitted PIT',
      standardDesc: 'Progressive scale (0%–35%)',
      specialTitle: null,
      specialDesc: null,
      contractorLabel: 'Thailand Contractor<br><span style="font-size:0.75rem;font-weight:normal;color:var(--color-text-secondary)">Standard PIT (0%–35%)</span>'
    }
  };

  const compIncomes = [50000, 100000, 150000];
  const compRows = compIncomes.map(gross => {
    const empStdA = taxEngine.calculateTax({ grossIncome: gross, countryCode: codeA, workerType: 'employee', useSpecialRegime: false });
    const empStdB = taxEngine.calculateTax({ grossIncome: gross, countryCode: codeB, workerType: 'employee', useSpecialRegime: false });
    const empRegA = hasSpecialA ? taxEngine.calculateTax({ grossIncome: gross, countryCode: codeA, workerType: 'employee', useSpecialRegime: true }) : null;
    const empRegB = hasSpecialB ? taxEngine.calculateTax({ grossIncome: gross, countryCode: codeB, workerType: 'employee', useSpecialRegime: true }) : null;
    const conA = taxEngine.calculateTax({ grossIncome: gross, countryCode: codeA, workerType: 'contractor', useSpecialRegime: false });
    const conB = taxEngine.calculateTax({ grossIncome: gross, countryCode: codeB, workerType: 'contractor', useSpecialRegime: false });

    const deltaStd = empStdA.netAnnual - empStdB.netAnnual;
    const deltaReg = (hasSpecialA && hasSpecialB) ? empRegA.netAnnual - empRegB.netAnnual : null;

    return {
      gross,
      empStdA, empStdB,
      empRegA, empRegB,
      conA, conB,
      deltaStd,
      deltaReg
    };
  });

  const faqsHtml = content.faqs.map(f => `
        <div class="faq-item glass-card" style="margin-bottom: 0.85rem; padding: 1.25rem 1.5rem;">
            <div class="faq-question" style="font-weight: 600; font-size: 1.05rem; color: #fff;">
                <span>${escapeHTML(f.q)}</span>
            </div>
            <div class="faq-answer" style="margin-top: 0.75rem; color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.65;">
                <p style="margin: 0;">${escapeHTML(f.a)}</p>
            </div>
        </div>`).join('');

  return `
    <header class="article-hero-header" style="text-align: left; margin-top: 1.5rem; margin-bottom: 2.5rem;">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
            <span class="country-code-badge">${escapeHTML(countryA.countryCode)} vs ${escapeHTML(countryB.countryCode)}</span>
            <span class="footer-status-badge"><span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-net);"></span>${escapeHTML(content.heroBadge || 'Bilateral Tax Comparison 2026')}</span>
            <span class="footer-status-badge">${computeVerificationBadge(page)}</span>
        </div>
        <h1>${escapeHTML(content.h1)}</h1>
        <p style="font-size: 1.15rem; color: var(--color-text-secondary); line-height: 1.7; max-width: 850px; margin-top: 1rem;">
            ${escapeHTML(content.intro)}
        </p>
    </header>

    <!-- Side-by-Side Living Cost Snapshot -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Living Cost & Relocation Overview</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
            <div class="glass-card" style="padding: 1.75rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 1.2rem; font-weight: 700; color: #fff;">${escapeHTML(countryA.country)}</div>
                    <span class="country-code-badge">${escapeHTML(countryA.countryCode)}</span>
                </div>
                <div style="margin-top: 1rem; font-size: 2rem; font-weight: 800; color: #fff;">
                    ${countryA.currency === 'EUR' ? formatEUR(countryA.livingCost) : `${countryA.currency === 'THB' ? '฿' : '$'}${countryA.livingCost.toLocaleString('en-US')} <span style="font-size: 1.1rem; color: var(--color-text-secondary); font-weight: 500;">(~${formatEUR(countryA.livingCostEUR)})</span>`}
                    <span style="font-size: 0.95rem; font-weight: normal; color: var(--color-text-secondary);">/ month</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Baseline Single Expat Living Cost in ${escapeHTML(countryA.city)}</div>
            </div>
            <div class="glass-card" style="padding: 1.75rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 1.2rem; font-weight: 700; color: #fff;">${escapeHTML(countryB.country)}</div>
                    <span class="country-code-badge">${escapeHTML(countryB.countryCode)}</span>
                </div>
                <div style="margin-top: 1rem; font-size: 2rem; font-weight: 800; color: #fff;">
                    ${countryB.currency === 'EUR' ? formatEUR(countryB.livingCost) : `${countryB.currency === 'THB' ? '฿' : '$'}${countryB.livingCost.toLocaleString('en-US')} <span style="font-size: 1.1rem; color: var(--color-text-secondary); font-weight: 500;">(~${formatEUR(countryB.livingCostEUR)})</span>`}
                    <span style="font-size: 0.95rem; font-weight: normal; color: var(--color-text-secondary);">/ month</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Baseline Single Expat Living Cost in ${escapeHTML(countryB.city)}</div>
            </div>
        </div>
    </section>

    <!-- Head-to-Head Salary Comparison Table -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Head-to-Head Net Pay & Tax Comparison Table (2026)</h2>
        <p style="color: var(--color-text-secondary); margin-top: 0.5rem; margin-bottom: 1.5rem;">
            Direct comparison of take-home pay for both employees and contractors across €50,000, €100,000, and €150,000 compensation benchmarks:
        </p>
        <div class="table-responsive" style="overflow-x: auto;">
            <table class="data-table-glass" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr>
                        <th style="padding: 1rem;">Gross Income</th>
                        <th style="padding: 1rem;">
                            ${regimeMeta[codeA].standardTitle}<br>
                            <span style="font-size:0.75rem;font-weight:normal;color:var(--color-text-secondary)">${regimeMeta[codeA].standardDesc}</span>
                        </th>
                        ${hasSpecialA ? `
                        <th style="padding: 1rem; border-left: 1px solid rgba(255,255,255,0.08); background: rgba(56, 189, 248, 0.03);">
                            ${regimeMeta[codeA].specialTitle}<br>
                            <span style="font-size:0.75rem;font-weight:normal;color:var(--color-tax)">${regimeMeta[codeA].specialDesc}</span>
                        </th>` : ''}
                        <th style="padding: 1rem;">
                            ${regimeMeta[codeB].standardTitle}<br>
                            <span style="font-size:0.75rem;font-weight:normal;color:var(--color-text-secondary)">${regimeMeta[codeB].standardDesc}</span>
                        </th>
                        ${hasSpecialB ? `
                        <th style="padding: 1rem; border-left: 1px solid rgba(255,255,255,0.08); background: rgba(56, 189, 248, 0.03);">
                            ${regimeMeta[codeB].specialTitle}<br>
                            <span style="font-size:0.75rem;font-weight:normal;color:var(--color-tax)">${regimeMeta[codeB].specialDesc}</span>
                        </th>` : ''}
                        <th style="padding: 1rem;">
                            Standard Delta<br>
                            <span style="font-size:0.75rem;font-weight:normal;color:var(--color-text-secondary)">Standard vs Standard</span>
                        </th>
                        ${(hasSpecialA && hasSpecialB) ? `
                        <th style="padding: 1rem; border-left: 1px solid rgba(255,255,255,0.08); background: rgba(56, 189, 248, 0.03);">
                            Special Delta*<br>
                            <span style="font-size:0.75rem;font-weight:normal;color:var(--color-tax)">Special vs Special</span>
                        </th>` : ''}
                        <th style="padding: 1rem;">${regimeMeta[codeA].contractorLabel}</th>
                        <th style="padding: 1rem;">${regimeMeta[codeB].contractorLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    ${compRows.map(row => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <td style="padding: 1rem; font-weight: 700; font-family: var(--font-mono); color: #fff;">${formatEUR(row.gross)}</td>
                        <td style="padding: 1rem; font-weight: 600; color: var(--color-net);">${formatEUR(row.empStdA.netAnnual)} (${row.empStdA.effectiveTaxRate}%)</td>
                        ${hasSpecialA ? `
                        <td style="padding: 1rem; font-weight: 600; color: var(--color-tax); border-left: 1px solid rgba(255,255,255,0.08); background: rgba(56, 189, 248, 0.02);">${formatEUR(row.empRegA.netAnnual)} (${row.empRegA.effectiveTaxRate}%)</td>` : ''}
                        <td style="padding: 1rem; font-weight: 600; color: var(--color-net);">${formatEUR(row.empStdB.netAnnual)} (${row.empStdB.effectiveTaxRate}%)</td>
                        ${hasSpecialB ? `
                        <td style="padding: 1rem; font-weight: 600; color: var(--color-tax); border-left: 1px solid rgba(255,255,255,0.08); background: rgba(56, 189, 248, 0.02);">${formatEUR(row.empRegB.netAnnual)} (${row.empRegB.effectiveTaxRate}%)</td>` : ''}
                        <td style="padding: 1rem; font-weight: 700; color: ${row.deltaStd >= 0 ? 'var(--color-net)' : 'var(--color-tax)'};">
                            ${row.deltaStd >= 0 ? `+${formatEUR(row.deltaStd)} (${countryA.countryCode})` : `+${formatEUR(Math.abs(row.deltaStd))} (${countryB.countryCode})`}
                        </td>
                        ${(hasSpecialA && hasSpecialB) ? `
                        <td style="padding: 1rem; font-weight: 700; border-left: 1px solid rgba(255,255,255,0.08); background: rgba(56, 189, 248, 0.02); color: ${row.deltaReg >= 0 ? 'var(--color-net)' : 'var(--color-tax)'};">
                            ${row.deltaReg >= 0 ? `+${formatEUR(row.deltaReg)} (${countryA.countryCode})` : `+${formatEUR(Math.abs(row.deltaReg))} (${countryB.countryCode})`}
                        </td>` : ''}
                        <td style="padding: 1rem; color: #fff;">${formatEUR(row.conA.netAnnual)}</td>
                        <td style="padding: 1rem; color: #fff;">${formatEUR(row.conB.netAnnual)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
        <div class="callout-box" style="margin-top: 1.5rem;">
            <div class="callout-title">Statutory Eligibility Constraints & Modeling Basis</div>
            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0; font-size: 0.88rem; line-height: 1.6; color: var(--color-text-secondary);">
                ${(codeA === 'ES' || codeB === 'ES') ? '<li><strong>Spain Beckham Law:</strong> Requires moving to Spain, no prior residence in previous 5 tax years, move linked to an employment contract, foreign telework agreement (Spanish Digital Nomad Visa), or qualifying company directorship. Flat 24% rate up to €600,000 under Art. 93 LIRPF and Ley 28/2022.</li>' : ''}
                ${(codeA === 'IT' || codeB === 'IT') ? '<li><strong>Italy Regime Impatriati:</strong> Requires 3 tax years prior non-residence, commit to 4 years stay, role requiring high qualification (50% income exemption up to €122,295 INPS ceiling under D.Lgs. 209/2023).</li>' : ''}
                ${(codeA === 'PT' || codeB === 'PT') ? '<li><strong>Portugal IFICI (NHR 2.0):</strong> Only if you qualify (qualifying activities in certified tech startups or accredited scientific R&D under Art. 58-A EBF). The standard column models progressive IRS (12.5%–48%).</li>' : ''}
                ${(codeA === 'TH' || codeB === 'TH') ? '<li><strong>Thailand:</strong> Default column models standard remitted scenario under Revenue Department Instructions Por. 161/2566 & 162/2566. Unremitted offshore income is 0.00% taxed.</li>' : ''}
                ${(countryA.socialSecurityStatus !== 'verified' || countryB.socialSecurityStatus !== 'verified') ? `<li><strong>Estimate Disclosure:</strong> Social security contributions for ${[countryA, countryB].filter(c => c.socialSecurityStatus !== 'verified').map(c => c.country).join(' and ')} are modeled as estimates based on published statutory circulars.</li>` : ''}
                <li><strong>Contractor Regimes:</strong> Spain models minimum base across 15 real-income tramos (RDL 13/2022). Portugal models Category B simplified regime with 75% taxable coefficient and 21.4% social security on 70% of gross (capped at 12x monthly IAS). Italy models Gestione Separata at 26.07% capped at €122,295. UAE models 0% personal income tax and small business corporate tax exemption below AED 3,000,000 turnover.</li>
            </ul>
        </div>
    </section>

    <!-- In-depth Editorial Comparative Analysis -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Special Tax Regimes & Expatriate Incentives</h2>
        <p style="margin-top: 1rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.regimeComparison)}</p>

        <h3 style="margin-top: 2rem;">Social Security & Mandatory Payroll Deductions</h3>
        <p style="margin-top: 0.75rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.socialSecurityComparison)}</p>

        <h3 style="margin-top: 2rem;">Cost of Living & Real Purchasing Power</h3>
        <p style="margin-top: 0.75rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.costOfLivingComparison)}</p>
    </section>

    <!-- Winner by Profile Table -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Winner by Profile Benchmark</h2>
        <p style="color: var(--color-text-secondary); margin-top: 0.5rem; margin-bottom: 1.5rem;">
            Selecting between ${escapeHTML(countryA.country)} and ${escapeHTML(countryB.country)} depends heavily on professional classification and earnings structure:
        </p>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${content.winnerByProfile.map(w => `
            <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                    <span style="font-weight: 700; font-size: 1.05rem; color: #fff;">${escapeHTML(w.profile)}</span>
                    <span class="footer-status-badge" style="color: var(--color-net); font-weight: 700;">★ Recommended: ${escapeHTML(w.winner)}</span>
                </div>
                <p style="margin: 0; font-size: 0.92rem; color: var(--color-text-secondary); line-height: 1.65;">${escapeHTML(w.rationale)}</p>
            </div>`).join('')}
        </div>
    </section>

    <!-- FAQs -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Frequently Asked Questions: ${escapeHTML(content.h1)}</h2>
        <div class="faq-accordion" style="margin-top: 1.5rem;">
            ${faqsHtml}
        </div>
    </section>`;
}

// 4. Ranking Page Body Renderer
function renderRankingPage({ page, content, allCountries, rel }) {
  const rankingDefinitions = [
    { code: 'AE', useSpecial: false, regimeTitle: 'Zero Personal Income Tax', constraint: '0% personal income tax, 0% social security withholding' },
    { code: 'TH', useSpecial: false, regimeTitle: 'Standard Remitted PIT', constraint: 'Standard remitted scenario under Por. 161/2566 (0% offshore optional)' },
    { code: 'IT', useSpecial: true, regimeTitle: 'Regime Impatriati', constraint: 'Requires 3 yr prior non-residence, 4 yr stay commitment, high qualification' },
    { code: 'ES', useSpecial: true, regimeTitle: 'Beckham Law', constraint: 'Requires moving to Spain, no prior residence 5 yr, employer assignment or nomad visa' },
    { code: 'PT', useSpecial: false, regimeTitle: 'Standard Progressive IRS', constraint: 'Standard progressive IRS (12.5%–48%). IFICI 20% only if qualifying' }
  ];

  const ranked = rankingDefinitions.map(def => {
    const c = allCountries[def.code];
    const livingCostEUR = c.livingCostEUR || c.livingCost;
    const emp = taxEngine.calculateTax({ grossIncome: 100000, countryCode: def.code, workerType: 'employee', useSpecialRegime: def.useSpecial });
    const con = taxEngine.calculateTax({ grossIncome: 100000, countryCode: def.code, workerType: 'contractor', useSpecialRegime: def.useSpecial });
    const leftover = emp.netMonthly - livingCostEUR;
    return {
      country: c,
      countrySlug: COUNTRY_SLUGS[def.code],
      livingCostEUR,
      emp,
      con,
      leftover,
      regimeTitle: def.regimeTitle,
      constraint: def.constraint
    };
  }).sort((a, b) => b.emp.netAnnual - a.emp.netAnnual);

  const faqsHtml = content.faqs.map(f => `
        <div class="faq-item glass-card" style="margin-bottom: 0.85rem; padding: 1.25rem 1.5rem;">
            <div class="faq-question" style="font-weight: 600; font-size: 1.05rem; color: #fff;">
                <span>${escapeHTML(f.q)}</span>
            </div>
            <div class="faq-answer" style="margin-top: 0.75rem; color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.65;">
                <p style="margin: 0;">${escapeHTML(f.a)}</p>
            </div>
        </div>`).join('');

  return `
    <header class="article-hero-header" style="text-align: left; margin-top: 1.5rem; margin-bottom: 2.5rem;">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
            <span class="country-code-badge">2026 RANKINGS</span>
            <span class="footer-status-badge"><span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-net);"></span>${escapeHTML(content.heroBadge)}</span>
            <span class="footer-status-badge">${computeVerificationBadge(page)}</span>
        </div>
        <h1>${escapeHTML(content.h1)}</h1>
        <p style="font-size: 1.15rem; color: var(--color-text-secondary); line-height: 1.7; max-width: 850px; margin-top: 1rem;">
            ${escapeHTML(content.intro)}
        </p>
    </header>

    <!-- Ranked Table -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>2026 Comprehensive Remote Worker Tax Ranking (€100k Benchmark)</h2>
        <p style="color: var(--color-text-secondary); margin-top: 0.5rem; margin-bottom: 1.5rem;">
            Ranked by annual net take-home salary and effective statutory retention for a single professional earning €100,000 gross under remote worker defaults:
        </p>
        <div class="table-responsive" style="overflow-x: auto;">
            <table class="data-table-glass" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr>
                        <th style="padding: 1rem;">Rank</th>
                        <th style="padding: 1rem;">Jurisdiction &amp; Basis</th>
                        <th style="padding: 1rem;">Effective Tax Rate</th>
                        <th style="padding: 1rem;">Social Security</th>
                        <th style="padding: 1rem;">Net Annual Take-Home</th>
                        <th style="padding: 1rem;">Living Cost</th>
                        <th style="padding: 1rem;">Monthly Disposable Leftover</th>
                    </tr>
                </thead>
                <tbody>
                    ${ranked.map((item, idx) => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <td style="padding: 1rem; font-weight: 700; color: var(--color-tax);">#${idx + 1}</td>
                        <td style="padding: 1rem; color: #fff;">
                            <a href="${rel}countries/${item.countrySlug}/" style="color: #fff; text-decoration: none; font-weight: 700;">${escapeHTML(item.country.country)}</a>
                            <div style="font-size: 0.8rem; color: var(--color-tax); font-weight: 500; margin-top: 2px;">${escapeHTML(item.regimeTitle)}</div>
                            <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px;">${escapeHTML(item.constraint)}</div>
                        </td>
                        <td style="padding: 1rem;"><span class="badge-effective-tax">${item.emp.effectiveTaxRate}%</span></td>
                        <td style="padding: 1rem; color: var(--color-text-secondary);">${formatEUR(item.emp.socialSecurity)}${item.country.socialSecurityStatus !== 'verified' ? ' <span style="font-size:0.75rem; color:#fbbf24; font-weight:600;">(Est.)</span>' : ''}</td>
                        <td style="padding: 1rem; font-weight: 700; color: var(--color-net);">${formatEUR(item.emp.netAnnual)}</td>
                        <td style="padding: 1rem; color: #fff;">${formatEUR(item.livingCostEUR)}/mo</td>
                        <td style="padding: 1rem; font-weight: 600; color: ${item.leftover > 0 ? 'var(--color-net)' : 'var(--color-tax)'};">${formatEUR(item.leftover)}/mo</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
        <div class="callout-box" style="margin-top: 1.5rem;">
            <div class="callout-title">Statutory Eligibility Constraints &amp; Regime Notes</div>
            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0; font-size: 0.88rem; line-height: 1.6; color: var(--color-text-secondary);">
                <li><strong>United Arab Emirates:</strong> Retains 100% gross earnings under 0% PIT and 0% social security framework.</li>
                <li><strong>Thailand:</strong> Default models standard remitted progressive PIT under Por. 161/2566 &amp; 162/2566 with 0% social security. Offshore unremitted income is 0.00% taxed.</li>
                <li><strong>Italy Regime Impatriati:</strong> Requires 3 yr prior non-residence, 4 yr stay commitment, high qualification (50% taxable income exemption).</li>
                <li><strong>Spain Beckham Law:</strong> Requires moving to Spain, no prior residence 5 yr, employer assignment or nomad visa (24% flat rate).</li>
                <li><strong>Portugal:</strong> Ranked under standard progressive IRS (12.5%–48%) with 11% uncapped social security. IFICI (20% flat tax) is strictly accessible only if you qualify under certified startup or R&amp;D activities.</li>
                <li><strong>Estimate Disclosure:</strong> Portugal and Italy social security figures (Portugal IAS €537.13 / contractor contributions and Italy €122,295 INPS massimale / 26.07% Gestione Separata) are modeled as Remotax estimates pending official online verification.</li>
            </ul>
        </div>
    </section>

    <!-- Editorial Analysis -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Comparative Analysis & Key Findings</h2>
        <p style="margin-top: 1rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.analysis)}</p>

        <h3 style="margin-top: 2rem;">Ranking Methodology & Data Evaluation</h3>
        <p style="margin-top: 0.75rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.methodology)}</p>
    </section>

    <!-- FAQs -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Frequently Asked Questions: ${escapeHTML(content.h1)}</h2>
        <div class="faq-accordion" style="margin-top: 1.5rem;">
            ${faqsHtml}
        </div>
    </section>`;
}

// 5. Methodology Page Body Renderer
function renderMethodologyPage({ page, content, rel }) {
  const faqsHtml = content.faqs.map(f => `
        <div class="faq-item glass-card" style="margin-bottom: 0.85rem; padding: 1.25rem 1.5rem;">
            <div class="faq-question" style="font-weight: 600; font-size: 1.05rem; color: #fff;">
                <span>${escapeHTML(f.q)}</span>
            </div>
            <div class="faq-answer" style="margin-top: 0.75rem; color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.65;">
                <p style="margin: 0;">${escapeHTML(f.a)}</p>
            </div>
        </div>`).join('');

  return `
    <header class="article-hero-header" style="text-align: left; margin-top: 1.5rem; margin-bottom: 2.5rem;">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
            <span class="country-code-badge">STANDARDS</span>
            <span class="footer-status-badge"><span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-net);"></span>${escapeHTML(content.heroBadge)}</span>
            <span class="footer-status-badge">${computeVerificationBadge(page)}</span>
        </div>
        <h1>${escapeHTML(content.h1)}</h1>
        <p style="font-size: 1.15rem; color: var(--color-text-secondary); line-height: 1.7; max-width: 850px; margin-top: 1rem;">
            ${escapeHTML(content.intro)}
        </p>
    </header>

    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Data Verification & Statutory Sources Protocol</h2>
        <p style="margin-top: 1rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.statutoryVerificationProtocol)}</p>

        <h3 style="margin-top: 2rem;">Core Calculation Engine & Statutory Algorithms</h3>
        <p style="margin-top: 0.75rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.calculationRules)}</p>

        <div id="living-costs" style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.08);">
            <h3>Cost of Living & Purchasing Power Benchmarks</h3>
            <p style="margin-top: 0.75rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.livingCostBenchmarking)}</p>

            <div class="callout-box" style="margin-top: 1.25rem; border-color: rgba(245, 158, 11, 0.4);">
                <div class="callout-title" style="color: #fbbf24;">Remotax Living Cost Benchmark Specifications & Worker Assumptions</div>
                <p style="font-size: 0.92rem; line-height: 1.65; margin: 0.5rem 0; color: #fff;">
                    Every living-cost figure published on Remotax is an independent research benchmark modeled for a single expatriate or remote professional, and kept visually distinct from statutory tax figures. The Remotax model establishes the following baseline parameters:
                </p>
                <ul style="margin: 0.5rem 0 0 1.25rem; font-size: 0.88rem; line-height: 1.65; color: var(--color-text-secondary);">
                    <li><strong>Worker Profile:</strong> Single individual remote knowledge worker without children or dependents.</li>
                    <li><strong>Housing Accommodation:</strong> Private, furnished 1-bedroom apartment in a prime or safe, expat-friendly residential neighborhood of the benchmark city (Madrid Centro/Salamanca, Lisbon Parque das Nações/Saldanha, Milan Porta Nuova/Navigli, Dubai Marina/Downtown, Bangkok Sukhumvit).</li>
                    <li><strong>Utilities & Telecommunications:</strong> Electricity, water, central heating/air-conditioning, and uncapped high-speed fiber internet (&gt;= 300 Mbps).</li>
                    <li><strong>Monthly Sustenance & Transit:</strong> Monthly grocery basket, 1–2 restaurant meals weekly, municipal transit pass, and basic fitness/coworking access.</li>
                    <li><strong>Dated Baseline:</strong> October 2026 benchmark data converted using official European Central Bank reference exchange rates as of October 16, 2026.</li>
                </ul>
            </div>
        </div>

        <h3 style="margin-top: 2rem;">Dated Benchmark Foreign Exchange (FX) Protocol</h3>
        <p style="margin-top: 0.75rem; line-height: 1.75; color: var(--color-text-secondary);">${escapeHTML(content.fxBenchmarkProtocol)}</p>
        <div class="table-responsive" style="overflow-x: auto; margin-top: 1.25rem;">
            <table class="data-table-glass" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr>
                        <th style="padding: 0.85rem 1rem;">Currency Pair</th>
                        <th style="padding: 0.85rem 1rem;">Benchmark Rate</th>
                        <th style="padding: 0.85rem 1rem;">Effective Date</th>
                        <th style="padding: 0.85rem 1rem;">Statutory Reference Source</th>
                        <th style="padding: 0.85rem 1rem;">Standard Living Cost Equivalent</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <td style="padding: 0.85rem 1rem; font-weight: 700; color: #fff;">EUR / USD</td>
                        <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-net);">${fxData.rates.USD}</td>
                        <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">${fxData.date}</td>
                        <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">${escapeHTML(fxData.notes.USD)}</td>
                        <td style="padding: 0.85rem 1rem; color: #fff;">$2,250 / mo = €1,999 / mo</td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <td style="padding: 0.85rem 1rem; font-weight: 700; color: #fff;">EUR / THB</td>
                        <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-net);">${fxData.rates.THB}</td>
                        <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">${fxData.date}</td>
                        <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">${escapeHTML(fxData.notes.THB)}</td>
                        <td style="padding: 0.85rem 1rem; color: #fff;">฿38,500 / mo = €1,024 / mo</td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <td style="padding: 0.85rem 1rem; font-weight: 700; color: #fff;">EUR / AED</td>
                        <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-net);">${Number(fxData.rates.AED).toFixed(4)}</td>
                        <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">${fxData.date}</td>
                        <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">${escapeHTML(fxData.notes.AED)}</td>
                        <td style="padding: 0.85rem 1rem; color: #fff;">AED 8,250 / mo = €1,996 / mo</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>

    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2rem 2.25rem;">
        <h2>Statutory Limitations & 'Not Tax Advice' Disclosure</h2>
        <div class="callout-box" style="margin-top: 1rem;">
            <div class="callout-title">Important Legal Notice</div>
            <p style="font-size: 0.95rem; line-height: 1.7; margin: 0; color: #fff;">
                ${escapeHTML(content.disclaimer)}
            </p>
        </div>
    </section>

    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.5rem 2rem;">
        <h2>Frequently Asked Questions: Methodology & Standards</h2>
        <div class="faq-accordion" style="margin-top: 1.5rem;">
            ${faqsHtml}
        </div>
    </section>`;
}

// ----------------------------------------------------------------------
// GENERATION ENGINE MAIN EXECUTION
// ----------------------------------------------------------------------
let generatedPagesCount = 0;
const redirectsList = [
  { oldPath: 'comparisons/spain-vs-portugal.html', newPath: 'comparisons/spain-vs-portugal/' }
];

const reversePairs = [
  ['portugal-vs-spain', 'spain-vs-portugal'],
  ['uae-vs-spain', 'spain-vs-uae'],
  ['italy-vs-spain', 'spain-vs-italy'],
  ['thailand-vs-spain', 'spain-vs-thailand'],
  ['uae-vs-portugal', 'portugal-vs-uae'],
  ['italy-vs-portugal', 'portugal-vs-italy'],
  ['thailand-vs-portugal', 'portugal-vs-thailand'],
  ['italy-vs-uae', 'uae-vs-italy'],
  ['thailand-vs-uae', 'uae-vs-thailand'],
  ['thailand-vs-italy', 'italy-vs-thailand']
];

reversePairs.forEach(([rev, canon]) => {
  redirectsList.push({
    oldPath: `comparisons/${rev}/`,
    newPath: `comparisons/${canon}/`
  });
});

// Process Each Page
activeSeoPages.forEach(page => {
  const rel = getRelativeDepth(page.path);
  const canonicalUrl = `${config.BASE_URL}${page.path}`;

  let contentFile;
  if (page.pageType === 'country') contentFile = path.join(ROOT_DIR, 'content', 'countries', `${page.slug}.json`);
  else if (page.pageType === 'regime') contentFile = path.join(ROOT_DIR, 'content', 'regimes', `${page.slug}.json`);
  else if (page.pageType === 'comparison') contentFile = path.join(ROOT_DIR, 'content', 'comparisons', `${page.slug}.json`);
  else if (page.pageType === 'ranking') contentFile = path.join(ROOT_DIR, 'content', 'rankings', `${page.slug}.json`);
  else if (page.pageType === 'methodology') contentFile = path.join(ROOT_DIR, 'content', 'methodology.json');

  if (!fs.existsSync(contentFile)) {
    throw new Error(`Content file missing for ${page.slug}: ${contentFile}`);
  }

  const rawContent = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
  const content = interpolate(rawContent);

  let bodyHtml = '';
  if (page.pageType === 'country') {
    const country = REMOTAX_COUNTRIES[page.countryCode];
    if (country.taxTablesStatus !== 'verified') {
      console.warn(`[SKIP] Country ${page.countryCode} taxTablesStatus is not verified! Skipping.`);
      return;
    }
    bodyHtml = renderCountryHub({ page, content, country, rel });
  } else if (page.pageType === 'regime') {
    const country = REMOTAX_COUNTRIES[page.countryCode];
    bodyHtml = renderRegimePage({ page, content, country, rel });
  } else if (page.pageType === 'comparison') {
    const countryA = REMOTAX_COUNTRIES[page.countryCodes[0]];
    const countryB = REMOTAX_COUNTRIES[page.countryCodes[1]];
    bodyHtml = renderComparisonPage({ page, content, countryA, countryB, rel });
  } else if (page.pageType === 'ranking') {
    bodyHtml = renderRankingPage({ page, content, allCountries: REMOTAX_COUNTRIES, rel });
  } else if (page.pageType === 'methodology') {
    bodyHtml = renderMethodologyPage({ page, content, rel });
  }

  const fullHtml = renderLayout({ page, content, bodyHtml, rel, canonicalUrl });

  if (fullHtml.includes('undefined')) {
    throw new Error(`Rendered HTML contains "undefined" in page: ${page.slug}`);
  }
  if (fullHtml.includes('NaN')) {
    throw new Error(`Rendered HTML contains "NaN" in page: ${page.slug}`);
  }

  const outDir = path.join(ROOT_DIR, page.path);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'index.html');
  fs.writeFileSync(outFile, fullHtml, 'utf8');
  generatedPagesCount++;
  console.log(`[GENERATED] ${page.path}index.html (${page.pageType})`);
});

// Write redirects.csv
const redirectsCsvContent = 'old_url,new_url\n' + redirectsList.map(r => `${r.oldPath},${r.newPath}`).join('\n') + '\n';
fs.writeFileSync(REDIRECTS_CSV_PATH, redirectsCsvContent, 'utf8');
console.log(`[UPDATED] redirects.csv (${redirectsList.length} mappings)`);

// Existing Public Pages
const existingPublicPages = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: 'calculator', changefreq: 'weekly', priority: '0.8' },
  { path: 'calculators/take-home-pay', changefreq: 'weekly', priority: '0.9' },
  { path: 'calculators/freelancer-tax', changefreq: 'weekly', priority: '0.9' },
  { path: 'calculators/remote-worker-tax', changefreq: 'weekly', priority: '0.9' },
  { path: 'calculators/remote-work-savings', changefreq: 'weekly', priority: '0.85' },
  { path: 'benchmarks', changefreq: 'weekly', priority: '0.8' },
  { path: 'destinations', changefreq: 'weekly', priority: '0.8' },
  { path: 'quiz', changefreq: 'monthly', priority: '0.7' },
  { path: 'blog', changefreq: 'weekly', priority: '0.8' },
  { path: 'article-spain-beckham-law', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-dubai-zero-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-portugal-d8-nhr', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-germany-expat-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-thailand-dtv-visa', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-uk-income-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-usa-expat-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-netherlands-30-ruling', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-italy-impatriati-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-singapore-territorial-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'tax-calculator/spain', changefreq: 'weekly', priority: '0.9' },
  { path: 'tax-calculator/portugal', changefreq: 'weekly', priority: '0.9' },
  { path: 'tax-calculator/germany', changefreq: 'weekly', priority: '0.9' },
  { path: 'tax-calculator/uae', changefreq: 'weekly', priority: '0.9' },
  { path: 'tax-calculator/uk', changefreq: 'weekly', priority: '0.9' },
  { path: 'faq', changefreq: 'monthly', priority: '0.7' },
  { path: 'privacy', changefreq: 'monthly', priority: '0.5' },
  { path: 'terms', changefreq: 'monthly', priority: '0.5' },
  { path: 'adsense-disclosure', changefreq: 'monthly', priority: '0.5' }
];

// Generate Sitemaps
const sitemaps = {
  'sitemap-countries.xml': activeSeoPages.filter(p => p.pageType === 'country'),
  'sitemap-regimes.xml': activeSeoPages.filter(p => p.pageType === 'regime'),
  'sitemap-comparisons.xml': activeSeoPages.filter(p => p.pageType === 'comparison'),
  'sitemap-best.xml': activeSeoPages.filter(p => p.pageType === 'ranking'),
  'sitemap-pages.xml': [
    ...existingPublicPages,
    ...activeSeoPages.filter(p => p.pageType === 'methodology')
  ]
};

const lastModDate = '2026-10-16';

for (const [smFile, pages] of Object.entries(sitemaps)) {
  const smXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `    <url>
        <loc>${config.BASE_URL}${p.path}</loc>
        <lastmod>${p.lastmod || lastModDate}</lastmod>
        <changefreq>${p.changefreq || 'weekly'}</changefreq>
        <priority>${p.priority || (p.pageType === 'country' ? '0.9' : '0.8')}</priority>
    </url>`).join('\n')}
</urlset>\n`;
  fs.writeFileSync(path.join(ROOT_DIR, smFile), smXml, 'utf8');
  console.log(`[SITEMAP] ${smFile} (${pages.length} URLs)`);
}

// Generate sitemap.xml index
const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(sitemaps).map(smFile => `    <sitemap>
        <loc>${config.BASE_URL}${smFile}</loc>
        <lastmod>${lastModDate}</lastmod>
    </sitemap>`).join('\n')}
</sitemapindex>\n`;
fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapIndexXml, 'utf8');
console.log(`[SITEMAP INDEX] sitemap.xml`);

// Update robots.txt
let robotsTxt = `User-agent: *\n`;
if (config.INDEXING) {
  robotsTxt += `Allow: /\n\nSitemap: ${config.BASE_URL}sitemap.xml\n`;
} else {
  robotsTxt += `Disallow: /\n`;
}
fs.writeFileSync(ROBOTS_PATH, robotsTxt, 'utf8');
console.log(`[ROBOTS] robots.txt updated (INDEXING=${config.INDEXING})`);

// Handle .htaccess rewrites
let htaccessContent = fs.readFileSync(HTACCESS_PATH, 'utf8');
const redirectMarkerStart = '# --- REMOTAX WAVE 1 301 REDIRECTS START ---';
const redirectMarkerEnd = '# --- REMOTAX WAVE 1 301 REDIRECTS END ---';

let wave1HtaccessRules = `${redirectMarkerStart}\n`;
wave1HtaccessRules += `# 301 Redirect legacy comparisons HTML to clean directory URL\n`;
wave1HtaccessRules += `RewriteRule ^comparisons/spain-vs-portugal\\.html$ comparisons/spain-vs-portugal/ [R=301,L]\n\n`;
wave1HtaccessRules += `# 301 Redirect reverse comparison pairs to canonical pair URLs\n`;
reversePairs.forEach(([rev, canon]) => {
  wave1HtaccessRules += `RewriteRule ^comparisons/${rev}/?$ comparisons/${canon}/ [R=301,L]\n`;
});
wave1HtaccessRules += `${redirectMarkerEnd}`;

if (htaccessContent.includes(redirectMarkerStart)) {
  const reg = new RegExp(`${redirectMarkerStart}[\\s\\S]*?${redirectMarkerEnd}`);
  htaccessContent = htaccessContent.replace(reg, wave1HtaccessRules);
} else {
  htaccessContent = htaccessContent.replace('RewriteBase /remotax/\n', `RewriteBase /remotax/\n\n${wave1HtaccessRules}\n`);
}
fs.writeFileSync(HTACCESS_PATH, htaccessContent, 'utf8');
console.log(`[HTACCESS] Updated .htaccess with Wave-1 301 rules`);

// Handle --emit-htaccess option
if (process.argv.includes('--emit-htaccess')) {
  const domainMoveRules = `# ======================================================================\n` +
    `# REMOTAX DOMAIN MIGRATION 301 REDIRECT RULES (afrix.ir/remotax/* -> NEW_DOMAIN/*)\n` +
    `# ======================================================================\n\n` +
    `RewriteEngine On\n` +
    `RewriteCond %{HTTP_HOST} ^(www\\.)?afrix\\.ir$ [NC]\n` +
    `RewriteRule ^remotax/(.*)$ https://new-domain.com/$1 [R=301,L]\n`;
  const domainMoveFile = path.join(ROOT_DIR, '.htaccess-domain-move');
  fs.writeFileSync(domainMoveFile, domainMoveRules, 'utf8');
  console.log(`[EMIT] Generated ${domainMoveFile}`);
}

console.log(`\n======================================================================`);
console.log(` SUCCESS: Generated all ${generatedPagesCount} Wave-1 static pages.`);
console.log('======================================================================\n');
