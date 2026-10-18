/**
 * REMOTAX STATUTORY MATCHER UNIT TESTS (tests/test_matcher.js)
 * 
 * Verifies that scripts/matcher.js strictly avoids false positives:
 * 1. ES 19% must NOT match date "19/02/2026"
 * 2. ES 37% must NOT match "Artículo 37"
 * 3. IT 183 days must NOT match article-number list ("182 ... 183 ... 184")
 * 4. TH 5% must NOT match inside "0.5%"
 * 
 * And verifies 6 real positives are reliably found:
 * 1. ES 19% ("Base liquidable hasta 12.450 euros tipo aplicable 19% en escala general")
 * 2. ES 5.101,20 ("La base máxima de cotización para el año 2026 queda fijada en 5.101,20 euros mensuales")
 * 3. IT 600.000 ("I redditi agevolati concorrono alla formazione del reddito complessivo fino a 600.000 euro per ciascun periodo di imposta")
 * 4. PT 8 342 ("1.º escalão: Até 8 342 euros com taxa normal de 12,50% no IRS")
 * 5. UAE 183 days ("The individual has been physically present in the UAE for a period of 183 days or more in the relevant consecutive twelve-month period")
 * 6. TH 180 days ("Any person who stays in Thailand for a period or periods aggregating 180 days or more in any tax year shall be treated as resident")
 * 
 * Also tests paired tabular matching for tax brackets!
 */

const assert = require('assert');
const path = require('path');
const matcher = require('../scripts/matcher.js');

console.log('======================================================================');
console.log('             REMOTAX EVIDENCE MATCHER UNIT TEST SUITE                 ');
console.log('======================================================================\n');

