/**
 * REMOTAX PRODUCTION BUILD SCRIPT (build.js)
 * Conforms to Remotax Platform Architecture Spec
 * 
 * Rebuilds all production assets:
 * 1. css/remotax.min.css & css/critical.min.css
 * 2. data/countries.min.js
 * 3. engine/taxEngine.min.js
 * 4. app.min.js
 * 5. js/nav.min.js
 * 
 * Runs full validation test harness:
 * 6. node tests/test_wave1_harness.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('                 REMOTAX PRODUCTION ASSET BUILDER                    ');
console.log('======================================================================\n');

const ROOT_DIR = __dirname;

// --- 1. Safe JavaScript Minifier (Zero-Dependency State Machine) ---
function minifyJS(code) {
    let result = '';
    let inString = false;
    let stringChar = '';
    let inMultiComment = false;
    let inSingleComment = false;
    let isEscaped = false;

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const nextChar = code[i + 1];

        if (inSingleComment) {
            if (char === '\n') {
                inSingleComment = false;
                result += '\n';
            }
            continue;
        }

        if (inMultiComment) {
            if (char === '*' && nextChar === '/') {
                inMultiComment = false;
                i++;
            }
            continue;
        }

        if (inString) {
            result += char;
            if (isEscaped) {
                isEscaped = false;
            } else if (char === '\\') {
                isEscaped = true;
            } else if (char === stringChar) {
                inString = false;
            }
            continue;
        }

        if (char === '/' && nextChar === '/') {
            inSingleComment = true;
            i++;
            continue;
        }
        if (char === '/' && nextChar === '*') {
            inMultiComment = true;
            i++;
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
            isEscaped = false;
            result += char;
            continue;
        }

        result += char;
    }

    // Trim lines and collapse empty lines
    const lines = result.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    return lines.join('\n');
}

// --- 2. CSS Minifier ---
function minifyCSS(css) {
    let out = css;
    out = out.replace(/\/\*[\s\S]*?\*\//g, '');
    out = out.replace(/\s+/g, ' ');
    out = out.replace(/\s*([\{\}\:\;\,])\s*/g, '$1');
    out = out.replace(/;\}/g, '}');
    return out.trim();
}

function readFileSafe(relPath) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Required source file not found: ${relPath}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
}

function writeFileSafe(relPath, content) {
    const fullPath = path.join(ROOT_DIR, relPath);
    fs.writeFileSync(fullPath, content, 'utf8');
    const sizeKB = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(2);
    console.log(`  ✓ Built ${relPath} (${sizeKB} KiB)`);
}

// --- Step 1: Rebuild CSS ---
console.log('1. Building CSS Bundles...');
const FONTS_CSS = `/* --- System & Local Typography Stack (Zero-CLS, Instant Paint) --- */
@font-face {
    font-family: 'Instrument Serif';
    font-style: normal;
    font-weight: 400;
    font-display: optional;
    src: local('Instrument Serif'), local('New York'), local('Georgia'), local('Times New Roman'), local('serif');
}

@font-face {
    font-family: 'Instrument Serif';
    font-style: italic;
    font-weight: 400;
    font-display: optional;
    src: local('Instrument Serif Italic'), local('Instrument Serif'), local('New York'), local('Georgia'), local('Times New Roman'), local('serif');
}
`;

const A11Y_CSS = `
/* Accessibility & Focus Rings */
.sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
}

.skip-to-content {
    position: absolute;
    top: -120px;
    left: 1rem;
    z-index: 99999;
    padding: 0.65rem 1.25rem;
    background: #070B0F;
    color: #ffffff;
    border: 1px solid var(--horizon-orange, #d9772f);
    border-radius: 9999px;
    font-family: var(--font-sans);
    font-size: 0.88rem;
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
    transition: top 0.2s ease;
}

.skip-to-content:focus {
    top: 1rem;
    outline: 2px solid var(--horizon-peach, #f2b283);
}

:focus-visible {
    outline: 2px solid var(--horizon-peach, #f2b283) !important;
    outline-offset: 3px !important;
}

.radio-card-title {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0.25rem;
}

.footer-heading {
    font-family: var(--font-sans);
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #ffffff;
    margin-bottom: 1rem;
    display: block;
}

.callout-title {
    color: #ffffff;
    font-size: 1.05rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
    display: block;
}

.content-visibility-auto {
    content-visibility: auto;
    contain-intrinsic-size: 1px 600px;
}
`;

