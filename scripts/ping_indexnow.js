#!/usr/bin/env node
/**
 * Remotax IndexNow Submission Script
 * Automatically submits all active canonical URLs to the IndexNow protocol (Bing, Yandex, Seznam, Naver)
 * for instant indexing of programmatic SEO updates.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const KEY = '7e93fbc0671d49e69c73b06385d39211';
const HOST = 'afrix.ir';
const KEY_LOCATION = `https://${HOST}/remotax/${KEY}.txt`;

// Read all URLs from child sitemaps
const childSitemaps = [
  'sitemap-countries.xml',
  'sitemap-regimes.xml',
  'sitemap-comparisons.xml',
  'sitemap-best.xml',
  'sitemap-salaries.xml',
  'sitemap-pages.xml'
];

const urlList = [];
for (const smFile of childSitemaps) {
  const filePath = path.join(ROOT_DIR, smFile);
  if (fs.existsSync(filePath)) {
    const xml = fs.readFileSync(filePath, 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    locs.forEach(u => {
      if (!urlList.includes(u)) urlList.push(u);
    });
  }
}

console.log(`[INDEXNOW] Collected ${urlList.length} URLs across ${childSitemaps.length} sitemaps.`);

const payload = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList
}, null, 2);

const payloadPath = path.join(ROOT_DIR, 'scratch', 'indexnow_payload.json');
fs.writeFileSync(payloadPath, payload, 'utf8');
console.log(`[INDEXNOW] Wrote payload to ${payloadPath}`);

// If dry run, exit
if (process.argv.includes('--dry-run')) {
  console.log('[INDEXNOW] Dry run complete. Did not submit HTTP POST.');
  process.exit(0);
}

// Perform HTTP POST to api.indexnow.org
const postData = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList
});

const options = {
  hostname: 'api.indexnow.org',
  port: 443,
  path: '/indexnow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`[INDEXNOW] Submitting ${urlList.length} URLs to https://api.indexnow.org/indexnow ...`);

const req = https.request(options, res => {
  console.log(`[INDEXNOW] Response HTTP Status: ${res.statusCode} ${res.statusMessage}`);
  let responseBody = '';
  res.on('data', chunk => { responseBody += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 202) {
      console.log('✓ [INDEXNOW] Successfully submitted URLs to IndexNow network!');
    } else {
      console.log(`[INDEXNOW] Submission response: ${responseBody || '(empty body)'}`);
    }
  });
});

req.on('error', e => {
  console.warn(`[INDEXNOW NOTE] Submission network call failed or was blocked by sandbox: ${e.message}`);
  console.log('[INDEXNOW] Payload is valid and preserved in scratch/indexnow_payload.json for production deployment.');
});

req.write(postData);
req.end();