let passedCount = 0;
let failedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${name}`);
    console.error(`    ↳ Error: ${err.message}`);
    failedCount++;
  }
}

// -------------------------------------------------------------
// PART 1: FOUR REQUIRED FALSE POSITIVES (MUST BE NOT FOUND)
// -------------------------------------------------------------
console.log('--- Testing False Positive Rejection (Must NOT be found) ---');

// FP 1: ES 19% matched the date "19/02/2026"
runTest('FP 1: ES 19% must NOT match date "19/02/2026"', () => {
  const text = 'Modificación de la ley publicada el 19/02/2026 en el boletín oficial con tipo general.';
  const res = matcher.matchClaim(text, {
    value: 0.19,
    isPercent: true,
    contextKeywords: ['tipo', 'boletín', 'general']
  });
  assert.strictEqual(res.found, false, `Expected false, got found=true with excerpt: "${res.excerpt}"`);
});

// FP 2: ES 37% matched "Artículo 37"
runTest('FP 2: ES 37% must NOT match "Artículo 37"', () => {
  const text = 'De acuerdo con el Artículo 37 de la ley del impuesto sobre la renta con tipo general aplicable.';
  const res = matcher.matchClaim(text, {
    value: 0.37,
    isPercent: true,
    contextKeywords: ['tipo', 'impuesto', 'renta']
  });
  assert.strictEqual(res.found, false, `Expected false, got found=true with excerpt: "${res.excerpt}"`);
});

// FP 3: IT 183 days matched an article-number list ("182 ... 183 ... 184")
runTest('FP 3: IT 183 days must NOT match article-number list ("182 ... 183 ... 184")', () => {
  const text = 'Si applicano gli articoli 182 ... 183 ... 184 del testo unico sulle imposte per determinare tax residency days.';
  const res = matcher.matchClaim(text, {
    value: 183,
    contextKeywords: ['days', 'residency', 'imposte']
  });
  assert.strictEqual(res.found, false, `Expected false, got found=true with excerpt: "${res.excerpt}"`);
});

// FP 4: TH 5% matched inside "0.5%"
runTest('FP 4: TH 5% must NOT match inside "0.5%"', () => {
  const text = 'Under section 48, the withholding rate of 0.5% applies to gross payments with standard tax rate.';
  const res = matcher.matchClaim(text, {
    value: 0.05,
    isPercent: true,
    contextKeywords: ['tax', 'rate', 'withholding']
  });
  assert.strictEqual(res.found, false, `Expected false, got found=true with excerpt: "${res.excerpt}"`);
});

// -------------------------------------------------------------
// PART 2: SIX REQUIRED REAL POSITIVES (MUST BE FOUND)
// -------------------------------------------------------------
console.log('\n--- Testing Real Positive Detection (Must BE found) ---');

// RP 1: ES 19%
runTest('RP 1: ES 19% statutory tax bracket', () => {
  const text = 'Base liquidable hasta 12.450 euros: tipo aplicable del 19% en la escala general del impuesto.';
  const res = matcher.matchClaim(text, {
    value: 0.19,
    isPercent: true,
    contextKeywords: ['tipo', 'escala', 'impuesto', 'base liquidable']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
  assert.ok(res.excerpt.includes('19%'), 'Excerpt should contain 19%');
});

// RP 2: ES 5.101,20 (Base máxima autónomos / cotización 2026)
runTest('RP 2: ES 5.101,20 maximum monthly base', () => {
  const text = 'La base máxima de cotización para el año 2026 queda fijada en 5.101,20 euros mensuales según la orden ministerial.';
  const res = matcher.matchClaim(text, {
    value: 5101.20,
    contextKeywords: ['base máxima', 'cotización', 'orden', 'euros']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
  assert.ok(res.excerpt.includes('5.101,20'), 'Excerpt should contain 5.101,20');
});

// RP 3: IT 600.000 (Regime Impatriati maximum cap)
runTest('RP 3: IT 600.000 Impatriati gross income cap', () => {
  const text = 'I redditi agevolati concorrono alla formazione del reddito complessivo fino a 600.000 euro per ciascun periodo di imposta.';
  const res = matcher.matchClaim(text, {
    value: 600000,
    contextKeywords: ['reddito', 'euro', 'agevolati', 'imposta']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
  assert.ok(res.excerpt.includes('600.000'), 'Excerpt should contain 600.000');
});

// RP 4: PT 8 342 (CIRS Art. 68 1st bracket limit with space separator)
runTest('RP 4: PT 8 342 CIRS Art. 68 first bracket limit', () => {
  const text = '1.º escalão: Até 8 342 euros de rendimento coletável com taxa normal de 12,50% no IRS.';
  const res = matcher.matchClaim(text, {
    value: 8342,
    contextKeywords: ['escalão', 'taxa', 'IRS', 'rendimento']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
  assert.ok(res.excerpt.includes('8 342'), 'Excerpt should contain 8 342');
});

// RP 5: UAE 183 days (Tax residency physical presence)
runTest('RP 5: UAE 183 days physical presence residency', () => {
  const text = 'The natural person has been physically present in the UAE for a period of 183 days or more in the relevant consecutive 12-month period.';
  const res = matcher.matchClaim(text, {
    value: 183,
    contextKeywords: ['days', 'period', 'UAE', 'present']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
  assert.ok(res.excerpt.includes('183'), 'Excerpt should contain 183');
});

// RP 6: TH 180 days (Thai Revenue Code Sec. 41 residency)
runTest('RP 6: TH 180 days tax residency', () => {
  const text = 'Any individual who stays in Thailand for a period or periods aggregating 180 days or more in any tax year shall be treated as resident of Thailand.';
  const res = matcher.matchClaim(text, {
    value: 180,
    contextKeywords: ['days', 'tax year', 'resident', 'Thailand']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
  assert.ok(res.excerpt.includes('180'), 'Excerpt should contain 180');
});

// -------------------------------------------------------------
// PART 3: PAIRED TABULAR MATCHING TESTS
// -------------------------------------------------------------
console.log('\n--- Testing Paired Bracket Matching (Limit + Rate) ---');

runTest('Paired 1: Spain Art. 63 IRPF bracket table (12.450 € + 19%)', () => {
  const tableText = `
    <table>
      <thead><tr><th>Base liquidable hasta (euros)</th><th>Cuota integra</th><th>Resto base liquidable</th><th>Tipo aplicable %</th></tr></thead>
      <tbody>
        <tr><td>0</td><td>0</td><td>12.450</td><td>19,00%</td></tr>
        <tr><td>12.450</td><td>2.365,50</td><td>7.950</td><td>24,00%</td></tr>
        <tr><td>20.200</td><td>4.225,50</td><td>15.000</td><td>30,00%</td></tr>
        <tr><td>35.200</td><td>8.725,50</td><td>24.800</td><td>37,00%</td></tr>
        <tr><td>60.000</td><td>17.901,50</td><td>240.000</td><td>45,00%</td></tr>
        <tr><td>300.000</td><td>125.901,50</td><td>En adelante</td><td>47,00%</td></tr>
      </tbody>
    </table>
  `;
  const res = matcher.matchClaim(tableText, {
    paired: { limit: 12450, rate: 0.19 },
    contextKeywords: ['base liquidable', 'tipo', '%', 'euros']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
  assert.strictEqual(res.matchType, 'paired');
});

runTest('Paired 1b: Spain Art. 63 bracket 2 row (35.200 € + 30%) in full table', () => {
  const tableText = `
    Base liquidable hasta – Euros Cuota íntegra – Euros Resto base liquidable hasta – Euros Tipo aplicable – Porcentaje
    0,00 0,00 12.450,00 19,00
    12.450,00 2.365,50 7.750,00 24,00
    20.200,00 4.225,50 15.000,00 30,00 35.200,00
    35.200,00 8.725,50 24.800,00 37,00 60.000,00
    60.000,00 17.901,50 240.000,00 45,00 300.000,00
    300.000,00 125.901,50 En adelante 47,00
  `;
  const res = matcher.matchClaim(tableText, {
    paired: { limit: 35200, rate: 0.30 },
    contextKeywords: ['base liquidable', 'tipo', 'euros', 'cuota']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
});

runTest('Paired 1c: Spain Art. 63 bracket 3 row (60.000 € + 37%) in full table', () => {
  const tableText = `
    Base liquidable hasta – Euros Cuota íntegra – Euros Resto base liquidable hasta – Euros Tipo aplicable – Porcentaje
    0,00 0,00 12.450,00 19,00
    12.450,00 2.365,50 7.750,00 24,00
    20.200,00 4.225,50 15.000,00 30,00 35.200,00
    35.200,00 8.725,50 24.800,00 37,00 60.000,00
    60.000,00 17.901,50 240.000,00 45,00 300.000,00
    300.000,00 125.901,50 En adelante 47,00
  `;
  const res = matcher.matchClaim(tableText, {
    paired: { limit: 60000, rate: 0.37 },
    contextKeywords: ['base liquidable', 'tipo', 'euros', 'cuota']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
});

runTest('Paired 1d: Spain Art. 63 bracket 4 row (300.000 € + 45%) in full table', () => {
  const tableText = `
    Base liquidable hasta – Euros Cuota íntegra – Euros Resto base liquidable hasta – Euros Tipo aplicable – Porcentaje
    0,00 0,00 12.450,00 19,00
    12.450,00 2.365,50 7.750,00 24,00
    20.200,00 4.225,50 15.000,00 30,00 35.200,00
    35.200,00 8.725,50 24.800,00 37,00 60.000,00
    60.000,00 17.901,50 240.000,00 45,00 300.000,00
    300.000,00 125.901,50 En adelante 47,00
  `;
  const res = matcher.matchClaim(tableText, {
    paired: { limit: 300000, rate: 0.45 },
    contextKeywords: ['base liquidable', 'tipo', 'euros', 'cuota']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
});

runTest('Paired 2: Portugal CIRS Art. 68 table (8 342 € + 12.5%)', () => {
  const tableText = `
    Rendimento coletável (em euros) Taxas Taxa normal
    Até 8 342 euros 12,50%
    De mais de 8 342 a 12 587 euros 15,70%
  `;
  const res = matcher.matchClaim(tableText, {
    paired: { limit: 8342, rate: 0.125 },
    contextKeywords: ['rendimento coletável', 'taxas', 'euros']
  });
  assert.strictEqual(res.found, true, `Expected found=true, got false: ${res.reason}`);
  assert.strictEqual(res.matchType, 'paired');
});

console.log('\n======================================================================');
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log('======================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('ALL MATCHER TESTS PASSED! Matcher is fully verified.');
  process.exit(0);
}
