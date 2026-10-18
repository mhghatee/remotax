/**
 * Lighthouse Audit Runner for Remotax Review Package
 * Runs raw Lighthouse JSON audits for Mobile & Desktop across 5 page types:
 * 1. Country Hub: /countries/spain/
 * 2. Regime: /regimes/beckham-law-spain/
 * 3. Comparison: /comparisons/spain-vs-portugal/
 * 4. Ranking: /best/digital-nomad-taxes/
 * 5. Methodology: /methodology/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'review', 'lighthouse');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const AUDITS = [
  { name: 'country_spain', url: 'http://localhost:8080/countries/spain/', type: 'Country Hub' },
  { name: 'regime_beckham', url: 'http://localhost:8080/regimes/beckham-law-spain/', type: 'Regime' },
  { name: 'comparison_spain_portugal', url: 'http://localhost:8080/comparisons/spain-vs-portugal/', type: 'Comparison' },
  { name: 'ranking_nomad_taxes', url: 'http://localhost:8080/best/digital-nomad-taxes/', type: 'Ranking' },
  { name: 'methodology', url: 'http://localhost:8080/methodology/', type: 'Methodology' }
];

const results = [];

for (const audit of AUDITS) {
  // 1. Mobile
  const mobileFile = path.join(OUT_DIR, `${audit.name}_mobile.json`);
  console.log(`[LIGHTHOUSE] Auditing ${audit.type} (Mobile): ${audit.url}...`);
  const mobileCmd = `CHROME_PATH="${CHROME_PATH}" npx --yes lighthouse "${audit.url}" --chrome-flags="--headless=new --no-sandbox --disable-gpu" --output=json --output-path="${mobileFile}" --quiet`;
  try {
    execSync(mobileCmd, { stdio: 'pipe' });
    const json = JSON.parse(fs.readFileSync(mobileFile, 'utf8'));
    const cats = json.categories;
    results.push({
      page: audit.type,
      device: 'Mobile',
      file: `${audit.name}_mobile.json`,
      perf: Math.round(cats.performance.score * 100),
      a11y: Math.round(cats.accessibility.score * 100),
      bp: Math.round(cats['best-practices'].score * 100),
      seo: Math.round(cats.seo.score * 100)
    });
  } catch (err) {
    console.error(`Failed mobile audit for ${audit.url}:`, err.message);
  }

  // 2. Desktop
  const desktopFile = path.join(OUT_DIR, `${audit.name}_desktop.json`);
  console.log(`[LIGHTHOUSE] Auditing ${audit.type} (Desktop): ${audit.url}...`);
  const desktopCmd = `CHROME_PATH="${CHROME_PATH}" npx --yes lighthouse "${audit.url}" --chrome-flags="--headless=new --no-sandbox --disable-gpu" --preset=desktop --output=json --output-path="${desktopFile}" --quiet`;
  try {
    execSync(desktopCmd, { stdio: 'pipe' });
    const json = JSON.parse(fs.readFileSync(desktopFile, 'utf8'));
    const cats = json.categories;
    results.push({
      page: audit.type,
      device: 'Desktop',
      file: `${audit.name}_desktop.json`,
      perf: Math.round(cats.performance.score * 100),
      a11y: Math.round(cats.accessibility.score * 100),
      bp: Math.round(cats['best-practices'].score * 100),
      seo: Math.round(cats.seo.score * 100)
    });
  } catch (err) {
    console.error(`Failed desktop audit for ${audit.url}:`, err.message);
  }
}

// Write scores summary
const summaryPath = path.join(OUT_DIR, 'scores_summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf8');

console.log('\n======================================================================');
console.log('                 LIGHTHOUSE RUNTIME SCORES SUMMARY                    ');
console.log('======================================================================');
console.log('| Page Type | Device | Perf | A11y | Best Practices | SEO (INDEXING=false) |');
console.log('|:---|:---|:---:|:---:|:---:|:---:|');
results.forEach(r => {
  console.log(`| ${r.page} | ${r.device} | ${r.perf} | ${r.a11y} | ${r.bp} | ${r.seo} |`);
});
console.log('======================================================================\n');
