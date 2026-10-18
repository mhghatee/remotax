# Remotax Indexing Pilot Rollback Procedures

This document outlines the exact, tested procedures to roll back the Remotax Wave-1 programmatic SEO pages from live search indexing (`INDEXING=true`) back to protected no-index state (`INDEXING=false`), or to revert to the `pre-indexing-pilot` git tag.

---

## Method 1: Configuration Rollback (Fastest & Safest)

This method keeps any post-launch fixes or content updates while immediately disabling search crawler indexing across all 22 active pages and sitemaps.

### Step 1: Set INDEXING to false
Edit `generator.config.json` and change `"INDEXING": true` to `false`:
```json
{
  "BASE_URL": "https://afrix.ir/remotax",
  "INDEXING": false
}
```

### Step 2: Regenerate All Pages & Assets
Run the generator and build pipeline:
```bash
node generate.js
node build.js
```

### Step 3: Run the Quality Verification Gate
Verify that `noindex` is restored, robots.txt blocks crawlers, and all gates pass:
```bash
node check.js
```
Expected output:
- `✓ Phase 2: Indexing / Robots / Canonical Gates passed (all pages have noindex, follow)`
- `✓ Phase 2b: robots.txt contains Disallow: /`
- `ALL 22 ACTIVE PAGES PASSED (0 errors, 0 warnings)`

### Step 4: Redeploy to Production
Trigger deployment using the configured deployment mechanism (see DEPLOYMENT section below).

### Step 5: Verify Live Rollback
Verify that live production immediately serves `noindex` and disallows crawling:
```bash
curl -s -i https://afrix.ir/remotax/ | grep -i "robots"
# Expected: <meta name="robots" content="noindex, nofollow">

curl -s https://afrix.ir/remotax/robots.txt
# Expected:
# User-agent: *
# Disallow: /

curl -s -i https://afrix.ir/remotax/countries/spain/ | grep -i "robots"
# Expected: <meta name="robots" content="noindex, nofollow">
```

---

## Method 2: Git Tag Rollback (`pre-indexing-pilot`)

If code or template regressions require rolling back the entire repository to the exact commit tagged prior to indexing activation:

### Step 1: Checkout the Pre-Indexing Tag
```bash
git checkout pre-indexing-pilot
```
*(Or create a revert commit if working on a branch: `git revert HEAD`)*

### Step 2: Re-run Build
```bash
node build.js
node check.js
```

### Step 3: Redeploy
Deploy the repository state at `pre-indexing-pilot` to production.

---

## Production Deployment Reference

### cPanel Git Deployment (`.cpanel.yml`)
When pushed to the repository connected to cPanel Git Version Control:
1. In cPanel, navigate to **Git™ Version Control**.
2. Select the `remotax` repository.
3. Click **Deploy HEAD Commit**.
4. The tasks in `.cpanel.yml` will execute:
   - Copy files to `/home/silverio/public_html/remotax`
   - Clean up non-production directories (`tests/`, `scratch/`, `reports/`, `review/`, `content/`, `templates/`, `scripts/`)
   - Clean up non-production files (`*.js` generator scripts, `*.csv`, `*.zip`, `*.md`)

---

## Contact & Incident Escalation
If unexpected HTTP errors or crawler leaks occur:
- Check HTTP status codes for all 22 URLs.
- Ensure `.htaccess` blocks internal paths (`review/`, `reports/`, `tests/`, `content/`).
- Contact site administrator for hosting access if FTP or cPanel UI is inaccessible.
