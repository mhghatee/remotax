/**
 * REMOTAX STATUTORY NUMBER & EVIDENCE MATCHER (scripts/matcher.js)
 * 
 * Strict statutory verification matcher designed to eliminate false positives:
 * 1. Strict numeric word boundaries: (?<![\d.,]) and (?![\d.,]) - prevents matching inside larger numbers, decimals, or dates.
 * 2. Date format protection: "19/02/2026" or "19-02-2026" never matches "19%".
 * 3. Article / Section / Law reference rejection: "Artículo 37" never matches "37%".
 * 4. Number sequence rejection: "182 ... 183 ... 184" never matches "183 days".
 * 5. Mandatory context keyword within 120 characters.
 * 6. Paired tabular matching for tax brackets (requires limit AND rate in proximity).
 * 7. Universal number formatting (EU "5.101,20", US "5,101.20", spaced "5 101,20", "8 342").
 */

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes text by decoding HTML entities and collapsing whitespace
 */
function normalizeDocText(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/[\u00A0\u200B\u202F]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Generate regex variants for a numeric value
 */
function getNumberPatterns(value, isPercent = false) {
  const patterns = [];

  // Parse if string was passed
  let numVal = null;
  let strInput = null;

  if (typeof value === 'number') {
    numVal = value;
  } else if (typeof value === 'string') {
    strInput = value.trim();
    const cleanStr = strInput.replace(/[%€$฿]/g, '').trim();
    // Parse European or US format
    const parsed = parseFloat(cleanStr.replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(parsed)) {
      numVal = parsed;
    }
  }

  if (numVal !== null) {
    if (isPercent || (numVal > 0 && numVal < 1) || (strInput && strInput.includes('%'))) {
      const pct = (numVal > 0 && numVal <= 1 && !strInput?.endsWith('%')) ? (numVal * 100) : numVal;
      const pctFixed2 = pct.toFixed(2);
      const pctFixed1 = pct.toFixed(1);
      const pctInt = Math.round(pct).toString();

      const vals = [
        pctFixed2.replace('.', ','),
        pctFixed2,
        pctFixed1.replace('.', ','),
        pctFixed1,
        pctInt
      ];
      const uniqueVals = [...new Set(vals)];
      for (const v of uniqueVals) {
        // Must match either with % or followed by percent words, or stand-alone in table column
        patterns.push({
          regexStr: `(?<![\\d.,])${escapeRegex(v)}(?:\\s*(?:%|por\\s+ciento|per\\s+cento|percent))?(?![\\d.,])`,
          rawVal: v,
          isPercentMatch: true
        });
      }
      return patterns;
    }

    // Number with decimals (e.g. 5101.20, 653.59, 1928.10, 4587.09, 537.13, 1.1253, 37.602)
    const strVal = numVal.toString();
    const hasDecimal = (numVal % 1 !== 0) || (strInput && (strInput.includes('.') || strInput.includes(',')));

    if (hasDecimal) {
      const parts = strVal.split('.');
      const intPart = parts[0];
      const decVariants = new Set();

      if (parts[1]) decVariants.add(parts[1]);
      decVariants.add(numVal.toFixed(2).split('.')[1]); // '20' for 5101.20
      if (strInput) {
        const strParts = strInput.split(/[.,]/);
        if (strParts.length > 1) decVariants.add(strParts[strParts.length - 1]);
      }

      for (const decPart of decVariants) {
        const formattedEU = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decPart;
        const formattedUS = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + decPart;
        const formattedSpaceEU = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + decPart;
        const formattedSpaceUS = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '.' + decPart;
        const unformattedEU = intPart + ',' + decPart;
        const unformattedUS = intPart + '.' + decPart;

        const variants = [formattedEU, formattedUS, formattedSpaceEU, formattedSpaceUS, unformattedEU, unformattedUS];
        for (const v of [...new Set(variants)]) {
          patterns.push({
            regexStr: `(?<![\\d.,])${escapeRegex(v)}(?![\\d.,])`,
            rawVal: v
          });
        }
      }
    } else {
      // Integer: e.g. 8342, 12450, 183, 180, 600000
      const intPart = Math.round(numVal).toString();
      const formattedDot = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');     // 8.342, 600.000
      const formattedComma = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');   // 8,342, 600,000
      const formattedSpace = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');   // 8 342, 600 000

      const variants = [
        intPart,
        formattedDot,
        formattedComma,
        formattedSpace,
        // Also support ,00 and .00 representations
        formattedDot + ',00',
        formattedComma + '.00',
        formattedSpace + ',00',
        intPart + ',00',
        intPart + '.00'
      ];
      for (const v of [...new Set(variants)]) {
        patterns.push({
          regexStr: `(?<![\\d.,])${escapeRegex(v)}(?![\\d.,])`,
          rawVal: v
        });
      }
    }
  } else if (strInput) {
    patterns.push({
      regexStr: `(?<![\\d.,])${escapeRegex(strInput)}(?![\\d.,])`,
      rawVal: strInput
    });
  }

  return patterns;
}

/**
 * Checks if a candidate match is a false positive due to date, article numbering, or number sequences
 */
function isFalsePositive(fullText, matchIndex, matchLength, config = {}) {
  const windowBefore = fullText.slice(Math.max(0, matchIndex - 45), matchIndex);
  const windowAfter = fullText.slice(matchIndex + matchLength, Math.min(fullText.length, matchIndex + matchLength + 45));

  // 1. Date check: preceded or followed by date separators and digits
  // e.g. "19/02/2026", "2026-02-19", "19-02-2026", "19/2/26"
  if (/^[\/\-]\s*\d{1,4}/.test(windowAfter)) {
    return { isFalse: true, reason: 'Followed by date separator and digits' };
  }
  if (/\d{1,4}\s*[\/\-]$/.test(windowBefore)) {
    return { isFalse: true, reason: 'Preceded by date separator and digits' };
  }

  // If the matched string explicitly contains a percentage symbol, it cannot be an article or page number
  const matchedStr = fullText.slice(matchIndex, matchIndex + matchLength);
  if (matchedStr.includes('%')) {
    return { isFalse: false };
  }

  // 2. Article / decree / section / law number check
  // e.g. "Artículo 37", "Art. 183", "articolo 183", "n. 37", "nº 183", "comma 183"
  const forbiddenPreceders = config.forbiddenPreceders || [
    'artículo', 'articulo', 'artículos', 'articulos', 'art.', 'art', 'artt.', 'arts.',
    'articolo', 'articoli', 'artigo', 'artigos',
    'n.º', 'nº', 'n°', 'n.', 'número', 'numero', 'numeri', 'números',
    'sezione', 'sezioni', 'sección', 'seccion', 'secciones', 'secção', 'secções',
    'comma', 'commi', 'párrafo', 'paragrafo', 'parágrafo', 'alínea', 'alinea',
    'legge', 'decreto', 'ley', 'orden', 'portaria', 'resolution', 'decision', 'delibera'
  ];
  const beforeLower = windowBefore.toLowerCase();
  for (const fp of forbiddenPreceders) {
    const rx = new RegExp(`(?:\\b|^)${escapeRegex(fp)}\\s*$`, 'i');
    if (rx.test(beforeLower)) {
      return { isFalse: true, reason: `Preceded by forbidden reference word: "${fp}"` };
    }
  }

  // 3. Integer sequence / pagination check (e.g. "182 ... 183 ... 184" or "182, 183, 184")
  // Must have list separators: commas, semicolons, ellipses (...), dashes, or conjunctions
  const hasSeqBefore = /\b\d+\s*(?:[,;…–—]|\.{2,}|\b(?:e|ed|o|od|y|u|and|or)\b)\s*$/i.test(windowBefore);
  const hasSeqAfter = /^\s*(?:[,;…–—]|\.{2,}|\b(?:e|ed|o|od|y|u|and|or)\b)\s*\d+\b/i.test(windowAfter);
  if (hasSeqBefore && hasSeqAfter) {
    return { isFalse: true, reason: 'Matched inside an enumerated integer list / sequence' };
  }

  // 4. Enumeration following plural reference word: e.g. "articoli 182 ... 183 ... 184"
  if (/\b(art[íi]culos?|artt?\.?|articoli|artigos?|sezion[ie]|secci[oó]n(?:es)?|numer[oi]s?|n[º°.]|commi?|paragraphs?|sections?)\b/i.test(windowBefore) &&
      /\b\d+\b/.test(windowBefore)) {
    return { isFalse: true, reason: 'Matched inside an article or section enumeration' };
  }

  return { isFalse: false };
}

/**
 * Checks if at least one required context keyword is within maxDistance characters
 */
function hasContextKeyword(fullText, matchIndex, matchLength, keywords = [], maxDistance = 120) {
  if (!keywords || keywords.length === 0) return { found: true, keyword: 'default' };

  const start = Math.max(0, matchIndex - maxDistance);
  const end = Math.min(fullText.length, matchIndex + matchLength + maxDistance);
  const contextSnippet = fullText.slice(start, end).toLowerCase();

  for (const kw of keywords) {
    if (contextSnippet.includes(kw.toLowerCase())) {
      return { found: true, keyword: kw };
    }
  }

  return { found: false };
}

/**
 * Match a statutory claim against document text
 * 
 * @param {string} rawDocumentText - The raw HTML or plain text from the source URL
 * @param {object} config - Rule config for this field
 * @returns {object} { found: boolean, excerpt: string, reason: string }
 */
function matchClaim(rawDocumentText, config) {
  if (!rawDocumentText || typeof rawDocumentText !== 'string') {
    return { found: false, excerpt: '', reason: 'Empty document body' };
  }

  const doc = normalizeDocText(rawDocumentText);

  // If paired matching is requested (e.g. tax brackets with limit AND rate together)
  if (config.paired) {
    const limitPatterns = getNumberPatterns(config.paired.limit, false);
    const ratePatterns = getNumberPatterns(config.paired.rate, true);
    const pairWindow = config.pairWindow || 160;

    for (const lp of limitPatterns) {
      const limitRegex = new RegExp(lp.regexStr, 'g');
      let lMatch;
      while ((lMatch = limitRegex.exec(doc)) !== null) {
        const lIdx = lMatch.index;
        const lLen = lMatch[0].length;

        // Check false positive on limit
        const fpLimit = isFalsePositive(doc, lIdx, lLen, config);
        if (fpLimit.isFalse) continue;

        // Search for rate within pairWindow
        const start = Math.max(0, lIdx - pairWindow);
        const end = Math.min(doc.length, lIdx + lLen + pairWindow);
        const subDoc = doc.slice(start, end);

        for (const rp of ratePatterns) {
          const rateRegex = new RegExp(rp.regexStr, 'g');
          let rMatch;
          while ((rMatch = rateRegex.exec(subDoc)) !== null) {
            const actualRIdx = start + rMatch.index;
            const actualRLen = rMatch[0].length;

            const fpRate = isFalsePositive(doc, actualRIdx, actualRLen, config);
            if (fpRate.isFalse) continue;

            // Check context keyword in proximity (tables allow up to 600 chars to reach table headers)
            const ctxDistance = config.contextDistance || (config.paired ? 600 : 120);
            const ctx = hasContextKeyword(doc, lIdx, lLen, config.contextKeywords, ctxDistance);
            if (ctx.found) {
              const snippetStart = Math.max(0, Math.min(lIdx, actualRIdx) - 35);
              const snippetEnd = Math.min(doc.length, Math.max(lIdx + lLen, actualRIdx + actualRLen) + 35);
              const excerpt = doc.slice(snippetStart, snippetEnd).trim();
              return {
                found: true,
                excerpt: excerpt.split(/\s+/).slice(0, 15).join(' '),
                matchType: 'paired',
                matchedKeyword: ctx.keyword,
                matchedLimit: lMatch[0],
                matchedRate: rMatch[0]
              };
            }
          }
        }
      }
    }

    return { found: false, excerpt: '', reason: 'Paired bracket limit and rate not found in proximity with context' };
  }

  // Single value matching
  const patterns = getNumberPatterns(config.value, config.isPercent);

  for (const pat of patterns) {
    const regex = new RegExp(pat.regexStr, 'gi');
    let match;
    while ((match = regex.exec(doc)) !== null) {
      const idx = match.index;
      const len = match[0].length;

      // 1. Check for false positives (dates, article numbers, sequences)
      const fp = isFalsePositive(doc, idx, len, config);
      if (fp.isFalse) {
        continue;
      }

      // 2. Check for required context keyword within 120 chars
      const ctx = hasContextKeyword(doc, idx, len, config.contextKeywords, config.contextDistance || 120);
      if (!ctx.found) {
        continue;
      }

      // Found valid match! Extract clean ~10-word excerpt around match
      const start = Math.max(0, idx - 45);
      const end = Math.min(doc.length, idx + len + 45);
      const rawExcerpt = doc.slice(start, end).trim();
      const excerptWords = rawExcerpt.split(/\s+/).slice(0, 15).join(' ');

      return {
        found: true,
        excerpt: excerptWords,
        matchedValue: match[0],
        matchedKeyword: ctx.keyword
      };
    }
  }

  return { found: false, excerpt: '', reason: 'Value not found with required word boundaries and context keyword' };
}

module.exports = {
  matchClaim,
  getNumberPatterns,
  isFalsePositive,
  hasContextKeyword,
  normalizeDocText
};
