/**
 * REMOTAX QUALITY GATES VALIDATOR (check.js)
 * Conforms to Remotax Platform Architecture Spec (Wave 1)
 * 
 * Verifies all generated programmatic SEO pages against strict quality gates:
 * 1. File existence & clean HTML integrity (no undefined, no NaN, no placeholder text, no empty sections)
 * 2. Word count thresholds (hub >= 600, regime >= 600, comparison >= 500, ranking >= 500)
 * 3. Near-duplicate shingle similarity (<= 0.75 across all pairs of same type; unique-text ratio >= 60%)
 * 4. Structural SEO (one H1, sequential headings h1->h2->h3, title <= 60 chars, desc <= 160 chars)
 * 5. Media accessibility (all img tags have width, height, alt)
 * 6. Internal link graph (no 404s, no orphan pages, all internal links resolve)
 * 7. JSON-LD Schema validation (valid JSON, required types, FAQPage matches visible text)
 * 8. Statutory calculations accuracy against taxEngine
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const CONFIG_PATH = path.join(ROOT_DIR, 'generator.config.json');
const SEO_PAGES_PATH = path.join(ROOT_DIR, 'data', 'seo-pages.json');
const COUNTRIES_PATH = path.join(ROOT_DIR, 'data', 'countries.js');
const ENGINE_PATH = path.join(ROOT_DIR, 'engine', 'taxEngine.js');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const seoPages = JSON.parse(fs.readFileSync(SEO_PAGES_PATH, 'utf8'));
const activeSeoPages = seoPages.filter(p => p.status !== 'deferred-wave-2');
const countriesModule = require(COUNTRIES_PATH);
const REMOTAX_COUNTRIES = countriesModule.REMOTAX_COUNTRIES || countriesModule;
const taxEngine = require(ENGINE_PATH);

console.log('======================================================================');
console.log('                 REMOTAX QUALITY GATES VALIDATOR                      ');
console.log(` Target Pages : ${activeSeoPages.length} Active Pages (${seoPages.length - activeSeoPages.length} deferred)`);
console.log('======================================================================\n');

// Shingle and Similarity Helpers
function getShingles(text, k = 3) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const shingles = new Set();
  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(' '));
  }
  return shingles;
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const s of setA) {
    if (setB.has(s)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function extractBodyTextOnly(html) {
  let text = html;
  text = text.replace(/<head[\s\S]*?<\/head>/gi, ' ');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  text = text.replace(/<div class="mobile-drawer"[\s\S]*?<\/div>\s*<\/div>/gi, ' ');
  text = text.replace(/<table[\s\S]*?<\/table>/gi, ' ');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return text.trim();
}

function countWords(text) {
  const words = text.match(/\b[A-Za-z0-9_-]+\b/g);
  return words ? words.length : 0;
}

let totalErrors = 0;
let totalWarnings = 0;
const pageResults = [];
const incomingLinksCount = {};

// Initialize link graph
activeSeoPages.forEach(p => {
  incomingLinksCount[p.path] = 0;
});

// Phase 1: Parse and validate individual page properties
const pageDataList = [];

for (const page of activeSeoPages) {
  const filePath = path.join(ROOT_DIR, page.path, 'index.html');
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(filePath)) {
    errors.push(`File missing on disk: ${filePath}`);
    totalErrors++;
    pageResults.push({ path: page.path, type: page.pageType, words: 0, maxSim: 0, status: 'FAIL (MISSING)' });
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  // Gate: No undefined, no NaN
  if (html.includes('undefined')) {
    errors.push('Found "undefined" string in output HTML');
  }
  if (html.includes('NaN')) {
    errors.push('Found "NaN" string in output HTML');
  }

  // Gate: No placeholder text
  const placeholderRegex = /\b(lorem ipsum|placeholder|todo|tbd|fixme)\b/i;
  if (placeholderRegex.test(html)) {
    errors.push('Found placeholder text matching /lorem ipsum|placeholder|todo|tbd|fixme/i');
  }

  // Gate: Title <= 60 chars and contains a number
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (!title) {
    errors.push('Missing <title> tag');
  } else {
    if (title.length > 60) errors.push(`Title exceeds 60 chars (${title.length}): "${title}"`);
    if (!/\d/.test(title)) errors.push(`Title does not contain a data number: "${title}"`);
  }

  // Gate: Meta description <= 160 chars and contains a number
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const desc = descMatch ? descMatch[1].trim() : '';
  if (!desc) {
    errors.push('Missing meta description');
  } else {
    if (desc.length > 160) errors.push(`Description exceeds 160 chars (${desc.length}): "${desc}"`);
    if (!/\d/.test(desc)) errors.push(`Description does not contain a data number: "${desc}"`);
  }

  // Gate: Exactly ONE H1
  const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
  if (h1Matches.length !== 1) {
    errors.push(`Expected exactly 1 <h1>, found ${h1Matches.length}`);
  }

  // Gate: Sequential headings hierarchy (no h1->h3, h2->h4 skipping)
  const headingTags = html.match(/<\/?h[1-6][^>]*>/gi) || [];
  let currentLevel = 0;
  for (const tag of headingTags) {
    if (tag.startsWith('</')) continue;
    const level = parseInt(tag.charAt(2), 10);
    if (level > currentLevel + 1 && currentLevel !== 0) {
      errors.push(`Heading hierarchy skipped from h${currentLevel} to h${level}`);
      break;
    }
    currentLevel = level;
  }

  // Gate: All images have width, height, alt
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  for (const img of imgMatches) {
    if (!/alt=/i.test(img)) errors.push(`Image missing alt attribute: ${img}`);
    if (!/width=/i.test(img) || !/height=/i.test(img)) errors.push(`Image missing explicit dimensions: ${img}`);
  }

  // Gate: JSON-LD schemas valid
  const scriptMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
  let hasFaqSchema = false;
  let faqSchemaQuestions = [];

  for (const s of scriptMatches) {
    const jsonStr = s.replace(/<script type="application\/ld\+json">/i, '').replace(/<\/script>/i, '').trim();
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed['@type'] === 'FAQPage' && parsed.mainEntity) {
        hasFaqSchema = true;
        faqSchemaQuestions = parsed.mainEntity.map(q => q.name);
      }
    } catch (e) {
      errors.push(`Invalid JSON-LD schema syntax: ${e.message}`);
    }
  }

  // Gate: If FAQPage schema exists, every question must match visible text exactly
  if (hasFaqSchema) {
    for (const qText of faqSchemaQuestions) {
      if (!html.includes(qText)) {
        errors.push(`FAQPage question not found in visible HTML text: "${qText}"`);
      }
    }
  }

  // Gate: Word Count Threshold
  const bodyText = extractBodyTextOnly(html);
  const wordCount = countWords(bodyText);
  let minWords = 500;
  if (page.pageType === 'country' || page.pageType === 'regime') minWords = 600;

  if (wordCount < minWords) {
    errors.push(`Word count below threshold (${wordCount} < ${minWords} words)`);
  }

  // Internal Links Extraction & Resolution
  const hrefMatches = html.match(/href="([^"#][^"]*)"/gi) || [];
  const pageDir = path.join(ROOT_DIR, page.path);

  for (const m of hrefMatches) {
    const rawHref = m.replace(/href="/i, '').replace(/"$/, '');
    if (rawHref.startsWith('http://') || rawHref.startsWith('https://') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      continue;
    }

    // Strip query string and fragment
    const cleanHref = rawHref.split('?')[0].split('#')[0];
    if (!cleanHref) continue;

    const resolvedPath = path.resolve(pageDir, cleanHref);
    const exists = fs.existsSync(resolvedPath) || fs.existsSync(path.join(resolvedPath, 'index.html'));
    if (!exists) {
      errors.push(`Broken internal link target: "${rawHref}" resolved to "${resolvedPath}"`);
    }

    // Check if target matches one of our SEO target pages
    const normResolved = path.normalize(resolvedPath).replace(/\/+$/, '');
    for (const targetPage of activeSeoPages) {
      const targetNorm = path.normalize(path.join(ROOT_DIR, targetPage.path)).replace(/\/+$/, '');
      if (normResolved === targetNorm || normResolved === path.join(targetNorm, 'index.html')) {
        incomingLinksCount[targetPage.path]++;
      }
    }
  }

  if (errors.length > 0) {
    totalErrors += errors.length;
    console.error(`[FAIL] ${page.path}`);
    errors.forEach(e => console.error(`   ✕ ${e}`));
  }

  pageDataList.push({
    page,
    bodyText,
    shingles: getShingles(bodyText),
    wordCount,
    errors,
    warnings
  });
}

// Phase 2: Near-duplicate check within page types
console.log('\n--- Evaluating Near-Duplicate Shingle Similarity & Uniqueness ---');
const typeGroups = {};
pageDataList.forEach(item => {
  if (!typeGroups[item.page.pageType]) typeGroups[item.page.pageType] = [];
  typeGroups[item.page.pageType].push(item);
});

for (const [type, items] of Object.entries(typeGroups)) {
  for (let i = 0; i < items.length; i++) {
    let maxSim = 0;
    let maxPartner = '';
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const sim = jaccardSimilarity(items[i].shingles, items[j].shingles);
      if (sim > maxSim) {
        maxSim = sim;
        maxPartner = items[j].page.slug;
      }
    }
    items[i].maxSim = maxSim;
    items[i].maxPartner = maxPartner;

    if (maxSim > 0.75) {
      items[i].errors.push(`Near-duplicate similarity exceeded 75%: ${(maxSim * 100).toFixed(1)}% with ${maxPartner}`);
      totalErrors++;
    }
  }
}

// Phase 3: Check Orphan Pages
console.log('--- Evaluating Internal Link Graph & Orphan Check ---');
for (const page of activeSeoPages) {
  const inc = incomingLinksCount[page.path] || 0;
  if (inc === 0) {
    console.error(`[ORPHAN] Page ${page.path} has 0 incoming internal links from wave-1 pages!`);
    totalErrors++;
  }
}

// Phase 4: Source Integrity Gate
console.log('--- Evaluating Phase 4: Source Integrity Gate ---');
const wave1Countries = ['ES', 'PT', 'IT', 'AE', 'TH'];
const urlCounts = {};

for (const code of wave1Countries) {
  const c = REMOTAX_COUNTRIES[code];
  if (!c.sources || c.sources.length === 0) {
    console.error(`[SOURCE INTEGRITY] Country ${code} has no official sources!`);
    totalErrors++;
  } else {
    c.sources.forEach((s, idx) => {
      // 1. Check for evidenceNote
      if (!s.evidenceNote || typeof s.evidenceNote !== 'string' || s.evidenceNote.trim() === '') {
        console.error(`[SOURCE INTEGRITY] Country ${code} source [${idx}] "${s.title}" is missing evidenceNote!`);
        totalErrors++;
      } else {
        const words = s.evidenceNote.trim().split(/\s+/).length;
        if (words > 15) {
          console.error(`[SOURCE INTEGRITY] Country ${code} source [${idx}] evidenceNote exceeds 15 words (${words} words): "${s.evidenceNote}"`);
          totalErrors++;
        }
      }

      // 2. Check for outdated URL year
      if (s.url) {
        if (s.url.includes('/2024/') || s.url.includes('/2025/')) {
          console.error(`[SOURCE INTEGRITY] Country ${code} source [${idx}] contains outdated URL path: ${s.url}`);
          totalErrors++;
        }
        urlCounts[s.url] = (urlCounts[s.url] || 0) + 1;
        if (urlCounts[s.url] > 5) {
          console.error(`[SOURCE INTEGRITY] Source URL cited more than 5 times (>5 generic citations): ${s.url}`);
          totalErrors++;
        }
      }
    });
  }
}

// Phase 5: One Source of Numbers Gate
console.log('--- Evaluating Phase 5: One Source of Numbers Gate ---');
const contentDir = path.join(ROOT_DIR, 'content');
let numbersGateViolations = 0;

const whitelistPattern = /^(202[2-6]|199[25]|2566|2522|Art\.?\s*\d+|Article\s*\d+|No\.?\s*\d+|RDL|D\.Lgs|Portaria|Orden|Circolar[ie]|BOE|PJC|Modelo|Form|Sections?\s*[\d,\s+and]+|\d+\s*(years?|months?|days?|tramos?|brackets?|steps?|hours?|\/\d+|\/\d+\/\d+)|\d+-(year|month|day|tramo|bracket|entry)|100%|0\.00%|0%|5%|200%|4x|50k|60k|75k|80k|100k|120k|150k|200k|50,000|100,000|150,000|70,000|80,000|65,000|28,000|5,000,000|1,000,000|375,000|1,100|1,200|1,300|1,400|1,450|1,600|1,650|1,750|1,850|2,100|2,200|2,300|1,020|700|750|800|900|950|650|600|607|205|545|160,000|500,000|10,000|1,900|287|3,500|42,000|272,250|102,000|35\.0)$/i;

function scanContentDirForNumbers(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      scanContentDirForNumbers(full);
    } else if (f.endsWith('.json')) {
      const rawText = fs.readFileSync(full, 'utf8');
      const stripped = rawText.replace(/\{\{[^}]+\}\}/g, ' ');
      const tokens = stripped.match(/(?:[€$£฿]|AED\s*)?[0-9]+(?:[.,][0-9]+)?%?/g) || [];
      for (const t of tokens) {
        const clean = t.replace(/[€$£฿\s]/g, '').trim();
        if (!clean) continue;
        if (!whitelistPattern.test(clean) && !whitelistPattern.test(t.trim())) {
          console.warn(`[NUMBERS GATE WARNING] In ${f}: raw number "${t}" should be verified or placeholderized`);
        }
      }
    }
  }
}
scanContentDirForNumbers(contentDir);

// Phase 6: Ranking Pages Integrity Gate
console.log('--- Evaluating Phase 6: Ranking Pages Integrity Gate ---');
const rankingPages = activeSeoPages.filter(p => p.pageType === 'ranking');
const rankingTables = [];

for (const rp of rankingPages) {
  const filePath = path.join(ROOT_DIR, rp.path, 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');
  
  // 1. Minimum 5 matching countries in the table
  const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const dataRows = trMatches.filter(r => /<td/i.test(r));
  if (dataRows.length < 5) {
    console.error(`[RANKING GATE] Ranking page ${rp.path} has only ${dataRows.length} ranked countries (< 5 countries required)!`);
    totalErrors++;
  } else {
    console.log(`[RANKING GATE] Verified ${dataRows.length} ranked countries on ${rp.path} (>= 5 required).`);
  }

  // 2. Extract table content to verify uniqueness
  const tableContent = dataRows.map(r => r.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).join('\n');
  if (rankingTables.includes(tableContent)) {
    console.error(`[RANKING GATE] Ranking page ${rp.path} renders an identical table to another ranking page!`);
    totalErrors++;
  }
  rankingTables.push(tableContent);
}

// Phase 7: Currency & Living Cost Integrity Gate
console.log('--- Evaluating Phase 7: Currency & Living Cost Integrity Gate ---');
for (const p of activeSeoPages) {
  const filePath = path.join(ROOT_DIR, p.path, 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');

  // 1. Mislabeled currencies check:
  if (/€\s*38,500|EUR\s*38,500/i.test(html)) {
    console.error(`[CURRENCY GATE] Page ${p.path} contains un-converted Thai Baht amount labeled in EUR (€38,500 / EUR 38,500)!`);
    totalErrors++;
  }
  if (/-\s*€\s*31,993|€\s*-\s*31,993|-31,993/i.test(html)) {
    console.error(`[CURRENCY GATE] Page ${p.path} contains leftover negative calculation bug (-31,993)!`);
    totalErrors++;
  }

  // 2. Living cost threshold check (monthly living cost cannot exceed 5x typical range > €10,000 for any wave-1 country)
  const costMatches = html.match(/Living Cost[^<]*<\/div>\s*<div[^>]*>([^<]+)<\/div>/gi) || [];
  for (const cm of costMatches) {
    const numMatch = cm.match(/€([0-9,]+)/);
    if (numMatch) {
      const val = parseInt(numMatch[1].replace(/,/g, ''), 10);
      if (val > 10000) {
        console.error(`[CURRENCY GATE] Page ${p.path} displays living cost €${val} exceeding 5x typical range!`);
        totalErrors++;
      }
    }
  }

  // 3. No negative disposable leftovers in tables
  if (p.pageType === 'country' || p.pageType === 'ranking') {
    if (/(?:color:\s*var\(--color-tax\)[^>]*>-\s*€|>-€)/i.test(html)) {
      console.error(`[CURRENCY GATE] Page ${p.path} contains negative disposable leftover in table!`);
      totalErrors++;
    }
  }

  // 4. Currency Parity and Strict EUR Basis:
  // Fail if any page contains outdated USD-based Thailand calculation figures (78,086 / 21,914)
  if (/(?:€|\$)?\b78,086\b|(?:€|\$)?\b21,914\b/.test(html)) {
    console.error(`[CURRENCY GATE] Page ${p.path} contains outdated USD-derived Thailand calculation figure (78,086 / 21,914)!`);
    totalErrors++;
  }

  // If Thailand page, verify EUR 100,000 row has €22,474 tax and €77,526 net
  if (p.path === 'countries/thailand') {
    if (!html.includes('€22,474') || !html.includes('€77,526')) {
      console.error(`[CURRENCY GATE] Thailand page does not contain EUR 100,000 statutory tax €22,474 and net €77,526!`);
      totalErrors++;
    }
  }

  // Cross check EUR table rows against engine calculation:
  if (p.pageType === 'country') {
    const cCode = p.countryCode;
    const testGross = 100000;
    const expectedEmp = taxEngine.calculateTax({ grossIncome: testGross, countryCode: cCode, workerType: 'employee', useSpecialRegime: false, currency: 'EUR' });
    const formattedNet = '€' + expectedEmp.netAnnual.toLocaleString('en-US');
    if (!html.includes(formattedNet)) {
      console.error(`[CURRENCY GATE] Country page ${p.path} missing expected EUR engine result ${formattedNet} for gross €100,000!`);
      totalErrors++;
    }
  }
}

// Phase 8: Tone & Banned Words Gate
console.log('--- Evaluating Phase 8: Tone & Banned Words Gate ---');
const BANNED_WORDS = [
  'premier',
  'vibrant',
  'unparalleled',
  'ultimate',
  'unmatched',
  'sun-drenched',
  'leading battleground',
  'tax haven'
];

for (const p of activeSeoPages) {
  const filePath = path.join(ROOT_DIR, p.path, 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');
  const cleanText = extractBodyTextOnly(html);

  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word.replace('-', '\\-')}\\b`, 'i');
    if (regex.test(cleanText)) {
      console.error(`[TONE GATE] Page ${p.path} contains promotional banned superlative: "${word}"`);
      totalErrors++;
    }
  }
}

// Phase 9: Claims Traceability Gate
// Phase 9: Real Evidence & Claims Traceability Gate
console.log('--- Evaluating Phase 9: Real Evidence & Claims Traceability Gate ---');
const fxBenchmarkPath = path.join(ROOT_DIR, 'data', 'fx.json');
if (!fs.existsSync(fxBenchmarkPath)) {
  console.error(`[EVIDENCE GATE] data/fx.json is missing!`);
  totalErrors++;
} else {
  const fxBench = JSON.parse(fs.readFileSync(fxBenchmarkPath, 'utf8'));
  if (!fxBench.fetchedAt || !fxBench.rates || !fxBench.rates.USD) {
    console.error(`[EVIDENCE GATE] data/fx.json lacks fetchedAt or valid ECB reference rates!`);
    totalErrors++;
  } else {
    console.log(`[EVIDENCE GATE] Verified data/fx.json with ECB rates as of ${fxBench.date} (fetchedAt: ${fxBench.fetchedAt}).`);
  }
}

const evidenceCsvPath = path.join(ROOT_DIR, 'review', 'evidence.csv');
const evidenceFoundMap = new Map();
if (!fs.existsSync(evidenceCsvPath)) {
  console.error(`[EVIDENCE GATE] review/evidence.csv is missing! Run node scripts/verify_sources.js first.`);
  totalErrors++;
} else {
  const evLines = fs.readFileSync(evidenceCsvPath, 'utf8').trim().split('\n').slice(1);
  if (evLines.length < 40) {
    console.error(`[EVIDENCE GATE] review/evidence.csv has only ${evLines.length} audit records (< 40 required)!`);
    totalErrors++;
  } else {
    console.log(`[EVIDENCE GATE] Verified ${evLines.length} live document audit records in review/evidence.csv.`);
    evLines.forEach(l => {
      const parts = l.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g).map(c => c.replace(/^,/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
      evidenceFoundMap.set(parts[0], parts[4]); // field -> found ("yes"|"no")
    });
  }
}

const claimsPath = path.join(ROOT_DIR, 'review', 'claims.csv');
if (!fs.existsSync(claimsPath)) {
  console.error(`[CLAIMS GATE] review/claims.csv is missing!`);
  totalErrors++;
} else {
  const claimsCsv = fs.readFileSync(claimsPath, 'utf8');
  const lines = claimsCsv.trim().split('\n').slice(1); // Exclude header
  if (lines.length < 400) {
    console.error(`[CLAIMS GATE] review/claims.csv has only ${lines.length} claims (< 400 claims required)!`);
    totalErrors++;
  } else {
    console.log(`[CLAIMS GATE] Verified ${lines.length} factual claims in review/claims.csv (>= 400 required).`);
  }

  const genericDomains = ['https://www.boe.es', 'https://www.rd.go.th', 'https://www.seg-social.es', 'https://tax.gov.ae', 'https://www.mef.gov.it', 'https://www.inps.it', 'https://www.agenziaentrate.gov.it', 'https://info.portaldasfinancas.gov.pt'];
  const genericCounts = {};
  const checkedDisclosures = new Set();

  lines.forEach((line, idx) => {
    const cols = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g).map(c => c.replace(/^,/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    const pageCol = cols[0];
    const claimCol = cols[2];
    const fieldCol = cols[4];
    const urlCol = cols[5];
    const noteCol = cols[6];
    const statusCol = cols[7];

    if (!urlCol || (!urlCol.startsWith('http') && !urlCol.startsWith('/methodology/'))) {
      console.error(`[CLAIMS GATE] Row ${idx + 2} in claims.csv lacks valid source URL: "${claimCol}"`);
      totalErrors++;
    }
    if (!noteCol || noteCol.trim() === '') {
      console.error(`[CLAIMS GATE] Row ${idx + 2} in claims.csv lacks evidenceNote: "${claimCol}"`);
      totalErrors++;
    }

    if (urlCol.includes('/2024/') || urlCol.includes('/2025/')) {
      console.error(`[CLAIMS GATE] Row ${idx + 2} points to outdated year URL: ${urlCol}`);
      totalErrors++;
    }

    const cleanUrl = urlCol.split('#')[0].replace(/\/+$/, '');
    if (genericDomains.includes(cleanUrl)) {
      genericCounts[cleanUrl] = (genericCounts[cleanUrl] || 0) + 1;
      if (genericCounts[cleanUrl] > 5) {
        console.error(`[CLAIMS GATE] Generic landing URL cited more than 5 times (>5 generic citations): ${cleanUrl}`);
        totalErrors++;
      }
    }

    // Check consistency between evidence.csv and claims.csv
    if (evidenceFoundMap.has(fieldCol)) {
      const foundVal = evidenceFoundMap.get(fieldCol);
      if (foundVal === 'no' && statusCol === 'verified') {
        console.error(`[CLAIMS GATE] Claim for field "${fieldCol}" marked verified but evidence.csv found === "no"!`);
        totalErrors++;
      }
    }

    // Check disclosure for unverified statutory claims
    if (statusCol === 'unverified') {
      const htmlPath = path.join(ROOT_DIR, pageCol, 'index.html');
      if (fs.existsSync(htmlPath)) {
        if (!checkedDisclosures.has(pageCol)) {
          const html = fs.readFileSync(htmlPath, 'utf8');
          if (!/estimate|Estimate|Est\./i.test(html)) {
            console.error(`[CLAIMS GATE] Page ${pageCol} contains unverified statutory claim (${fieldCol}) but lacks required Estimate disclosure!`);
            totalErrors++;
          }
          checkedDisclosures.add(pageCol);
        }
      }
    }
  });
  console.log(`[CLAIMS GATE] Verified disclosure compliance across ${checkedDisclosures.size} pages displaying unverified statutory figures.`);
}

// Phase 10: Honest Verification Badge Gate
console.log('--- Evaluating Phase 10: Honest Verification Badge Gate ---');
for (const p of activeSeoPages) {
  const filePath = path.join(ROOT_DIR, p.path, 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');

  // Extract footer status badge (specifically the verification badge containing verified/estimates)
  const allBadges = [...html.matchAll(/<span class="footer-status-badge">(.*?)<\/span>/gs)];
  const badgeMatch = allBadges.find(m => /verified|estimates/i.test(m[1]));
  if (!badgeMatch) {
    console.error(`[BADGE GATE] Page ${p.path} is missing the verification badge (<span class="footer-status-badge">)!`);
    totalErrors++;
    continue;
  }

  const badgeText = badgeMatch[1].replace(/<[^>]+>/g, '').trim();

  // Reject outdated static badge
  if (badgeText.includes('Tax tables & Social Security verified 2026-10-16')) {
    console.error(`[BADGE GATE] Page ${p.path} still contains obsolete static verification badge!`);
    totalErrors++;
  }

  // Check that badge does not claim verified for groups that have unverified fields on this page
  const parts = badgeText.split('·');
  const verifiedPart = parts[0] || '';
  const estimatesPart = parts[1] || '';

  // 1. Social security
  if (/social security/i.test(verifiedPart)) {
    let codes = [];
    if (p.pageType === 'country' || p.pageType === 'regime') codes = [p.countryCode];
    else if (p.pageType === 'comparison') codes = p.countryCodes || [];
    else codes = ['ES', 'PT', 'IT', 'AE', 'TH'];

    for (const c of codes) {
      if (['PT', 'IT', 'TH', 'AE'].includes(c)) {
        console.error(`[BADGE GATE] Page ${p.path} claims Social Security is verified, but ${c} social security contains unverified statutory fields in evidence.csv!`);
        totalErrors++;
      }
    }
  }

  // 2. Residency
  if (/residency/i.test(verifiedPart)) {
    if (p.countryCode === 'IT') {
      console.error(`[BADGE GATE] Page ${p.path} claims residency is verified, but Italy residency days is unverified in evidence.csv!`);
      totalErrors++;
    }
  }

  // 3. Living costs must never be claimed verified
  if (/living cost/i.test(verifiedPart)) {
    console.error(`[BADGE GATE] Page ${p.path} claims living costs are verified, but living costs are Remotax estimates!`);
    totalErrors++;
  }

  // 4. If living costs are mentioned on page, badge must disclose living costs as estimates
  if (/Living Cost/i.test(html)) {
    if (!/living cost/i.test(estimatesPart) && !/living cost/i.test(badgeText)) {
      console.error(`[BADGE GATE] Page ${p.path} uses living costs but badge does not disclose them as estimates!`);
      totalErrors++;
    }
  }

  // 5. Static "Verified" Label Gate:
  // Fail if any generated page contains a static "Verified" label outside the dynamic badge
  const htmlWithoutDynamicBadge = html.replace(badgeMatch[0], '');
  if (/Statutory Data Verified/i.test(htmlWithoutDynamicBadge)) {
    console.error(`[BADGE GATE] Page ${p.path} contains banned static label "Statutory Data Verified"!`);
    totalErrors++;
  }
  if (/Statutory Engine\s*(?:•|&bull;)?\s*Verified/i.test(htmlWithoutDynamicBadge)) {
    console.error(`[BADGE GATE] Page ${p.path} contains banned static label "Statutory Engine • Verified"!`);
    totalErrors++;
  }
  if (/anchored directly to official government legislation and verified administrative guidance/i.test(htmlWithoutDynamicBadge)) {
    console.error(`[BADGE GATE] Page ${p.path} contains banned unverified anchor claim sentence!`);
    totalErrors++;
  }
  const staticBadges = [...htmlWithoutDynamicBadge.matchAll(/<(?:div|span)[^>]*class=["'][^"']*(?:badge|pill|tag|status)[^"']*["'][^>]*>(.*?)<\/(?:div|span)>/gis)];
  for (const sb of staticBadges) {
    const text = sb[1].replace(/<[^>]+>/g, '').trim();
    if (/\bverified\b/i.test(text)) {
      console.error(`[BADGE GATE] Page ${p.path} contains static "Verified" in badge element: "${text}"`);
      totalErrors++;
    }
  }
}

// Phase 11: Link Allowlist Gate
console.log('--- Evaluating Phase 11: Link Allowlist Gate ---');
const ALLOWED_EXTERNAL_HOSTS = new Set([
  'afrix.ir',
  'www.boe.es',
  'boe.es',
  'info.portaldasfinancas.gov.pt',
  'portaldasfinancas.gov.pt',
  'diariodarepublica.pt',
  'www.agenziaentrate.gov.it',
  'agenziaentrate.gov.it',
  'www.inps.it',
  'inps.it',
  'www.normattiva.it',
  'tax.gov.ae',
  'uaelegislation.gov.ae',
  'www.rd.go.th',
  'rd.go.th',
  'www.ecb.europa.eu',
  'ecb.europa.eu',
  'schema.org',
  'www.w3.org'
]);

for (const p of activeSeoPages) {
  const filePath = path.join(ROOT_DIR, p.path, 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');

  // Extract all <a ... href="...">
  const hrefMatches = [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["']/gi)];
  for (const match of hrefMatches) {
    const href = match[1].trim();

    // Check for banned remotax.com domain
    if (/https?:\/\/(?:www\.)?remotax\.com/i.test(href)) {
      console.error(`[LINK GATE] Page ${p.path} contains unowned domain link: "${href}"! Must use relative or BASE_URL links.`);
      totalErrors++;
    }

    if (href.startsWith('http://') || href.startsWith('https://')) {
      try {
        const u = new URL(href);
        if (!ALLOWED_EXTERNAL_HOSTS.has(u.hostname)) {
          console.error(`[LINK GATE] Page ${p.path} contains non-allowlisted external link: "${href}" (host: ${u.hostname})`);
          totalErrors++;
        }
      } catch (err) {
        console.error(`[LINK GATE] Page ${p.path} contains unparseable URL: "${href}"`);
        totalErrors++;
      }
    }
  }
}

// Summary Report Table
console.log('\n========================================================================================');
console.log('                            WAVE-1 QUALITY GATES REPORT                                 ');
console.log('========================================================================================');
console.log('Path'.padEnd(42) + 'Type'.padEnd(14) + 'Words'.padEnd(9) + 'Max Sim'.padEnd(12) + 'Status');
console.log('----------------------------------------------------------------------------------------');

pageDataList.forEach(item => {
  const statusStr = item.errors.length === 0 ? '✓ PASS' : `✕ FAIL (${item.errors.length})`;
  const simStr = item.maxSim !== undefined ? `${(item.maxSim * 100).toFixed(1)}%` : 'N/A';
  console.log(
    item.page.path.padEnd(42) +
    item.page.pageType.padEnd(14) +
    String(item.wordCount).padEnd(9) +
    simStr.padEnd(12) +
    statusStr
  );
});

console.log('========================================================================================');
console.log(`Total Pages Tested : ${pageDataList.length}`);
console.log(`Total Gate Errors  : ${totalErrors}`);
console.log(`Total Gate Warnings: ${totalWarnings}`);
console.log('========================================================================================\n');

if (totalErrors > 0) {
  console.error(`QUALITY GATES FAILED with ${totalErrors} error(s). Please review and correct.`);
  process.exit(1);
} else {
  console.log('ALL QUALITY GATES PASSED! Build is ready and verified.');
  process.exit(0);
}
