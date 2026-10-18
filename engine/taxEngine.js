/**
 * REMOTAX PURE CALCULATION ENGINE v1.1
 * Decoupled, functional, zero-DOM tax & salary calculation architecture.
 * Conforms to Remotax Platform Specification (Sections 3, 6, 7, 8, 9, 10, 11, 12, 13, 19, 22, 23, 27)
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['../data/countries'], factory);
    } else if (typeof module === 'object' && module.exports) {
        const { REMOTAX_COUNTRIES } = require('../data/countries');
        module.exports = factory(REMOTAX_COUNTRIES);
    } else {
        const countriesObj = root.REMOTAX_COUNTRIES || (typeof window !== 'undefined' ? window.REMOTAX_COUNTRIES : undefined) || (typeof REMOTAX_COUNTRIES !== 'undefined' ? REMOTAX_COUNTRIES : undefined);
        root.RemotaxEngine = factory(countriesObj);
    }
}(typeof self !== 'undefined' ? self : this, function (REMOTAX_COUNTRIES) {
    'use strict';

    /**
     * Robust numeric input sanitizer (Section 6)
     */
    function parseValidNumber(inputVal, fallback = 0) {
        if (typeof inputVal === 'number') {
            return (isNaN(inputVal) || !isFinite(inputVal)) ? fallback : Math.max(0, inputVal);
        }
        if (!inputVal) return fallback;
        const cleaned = String(inputVal).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return (isNaN(num) || !isFinite(num)) ? fallback : Math.max(0, num);
    }

    /**
     * Progressive bracket calculator helper
     */
    function calculateBrackets(taxableIncome, brackets) {
        if (!brackets || brackets.length === 0) return 0;
        let tax = 0;
        let prevLimit = 0;
        for (let i = 0; i < brackets.length; i++) {
            const b = brackets[i];
            if (taxableIncome > prevLimit) {
                const chunk = Math.min(taxableIncome, b.limit) - prevLimit;
                tax += chunk * b.rate;
                prevLimit = b.limit;
            } else {
                break;
            }
        }
        return Math.max(0, tax);
    }

    /**
     * Spain Autónomos Social Security: 15 Statutory Income Tramos (RDL 13/2022 & Orden PJC/297/2026)
     * Evaluates monthly net return after 7% generic deductible expenses (minimum base of each tramo)
     */
    function calculateSpainAutonomoSS(gross, expenses) {
        const netAnnual = Math.max(0, (gross - expenses) * 0.93);
        const netMonthly = netAnnual / 12;
        if (netMonthly <= 670) return 205.88 * 12;
        if (netMonthly <= 900) return 226.47 * 12;
        if (netMonthly <= 1166.70) return 267.65 * 12;
        if (netMonthly <= 1300) return 299.56 * 12;
        if (netMonthly <= 1500) return 302.65 * 12;
        if (netMonthly <= 1700) return 302.65 * 12;
        if (netMonthly <= 1850) return 360.29 * 12;
        if (netMonthly <= 2030) return 380.88 * 12;
        if (netMonthly <= 2330) return 401.47 * 12;
        if (netMonthly <= 2760) return 427.21 * 12;
        if (netMonthly <= 3190) return 452.94 * 12;
        if (netMonthly <= 3620) return 478.68 * 12;
        if (netMonthly <= 4050) return 504.41 * 12;
        if (netMonthly <= 6000) return 545.59 * 12;
        return 607.35 * 12; // Tramo 15 (> 6,000 €/mo): €7,288.20/yr
    }

    /**
     * Core Tax & Take-Home Calculation Engine
     * @param {Object} params
     * @returns {Object} Full standardized financial breakdown
     */
    function calculateTax(params) {
        params = params || {};
        const gross = parseValidNumber(params.grossIncome, 0);
        const countryCode = String(params.countryCode || 'ES').toUpperCase();
        const workerType = params.workerType || 'contractor'; // 'employee' | 'freelancer' | 'contractor'
        const filingStatus = params.filingStatus || 'single'; // 'single' | 'married_joint'
        const useRegime = params.useSpecialRegime !== false;
        const expenses = parseValidNumber(params.businessExpenses, 0);

        const countries = (typeof REMOTAX_COUNTRIES !== 'undefined' && REMOTAX_COUNTRIES) ||
                          (typeof window !== 'undefined' && window.REMOTAX_COUNTRIES) ||
                          (typeof globalThis !== 'undefined' && globalThis.REMOTAX_COUNTRIES) || {};
        const countryData = countries[countryCode] || countries.ES || { taxYear: 2026, currency: 'EUR', symbol: '€', livingCost: 1800, taxBrackets: [], socialSecurity: {}, regimes: [], deductions: {} };
        const taxYear = params.taxYear || countryData.taxYear || 2026;

        let incomeTax = 0;
        let socialSecurity = 0;
        let taxableIncome = Math.max(0, gross - expenses);
        let activeRegimeNote = "";

        // Determine calculation currency basis (cross-country benchmarks and tables default to EUR)
        let calcCurrency = 'EUR';
        if (params.currency) {
            calcCurrency = String(params.currency).toUpperCase();
        } else if (params.incomeCurrency) {
            calcCurrency = String(params.incomeCurrency).toUpperCase();
        } else if (params.isUSD === true) {
            calcCurrency = 'USD';
        }

        // --- Country-Specific Statutory Rules ---
        switch (countryCode) {
            case 'ES': // Spain
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    const r = countryData.regimes[0];
                    incomeTax = taxableIncome <= r.cap ? taxableIncome * r.flatRate : (r.cap * r.flatRate) + ((taxableIncome - r.cap) * r.overflowRate);
                    activeRegimeNote = r.eligibilityNote || "";
                } else {
                    let baseDeduction = countryData.deductions.standardAllowance || 5550;
                    if (filingStatus === 'married_joint') {
                        baseDeduction += (countryData.deductions.jointDeduction || 3400);
                    }
                    const workExpAllowance = (workerType === 'employee') ? (countryData.deductions.workExpenseAllowance || 2000) : 0;
                    const taxableES = Math.max(0, taxableIncome - baseDeduction - workExpAllowance);
                    incomeTax = calculateBrackets(taxableES, countryData.taxBrackets);
                }
                if (workerType === 'employee') {
                    const maxBaseES = countryData.socialSecurity.employeeMaxAnnualBase || 61214.40;
                    const empRateES = countryData.socialSecurity.employeeRate || 0.065;
                    socialSecurity = Math.min(gross, maxBaseES) * empRateES;
                } else {
                    socialSecurity = calculateSpainAutonomoSS(gross, expenses);
                }
                break;

            case 'PT': // Portugal
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    incomeTax = taxableIncome * countryData.regimes[0].flatRate;
                    activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                } else {
                    if (workerType === 'employee') {
                        const specificDeduction = countryData.deductions.standardAllowance || 4587.09;
                        const taxablePT = Math.max(0, taxableIncome - specificDeduction);
                        incomeTax = calculateBrackets(taxablePT, countryData.taxBrackets);
                    } else {
                        // Category B Simplified Regime: 75% taxable coefficient (Art. 31/151 CIRS)
                        const coeff = countryData.deductions.categoryBCoefficient || 0.75;
                        const taxablePT = Math.max(0, taxableIncome * coeff);
                        incomeTax = calculateBrackets(taxablePT, countryData.taxBrackets);
                    }
                }
                if (workerType === 'employee') {
                    socialSecurity = gross * (countryData.socialSecurity.employeeRate || 0.11);
                } else {
                    const relevantIncomePT = gross * (countryData.socialSecurity.contractorBaseMultiplier || 0.70);
                    const maxBasePT = countryData.socialSecurity.contractorMaxAnnualBase || 77346.72;
                    const contractorRatePT = countryData.socialSecurity.contractorRate || 0.214;
                    socialSecurity = Math.min(relevantIncomePT, maxBasePT) * contractorRatePT;
                }
                break;

            case 'AE': // UAE
                incomeTax = 0;
                socialSecurity = 0;
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                }
                break;

            case 'DE': // Germany
                let baseAllowanceDE = 0;
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    baseAllowanceDE = (filingStatus === 'married_joint')
                        ? (countryData.regimes[0].allowanceJoint || 23568)
                        : (countryData.regimes[0].allowanceSingle || 11784);
                    activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                }
                const netTaxableDE = Math.max(0, taxableIncome - baseAllowanceDE);
                incomeTax = calculateBrackets(netTaxableDE, countryData.taxBrackets);
                socialSecurity = workerType === 'employee'
                    ? Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual)
                    : Math.min(gross * countryData.socialSecurity.contractorRate, 8000);
                break;

            case 'GB': // UK
                const allowanceUK = useRegime ? (countryData.regimes[0].allowanceSingle || 12570) : 0;
                // UK personal allowance tapers by £1 for every £2 over £100,000
                let adjustedAllowance = allowanceUK;
                if (gross > 100000 && allowanceUK > 0) {
                    adjustedAllowance = Math.max(0, allowanceUK - ((gross - 100000) / 2));
                }
                const netTaxableUK = Math.max(0, taxableIncome - adjustedAllowance);
                incomeTax = calculateBrackets(netTaxableUK, countryData.taxBrackets);
                socialSecurity = workerType === 'employee'
                    ? Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual)
                    : Math.min(gross * countryData.socialSecurity.contractorRate, 4500);
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                }
                break;

            case 'US': // USA
                let deductionUS = 0;
                let activeBrackets = countryData.taxBrackets;
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    if (filingStatus === 'married_joint') {
                        deductionUS = countryData.regimes[0].allowanceJoint || 29200;
                        activeBrackets = countryData.taxBracketsJoint || countryData.taxBrackets;
                    } else {
                        deductionUS = countryData.regimes[0].allowanceSingle || 14600;
                    }
                }
                const netTaxableUS = Math.max(0, taxableIncome - deductionUS);
                incomeTax = calculateBrackets(netTaxableUS, activeBrackets);
                socialSecurity = gross * (workerType === 'employee' ? countryData.socialSecurity.employeeRate : countryData.socialSecurity.contractorRate);
                break;

            case 'CA': // Canada
                const bpaCA = useRegime ? (countryData.regimes[0].allowanceSingle || 15705) : 0;
                const netTaxableCA = Math.max(0, taxableIncome - bpaCA);
                incomeTax = calculateBrackets(netTaxableCA, countryData.taxBrackets);
                socialSecurity = Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual);
                break;

            case 'NL': // Netherlands
                let taxableNL = (useRegime && countryData.regimes && countryData.regimes[0])
                    ? taxableIncome * countryData.regimes[0].taxableMultiplier
                    : taxableIncome;
                incomeTax = calculateBrackets(taxableNL, countryData.taxBrackets);
                socialSecurity = workerType === 'employee'
                    ? gross * countryData.socialSecurity.employeeRate
                    : Math.min(gross * countryData.socialSecurity.contractorRate, countryData.socialSecurity.freelancerMaxAnnual);
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                }
                break;

            case 'IT': // Italy
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    const r = countryData.regimes[0];
                    const hasChild = !!(params.hasMinorChild || params.childVariant || params.withChild || params.hasChild);
                    const multiplier = (hasChild && r.taxableMultiplierChild) ? r.taxableMultiplierChild : (r.taxableMultiplier || 0.50);
                    const cap = r.cap || 600000;
                    const exemptBase = Math.min(taxableIncome, cap);
                    const excessBase = Math.max(0, taxableIncome - cap);
                    const taxableIT = (exemptBase * multiplier) + excessBase;
                    incomeTax = calculateBrackets(taxableIT, countryData.taxBrackets);
                    activeRegimeNote = (hasChild ? "60% exemption applied (minor child dependent variant, D.Lgs. 209/2023). " : "50% exemption applied. ") + (r.eligibilityNote || "");
                } else {
                    incomeTax = calculateBrackets(taxableIncome, countryData.taxBrackets);
                }
                // Social security (INPS) is calculated on 100% of gross (unreduced by Impatriati) up to statutory massimale €122,295
                {
                    const inpsMassimale = countryData.socialSecurity.employeeMaxAnnualBase || 122295;
                    const primaFascia = countryData.socialSecurity.primaFascia || 56224;
                    const contractorRateIT = countryData.socialSecurity.contractorRate || 0.2607;
                    const cappedGross = Math.min(gross, inpsMassimale);
                    if (workerType === 'employee') {
                        if (cappedGross <= primaFascia) {
                            socialSecurity = cappedGross * (countryData.socialSecurity.employeeRate || 0.0919);
                        } else {
                            const baseRate = countryData.socialSecurity.employeeRate || 0.0919;
                            const excessRate = countryData.socialSecurity.employeeExcessRate || 0.1019;
                            socialSecurity = (primaFascia * baseRate) + ((cappedGross - primaFascia) * excessRate);
                        }
                    } else {
                        socialSecurity = cappedGross * contractorRateIT;
                    }
                }
                break;

            case 'GR': // Greece
                let taxableGR = (useRegime && countryData.regimes && countryData.regimes[0])
                    ? taxableIncome * countryData.regimes[0].taxableMultiplier
                    : taxableIncome;
                incomeTax = calculateBrackets(taxableGR, countryData.taxBrackets);
                socialSecurity = Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual);
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                }
                break;

            case 'TH': // Thailand
                {
                    const fxEurThb = countryData.fxRateEUR || 37.602;
                    const fxUsdThb = countryData.fxRateUSD || 33.415;

                    let grossTHB = gross;
                    let expensesTHB = expenses;

                    if (calcCurrency === 'EUR') {
                        grossTHB = gross * fxEurThb;
                        expensesTHB = expenses * fxEurThb;
                    } else if (calcCurrency === 'USD') {
                        grossTHB = gross * fxUsdThb;
                        expensesTHB = expenses * fxUsdThb;
                    }

                    const taxableBaseTHB = Math.max(0, grossTHB - expensesTHB);
                    let taxTHB = 0;
                    // Default = remitted income (progressive PIT).
                    // 0% offshore scenario ONLY applies if explicitly requested:
                    const isOffshoreExplicit = params.isOffshoreUnremitted === true || params.regimeId === 'th_offshore_unremitted' || (params.useSpecialRegime === true && params.forceOffshoreZero === true);

                    if (isOffshoreExplicit) {
                        taxTHB = 0;
                        activeRegimeNote = "Offshore non-remitted income scenario (0% Thai tax). Warning: ATM withdrawals, card purchases in Thailand, and bank transfers into Thailand constitute taxable remittance under Thai Revenue Department Instructions Por. 161/2566 & 162/2566.";
                    } else {
                        const expenseDed = Math.min(grossTHB * (countryData.deductions.employmentExpenseRate || 0.50), countryData.deductions.employmentExpenseCap || 100000);
                        const personalAllowance = countryData.deductions.standardAllowance || 60000;
                        const netTaxableTHB = Math.max(0, taxableBaseTHB - expenseDed - personalAllowance);
                        taxTHB = calculateBrackets(netTaxableTHB, countryData.taxBrackets);
                        activeRegimeNote = "Progressive PIT on remitted foreign income (0%–35%) with ฿160,000 statutory deductions (50% expense cap ฿100,000 + ฿60,000 personal allowance).";
                    }

                    if (calcCurrency === 'EUR') {
                        incomeTax = taxTHB / fxEurThb;
                    } else if (calcCurrency === 'USD') {
                        incomeTax = taxTHB / fxUsdThb;
                    } else {
                        incomeTax = taxTHB;
                    }
                    socialSecurity = 0;
                }
                break;

            case 'SG': // Singapore
                if (useRegime) {
                    incomeTax = 0; // Foreign territorial exemption
                    if (countryData.regimes && countryData.regimes[0]) {
                        activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                    }
                } else {
                    incomeTax = calculateBrackets(taxableIncome, countryData.taxBrackets);
                }
                socialSecurity = 0;
                break;

            case 'CH': // Switzerland
                const swissRate = useRegime ? 0.18 : 0.22;
                incomeTax = taxableIncome * swissRate;
                socialSecurity = gross * countryData.socialSecurity.employeeRate;
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                }
                break;

            case 'MT': // Malta
                incomeTax = (useRegime && countryData.regimes && countryData.regimes[0])
                    ? taxableIncome * countryData.regimes[0].flatRate
                    : calculateBrackets(taxableIncome, countryData.taxBrackets);
                socialSecurity = Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual);
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                }
                break;

            case 'CY': // Cyprus
                let taxableCY = (useRegime && countryData.regimes && countryData.regimes[0] && gross > 55000)
                    ? taxableIncome * countryData.regimes[0].taxableMultiplier
                    : taxableIncome;
                incomeTax = calculateBrackets(taxableCY, countryData.taxBrackets);
                socialSecurity = Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual);
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    activeRegimeNote = countryData.regimes[0].eligibilityNote || "";
                }
                break;

            case 'EE': // Estonia
                incomeTax = taxableIncome * 0.20;
                socialSecurity = workerType === 'employee' ? gross * countryData.socialSecurity.employeeRate : 0;
                break;

            case 'AU': // Australia
                const thresholdAU = useRegime ? (countryData.regimes[0].allowanceSingle || 18200) : 0;
                const netTaxableAU = Math.max(0, taxableIncome - thresholdAU);
                incomeTax = calculateBrackets(netTaxableAU, countryData.taxBrackets);
                socialSecurity = Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual);
                break;

            default:
                incomeTax = calculateBrackets(taxableIncome, countryData.taxBrackets || []);
                socialSecurity = gross * 0.10;
                break;
        }

        // Section 10: Strict Mathematical Consistency
        // Gross - Income Tax - Social Security - Expenses = Net Income
        incomeTax = Math.max(0, Math.round(incomeTax));
        socialSecurity = Math.max(0, Math.round(socialSecurity));
        const totalDeductions = incomeTax + socialSecurity + Math.round(expenses);
        const netAnnual = Math.max(0, Math.round(gross - totalDeductions));
        const netMonthly = Math.round(netAnnual / 12);
        const netWeekly = Math.round(netAnnual / 52);

        // Standard 2,000 work hours/year (Section 11)
        const netHourly = parseFloat((netAnnual / 2000).toFixed(2));
        const effectiveTaxRate = gross > 0 ? parseFloat(Math.min(100, Math.max(0, ((incomeTax + socialSecurity) / gross) * 100)).toFixed(1)) : 0.0;

        // Cost of Living & Purchasing Power
        let displayCurrency = countryData.currency;
        let displaySymbol = countryData.symbol;
        let monthlyLivingCost = countryData.livingCost || 1800;

        if (calcCurrency === 'EUR') {
            displayCurrency = 'EUR';
            displaySymbol = '€';
            monthlyLivingCost = countryData.livingCostEUR || (countryCode === 'TH' ? Math.round(38500 / 37.602) : (countryCode === 'AE' ? 2000 : (countryData.livingCost || 1800)));
        } else if (calcCurrency === 'USD') {
            displayCurrency = 'USD';
            displaySymbol = '$';
            monthlyLivingCost = countryCode === 'TH' ? Math.round(38500 / 33.415) : (countryCode === 'AE' ? (countryData.livingCost || 2250) : Math.round((countryData.livingCost || 1800) * 1.1253));
        } else if (calcCurrency === 'THB') {
            displayCurrency = 'THB';
            displaySymbol = '฿';
            monthlyLivingCost = countryData.livingCost || 38500;
        }

        const netMonthlySavings = netMonthly - monthlyLivingCost;

        let tier = "✨ Solid Comfort";
        if (netMonthlySavings >= 4000) {
            tier = "💎 Wealth Accumulator";
        } else if (netMonthlySavings >= 2000) {
            tier = "🚀 High Savings & Luxury";
        } else if (netMonthlySavings < 0) {
            tier = "⚠️ Deficit Hazard";
        }

        return {
            country: countryData.country,
            countryCode: countryData.countryCode,
            currency: displayCurrency,
            symbol: displaySymbol,
            calcCurrency: calcCurrency,
            localCurrency: countryData.currency,
            localSymbol: countryData.symbol,
            fxRateUSD: countryData.fxRateUSD || 1.0,
            city: countryData.city,
            taxYear: taxYear,
            workerType: workerType,
            filingStatus: filingStatus,
            supportsFilingStatus: !!countryData.supportsFilingStatus,
            taxTablesStatus: countryData.taxTablesStatus || "needs-review",
            socialSecurityStatus: countryData.socialSecurityStatus || "approximation",
            dataStatus: countryData.dataStatus || "needs-review",
            isVerified: (countryData.taxTablesStatus === 'verified' && countryData.socialSecurityStatus === 'verified'),
            modelNotes: countryData.modelNotes || "",
            verifiedOn: countryData.verifiedOn || null,
            grossIncome: Math.round(gross),
            businessExpenses: Math.round(expenses),
            taxableIncome: Math.round(taxableIncome),
            incomeTax: incomeTax,
            socialSecurity: socialSecurity,
            totalDeductions: totalDeductions,
            effectiveTaxRate: effectiveTaxRate,
            netAnnual: netAnnual,
            netMonthly: netMonthly,
            netWeekly: netWeekly,
            netHourly: netHourly,
            monthlyLivingCost: monthlyLivingCost,
            netMonthlySavings: netMonthlySavings,
            tier: tier,
            activeRegimeNote: activeRegimeNote,
            sources: countryData.sources || [],
            lastUpdated: countryData.lastUpdated || "October 2026",
            calculationVersion: "2026.3"
        };
    }

    /**
     * Side-by-Side Comparison Engine (Sections 19, 22, 23)
     */
    function compareCountries(income, countryA, countryB, workerType, filingStatus) {
        const resA = calculateTax({ grossIncome: income, countryCode: countryA, workerType: workerType, filingStatus: filingStatus, useSpecialRegime: countryA !== 'TH', isOffshoreUnremitted: false, currency: 'EUR' });
        const resB = calculateTax({ grossIncome: income, countryCode: countryB, workerType: workerType, filingStatus: filingStatus, useSpecialRegime: countryB !== 'TH', isOffshoreUnremitted: false, currency: 'EUR' });

        const annualNetDiff = resB.netAnnual - resA.netAnnual;
        const monthlyNetDiff = resB.netMonthly - resA.netMonthly;
        const taxDiff = resB.incomeTax - resA.incomeTax;
        const livingCostDiff = (resB.monthlyLivingCost * 12) - (resA.monthlyLivingCost * 12);
        const annualDisposableDiff = (resB.netMonthlySavings * 12) - (resA.netMonthlySavings * 12);

        let winnerText = "";
        if (annualDisposableDiff > 0) {
            winnerText = `${resB.country} provides higher estimated annual disposable income (approx. ${resB.symbol}${Math.abs(annualDisposableDiff).toLocaleString()} more/yr) after local taxes and living expenses under these assumptions.`;
        } else if (annualDisposableDiff < 0) {
            winnerText = `${resA.country} provides higher estimated annual disposable income (approx. ${resA.symbol}${Math.abs(annualDisposableDiff).toLocaleString()} more/yr) after local taxes and living expenses under these assumptions.`;
        } else {
            winnerText = `Both ${resA.country} and ${resB.country} offer approximately identical estimated net disposable income under these assumptions.`;
        }

        return {
            countryA: resA,
            countryB: resB,
            annualDifference: annualNetDiff,
            monthlyDifference: monthlyNetDiff,
            taxDifference: taxDiff,
            livingCostDifference: livingCostDiff,
            annualDisposableDifference: annualDisposableDiff,
            winnerText: winnerText
        };
    }

    /**
     * Freelancer Hourly Rate Calculator with Configurable Hours (Sections 12, 27, 28)
     */
    function calculateHourlyRate(params) {
        params = params || {};
        const desiredNet = parseValidNumber(params.desiredAnnualNet, 70000);
        const billableHours = parseValidNumber(params.billableHoursYear, 1440);
        const expenses = parseValidNumber(params.annualExpenses, 6000);
        const estTaxRate = Math.min(90, Math.max(0, parseValidNumber(params.estimatedTaxPct, 28))) / 100;

        // Gross needed = (desiredNet / (1 - estTaxRate)) + expenses
        const grossNeeded = (desiredNet / Math.max(0.01, 1 - estTaxRate)) + expenses;
        const minHourlyRate = billableHours > 0 ? grossNeeded / billableHours : 0;
        const recommendedHourlyRate = minHourlyRate * 1.20; // 20% margin for admin, gap periods

        return {
            desiredNet: Math.round(desiredNet),
            billableHoursYear: Math.round(billableHours),
            grossRevenueRequired: Math.round(grossNeeded),
            minHourlyRate: Math.round(minHourlyRate),
            recommendedHourlyRate: Math.round(recommendedHourlyRate)
        };
    }

    /**
     * Remote Work vs Office Savings Calculator (Section 25)
     */
    function calculateRemoteSavings(params) {
        params = params || {};
        const dailyCommuteCost = parseValidNumber(params.dailyCommuteCost, 15);
        const dailyMealCoffee = parseValidNumber(params.dailyMealCoffee, 18);
        const annualOfficeClothing = parseValidNumber(params.annualOfficeClothing, 1200);
        const daysPerWeek = parseValidNumber(params.officeDaysPerWeek, 5);
        const officeDaysYear = Math.min(365, daysPerWeek * 48); // 48 work weeks
        const annualCommute = dailyCommuteCost * officeDaysYear;
        const annualMeals = dailyMealCoffee * officeDaysYear;
        const remoteSetupCost = parseValidNumber(params.remoteSetupCost, 1000);

        const totalAnnualOfficeExpenses = annualCommute + annualMeals + annualOfficeClothing;
        const netAnnualSavings = Math.max(0, totalAnnualOfficeExpenses - remoteSetupCost);

        return {
            annualCommute: Math.round(annualCommute),
            annualMeals: Math.round(annualMeals),
            annualOfficeClothing: Math.round(annualOfficeClothing),
            totalAnnualOfficeExpenses: Math.round(totalAnnualOfficeExpenses),
            remoteSetupCost: Math.round(remoteSetupCost),
            netAnnualSavings: Math.round(netAnnualSavings),
            netMonthlySavings: Math.round(netAnnualSavings / 12)
        };
    }

    return {
        calculateTax: calculateTax,
        compareCountries: compareCountries,
        calculateHourlyRate: calculateHourlyRate,
        calculateRemoteSavings: calculateRemoteSavings,
        parseValidNumber: parseValidNumber,
        COUNTRIES: REMOTAX_COUNTRIES
    };
}));