const tokens = readFileSafe('css/tokens.css');
const base = readFileSafe('css/base.css');
const glass = readFileSafe('css/glass.css');
const components = readFileSafe('css/components.css');
const heroes = readFileSafe('css/heroes.css');
const indexRaw = readFileSafe('index.css');
const indexClean = indexRaw.replace(/@import\s+url\([^)]+\);\s*/g, '');

const combinedCSS = [FONTS_CSS, tokens, base, glass, components, heroes, indexClean, A11Y_CSS].join('\n');
const minCSS = minifyCSS(combinedCSS);
writeFileSafe('css/remotax.min.css', minCSS);

const criticalParts = [
    "html{background:#070B0F;color-scheme:dark;font-size:16px;scroll-behavior:smooth}",
    tokens,
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
    "body{min-height:100vh;min-height:100dvh;font-family:var(--font-sans);line-height:1.6;background-color:#070B0F;color:var(--text-body);overflow-x:hidden}",
    ".noise-overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;opacity:0.04;background-image:url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")}",
    ".navbar-floating{position:fixed;top:1rem;left:0;right:0;z-index:1000;display:flex;justify-content:center;padding:0 1rem;pointer-events:none}",
    ".nav-pill{pointer-events:auto;display:flex;align-items:center;justify-content:space-between;gap:0.75rem;padding:0.5rem 0.65rem 0.5rem 1rem;background:rgba(255,255,255,0.065);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border:1px solid rgba(255,255,255,0.12);border-radius:9999px;max-width:1120px;width:100%;box-shadow:0 8px 32px 0 rgba(0,0,0,0.45)}",
    ".nav-brand{display:flex;align-items:center;gap:10px;text-decoration:none}",
    ".nav-brand-mark{width:40px;height:40px;min-width:40px;min-height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center}",
    ".nav-brand-title{font-family:var(--font-sans);font-size:1.15rem;font-weight:700;letter-spacing:-0.035em;color:#ffffff;line-height:1;white-space:nowrap}",
    ".nav-brand-title .brand-tax{color:var(--horizon-peach,#F8DFC0)}",
    ".nav-brand-tag{padding:0.2rem 0.5rem;font-size:0.7rem;font-family:var(--font-mono);background:rgba(217,119,47,0.15);border:1px solid rgba(217,119,47,0.4);border-radius:9999px;color:var(--horizon-peach)}",
    ".container{max-width:1200px;margin:0 auto;padding:0 1.5rem}",
    ".pseo-layout-container{padding-top:calc(var(--header-height,72px) + 2.5rem) !important}@media (max-width:768px){.pseo-layout-container{padding-top:calc(var(--header-height,72px) + 1.5rem + env(safe-area-inset-top,0px)) !important}}",
    FONTS_CSS
];
const criticalMin = minifyCSS(criticalParts.join('\n'));
writeFileSafe('css/critical.min.css', criticalMin);

// --- Step 2: Rebuild JavaScript Minified Assets ---
console.log('\n2. Minifying Core JavaScript Assets...');
const jsFilesToMinify = [
    { src: 'data/countries.js', dest: 'data/countries.min.js' },
    { src: 'engine/taxEngine.js', dest: 'engine/taxEngine.min.js' },
    { src: 'app.js', dest: 'app.min.js' },
    { src: 'js/nav.js', dest: 'js/nav.min.js' }
];

jsFilesToMinify.forEach(({ src, dest }) => {
    const raw = readFileSafe(src);
    const min = minifyJS(raw);
    writeFileSafe(dest, min);
});

// --- Step 3: Execute Test Harness ---
console.log('\n3. Running Statutory Verification Test Harness...');
try {
    const harnessPath = path.join(ROOT_DIR, 'tests', 'test_wave1_harness.js');
    execSync(`node "${harnessPath}"`, { stdio: 'inherit', cwd: ROOT_DIR });
    console.log('\n🎉 BUILD COMPLETED SUCCESSFULLY (All assets minified & verified)');
} catch (err) {
    console.error('\n❌ BUILD FAILED: Verification test harness exited with error.');
    process.exit(1);
}
