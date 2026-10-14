/**
 * REMOTAX — Mobile Responsiveness & Navigation Verification Suite
 * Validates all 31 HTML files, markup consistency, forms, selects, CSS rules,
 * and calculations across $10k, $76k, $250k for 3 diverse countries.
 */

const fs = require('fs');
const path = require('path');

const RemotaxCountries = require('./data/countries.js');
const RemotaxEngine = require('./engine/taxEngine.js');

console.log('===============================================================');
console.log('REMOTAX — MOBILE RESPONSIVENESS & NAV AUDIT VERIFICATION');
console.log('===============================================================\n');

let totalErrors = 0;

// 1. Audit all 31 HTML files
function getAllHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.startsWith('.') || file === 'node_modules') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllHtmlFiles(fullPath, fileList);
        } else if (file.endsWith('.html')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const htmlFiles = getAllHtmlFiles('.');
console.log(`Auditing ${htmlFiles.length} HTML files...`);

htmlFiles.forEach(file => {
    const relPath = path.relative('.', file);
    const content = fs.readFileSync(file, 'utf8');

    // Check 1: Nav brand tag is "2026"
    const tagMatch = content.match(/class=["']nav-brand-tag["'][^>]*>(.*?)<\/span>/);
    if (!tagMatch || tagMatch[1].trim() !== '2026') {
        console.error(`[FAIL] ${relPath}: nav-brand-tag is "${tagMatch ? tagMatch[1] : 'MISSING'}", expected "2026"`);
        totalErrors++;
    }

    // Check 2: Hamburger button exists with required accessibility attributes
    if (!content.includes('id="mobile-menu-toggle"') || !content.includes('aria-controls="mobile-drawer"')) {
        console.error(`[FAIL] ${relPath}: Missing hamburger toggle or aria-controls`);
        totalErrors++;
    }

    // Check 3: Full-screen mobile drawer exists with close button and links
    if (!content.includes('id="mobile-drawer"') || !content.includes('id="mobile-drawer-close"')) {
        console.error(`[FAIL] ${relPath}: Missing mobile drawer sheet or close button`);
        totalErrors++;
    }

    // Check 4: Nav JS script included
    if (!content.includes('js/nav.js')) {
        console.error(`[FAIL] ${relPath}: Missing js/nav.js script tag`);
        totalErrors++;
    }

    // Check 5: No empty <select> elements
    const selectMatches = content.match(/<select[^>]*>([\s\S]*?)<\/select>/gi) || [];
    selectMatches.forEach((sel, idx) => {
        const optionCount = (sel.match(/<option[^>]*>/gi) || []).length;
        if (optionCount === 0) {
            console.error(`[FAIL] ${relPath}: Select #${idx + 1} has 0 options rendered in HTML!`);
            totalErrors++;
        }
    });

    // Check 6: Income inputs use inputmode="decimal" or "numeric"
    const incomeInputs = content.match(/<input[^>]*id=["']income-input["'][^>]*>/gi) || [];
    incomeInputs.forEach(inp => {
        if (!inp.includes('inputmode="decimal"') && !inp.includes('inputmode="numeric"')) {
            console.error(`[FAIL] ${relPath}: income-input missing inputmode for mobile numpad`);
            totalErrors++;
        }
    });
});

console.log(`[PASS] All ${htmlFiles.length} HTML files checked for navigation, drawer, and form selects.\n`);

// 2. Validate CSS Mobile Rules
console.log('Auditing Mobile CSS Rules...');

const glassCss = fs.readFileSync('css/glass.css', 'utf8');
const componentsCss = fs.readFileSync('css/components.css', 'utf8');
const baseCss = fs.readFileSync('css/base.css', 'utf8');
const heroesCss = fs.readFileSync('css/heroes.css', 'utf8');

// Check: form-select has appearance: none and custom chevron
if (!glassCss.includes('appearance: none') || !glassCss.includes('-webkit-appearance: none') || !glassCss.includes('data:image/svg+xml')) {
    console.error('[FAIL] glass.css: form-select missing appearance: none or custom chevron SVG');
    totalErrors++;
} else {
    console.log('[PASS] glass.css: form-select has appearance: none and custom SVG chevron');
}

// Check: inputs have 16px font-size to prevent iOS zoom
if (!glassCss.includes('font-size: 16px')) {
    console.error('[FAIL] glass.css: Missing 16px font-size to prevent iOS zoom');
    totalErrors++;
} else {
    console.log('[PASS] glass.css: 16px font-size enforced to prevent iOS zoom');
}

// Check: base.css has scroll-padding-top
if (!baseCss.includes('scroll-padding-top: calc(var(--header-height, 72px) + env(safe-area-inset-top, 0px)')) {
    console.error('[FAIL] base.css: Missing header scroll-padding-top clearance');
    totalErrors++;
} else {
    console.log('[PASS] base.css: scroll-padding-top configured for sticky header and notch safe areas');
}

// Check: components.css has carousel rules for mobile jurisdictions
if (!componentsCss.includes('scroll-snap-type: x mandatory') || !componentsCss.includes('82vw') || !componentsCss.includes('gap: 14px')) {
    console.error('[FAIL] components.css: Missing jurisdiction carousel mobile rules');
    totalErrors++;
} else {
    console.log('[PASS] components.css: Strategic Relocation Jurisdictions horizontal carousel configured');
}

// Check: heroes.css has tightened mobile paycheck layer
if (!heroesCss.includes('clamp(2.2rem, 9vw, 3rem)') || !heroesCss.includes('paycheck-glass-stack')) {
    console.error('[FAIL] heroes.css: Missing tightened mobile paycheck layer styles');
    totalErrors++;
} else {
    console.log('[PASS] heroes.css: Mobile paycheck layer tightened with clamp(2.2rem, 9vw, 3rem)');
}

// 3. End-to-end Calculator Verification across 3 Countries
console.log('\nTesting End-to-End Calculator Engine across 3 Countries (Spain, Germany, UAE)...');

const testCases = [
    { country: 'ES', gross: 10000, expectedNetMax: 10000, name: 'Spain Beckham Law (Low Income)' },
    { country: 'ES', gross: 76000, expectedNetMax: 76000, name: 'Spain Beckham Law (Mid Income)' },
    { country: 'ES', gross: 250000, expectedNetMax: 250000, name: 'Spain Beckham Law (High Income)' },
    { country: 'DE', gross: 10000, expectedNetMax: 10000, name: 'Germany BMF (Under Grundfreibetrag)' },
    { country: 'DE', gross: 76000, expectedNetMax: 76000, name: 'Germany BMF (Progressive & Social Cap)' },
    { country: 'DE', gross: 250000, expectedNetMax: 250000, name: 'Germany BMF (Top Rate 45%)' },
    { country: 'AE', gross: 10000, expectedNetMax: 10000, name: 'UAE Dubai Virtual (0% Tax)' },
    { country: 'AE', gross: 76000, expectedNetMax: 76000, name: 'UAE Dubai Virtual (0% Tax)' },
    { country: 'AE', gross: 250000, expectedNetMax: 250000, name: 'UAE Dubai Virtual (0% Tax)' }
];

testCases.forEach(tc => {
    const res = RemotaxEngine.calculateTax({
        grossIncome: tc.gross,
        countryCode: tc.country,
        workerType: 'contractor',
        useSpecialRegime: true
    });

    if (res.netAnnual > tc.expectedNetMax || res.netAnnual <= 0) {
        console.error(`[FAIL] ${tc.name}: Invalid net annual ${res.netAnnual}`);
        totalErrors++;
    } else {
        console.log(`[PASS] ${tc.name} gross: ${res.symbol}${tc.gross.toLocaleString()} -> Net: ${res.symbol}${res.netAnnual.toLocaleString()} (Effective Rate: ${res.effectiveTaxRate}%)`);
    }
});

console.log('\n===============================================================');
if (totalErrors === 0) {
    console.log('ALL VERIFICATION CHECKS PASSED WITH 0 ERRORS!');
} else {
    console.error(`VERIFICATION FAILED WITH ${totalErrors} ERRORS!`);
    process.exit(1);
}
console.log('===============================================================');
