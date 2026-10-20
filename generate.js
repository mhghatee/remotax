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
  if (pType === 'country' || pType === 'regime' || pType === 'salary') {
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
  } else if (type === 'salary-hub') {
    if (!currentPage.countryCode) {
      // Master salary directory: link to all 5 country salary hubs
      ['ES', 'PT', 'AE', 'IT', 'TH'].forEach(code => {
        const slug = COUNTRY_SLUGS[code];
        links.push({ title: `${REMOTAX_COUNTRIES[code].country} Salary Tax Calculator 2026`, url: `${rel}salary/${slug}/` });
      });
      links.push({ title: 'Interactive Take Home Pay Calculator', url: `${rel}calculators/take-home-pay.html` });
    } else {
      // Country salary hub: link to master hub, country hub, regime, peer country hubs
      links.push({ title: 'Global Salary Benchmarks Directory', url: `${rel}salary/` });
      const countryHub = allPages.find(p => p.pageType === 'country' && p.countryCode === currentPage.countryCode);
      if (countryHub) links.push({ title: `${REMOTAX_COUNTRIES[currentPage.countryCode].country} Tax Calculator Hub`, url: `${rel}${countryHub.path}` });
      const regime = allPages.find(p => p.pageType === 'regime' && p.countryCode === currentPage.countryCode);
      if (regime) links.push({ title: regime.primaryKeyword, url: `${rel}${regime.path}` });
      const peerHubs = allPages.filter(p => p.pageType === 'salary-hub' && p.countryCode && p.countryCode !== currentPage.countryCode);
      peerHubs.slice(0, 2).forEach(ph => {
        links.push({ title: `${REMOTAX_COUNTRIES[ph.countryCode].country} Salary Calculator`, url: `${rel}${ph.path}` });
      });
      links.push({ title: 'Interactive Take Home Pay Calculator', url: `${rel}calculators/take-home-pay.html` });
    }
  } else if (type === 'salary') {
    // 1. Parent Country Salary Hub
    links.push({ title: `${REMOTAX_COUNTRIES[currentPage.countryCode].country} Salary Directory`, url: `${rel}salary/${COUNTRY_SLUGS[currentPage.countryCode]}/` });
    // 2. Master Salary Hub
    links.push({ title: 'Global Salary Benchmarks Directory', url: `${rel}salary/` });
    // 3. Special regime
    const regime = allPages.find(p => p.pageType === 'regime' && p.countryCode === currentPage.countryCode);
    if (regime) links.push({ title: regime.primaryKeyword, url: `${rel}${regime.path}` });
    // 4. Country Hub
    const hub = allPages.find(p => p.pageType === 'country' && p.countryCode === currentPage.countryCode);
    if (hub) links.push({ title: `${REMOTAX_COUNTRIES[currentPage.countryCode].country} Tax Calculator Hub`, url: `${rel}${hub.path}` });
    // 5. Next salary step
    const nextSalary = allPages.find(p => p.pageType === 'salary' && p.countryCode === currentPage.countryCode && p.grossEUR > currentPage.grossEUR);
    if (nextSalary) links.push({ title: nextSalary.primaryKeyword, url: `${rel}${nextSalary.path}` });
    // 6. Interactive Calculator
    links.push({ title: 'Interactive Take Home Pay Calculator', url: `${rel}calculators/take-home-pay.html` });
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
  } else if (page.pageType === 'salary-hub') {
    if (!page.countryCode) {
      breadcrumbItems.push({ name: 'Salaries', url: canonicalUrl });
    } else {
      const cName = REMOTAX_COUNTRIES[page.countryCode].country;
      breadcrumbItems.push({ name: 'Salaries', url: `${config.BASE_URL}salary/` });
      breadcrumbItems.push({ name: `${cName} Salaries`, url: canonicalUrl });
    }
  } else if (page.pageType === 'salary') {
    const cName = REMOTAX_COUNTRIES[page.countryCode].country;
    const cSlug = COUNTRY_SLUGS[page.countryCode];
    breadcrumbItems.push({ name: 'Salaries', url: `${config.BASE_URL}salary/` });
    breadcrumbItems.push({ name: `${cName} Salaries`, url: `${config.BASE_URL}salary/${cSlug}/` });
    breadcrumbItems.push({ name: `€${page.grossEUR.toLocaleString('en-US')} Salary`, url: canonicalUrl });
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

  // WebApplication JSON-LD (for countries, comparisons, rankings)
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
        "priceCurrency": "EUR"
      },
      "description": content.metaDescription
    };
  }

  // FinancialProduct JSON-LD (for salary tiers and salary hubs)
  let financialProductSchema = null;
  if (['salary', 'salary-hub'].includes(page.pageType)) {
    let cur = 'EUR';
    if (page.countryCode === 'AE') cur = 'AED';
    else if (page.countryCode === 'TH') cur = 'THB';
    financialProductSchema = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": `Remotax ${content.h1}`,
      "url": canonicalUrl,
      "description": content.metaDescription,
      "category": "Tax Calculation & Salary Benchmark",
      "provider": {
        "@type": "Organization",
        "name": config.SITE_NAME,
        "url": config.BASE_URL
      },
      "feesAndCommissionsSpecification": "Free statutory reference benchmark",
      "currency": cur
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
    <link rel="alternate" hreflang="x-default" href="${canonicalUrl}">
    <link rel="alternate" hreflang="en" href="${canonicalUrl}">
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
    ${financialProductSchema ? `<script type="application/ld+json">\n    ${JSON.stringify(financialProductSchema, null, 2)}\n    </script>` : ''}
    ${faqSchema ? `<script type="application/ld+json">\n    ${JSON.stringify(faqSchema, null, 2)}\n    </script>` : ''}

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
            </a>
        </div>` : ''}
    </section>

    <!-- Dedicated Salary Benchmarks Grid -->
    <section class="glass-panel" style="margin-bottom: 3.5rem; padding: 2.25rem 2rem;">
        <h2>Popular ${escapeHTML(country.country)} Salary Take-Home Benchmarks (2026)</h2>
        <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-top: 0.5rem; margin-bottom: 1.5rem;">
            Explore precise paycheck withholdings, social security contributions, and net disposable income across 10 statutory compensation milestones in ${escapeHTML(country.country)}:
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.85rem;">
            ${[30000, 40000, 50000, 60000, 75000, 80000, 100000, 120000, 150000, 200000].map(amt => `
            <a href="${rel}salary/${COUNTRY_SLUGS[country.countryCode]}/${amt}-eur/" class="glass-card" style="padding: 1rem 1.15rem; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 0.25rem;">
                <span style="font-weight: 700; font-size: 1.05rem; color: #fff;">€${amt.toLocaleString('en-US')} Gross</span>
                <span style="font-size: 0.82rem; color: var(--color-tax);">View Take-Home Pay →</span>
            </a>`).join('')}
        </div>
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
        <div class="callout-box" style="margin-top: 1.25rem; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.18); border-radius: var(--radius-md); padding: 1rem 1.25rem;">
            <p style="margin: 0; font-size: 0.88rem; color: var(--color-text-secondary); line-height: 1.5;">
                <strong style="color: #fff;">Bilateral Comparative Analysis:</strong> Evaluating relocation between <strong>${escapeHTML(countryA.country)}</strong> and <strong>${escapeHTML(countryB.country)}</strong> (or vice versa). Remotax provides canonical statutory benchmarks for 2026, comparing progressive tax brackets, special expat regimes, mandatory social security, and capital living costs across both jurisdictions.
            </p>
        </div>
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

/// ----------------------------------------------------------------------
// 6. Salary Benchmark Landing Page Body Renderer
// ----------------------------------------------------------------------
const SALARY_AMOUNTS = [30000, 40000, 50000, 60000, 75000, 80000, 100000, 120000, 150000, 200000];

function getSalaryCountryCity(cCode) {
  if (cCode === 'ES') return { city: 'Madrid', costEUR: 1850 };
  if (cCode === 'PT') return { city: 'Lisbon', costEUR: 1650 };
  if (cCode === 'AE') return { city: 'Dubai', costEUR: 1996 };
  if (cCode === 'IT') return { city: 'Rome', costEUR: 1750 };
  if (cCode === 'TH') return { city: 'Bangkok', costEUR: 1024 };
  return { city: 'Capital City', costEUR: 1800 };
}

function getSalaryRegimeName(cCode) {
  if (cCode === 'ES') return { full: 'Beckham Law (Ley 28/2022)', short: 'Beckham Law' };
  if (cCode === 'PT') return { full: 'IFICI Regime (Art. 58-A EBF)', short: 'IFICI' };
  if (cCode === 'AE') return { full: 'Dubai Virtual Working Programme', short: '0% Tax' };
  if (cCode === 'IT') return { full: 'Impatriati Regime (D.Lgs. 209/2023)', short: 'Impatriati' };
  if (cCode === 'TH') return { full: 'Destination Thailand Visa (DTV)', short: 'DTV Visa' };
  return { full: 'Special Tax Regime', short: 'Regime' };
}

const TIER_SPECIFIC_INSIGHTS = {
  30000: {
    title: 'Foundational Relocation & Entry-Tier Remote Earnings',
    ES: 'At €30,000, electing the Beckham Law 24% flat rate is actually disadvantageous compared to Spain standard progressive IRPF. Progressive tax incorporates the €5,550 base allowance and lower introductory brackets (19%–24%), resulting in lower net tax under standard rules than the flat 24% expat regime. This salary level closely aligns with the Spanish Digital Nomad Visa income threshold (€31,752, set at 200% of the minimum wage).',
    PT: 'A compensation of €30,000 sits below Portugal D8 Digital Nomad Visa threshold (requiring 4 times minimum wage, or €41,760 annually), meaning applicants typically rely on the D2 entrepreneur or standard employment visa routes. In terms of taxation, this salary falls into the progressive 16.5% to 22% IRS tiers, where standard allowances cushion initial liabilities.',
    AE: 'At €30,000 (~$32,700), compensation is slightly under the Dubai Virtual Working Programme visa requirement of $3,500/month ($42,000/year). To secure UAE residency at this level, remote professionals typically leverage local freelance permits or mainland freezone investor visas to access zero income tax benefits.',
    IT: 'Under Italy Impatriati regime (D.Lgs. 209/2023), €30,000 gross is halved to a taxable base of just €15,000. This entire taxable amount falls within Italy lowest 23% IRPEF bracket, yielding exceptional tax retention for inbound specialists while meeting qualification requirements.',
    TH: 'Earning €30,000 translates to roughly ฿1,120,000 THB, which easily clears the Destination Thailand Visa (DTV) financial liquidity requirement of ฿500,000. In Bangkok, this provides tremendous purchasing power, covering living costs three times over with zero social security withholding.'
  },
  40000: {
    title: 'Mid-Tier Professional & Visa Qualifying Benchmark',
    ES: 'At €40,000, earnings cross Spain second progressive bracket into the 37% marginal rate. At this transition point, the Beckham Law flat 24% begins to reach mathematical parity with progressive taxation. Furthermore, €40,000 comfortably fulfills Spain Digital Nomad Visa minimum earnings criteria.',
    PT: 'A €40,000 salary aligns almost perfectly with Portugal D8 Digital Nomad Visa statutory threshold (€3,480 monthly / €41,760 yearly). Standard progressive IRS reaches the 28.5% bracket, while independent contractors utilizing the Category B regime can deduct 25% of gross income automatically.',
    AE: 'At €40,000 (~$43,600/yr), earnings satisfy the Dubai Virtual Working Programme statutory criteria of $3,500 per month. Holders enjoy 100% tax exemption, saving thousands compared to European home-country deductions.',
    IT: 'At €40,000, standard Italian progressive taxation would subject upper income to 33% and 43% brackets. The Impatriati regime restricts taxable income to €20,000, preserving high net retention while fulfilling high-specialization criteria.',
    TH: 'An income of €40,000 (~฿1,500,000 THB) places an expatriate in upper earnings percentiles in Thailand. If remitted, standard progressive PIT takes approximately 15.6%, whereas unremitted offshore earnings are completely tax-free under Por. 161/2566.'
  },
  50000: {
    title: 'Senior Knowledge Worker & Expat Incentive Inflection',
    ES: 'At €50,000, the Beckham Law flat 24% delivers unmistakable net savings over progressive IRPF. Progressive autonomous rates in regions like Madrid or Catalonia exceed 37% at this level, whereas the Beckham Law preserves predictable deductions.',
    PT: 'At €50,000, progressive IRS reaches 35%, generating significant tax liabilities. For qualifying software engineers and researchers, the IFICI 20% flat tax delivers over €4,000 in annual net savings compared to standard progressive schedules.',
    AE: 'At €50,000 (AED 205,000/yr), remote professionals retain the entire amount net. In Dubai, this affords a premium one-bedroom residence with ample surplus for investment and leisure.',
    IT: 'At €50,000, Impatriati reduces taxable earnings to €25,000. An inbound remote engineer retains over €42,000 net, outperforming standard domestic compensation packages by a wide margin.',
    TH: 'At €50,000 (~฿1,870,000 THB), an expat enjoys an executive-level living standard in Bangkok or Phuket, retaining over 75% of income even after lifestyle expenses and remitted taxes.'
  },
  60000: {
    title: 'Social Security Cap Engagement & Bracket Boundary',
    ES: 'A €60,000 salary closely approaches Spain statutory maximum social security contribution ceiling (€5,101.20 monthly / €61,214.40 annually). Employee social security withholdings peak at €3,978.94 per year, unlocking maximum marginal retention on subsequent earnings.',
    PT: 'At €60,000, progressive IRS climbs to 37%. Portugal uncapped 11% employee social security deducts €6,600 annually, underscoring the value of structured corporate or IFICI tax planning.',
    AE: 'At €60,000 (AED 246,000/yr), remote workers face 0% federal income tax and zero mandatory pension contributions, ensuring full liquidity without statutory friction.',
    IT: 'Standard Italian IRPEF enters the 43% top rate above €50,000. Under Impatriati, however, the taxable base is reduced to €30,000, shielding the worker entirely from the top marginal tax bracket.',
    TH: 'At €60,000 (~฿2,240,000 THB), remitted progressive income tax enters Thailand 25% bracket. Expatriates frequently optimize remittance schedules to minimize exposure.'
  },
  75000: {
    title: 'Senior Engineering & Specialist Relocation Sweet Spot',
    ES: 'At €75,000, Spanish employee social security is 100% capped at €3,978.94. Any additional salary increases are taxed strictly at the 24% Beckham Law rate without additional social security deductions.',
    PT: 'At €75,000, progressive IRS touches 43.5%. With €8,250 deducted in uncapped social security, qualifying under IFICI 20% creates a dramatic net compensation divergence of over €9,000 annually.',
    AE: 'At €75,000 (AED 307,500/yr), independent contractors easily qualify for Small Business Relief under Corporate Tax Ministerial Decision No. 73 of 2023, ensuring 0% corporate and 0% personal tax.',
    IT: 'At €75,000, Impatriati generates a taxable base of €37,500, producing net take-home pay of €58,000+. This makes Italy one of Europe most attractive relocation destinations for senior specialists.',
    TH: 'At €75,000 (~฿2,800,000 THB), savings margins exceed €4,500 per month against standard Bangkok living costs, enabling extensive international mobility across Southeast Asia.'
  },
  80000: {
    title: 'Management Tier & Upper Marginal Bracket Differential',
    ES: 'At €80,000, the gap between standard progressive IRPF (~€24,000 in taxes) and Beckham Law 24% (~€19,200 in taxes) widens substantially, yielding immediate cash advantages for inbound managers.',
    PT: 'At €80,000, Portuguese progressive taxation reaches upper brackets (45%). Total statutory deductions under standard rules approach €32,000, making alternative regimes essential.',
    AE: 'At €80,000 (AED 328,000/yr), net earnings remain €80,000. Living in Dubai allows full capital retention without withholding taxes or dividend imposts.',
    IT: 'At €80,000, qualifying under Impatriati fulfills all statutory requirements of D.Lgs. 209/2023 while preserving over €61,000 in annual net take-home compensation.',
    TH: 'At €80,000 (~฿2,990,000 THB), remote professionals benefit from zero payroll taxes, low capital costs, and full freedom to structure tax residency via the DTV visa.'
  },
  100000: {
    title: 'Six-Figure Benchmark & Expatriate Wealth Accumulation',
    ES: 'At the prestigious €100,000 threshold, Spain Beckham Law delivers €72,021 in annual net pay, saving over €11,000 compared to standard progressive IRPF.',
    PT: 'At €100,000, standard Portuguese taxation leaves €54,589 net, whereas qualifying under IFICI delivers €69,000 net take-home, a monumental €14,400+ annual difference.',
    AE: 'At €100,000 (AED 410,000/yr), an expatriate retains 100% of earnings. After accounting for luxury Dubai living costs (€23,952/yr), disposable savings exceed €76,000 annually.',
    IT: 'At €100,000, Italy Impatriati produces €76,672 net take-home. Employee pension contributions are capped near the INPS massimale, maximizing marginal take-home pay.',
    TH: 'At €100,000 (~฿3,740,000 THB), net remitted take-home is €77,526 (or full €100,000 if unremitted), supporting an elite lifestyle and multi-currency savings.'
  },
  120000: {
    title: 'Staff Principal & Director Compensation Optimization',
    ES: 'At €120,000, Beckham Law preserves €87,221 net. Standard progressive rates would exceed 45%, making Spain one of the top destinations for senior tech leaders.',
    PT: 'At €120,000, uncapped 11% social security deducts €13,200 annually. Under IFICI, the 20% flat tax protects earnings from Portugal 48% maximum progressive bracket.',
    AE: 'At €120,000 (AED 492,000/yr), 100% net retention allows expatriates to build substantial offshore investment portfolios free of capital gains taxes.',
    IT: 'At €120,000, an employee reaches Italy statutory INPS massimale (€122,295). Beyond this threshold, zero pension contributions are levied, maximizing net take-home.',
    TH: 'At €120,000 (~฿4,490,000 THB), remote executives can consider Thailand Long-Term Resident (LTR) visa as a high-income alternative to DTV, securing 10-year residency.'
  },
  150000: {
    title: 'Executive & VP Level Statutory Cap Navigation',
    ES: 'At €150,000, Beckham Law yields €110,021 net. The 24% rate remains active up to the statutory €600,000 ceiling, after which the 47% bracket applies.',
    PT: 'At €150,000, progressive IRS claims over €65,000 in deductions. IFICI preserves over €100,000 in net compensation for qualifying innovation executives.',
    AE: 'At €150,000 (AED 615,000/yr), total zero-tax treatment applies. Fulfilling the 183-day rule under Cabinet Decision No. 85 of 2022 guarantees international tax status.',
    IT: 'At €150,000, Impatriati 50% exemption shields €75,000 from taxation. Social security is fully capped, ensuring net compensation exceeds €112,000.',
    TH: 'At €150,000 (~฿5,610,000 THB), wealth structuring through tax treaty exemptions and timed remittances allows exceptional capital preservation in Bangkok.'
  },
  200000: {
    title: 'C-Suite & Elite Independent Contractor Taxation',
    ES: 'At €200,000 gross, Spain Beckham Law delivers €148,021 net take-home pay. Social security is negligible as a percentage of total earnings (~2%), ensuring 74% overall retention.',
    PT: 'At €200,000, the contrast between progressive taxation (€102,000+ total tax & SS) and IFICI demonstrates why specialized regime qualification is vital for top earners.',
    AE: 'At €200,000 (AED 820,000/yr), zero taxes across all levels enable executives to retain full compensation with comprehensive international banking freedom.',
    IT: 'At €200,000, Italy Impatriati leaves €146,000+ net. The statutory €600,000 regime ceiling provides ample room for bonuses, equity grants, and future increases.',
    TH: 'At €200,000 (~฿7,480,000 THB), expatriates operate at highest economic tiers with full access to elite banking, luxury property leases, and multi-year visa stability.'
  }
};

function renderSalaryMasterHub({ page, rel, allPages }) {
  const tiers = [30000, 50000, 75000, 100000, 150000, 200000];
  const cCodes = ['ES', 'PT', 'AE', 'IT', 'TH'];

  const matrixRows = tiers.map(gross => {
    const cells = cCodes.map(code => {
      const res = taxEngine.calculateTax({ grossIncome: gross, countryCode: code, workerType: 'employee', useSpecialRegime: true });
      return {
        code,
        net: res.netAnnual,
        rate: res.effectiveTaxRate
      };
    });
    let bestNet = 0;
    let bestCode = '';
    cells.forEach(c => {
      if (c.net > bestNet) {
        bestNet = c.net;
        bestCode = c.code;
      }
    });

    return `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 1rem; font-weight: 700; color: #fff; font-family: var(--font-mono);">€${gross.toLocaleString('en-US')}</td>
        ${cells.map(c => `
          <td style="padding: 1rem; font-family: var(--font-mono); ${c.code === bestCode ? 'color: #34D399; font-weight: 700;' : 'color: #fff;'}">
            €${c.net.toLocaleString('en-US')}<br>
            <span style="font-size: 0.75rem; color: var(--color-tax); font-family: var(--font-sans);">${c.rate}%</span>
          </td>
        `).join('')}
        <td style="padding: 1rem; color: #38BDF8; font-weight: 600;">${REMOTAX_COUNTRIES[bestCode].country}</td>
      </tr>`;
  }).join('');

  const countryCards = cCodes.map(code => {
    const cObj = REMOTAX_COUNTRIES[code];
    const slug = COUNTRY_SLUGS[code];
    const { city, costEUR } = getSalaryCountryCity(code);
    const regime = getSalaryRegimeName(code);
    const sample50k = taxEngine.calculateTax({ grossIncome: 50000, countryCode: code, workerType: 'employee', useSpecialRegime: true });
    const sample100k = taxEngine.calculateTax({ grossIncome: 100000, countryCode: code, workerType: 'employee', useSpecialRegime: true });

    return `
      <div class="glass-card" style="padding: 1.75rem; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0;">${escapeHTML(cObj.country)}</h3>
            <span class="country-code-badge">${code}</span>
          </div>
          <p style="font-size: 0.88rem; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 1.25rem;">
            Statutory regime: <strong style="color: var(--color-tax);">${escapeHTML(regime.full)}</strong>. Living costs in ${escapeHTML(city)} average ~€${costEUR.toLocaleString('en-US')}/mo.
          </p>
          <div style="background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="color: var(--color-text-secondary);">Net on €50,000:</span>
              <span style="font-family: var(--font-mono); color: #34D399; font-weight: 600;">€${sample50k.netAnnual.toLocaleString('en-US')}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--color-text-secondary);">Net on €100,000:</span>
              <span style="font-family: var(--font-mono); color: #34D399; font-weight: 600;">€${sample100k.netAnnual.toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>
        <div>
          <a href="${rel}salary/${slug}/" class="btn-primary" style="display: block; text-align: center; padding: 0.75rem 1rem; text-decoration: none; font-size: 0.9rem; font-weight: 600; border-radius: var(--radius-sm);">
            Explore ${escapeHTML(cObj.country)} Salary Tiers →
          </a>
        </div>
      </div>`;
  }).join('');

  const directorySections = cCodes.map(code => {
    const cObj = REMOTAX_COUNTRIES[code];
    const slug = COUNTRY_SLUGS[code];
    const links = SALARY_AMOUNTS.map(amt => `
      <a href="${rel}salary/${slug}/${amt}-eur/" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-sm); padding: 0.6rem 0.85rem; text-decoration: none; color: #fff; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; transition: border-color 0.2s;">
        <span style="font-weight: 600;">€${amt.toLocaleString('en-US')}</span>
        <span style="color: var(--color-tax); font-size: 0.8rem;">View Report →</span>
      </a>
    `).join('');

    return `
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
          <h3 style="font-size: 1.15rem; color: #fff; margin: 0;">${escapeHTML(cObj.country)} Salary Directory (10 Tiers)</h3>
          <a href="${rel}salary/${slug}/" style="font-size: 0.85rem; color: var(--color-tax); text-decoration: none;">View Country Hub →</a>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
          ${links}
        </div>
      </div>`;
  }).join('');

  const faqs = [
    {
      q: "Which jurisdiction offers the highest net take-home salary for remote professionals in 2026?",
      a: "The United Arab Emirates provides 100% net salary retention across all compensation brackets due to its statutory 0% federal personal income tax rate. Among European destinations, Italy Impatriati regime (D.Lgs. 209/2023) offers up to 50% taxable income exemption, while Spain Beckham Law applies a flat 24% tax rate up to €600,000 gross."
    },
    {
      q: "How do special expat regimes like Beckham Law and IFICI improve net compensation?",
      a: "Special expatriate regimes substitute domestic progressive tax schedules (which often exceed 45% to 48% at senior brackets) with flat withholding rates or substantial taxable base exemptions. In Spain, the Beckham Law fixes income tax at 24%, whereas Portugal IFICI regime applies a flat 20% rate for qualifying professionals."
    },
    {
      q: "What is the difference between employee payroll deductions and contractor taxes across Europe?",
      a: "Employees face statutory employer and employee social security contributions plus monthly PAYE income tax withholding. Independent contractors bill gross invoices but are responsible for self-employed social security regimes (such as Spain cuota de autónomos or Italy Gestione Separata) and progressive business income declarations."
    },
    {
      q: "How are foreign exchange rates and living costs calculated in these salary reports?",
      a: "Currency conversions are benchmarked against official European Central Bank (ECB) reference rates for EUR/AED and EUR/THB. Cost of living benchmarks represent standardized monthly expenditures for a single expatriate professional living in primary commercial hubs (Madrid, Lisbon, Dubai, Rome, and Bangkok)."
    }
  ];

  const faqsHtml = faqs.map((f, i) => `
    <div class="faq-item" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1.25rem; margin-bottom: ${i === faqs.length - 1 ? '0' : '1.25rem'};">
      <h3 style="font-size: 1.08rem; color: #fff; margin-bottom: 0.5rem;">${escapeHTML(f.q)}</h3>
      <p style="color: var(--color-text-secondary); line-height: 1.6; font-size: 0.95rem; margin: 0;">${escapeHTML(f.a)}</p>
    </div>
  `).join('');

  const bodyHtml = `
    <!-- Hero Section -->
    <section class="hero-hub" style="padding: 3.5rem 0 2.5rem; text-align: center; position: relative;">
      <div style="max-width: 900px; margin: 0 auto;">
        <div class="pill-tag" style="margin-bottom: 1.25rem;">
          <span class="pill-dot"></span> Tax Year 2026 Statutory Salary Directory
        </div>
        <h1 style="font-size: clamp(2rem, 4.5vw, 3.2rem); line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 1.25rem;">
          Global Remote Salary Tax Benchmarks 2026 <br>
          <span class="gradient-text">Statutory Gross-to-Net Compensation Guide</span>
        </h1>
        <p style="font-size: 1.15rem; color: var(--color-text-secondary); line-height: 1.6; max-width: 780px; margin: 0 auto 2.5rem;">
          Comprehensive gross-to-net salary directory comparing statutory employee take-home pay, social security withholdings, contractor taxes, and living costs across 5 key expat jurisdictions and 50 income tiers.
        </p>

        <!-- Quick Summary Metrics -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; text-align: left;">
          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid #34D399;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Jurisdictions Covered</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #34D399; font-family: var(--font-mono);">5 Countries</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Spain, Portugal, UAE, Italy, Thailand</div>
          </div>
          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid var(--color-tax);">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Compensation Tiers</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: var(--color-tax); font-family: var(--font-mono);">10 Brackets</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">From €30,000 to €200,000 Gross</div>
          </div>
          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid #38BDF8;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Total Reports</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #38BDF8; font-family: var(--font-mono);">50 Scenarios</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Pre-calculated statutory breakdowns</div>
          </div>
          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid #F59E0B;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Statutory Precision</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #F59E0B; font-family: var(--font-mono);">2026 Gazette</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Official tax codes &amp; social security caps</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Country Salary Hubs -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">Country Salary Tax Calculators &amp; Hubs</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.75rem;">
        Select your relocation destination to explore all 10 statutory salary tiers, progressive tax brackets, and local living expense comparisons:
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
        ${countryCards}
      </div>
    </section>

    <!-- Cross-Border Net Pay Matrix -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">Cross-Border Take-Home Pay Comparison Matrix (2026)</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        Comparative analysis of annual employee net take-home compensation and effective deduction rates across 6 benchmark income tiers under qualifying statutory tax regimes:
      </p>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.92rem;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.12); color: var(--color-text-secondary); font-size: 0.82rem; text-transform: uppercase;">
              <th style="padding: 0.85rem 1rem;">Gross Salary</th>
              <th style="padding: 0.85rem 1rem;">Spain (Beckham)</th>
              <th style="padding: 0.85rem 1rem;">Portugal (IFICI)</th>
              <th style="padding: 0.85rem 1rem;">UAE (0% PIT)</th>
              <th style="padding: 0.85rem 1rem;">Italy (Impatriati)</th>
              <th style="padding: 0.85rem 1rem;">Thailand (DTV)</th>
              <th style="padding: 0.85rem 1rem;">Top Retention</th>
            </tr>
          </thead>
          <tbody>
            ${matrixRows}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Complete 50-Tier Salary Ladder Directory -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">Complete Statutory Salary Directory by Income Bracket</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.75rem;">
        Direct access to all 50 pre-calculated statutory compensation reports detailing gross-to-net conversions, marginal deductions, and disposable income:
      </p>
      ${directorySections}
    </section>

    <!-- Interactive Calculator Bridge -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem; background: linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(52, 211, 153, 0.05)); border: 1px solid rgba(56, 189, 248, 0.2);">
      <div style="max-width: 760px;">
        <h2 style="font-size: 1.4rem; color: #fff; margin-bottom: 0.5rem;">Need a Custom Compensation Calculation?</h2>
        <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.25rem;">
          Use our interactive financial calculator to simulate exact gross-to-net earnings, customize health insurance and local deductions, or compare employee versus independent contractor compensation side-by-side.
        </p>
        <a href="${rel}calculators/take-home-pay.html" class="btn-primary" style="display: inline-block; padding: 0.85rem 1.75rem; font-weight: 600; text-decoration: none; border-radius: var(--radius-sm); font-size: 0.95rem;">
          Launch Interactive Take-Home Pay Calculator →
        </a>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 1.5rem; color: #fff;">Frequently Asked Questions: Global Salary Benchmarks</h2>
      <div class="faq-accordion">
        ${faqsHtml}
      </div>
    </section>

    <!-- Verification Badge Section -->
    <section class="glass-panel" style="padding: 2rem 2.25rem; margin-bottom: 2.5rem; border-left: 3px solid #34D399;">
      <h2 style="font-size: 1.15rem; color: #fff; margin-bottom: 0.75rem;">Evidence-Anchored Statutory Benchmarking</h2>
      <p style="font-size: 0.88rem; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 1rem;">
        Statutory withholdings and tax brackets are derived from official publications by BOE (Spain), DRE (Portugal), Agenzia delle Entrate (Italy), UAE Federal Tax Authority, and Thailand Revenue Department.
      </p>
      <div style="font-size: 0.82rem; color: var(--color-text-secondary);">
        <span class="footer-status-badge">Tax tables verified 2026-10-18 · Living costs and social security: Remotax estimates</span>
      </div>
    </section>
  `;

  return {
    bodyHtml,
    content: {
      metaTitle: "2026 Remote Salary Tax Calculator Directory | Remotax",
      metaDescription: "Explore statutory take-home pay benchmarks across 5 top expat jurisdictions for 2026. Compare employee and contractor net salaries across 10 income brackets.",
      h1: "Global Remote Salary Tax Benchmarks 2026",
      faqs
    }
  };
}

function renderCountrySalaryHub({ page, country, rel, allPages }) {
  const cCode = country.countryCode;
  const cName = country.country;
  const shortCountry = cCode === 'AE' ? 'UAE' : cName;
  const { city, costEUR } = getSalaryCountryCity(cCode);
  const regime = getSalaryRegimeName(cCode);
  const slug = COUNTRY_SLUGS[cCode];
  const fxAED = fxData.rates.AED;
  const fxTHB = fxData.rates.THB;

  const ladderRows = SALARY_AMOUNTS.map(gross => {
    const emp = taxEngine.calculateTax({ grossIncome: gross, countryCode: cCode, workerType: 'employee', useSpecialRegime: true });
    const cont = taxEngine.calculateTax({ grossIncome: gross, countryCode: cCode, workerType: 'contractor', useSpecialRegime: true });
    const monthlyGross = Math.round(gross / 12);
    const monthlyNet = Math.round(emp.netAnnual / 12);
    const monthlySurplus = Math.max(0, monthlyNet - costEUR);

    let localGrossStr = '';
    let localNetStr = '';
    if (cCode === 'AE') {
      const grossAED = Math.round(gross * fxAED);
      const netAED = Math.round(emp.netAnnual * fxAED);
      localGrossStr = `<br><span style="font-size:0.75rem;color:var(--color-text-secondary);font-family:var(--font-sans);">AED ${grossAED.toLocaleString('en-US')}</span>`;
      localNetStr = `<br><span style="font-size:0.75rem;color:var(--color-text-secondary);font-family:var(--font-sans);">AED ${netAED.toLocaleString('en-US')}</span>`;
    } else if (cCode === 'TH') {
      const grossTHB = Math.round(gross * fxTHB);
      const netTHB = Math.round(emp.netAnnual * fxTHB);
      localGrossStr = `<br><span style="font-size:0.75rem;color:var(--color-text-secondary);font-family:var(--font-sans);">฿${grossTHB.toLocaleString('en-US')}</span>`;
      localNetStr = `<br><span style="font-size:0.75rem;color:var(--color-text-secondary);font-family:var(--font-sans);">฿${netTHB.toLocaleString('en-US')}</span>`;
    }

    return `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 0.9rem 1rem; font-family: var(--font-mono); font-weight: 600; color: #fff;">
          €${gross.toLocaleString('en-US')}${localGrossStr}
        </td>
        <td style="padding: 0.9rem 1rem; font-family: var(--font-mono); color: var(--color-text-secondary);">
          €${monthlyGross.toLocaleString('en-US')}
        </td>
        <td style="padding: 0.9rem 1rem; font-family: var(--font-mono); color: #34D399; font-weight: 700;">
          €${emp.netAnnual.toLocaleString('en-US')}${localNetStr}
        </td>
        <td style="padding: 0.9rem 1rem; font-family: var(--font-mono); color: #fff;">
          €${monthlyNet.toLocaleString('en-US')}
        </td>
        <td style="padding: 0.9rem 1rem; font-family: var(--font-mono); color: var(--color-tax);">
          ${emp.effectiveTaxRate}%
        </td>
        <td style="padding: 0.9rem 1rem; font-family: var(--font-mono); color: #38BDF8;">
          €${cont.netAnnual.toLocaleString('en-US')}
        </td>
        <td style="padding: 0.9rem 1rem; font-family: var(--font-mono); color: #F59E0B;">
          €${monthlySurplus.toLocaleString('en-US')}
        </td>
        <td style="padding: 0.9rem 1rem; text-align: right;">
          <a href="${rel}salary/${slug}/${gross}-eur/" style="color: var(--color-tax); text-decoration: none; font-size: 0.85rem; font-weight: 600;">
            View Report →
          </a>
        </td>
      </tr>`;
  }).join('');

  const faqs = [
    {
      q: `What is the average take-home pay across standard salary levels in ${shortCountry}?`,
      a: `In ${shortCountry} for tax year 2026, net take-home retention ranges from approximately 65% to 100% depending on gross compensation and qualification under ${regime.full}. On a standard benchmark salary of €50,000, qualifying remote employees retain approximately €${taxEngine.calculateTax({ grossIncome: 50000, countryCode: cCode, workerType: 'employee', useSpecialRegime: true }).netAnnual.toLocaleString('en-US')} net annually.`
    },
    {
      q: `How does ${regime.short} reduce tax liability for inbound professionals in ${shortCountry}?`,
      a: `${regime.full} provides targeted statutory tax advantages for expatriates and remote workers. By replacing progressive domestic tax brackets with flat withholding rates or generous base deductions, qualifying individuals can save thousands of euros annually compared to standard domestic resident taxation.`
    },
    {
      q: `Are mandatory social security contributions capped in ${shortCountry}?`,
      a: `Employee social security structures vary by jurisdiction. In Spain, contributions are capped at the base máxima (€5,101.20 monthly in 2026), whereas Italy applies the INPS massimale ceiling (€122,295). In the UAE, expatriate employees are exempt from statutory pension deductions.`
    },
    {
      q: `How much monthly savings can an expatriate maintain in ${city} on average salaries?`,
      a: `With estimated single-person living expenses averaging €${costEUR.toLocaleString('en-US')} per month in ${city}, remote professionals earning €75,000 gross achieve estimated discretionary savings of €${Math.max(0, Math.round(taxEngine.calculateTax({ grossIncome: 75000, countryCode: cCode, workerType: 'employee', useSpecialRegime: true }).netAnnual / 12) - costEUR).toLocaleString('en-US')} per month after all statutory deductions and living costs.`
    }
  ];

  const faqsHtml = faqs.map((f, i) => `
    <div class="faq-item" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1.25rem; margin-bottom: ${i === faqs.length - 1 ? '0' : '1.25rem'};">
      <h3 style="font-size: 1.08rem; color: #fff; margin-bottom: 0.5rem;">${escapeHTML(f.q)}</h3>
      <p style="color: var(--color-text-secondary); line-height: 1.6; font-size: 0.95rem; margin: 0;">${escapeHTML(f.a)}</p>
    </div>
  `).join('');

  const bodyHtml = `
    <!-- Hero Section -->
    <section class="hero-hub" style="padding: 3.5rem 0 2.5rem; text-align: center; position: relative;">
      <div style="max-width: 900px; margin: 0 auto;">
        <div class="pill-tag" style="margin-bottom: 1.25rem;">
          <span class="pill-dot"></span> Tax Year 2026 Statutory Salary Brackets • ${escapeHTML(shortCountry)}
        </div>
        <h1 style="font-size: clamp(2rem, 4.5vw, 3.2rem); line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 1.25rem;">
          ${escapeHTML(shortCountry)} Salary Tax Calculator 2026 <br>
          <span class="gradient-text">Gross-to-Net Pay Brackets &amp; Tiers</span>
        </h1>
        <p style="font-size: 1.15rem; color: var(--color-text-secondary); line-height: 1.6; max-width: 780px; margin: 0 auto 2.5rem;">
          Statutory gross-to-net take-home pay calculations across 10 compensation tiers in ${escapeHTML(shortCountry)} under ${escapeHTML(regime.full)}. Compare employee deductions, contractor net income, and living expenses in ${escapeHTML(city)}.
        </p>

        <!-- Metric Highlight Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; text-align: left;">
          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid #34D399;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Statutory Regime</div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #34D399;">${escapeHTML(regime.short)}</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">${escapeHTML(regime.full)}</div>
          </div>
          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid var(--color-tax);">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Capital Living Cost</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: var(--color-tax); font-family: var(--font-mono);">€${costEUR.toLocaleString('en-US')}</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Single professional in ${escapeHTML(city)}</div>
          </div>
          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid #38BDF8;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Salary Ladder Tiers</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #38BDF8; font-family: var(--font-mono);">10 Brackets</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">€30,000 to €200,000 Gross Range</div>
          </div>
          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid #F59E0B;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Calculation Standard</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #F59E0B; font-family: var(--font-mono);">2026 Rules</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Evidence-anchored tax tables</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 10-Tier Salary Ladder Table -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">2026 Salary Ladder &amp; Take-Home Pay in ${escapeHTML(shortCountry)}</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        Statutory gross-to-net salary breakdown across 10 compensation tiers for single remote employees and independent contractors in ${escapeHTML(shortCountry)}:
      </p>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.92rem;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.12); color: var(--color-text-secondary); font-size: 0.82rem; text-transform: uppercase;">
              <th style="padding: 0.85rem 1rem;">Gross Annual</th>
              <th style="padding: 0.85rem 1rem;">Gross Monthly</th>
              <th style="padding: 0.85rem 1rem;">Employee Net (Yr)</th>
              <th style="padding: 0.85rem 1rem;">Employee Net (Mo)</th>
              <th style="padding: 0.85rem 1rem;">Total Deductions</th>
              <th style="padding: 0.85rem 1rem;">Contractor Net</th>
              <th style="padding: 0.85rem 1rem;">Monthly Surplus</th>
              <th style="padding: 0.85rem 1rem; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${ladderRows}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Deep-Dive Statutory Analysis -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: #fff;">Statutory Rules &amp; Taxation Framework in ${escapeHTML(shortCountry)}</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.25rem;">
        Tax liability in ${escapeHTML(shortCountry)} depends on fiscal residency status, contract structure (employee vs independent contractor), and eligibility for specialized expatriate frameworks such as ${escapeHTML(regime.full)}.
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.5rem;">
          <h3 style="font-size: 1.15rem; color: var(--color-tax); margin: 0 0 0.5rem 0;">Progressive Tax Scale vs Flat Regimes</h3>
          <p style="color: var(--color-text-secondary); font-size: 0.92rem; line-height: 1.6; margin: 0;">
            Without special regime election, income is taxed under standard progressive brackets. For higher earnings (€75,000+), electing ${escapeHTML(regime.short)} provides substantial statutory insulation against escalating marginal rates.
          </p>
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.5rem;">
          <h3 style="font-size: 1.15rem; color: #34D399; margin: 0 0 0.5rem 0;">Mandatory Social Security Contributions</h3>
          <p style="color: var(--color-text-secondary); font-size: 0.92rem; line-height: 1.6; margin: 0;">
            Social security contributions fund healthcare and state pensions. In ${escapeHTML(shortCountry)}, statutory floors and ceilings determine withholding burdens for remote employees and self-employed professionals.
          </p>
        </div>
      </div>
    </section>

    <!-- Cost of Living & Purchasing Power -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">Cost of Living &amp; Disposable Income in ${escapeHTML(city)}</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        Estimated monthly expenditures for a single expatriate in ${escapeHTML(city)} average <strong>€${costEUR.toLocaleString('en-US')}</strong> (covering rental accommodation, utilities, groceries, and dining):
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.25rem;">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Benchmark Living Cost</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #fff; font-family: var(--font-mono); margin: 0.35rem 0;">€${costEUR.toLocaleString('en-US')} / mo</div>
          <div style="font-size: 0.78rem; color: var(--color-text-secondary);"><a href="${rel}methodology/#living-costs" style="color: var(--color-tax);">Remotax benchmark estimate</a></div>
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.25rem;">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Discretionary Surplus on €50,000</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #34D399; font-family: var(--font-mono); margin: 0.35rem 0;">
            €${Math.max(0, Math.round(taxEngine.calculateTax({ grossIncome: 50000, countryCode: cCode, workerType: 'employee', useSpecialRegime: true }).netAnnual / 12) - costEUR).toLocaleString('en-US')} / mo
          </div>
          <div style="font-size: 0.78rem; color: var(--color-text-secondary);">Remaining liquid cashflow</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.25rem;">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Discretionary Surplus on €100,000</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #38BDF8; font-family: var(--font-mono); margin: 0.35rem 0;">
            €${Math.max(0, Math.round(taxEngine.calculateTax({ grossIncome: 100000, countryCode: cCode, workerType: 'employee', useSpecialRegime: true }).netAnnual / 12) - costEUR).toLocaleString('en-US')} / mo
          </div>
          <div style="font-size: 0.78rem; color: var(--color-text-secondary);">Remaining liquid cashflow</div>
        </div>
      </div>
    </section>

    <!-- FAQs Section -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 1.5rem; color: #fff;">Frequently Asked Questions: ${escapeHTML(shortCountry)} Salaries</h2>
      <div class="faq-accordion">
        ${faqsHtml}
      </div>
    </section>

    <!-- Verification Badge Section -->
    <section class="glass-panel" style="padding: 2rem 2.25rem; margin-bottom: 2.5rem; border-left: 3px solid #34D399;">
      <h2 style="font-size: 1.15rem; color: #fff; margin-bottom: 0.75rem;">Evidence-Anchored Statutory Calculations</h2>
      <p style="font-size: 0.88rem; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 1rem;">
        Every statutory deduction on this page is computed using official legislation and published tax tables for tax year 2026.
      </p>
      <div style="font-size: 0.82rem; color: var(--color-text-secondary);">
        <span class="footer-status-badge">Tax tables verified 2026-10-18 · Living costs and social security: Remotax estimates</span>
      </div>
    </section>
  `;

  return {
    bodyHtml,
    content: {
      metaTitle: `${shortCountry} Salary Tax Calculator 2026 Tiers | Remotax`,
      metaDescription: `Calculate statutory take-home pay across 10 salary brackets in ${shortCountry} for 2026 under ${regime.short}. Review net income, tax deductions, and living costs.`,
      h1: `${shortCountry} Salary Tax Calculator (2026 Brackets & Net Pay)`,
      faqs
    }
  };
}

function renderSalaryPage({ page, country, grossEUR, rel, allPages }) {
  const cCode = country.countryCode;
  const cName = country.country;
  const shortCountry = cCode === 'AE' ? 'UAE' : cName;
  const { city, costEUR } = getSalaryCountryCity(cCode);
  const regime = getSalaryRegimeName(cCode);
  const grossFormatted = grossEUR.toLocaleString('en-US');
  const insight = TIER_SPECIFIC_INSIGHTS[grossEUR];
  const fxAED = fxData.rates.AED;
  const fxTHB = fxData.rates.THB;

  // Local currency formatting
  let localCurrencyStr = '';
  let localGrossHeaderStr = '';
  let localNetMonthlyStr = '';
  if (cCode === 'AE') {
    const grossAED = Math.round(grossEUR * fxAED);
    const monthlyNetAED = Math.round((grossEUR * fxAED) / 12);
    localCurrencyStr = ` (~AED ${grossAED.toLocaleString('en-US')})`;
    localGrossHeaderStr = ` (~AED ${grossAED.toLocaleString('en-US')})`;
    localNetMonthlyStr = ` (~AED ${monthlyNetAED.toLocaleString('en-US')}/mo)`;
  } else if (cCode === 'TH') {
    const grossTHB = Math.round(grossEUR * fxTHB);
    const monthlyNetTHB = Math.round((taxEngine.calculateTax({ grossIncome: grossEUR, countryCode: cCode, workerType: 'employee', useSpecialRegime: true }).netAnnual * fxTHB) / 12);
    localCurrencyStr = ` (~฿${grossTHB.toLocaleString('en-US')} THB)`;
    localGrossHeaderStr = ` (~฿${grossTHB.toLocaleString('en-US')} THB)`;
    localNetMonthlyStr = ` (~฿${monthlyNetTHB.toLocaleString('en-US')}/mo)`;
  }

  // Compute Engine Calculations
  const empRegime = taxEngine.calculateTax({ grossIncome: grossEUR, countryCode: cCode, workerType: 'employee', useSpecialRegime: true });
  const empStd = taxEngine.calculateTax({ grossIncome: grossEUR, countryCode: cCode, workerType: 'employee', useSpecialRegime: false });
  const contRegime = taxEngine.calculateTax({ grossIncome: grossEUR, countryCode: cCode, workerType: 'contractor', useSpecialRegime: true });
  const contStd = taxEngine.calculateTax({ grossIncome: grossEUR, countryCode: cCode, workerType: 'contractor', useSpecialRegime: false });

  const monthlyGross = Math.round(grossEUR / 12);
  const monthlyNet = Math.round(empRegime.netAnnual / 12);
  const monthlySavings = Math.max(0, monthlyNet - costEUR);
  const regimeAnnualAdvantage = Math.max(0, empRegime.netAnnual - empStd.netAnnual);

  // Salary ladder navigation
  const idx = SALARY_AMOUNTS.indexOf(grossEUR);
  const prevAmt = idx > 0 ? SALARY_AMOUNTS[idx - 1] : null;
  const nextAmt = idx < SALARY_AMOUNTS.length - 1 ? SALARY_AMOUNTS[idx + 1] : null;

  let marginalAnalysisHtml = '';
  if (nextAmt) {
    const nextEmp = taxEngine.calculateTax({ grossIncome: nextAmt, countryCode: cCode, workerType: 'employee', useSpecialRegime: true });
    const deltaGross = nextAmt - grossEUR;
    const deltaNet = nextEmp.netAnnual - empRegime.netAnnual;
    const deltaTax = deltaGross - deltaNet;
    const marginalRate = ((deltaTax / deltaGross) * 100).toFixed(1);
    marginalAnalysisHtml = `
      <div class="callout-box" style="margin-top: 1.5rem; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: var(--radius-md); padding: 1.5rem;">
        <h3 style="margin: 0 0 0.5rem 0; color: var(--color-tax); font-size: 1.1rem;">Marginal Retention &amp; Progression on Salary Growth</h3>
        <p style="margin: 0; line-height: 1.6; font-size: 0.95rem; color: #fff;">
          Transitioning from <strong>€${grossFormatted}</strong> to <strong>€${nextAmt.toLocaleString('en-US')}</strong> (+€${deltaGross.toLocaleString('en-US')} gross) yields an extra <strong>€${deltaNet.toLocaleString('en-US')}</strong> in annual take-home pay under ${escapeHTML(regime.short)}. Across this bracket increment, your effective marginal deduction rate is <strong>${marginalRate}%</strong>, retaining <strong>${(100 - marginalRate).toFixed(1)}%</strong> of the added gross compensation.
        </p>
      </div>`;
  }

  // Tier-Differentiated Bespoke FAQs
  let faqs = [];
  if (grossEUR <= 40000) {
    faqs = [
      {
        q: `What is the net monthly take-home pay on €${grossFormatted} in ${shortCountry}?`,
        a: `For tax year 2026, an individual earning an annual gross salary of €${grossFormatted} in ${shortCountry} retains approximately €${empRegime.netAnnual.toLocaleString('en-US')} net annually under ${regime.full}. This translates to a net monthly take-home compensation of €${monthlyNet.toLocaleString('en-US')} (or €${Math.round(empRegime.netAnnual / 52).toLocaleString('en-US')} per week), reflecting an effective total statutory deduction rate of ${empRegime.effectiveTaxRate}%.`
      },
      {
        q: `Does an annual salary of €${grossFormatted} satisfy visa requirements in ${shortCountry}?`,
        a: `${insight[cCode]}`
      },
      {
        q: `Is independent contractor or employee status more tax-efficient at €${grossFormatted}?`,
        a: `As a remote employee under ${regime.short}, net take-home is €${empRegime.netAnnual.toLocaleString('en-US')} per year. Operating as an independent contractor yields approximately €${contRegime.netAnnual.toLocaleString('en-US')}. At introductory earnings of €${grossFormatted}, personal tax allowances and standard deductions often reduce statutory employee liabilities relative to flat self-employed social security minimums.`
      },
      {
        q: `What is the expected discretionary savings margin on €${grossFormatted} in ${city}?`,
        a: `Benchmark living expenses for a single remote professional in ${city} average €${costEUR.toLocaleString('en-US')} per month. With a net monthly income of €${monthlyNet.toLocaleString('en-US')}, the estimated unallocated monthly surplus is €${monthlySavings.toLocaleString('en-US')} (a savings rate of ${((monthlySavings / monthlyNet) * 100).toFixed(1)}%).`
      }
    ];
  } else if (grossEUR <= 80000) {
    faqs = [
      {
        q: `How much net take-home pay remains from €${grossFormatted} under ${regime.short}?`,
        a: `In tax year 2026, an annual gross compensation of €${grossFormatted} in ${shortCountry} yields an estimated net take-home pay of €${empRegime.netAnnual.toLocaleString('en-US')} under ${regime.full}. This provides a steady net monthly compensation of €${monthlyNet.toLocaleString('en-US')} with an overall deduction rate of ${empRegime.effectiveTaxRate}%.`
      },
      {
        q: `What is the annual tax advantage of ${regime.short} vs standard tax brackets on €${grossFormatted}?`,
        a: `Under domestic progressive tax schedules without special regime election, an employee earning €${grossFormatted} retains €${empStd.netAnnual.toLocaleString('en-US')} net. Qualifying for ${regime.full} boosts net annual retention by €${regimeAnnualAdvantage.toLocaleString('en-US')}, providing an additional €${Math.round(regimeAnnualAdvantage / 12).toLocaleString('en-US')} in disposable monthly liquidity.`
      },
      {
        q: `How do social security deductions impact net salary on €${grossFormatted} in ${shortCountry}?`,
        a: `On an annual gross of €${grossFormatted}, statutory employee social security contributions total €${empRegime.socialSecurity.toLocaleString('en-US')} per year (€${Math.round(empRegime.socialSecurity / 12).toLocaleString('en-US')} monthly). For independent contractors, mandatory contributions equal €${contRegime.socialSecurity.toLocaleString('en-US')}, depending on domestic self-employment contribution bases.`
      },
      {
        q: `How does purchasing power on €${grossFormatted} in ${city} compare to European averages?`,
        a: `A salary of €${grossFormatted} delivers net monthly income of €${monthlyNet.toLocaleString('en-US')}. Subtracting estimated living expenses of €${costEUR.toLocaleString('en-US')} in ${city} leaves a discretionary cashflow surplus of €${monthlySavings.toLocaleString('en-US')} per month (retaining ${((monthlySavings / monthlyNet) * 100).toFixed(1)}% of net earnings for savings or investments).`
      }
    ];
  } else {
    faqs = [
      {
        q: `What is the effective statutory tax and deduction rate on €${grossFormatted} in ${shortCountry}?`,
        a: `For tax year 2026, an executive or senior specialist earning €${grossFormatted} in ${shortCountry} retains €${empRegime.netAnnual.toLocaleString('en-US')} net annually under ${regime.full}. Total statutory deductions (income tax and social security) equal €${(grossEUR - empRegime.netAnnual).toLocaleString('en-US')}, representing an effective combined deduction rate of ${empRegime.effectiveTaxRate}%.`
      },
      {
        q: `Are earnings of €${grossFormatted} subject to statutory social security contribution caps in ${shortCountry}?`,
        a: `At €${grossFormatted}, social security withholdings are influenced by domestic contribution ceilings (such as Spain base máxima of €61,214.40 or Italy INPS ceiling of €122,295). As a result, effective social security accounts for just €${empRegime.socialSecurity.toLocaleString('en-US')} of total compensation, maximizing marginal retention on executive earnings.`
      },
      {
        q: `How does ${shortCountry} treat high-income expatriates earning €${grossFormatted} vs standard progressive brackets?`,
        a: `Standard progressive tax schedules at €${grossFormatted} impose top marginal rates (up to 43%–48% in Europe). Utilizing ${regime.full} insulates high earners against top-bracket escalation, yielding €${regimeAnnualAdvantage.toLocaleString('en-US')} in annual statutory tax savings compared to non-qualifying residents.`
      },
      {
        q: `What net compensation can a cross-border contractor retain from €${grossFormatted} in ${shortCountry}?`,
        a: `As an independent contractor billing €${grossFormatted}, estimated statutory net take-home is €${contRegime.netAnnual.toLocaleString('en-US')} per year (effective deduction rate of ${contRegime.effectiveTaxRate}%). High-earning contractors often explore incorporated single-member corporate vehicles or small business exemptions where permitted.`
      }
    ];
  }

  const faqsHtml = faqs.map((f, i) => `
    <div class="faq-item" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1.25rem; margin-bottom: ${i === faqs.length - 1 ? '0' : '1.25rem'};">
      <h3 style="font-size: 1.08rem; color: #fff; margin-bottom: 0.5rem;">${escapeHTML(f.q)}</h3>
      <p style="color: var(--color-text-secondary); line-height: 1.6; font-size: 0.95rem; margin: 0;">${escapeHTML(f.a)}</p>
    </div>
  `).join('');

  // Cross-border comparison table rows for this exact salary
  const peerRows = ['ES', 'PT', 'AE', 'IT', 'TH'].map(code => {
    const cObj = REMOTAX_COUNTRIES[code];
    const { city: pCity, costEUR: pCost } = getSalaryCountryCity(code);
    const pRes = taxEngine.calculateTax({ grossIncome: grossEUR, countryCode: code, workerType: 'employee', useSpecialRegime: true });
    const pNetMonthly = Math.round(pRes.netAnnual / 12);
    const pSavings = Math.max(0, pNetMonthly - pCost);
    const isCurrent = code === cCode;
    const pSlug = COUNTRY_SLUGS[code];

    return `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); ${isCurrent ? 'background: rgba(56, 189, 248, 0.08); font-weight: 600;' : ''}">
        <td style="padding: 1rem;">
          ${isCurrent ? `<strong>${cObj.country} (Current)</strong>` : `<a href="${rel}salary/${pSlug}/${grossEUR}-eur/" style="color: var(--color-tax); text-decoration: none; font-weight: 500;">${cObj.country}</a>`}
        </td>
        <td style="padding: 1rem; font-family: var(--font-mono); color: var(--color-net);">€${pRes.netAnnual.toLocaleString('en-US')}</td>
        <td style="padding: 1rem; font-family: var(--font-mono); color: #fff;">€${pNetMonthly.toLocaleString('en-US')}</td>
        <td style="padding: 1rem; font-family: var(--font-mono); color: var(--color-tax);">${pRes.effectiveTaxRate}%</td>
        <td style="padding: 1rem; color: var(--color-text-secondary);">${pCity} (€${pCost.toLocaleString('en-US')})</td>
        <td style="padding: 1rem; font-family: var(--font-mono); color: #34D399;">€${pSavings.toLocaleString('en-US')} / mo</td>
      </tr>`;
  }).join('');

  const bodyHtml = `
    <!-- Hero Section -->
    <section class="hero-hub" style="padding: 3.5rem 0 2.5rem; text-align: center; position: relative;">
      <div style="max-width: 900px; margin: 0 auto;">
        <div class="pill-tag" style="margin-bottom: 1.25rem;">
          <span class="pill-dot"></span> Tax Year 2026 Statutory Calculation • ${escapeHTML(shortCountry)}
        </div>
        <h1 style="font-size: clamp(2rem, 4.5vw, 3.2rem); line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 1.25rem;">
          Tax on €${grossFormatted}${localGrossHeaderStr} Salary in ${escapeHTML(shortCountry)} <br>
          <span class="gradient-text">2026 Take-Home Pay &amp; Net Calculation</span>
        </h1>
        <p style="font-size: 1.15rem; color: var(--color-text-secondary); line-height: 1.6; max-width: 760px; margin: 0 auto 2.5rem;">
          Comprehensive compensation breakdown on €${grossFormatted} gross income in ${escapeHTML(shortCountry)} for single remote employees and independent contractors under ${escapeHTML(regime.full)}.
        </p>

        <!-- Metric Highlight Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; text-align: left;">
          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid #34D399;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Net Annual Take-Home</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #34D399; font-family: var(--font-mono);">€${empRegime.netAnnual.toLocaleString('en-US')}</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">€${monthlyNet.toLocaleString('en-US')} / month${localNetMonthlyStr}</div>
          </div>

          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid var(--color-tax);">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Total Effective Deductions</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: var(--color-tax); font-family: var(--font-mono);">${empRegime.effectiveTaxRate}%</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Taxes: €${empRegime.incomeTax.toLocaleString('en-US')} • SS: €${empRegime.socialSecurity.toLocaleString('en-US')}</div>
          </div>

          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid #38BDF8;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Monthly Disposable Savings</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #38BDF8; font-family: var(--font-mono);">€${monthlySavings.toLocaleString('en-US')}</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">In ${escapeHTML(city)} after €${costEUR.toLocaleString('en-US')} living cost</div>
          </div>

          <div class="glass-panel" style="padding: 1.5rem; border-top: 3px solid #F59E0B;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: 0.5rem;">Special Regime Benefit</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #F59E0B; font-family: var(--font-mono);">+€${regimeAnnualAdvantage.toLocaleString('en-US')}</div>
            <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Annual savings vs standard tax scale</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 1: Detailed Paycheck Breakdown -->
    <section class="glass-panel" style="padding: 2.5rem 2rem; margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">Detailed Paycheck Breakdown for €${grossFormatted}</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        The table below details statutory deductions on an annual gross compensation of €${grossFormatted} in ${escapeHTML(shortCountry)} for tax year 2026 under ${escapeHTML(regime.full)}.
      </p>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.12); color: var(--color-text-secondary); font-size: 0.85rem; text-transform: uppercase;">
              <th style="padding: 0.85rem 1rem;">Compensation Metric</th>
              <th style="padding: 0.85rem 1rem;">Employee (Annual)</th>
              <th style="padding: 0.85rem 1rem;">Employee (Monthly)</th>
              <th style="padding: 0.85rem 1rem;">Contractor (Annual)</th>
              <th style="padding: 0.85rem 1rem;">Contractor (Monthly)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 0.85rem 1rem; font-weight: 600; color: #fff;">Gross Compensation</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono);">€${grossFormatted}</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono);">€${monthlyGross.toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono);">€${grossFormatted}</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono);">€${monthlyGross.toLocaleString('en-US')}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">Statutory Income Tax</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-tax);">€${empRegime.incomeTax.toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-tax);">€${Math.round(empRegime.incomeTax / 12).toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-tax);">€${contRegime.incomeTax.toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-tax);">€${Math.round(contRegime.incomeTax / 12).toLocaleString('en-US')}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">Mandatory Social Security</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-tax);">€${empRegime.socialSecurity.toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-tax);">€${Math.round(empRegime.socialSecurity / 12).toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-tax);">€${contRegime.socialSecurity.toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: var(--color-tax);">€${Math.round(contRegime.socialSecurity / 12).toLocaleString('en-US')}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.12); background: rgba(52, 211, 153, 0.06);">
              <td style="padding: 0.85rem 1rem; font-weight: 700; color: #34D399;">Net Take-Home Pay</td>
              <td style="padding: 0.85rem 1rem; font-weight: 700; font-family: var(--font-mono); color: #34D399;">€${empRegime.netAnnual.toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-weight: 700; font-family: var(--font-mono); color: #34D399;">€${monthlyNet.toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-weight: 700; font-family: var(--font-mono); color: #34D399;">€${contRegime.netAnnual.toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; font-weight: 700; font-family: var(--font-mono); color: #34D399;">€${Math.round(contRegime.netAnnual / 12).toLocaleString('en-US')}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">Weekly Take-Home (52 wks)</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: #fff;">€${Math.round(empRegime.netAnnual / 52).toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">—</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: #fff;">€${Math.round(contRegime.netAnnual / 52).toLocaleString('en-US')}</td>
              <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">—</td>
            </tr>
            <tr>
              <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">Hourly Rate (1,920 hrs/yr)</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: #fff;">€${(empRegime.netAnnual / 1920).toFixed(2)}/hr</td>
              <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">—</td>
              <td style="padding: 0.85rem 1rem; font-family: var(--font-mono); color: #fff;">€${(contRegime.netAnnual / 1920).toFixed(2)}/hr</td>
              <td style="padding: 0.85rem 1rem; color: var(--color-text-secondary);">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 2: Statutory Rules & Bracket Analysis -->
    <section class="glass-panel" style="padding: 2.5rem 2rem; margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: #fff;">Statutory Rules &amp; Tax Bracket Analysis for €${grossFormatted}</h2>
      <h3 style="font-size: 1.2rem; color: var(--color-tax); margin: 0.5rem 0 0.75rem;">${escapeHTML(insight.title)}</h3>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.25rem;">
        ${escapeHTML(insight[cCode])}
      </p>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.7; margin-bottom: 0;">
        Under standard domestic tax schedules (without special regime qualification), an employee earning €${grossFormatted} in ${escapeHTML(shortCountry)} retains <strong>€${empStd.netAnnual.toLocaleString('en-US')}</strong> annually (effective total deduction rate of <strong>${empStd.effectiveTaxRate}%</strong>). Utilizing ${escapeHTML(regime.full)} enhances annual net retention by <strong>€${regimeAnnualAdvantage.toLocaleString('en-US')}</strong>, boosting monthly disposable income by <strong>€${Math.round(regimeAnnualAdvantage / 12).toLocaleString('en-US')}</strong>.
      </p>

      ${marginalAnalysisHtml}
    </section>

    <!-- Section 3: Cost of Living & Purchasing Power -->
    <section class="glass-panel" style="padding: 2.5rem 2rem; margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">Cost of Living &amp; Disposable Income in ${escapeHTML(city)}</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        With an annual compensation of €${grossFormatted}, your net take-home is <strong>€${monthlyNet.toLocaleString('en-US')}</strong> per month. Based on Remotax modeled living cost benchmarks for a single remote worker in ${escapeHTML(city)}:
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.25rem;">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Benchmark Living Cost</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #fff; font-family: var(--font-mono); margin: 0.35rem 0;">€${costEUR.toLocaleString('en-US')} / mo</div>
          <div style="font-size: 0.78rem; color: var(--color-text-secondary);"><a href="${rel}methodology/#living-costs" style="color: var(--color-tax);">Remotax estimate (see methodology)</a></div>
        </div>

        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.25rem;">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Discretionary Surplus</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #34D399; font-family: var(--font-mono); margin: 0.35rem 0;">€${monthlySavings.toLocaleString('en-US')} / mo</div>
          <div style="font-size: 0.78rem; color: var(--color-text-secondary);">Remaining unallocated cashflow</div>
        </div>

        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.25rem;">
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">Monthly Savings Rate</div>
          <div style="font-size: 1.4rem; font-weight: 700; color: #38BDF8; font-family: var(--font-mono); margin: 0.35rem 0;">${((monthlySavings / monthlyNet) * 100).toFixed(1)}%</div>
          <div style="font-size: 0.78rem; color: var(--color-text-secondary);">Of net take-home compensation</div>
        </div>
      </div>
    </section>

    <!-- Section 4: Employee vs Independent Contractor Taxation -->
    <section class="glass-panel" style="padding: 2.5rem 2rem; margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">Employee vs Independent Contractor Taxation on €${grossFormatted}</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        Detailed statutory comparison of net compensation, tax obligations, and social security between remote employment and freelance contracts in ${escapeHTML(shortCountry)}:
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
        <div id="employee" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.5rem;">
          <h3 style="font-size: 1.15rem; color: #34D399; margin: 0 0 0.75rem 0;">Remote Employee Status</h3>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 0.75rem;">
            Under remote employment, statutory social security is shared with the employer. Net annual take-home is <strong>€${empRegime.netAnnual.toLocaleString('en-US')}</strong> (€${monthlyNet.toLocaleString('en-US')}/mo), offering full labor law protection and predictable withholdings.
          </p>
          <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-tax);">Effective rate: ${empRegime.effectiveTaxRate}%</div>
        </div>
        <div id="contractor" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 1.5rem;">
          <h3 style="font-size: 1.15rem; color: #38BDF8; margin: 0 0 0.75rem 0;">Independent Contractor Status</h3>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 0.75rem;">
            Operating as an independent contractor delivers <strong>€${contRegime.netAnnual.toLocaleString('en-US')}</strong> (€${Math.round(contRegime.netAnnual / 12).toLocaleString('en-US')}/mo). Contractors must manage their own self-employed social security declarations but may deduct legitimate business expenditures.
          </p>
          <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-tax);">Effective rate: ${contRegime.effectiveTaxRate}%</div>
        </div>
      </div>
    </section>

    <!-- Section 5: Cross-Country Benchmark Matrix -->
    <section class="glass-panel" style="padding: 2.5rem 2rem; margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #fff;">How €${grossFormatted} Compares Across Top Remote Jurisdictions</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        Review how an identical compensation of €${grossFormatted} performs across Europe and Asia under qualifying statutory regimes:
      </p>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.92rem;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.12); color: var(--color-text-secondary); font-size: 0.82rem; text-transform: uppercase;">
              <th style="padding: 0.85rem 1rem;">Jurisdiction</th>
              <th style="padding: 0.85rem 1rem;">Annual Net</th>
              <th style="padding: 0.85rem 1rem;">Monthly Net</th>
              <th style="padding: 0.85rem 1rem;">Effective Rate</th>
              <th style="padding: 0.85rem 1rem;">Capital City Cost</th>
              <th style="padding: 0.85rem 1rem;">Monthly Surplus</th>
            </tr>
          </thead>
          <tbody>
            ${peerRows}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 6: Salary Stepping Ladder -->
    <section class="glass-panel" style="padding: 2.5rem 2rem; margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: #fff;">Explore Adjacent Salary Levels in ${escapeHTML(shortCountry)}</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
        Explore take-home pay calculations for other common compensation levels in ${escapeHTML(shortCountry)}:
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
        ${prevAmt ? `
          <a href="${rel}salary/${COUNTRY_SLUGS[cCode]}/${prevAmt}-eur/" class="glass-card" style="padding: 1.25rem; text-decoration: none; display: flex; flex-direction: column; gap: 0.35rem;">
            <span style="font-size: 0.8rem; color: var(--color-text-secondary);">← Previous Step</span>
            <span style="font-size: 1.15rem; font-weight: 700; color: #fff;">€${prevAmt.toLocaleString('en-US')} Salary in ${escapeHTML(shortCountry)}</span>
            <span style="font-size: 0.85rem; color: var(--color-tax);">View €${prevAmt.toLocaleString('en-US')} Net Breakdown</span>
          </a>` : ''}

        ${nextAmt ? `
          <a href="${rel}salary/${COUNTRY_SLUGS[cCode]}/${nextAmt}-eur/" class="glass-card" style="padding: 1.25rem; text-decoration: none; display: flex; flex-direction: column; gap: 0.35rem;">
            <span style="font-size: 0.8rem; color: var(--color-text-secondary);">Next Step →</span>
            <span style="font-size: 1.15rem; font-weight: 700; color: #fff;">€${nextAmt.toLocaleString('en-US')} Salary in ${escapeHTML(shortCountry)}</span>
            <span style="font-size: 0.85rem; color: var(--color-tax);">View €${nextAmt.toLocaleString('en-US')} Net Breakdown</span>
          </a>` : ''}
      </div>
    </section>

    <!-- Section 7: FAQs -->
    <section class="glass-panel" style="margin-bottom: 2.5rem; padding: 2.5rem 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 1.5rem; color: #fff;">Frequently Asked Questions: €${grossFormatted} in ${escapeHTML(shortCountry)}</h2>
      <div class="faq-accordion">
        ${faqsHtml}
      </div>
    </section>

    <!-- Section 8: Verification Badge -->
    <section class="glass-panel" style="padding: 2rem 2.25rem; margin-bottom: 2.5rem; border-left: 3px solid #34D399;">
      <h2 style="font-size: 1.15rem; color: #fff; margin-bottom: 0.75rem;">Evidence-Anchored Statutory Calculations</h2>
      <p style="font-size: 0.88rem; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 1rem;">
        Every statutory withholding in this report is derived from official tax codes and gazette publications, including BOE, DRE, Agenzia delle Entrate, UAE FTA, and Thailand Revenue Code.
      </p>
      <div style="font-size: 0.82rem; color: var(--color-text-secondary);">
        <span class="footer-status-badge">Tax tables verified 2026-10-18 · Living costs and social security: Remotax estimates</span>
      </div>
    </section>
  `;

  return {
    bodyHtml,
    content: {
      metaTitle: `€${grossFormatted} Salary in ${shortCountry} (2026 Net) | Remotax`,
      metaDescription: `Take-home pay on €${grossFormatted}${localCurrencyStr} salary in ${shortCountry} for 2026. Net monthly: €${monthlyNet.toLocaleString('en-US')}. Statutory deductions, living costs, and contractor breakdown.`,
      h1: `Tax on €${grossFormatted}${localCurrencyStr} Salary in ${shortCountry} (2026 Net Pay)`,
      faqs
    }
  };
}

// ----------------------------------------------------------------------
// GENERATION ENGINE MAIN EXECUTION
// ----------------------------------------------------------------------
const redirectsList = [
  { oldPath: 'comparisons/spain-vs-portugal.html', newPath: 'comparisons/spain-vs-portugal/' },
  { oldPath: 'tax-calculator/spain.html', newPath: 'countries/spain/' },
  { oldPath: 'tax-calculator/spain', newPath: 'countries/spain/' },
  { oldPath: 'tax-calculator/portugal.html', newPath: 'countries/portugal/' },
  { oldPath: 'tax-calculator/portugal', newPath: 'countries/portugal/' },
  { oldPath: 'tax-calculator/uae.html', newPath: 'countries/uae/' },
  { oldPath: 'tax-calculator/uae', newPath: 'countries/uae/' },
  { oldPath: 'article-spain-beckham-law.html', newPath: 'regimes/beckham-law-spain/' },
  { oldPath: 'article-spain-beckham-law', newPath: 'regimes/beckham-law-spain/' },
  { oldPath: 'article-portugal-d8-nhr.html', newPath: 'regimes/ifici-portugal/' },
  { oldPath: 'article-portugal-d8-nhr', newPath: 'regimes/ifici-portugal/' },
  { oldPath: 'article-dubai-zero-tax.html', newPath: 'regimes/dubai-virtual-working-programme/' },
  { oldPath: 'article-dubai-zero-tax', newPath: 'regimes/dubai-virtual-working-programme/' },
  { oldPath: 'article-italy-impatriati-tax.html', newPath: 'regimes/impatriati-italy/' },
  { oldPath: 'article-italy-impatriati-tax', newPath: 'regimes/impatriati-italy/' },
  { oldPath: 'article-thailand-dtv-visa.html', newPath: 'regimes/thailand-dtv/' },
  { oldPath: 'article-thailand-dtv-visa', newPath: 'regimes/thailand-dtv/' }
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

let generatedPagesCount = 0;

// Process Each Page
activeSeoPages.forEach(page => {
  const rel = getRelativeDepth(page.path);
  const canonicalUrl = `${config.BASE_URL}${page.path}`;

  let bodyHtml = '';
  let content = null;

  if (page.pageType === 'salary') {
    const country = REMOTAX_COUNTRIES[page.countryCode];
    const rendered = renderSalaryPage({
      page,
      country,
      grossEUR: page.grossEUR,
      rel,
      allPages: activeSeoPages
    });
    bodyHtml = rendered.bodyHtml;
    content = rendered.content;
  } else if (page.pageType === 'salary-hub') {
    if (!page.countryCode) {
      const rendered = renderSalaryMasterHub({ page, rel, allPages: activeSeoPages });
      bodyHtml = rendered.bodyHtml;
      content = rendered.content;
    } else {
      const country = REMOTAX_COUNTRIES[page.countryCode];
      const rendered = renderCountrySalaryHub({ page, country, rel, allPages: activeSeoPages });
      bodyHtml = rendered.bodyHtml;
      content = rendered.content;
    }
  } else {
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
    content = interpolate(rawContent);

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
  { path: 'article-germany-expat-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-uk-income-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-usa-expat-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-netherlands-30-ruling', changefreq: 'monthly', priority: '0.75' },
  { path: 'article-singapore-territorial-tax', changefreq: 'monthly', priority: '0.75' },
  { path: 'tax-calculator/germany', changefreq: 'weekly', priority: '0.9' },
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
  'sitemap-salaries.xml': activeSeoPages.filter(p => p.pageType === 'salary' || p.pageType === 'salary-hub'),
  'sitemap-pages.xml': [
    ...existingPublicPages,
    ...activeSeoPages.filter(p => p.pageType === 'methodology')
  ]
};

const lastModDate = new Date().toISOString().split('T')[0];

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
wave1HtaccessRules += `# 301 Redirect legacy country calculators to modern country hubs\n`;
wave1HtaccessRules += `RewriteRule ^tax-calculator/spain(?:\\.html)?$ countries/spain/ [R=301,L]\n`;
wave1HtaccessRules += `RewriteRule ^tax-calculator/portugal(?:\\.html)?$ countries/portugal/ [R=301,L]\n`;
wave1HtaccessRules += `RewriteRule ^tax-calculator/uae(?:\\.html)?$ countries/uae/ [R=301,L]\n\n`;
wave1HtaccessRules += `# 301 Redirect legacy regime articles to modern regime hubs\n`;
wave1HtaccessRules += `RewriteRule ^article-spain-beckham-law(?:\\.html)?$ regimes/beckham-law-spain/ [R=301,L]\n`;
wave1HtaccessRules += `RewriteRule ^article-portugal-d8-nhr(?:\\.html)?$ regimes/ifici-portugal/ [R=301,L]\n`;
wave1HtaccessRules += `RewriteRule ^article-dubai-zero-tax(?:\\.html)?$ regimes/dubai-virtual-working-programme/ [R=301,L]\n`;
wave1HtaccessRules += `RewriteRule ^article-italy-impatriati-tax(?:\\.html)?$ regimes/impatriati-italy/ [R=301,L]\n`;
wave1HtaccessRules += `RewriteRule ^article-thailand-dtv-visa(?:\\.html)?$ regimes/thailand-dtv/ [R=301,L]\n\n`;
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
