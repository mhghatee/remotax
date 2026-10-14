/**
 * REMOTAX PURE CALCULATION ENGINE v1.0
 * Decoupled, functional, zero-DOM tax & salary calculation architecture.
 * Conforms to Remotax Platform Specification (Sections 3, 7, 9, 16, 19, 27, 63, 64)
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['../data/countries'], factory);
    } else if (typeof module === 'object' && module.exports) {
        const { REMOTAX_COUNTRIES } = require('../data/countries');
        module.exports = factory(REMOTAX_COUNTRIES);
    } else {
        root.RemotaxEngine = factory(root.REMOTAX_COUNTRIES);
    }
}(typeof self !== 'undefined' ? self : this, function (REMOTAX_COUNTRIES) {
    'use strict';

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
     * Core Tax & Take-Home Calculation Engine
     * @param {Object} params
     * @returns {Object} Full standardized financial breakdown
     */
    function calculateTax(params) {
        const gross = Math.max(0, parseFloat(params.grossIncome) || 0);
        const countryCode = (params.countryCode || 'ES').toUpperCase();
        const workerType = params.workerType || 'contractor'; // 'employee' | 'freelancer' | 'contractor'
        const useRegime = params.useSpecialRegime !== false;
        const expenses = Math.max(0, parseFloat(params.businessExpenses) || 0);
        const countryData = REMOTAX_COUNTRIES[countryCode] || REMOTAX_COUNTRIES.ES;
        const taxYear = params.taxYear || countryData.taxYear || 2026;

        let incomeTax = 0;
        let socialSecurity = 0;
        let taxableIncome = Math.max(0, gross - expenses);

        // --- Country-Specific Statutory Rules ---
        switch (countryCode) {
            case 'ES': // Spain
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    const r = countryData.regimes[0];
                    incomeTax = taxableIncome <= r.cap ? taxableIncome * r.flatRate : (r.cap * r.flatRate) + ((taxableIncome - r.cap) * r.overflowRate);
                } else {
                    incomeTax = calculateBrackets(taxableIncome, countryData.taxBrackets);
                }
                if (workerType === 'employee') {
                    socialSecurity = gross * countryData.socialSecurity.employeeRate;
                } else {
                    socialSecurity = Math.min(gross * countryData.socialSecurity.contractorRate, countryData.socialSecurity.freelancerMaxAnnual);
                }
                break;

            case 'PT': // Portugal
                if (useRegime && countryData.regimes && countryData.regimes[0]) {
                    incomeTax = taxableIncome * countryData.regimes[0].flatRate;
                } else {
                    incomeTax = calculateBrackets(taxableIncome, countryData.taxBrackets);
                }
                if (workerType === 'employee') {
                    socialSecurity = gross * countryData.socialSecurity.employeeRate;
                } else {
                    socialSecurity = Math.min(gross * countryData.socialSecurity.contractorRate, countryData.socialSecurity.freelancerMaxAnnual);
                }
                break;

            case 'AE': // UAE
                incomeTax = 0;
                socialSecurity = 0;
                break;

            case 'DE': // Germany
                const baseAllowanceDE = useRegime ? (countryData.regimes[0].allowance || 11784) : 0;
                const netTaxableDE = Math.max(0, taxableIncome - baseAllowanceDE);
                incomeTax = calculateBrackets(netTaxableDE, countryData.taxBrackets);
                socialSecurity = workerType === 'employee'
                    ? Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual)
                    : Math.min(gross * countryData.socialSecurity.contractorRate, 8000);
                break;

            case 'GB': // UK
                const allowanceUK = useRegime ? (countryData.regimes[0].allowance || 12570) : 0;
                const netTaxableUK = Math.max(0, taxableIncome - allowanceUK);
                incomeTax = calculateBrackets(netTaxableUK, countryData.taxBrackets);
                socialSecurity = workerType === 'employee'
                    ? Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual)
                    : Math.min(gross * countryData.socialSecurity.contractorRate, 4500);
                break;

            case 'US': // USA
                const deductionUS = useRegime ? (countryData.regimes[0].allowance || 14600) : 0;
                const netTaxableUS = Math.max(0, taxableIncome - deductionUS);
                incomeTax = calculateBrackets(netTaxableUS, countryData.taxBrackets);
                socialSecurity = gross * (workerType === 'employee' ? countryData.socialSecurity.employeeRate : countryData.socialSecurity.contractorRate);
                break;

            case 'CA': // Canada
                const bpaCA = useRegime ? (countryData.regimes[0].allowance || 15705) : 0;
                const netTaxableCA = Math.max(0, taxableIncome - bpaCA);
                incomeTax = calculateBrackets(netTaxableCA, countryData.taxBrackets);
                socialSecurity = Math.min(gross * countryData.socialSecurity.employeeRate, countryData.socialSecurity.freelancerMaxAnnual);
                break;

            case 'NL': // Netherlands
                let taxableNL = (useRegime && countryData.regimes[0]) ? taxableIncome * countryData.regimes[0].taxableMultiplier : taxableIncome;
                incomeTax = calculateBrackets(taxableNL, countryData.taxBrackets);
                socialSecurity = workerType === 'employee' ? gross * countryData.socialSecurity.employeeRate : Math.min(gross * countryData.socialSecurity.contractorRate, countryData.socialSecurity.freelancerMaxAnnual);
                break;

            case 'IT': // Italy
                let taxableIT = (useRegime && countryData.regimes[0]) ? taxableIncome * countryData.regimes[0].taxableMultiplier : taxableIncome;
                incomeTax = calculateBrackets(taxableIT, countryData.taxBrackets);
                socialSecurity = gross * (workerType === 'employee' ? countryData.socialSecurity.employeeRate : countryData.socialSecurity.contractorRate);
                break;

            case 'TH': // Thailand
                if (useRegime && countryData.regimes[0]) {
                    incomeTax = taxableIncome * countryData.regimes[0].flatRate;
                } else {
                    incomeTax = calculateBrackets(taxableIncome, countryData.taxBrackets);
                }
                socialSecurity = 0;
                break;

            case 'SG': // Singapore
                if (useRegime) {
                    incomeTax = 0; // Foreign territorial exemption
                } else {
                    incomeTax = calculateBrackets(taxableIncome, countryData.taxBrackets);
                }
                socialSecurity = 0;
                break;

            case 'CH': // Switzerland
                const swissRate = useRegime ? 0.18 : 0.22;
                incomeTax = taxableIncome * swissRate;
                socialSecurity = gross * countryData.socialSecurity.employeeRate;
                break;

            default:
                incomeTax = calculateBrackets(taxableIncome, countryData.taxBrackets);
                socialSecurity = gross * 0.10;
                break;
        }

        // Totals & Rates
        const totalDeductions = incomeTax + socialSecurity + expenses;
        const netAnnual = Math.max(0, gross - incomeTax - socialSecurity - expenses);
        const netMonthly = netAnnual / 12;
        const netWeekly = netAnnual / 52;
        const netHourly = netAnnual / 2000; // Standard 2,000 working hours/yr
        const effectiveTaxRate = gross > 0 ? ((incomeTax + socialSecurity) / gross) * 100 : 0;

        // Cost of Living & Purchasing Power
        const monthlyLivingCost = countryData.livingCost || 1800;
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
            currency: countryData.currency,
            symbol: countryData.symbol,
            city: countryData.city,
            taxYear: taxYear,
            workerType: workerType,
            grossIncome: gross,
            businessExpenses: expenses,
            taxableIncome: taxableIncome,
            incomeTax: Math.round(incomeTax),
            socialSecurity: Math.round(socialSecurity),
            totalDeductions: Math.round(totalDeductions),
            effectiveTaxRate: parseFloat(effectiveTaxRate.toFixed(1)),
            netAnnual: Math.round(netAnnual),
            netMonthly: Math.round(netMonthly),
            netWeekly: Math.round(netWeekly),
            netHourly: parseFloat(netHourly.toFixed(2)),
            monthlyLivingCost: monthlyLivingCost,
            netMonthlySavings: Math.round(netMonthlySavings),
            tier: tier,
            sources: countryData.sources || [],
            lastUpdated: countryData.lastUpdated || "October 2026"
        };
    }

    /**
     * Side-by-Side Comparison Engine (Section 19)
     */
    function compareCountries(income, countryA, countryB, workerType) {
        const resA = calculateTax({ grossIncome: income, countryCode: countryA, workerType: workerType, useSpecialRegime: true });
        const resB = calculateTax({ grossIncome: income, countryCode: countryB, workerType: workerType, useSpecialRegime: true });
        const annualDiff = resB.netAnnual - resA.netAnnual;
        const monthlyDiff = resB.netMonthly - resA.netMonthly;

        let winnerText = "";
        if (annualDiff > 0) {
            winnerText = `${resB.country} leaves you approximately ${resB.symbol}${Math.abs(annualDiff).toLocaleString()} more per year than ${resA.country}.`;
        } else if (annualDiff < 0) {
            winnerText = `${resA.country} leaves you approximately ${resA.symbol}${Math.abs(annualDiff).toLocaleString()} more per year than ${resB.country}.`;
        } else {
            winnerText = `Both ${resA.country} and ${resB.country} yield approximately identical net take-home pay.`;
        }

        return {
            countryA: resA,
            countryB: resB,
            annualDifference: annualDiff,
            monthlyDifference: monthlyDiff,
            winnerText: winnerText
        };
    }

    /**
     * Freelancer Hourly Rate Calculator (Section 27 & 28)
     */
    function calculateHourlyRate(params) {
        const desiredNet = parseFloat(params.desiredAnnualNet) || 70000;
        const hoursPerDay = parseFloat(params.hoursPerDay) || 6; // billable hours
        const daysPerWeek = parseFloat(params.daysPerWeek) || 5;
        const weeksPerYear = Math.max(1, 52 - (parseFloat(params.vacationWeeks) || 4));
        const billableHoursYear = hoursPerDay * daysPerWeek * weeksPerYear;
        const expenses = parseFloat(params.annualExpenses) || 6000;
        const estTaxRate = (parseFloat(params.estimatedTaxPct) || 28) / 100;

        // Gross needed = (desiredNet / (1 - estTaxRate)) + expenses
        const grossNeeded = (desiredNet / Math.max(0.01, 1 - estTaxRate)) + expenses;
        const minHourlyRate = billableHoursYear > 0 ? grossNeeded / billableHoursYear : 0;
        const recommendedHourlyRate = minHourlyRate * 1.20; // 20% margin for admin, gap periods

        return {
            desiredNet: desiredNet,
            billableHoursYear: Math.round(billableHoursYear),
            grossRevenueRequired: Math.round(grossNeeded),
            minHourlyRate: Math.round(minHourlyRate),
            recommendedHourlyRate: Math.round(recommendedHourlyRate)
        };
    }

    /**
     * Remote Work vs Office Savings Calculator (Section 25)
     */
    function calculateRemoteSavings(params) {
        const dailyCommuteCost = parseFloat(params.dailyCommuteCost) || 12;
        const dailyMealCoffee = parseFloat(params.dailyMealCoffee) || 18;
        const annualOfficeClothing = parseFloat(params.annualOfficeClothing) || 1200;
        const officeDaysYear = (parseFloat(params.officeDaysPerWeek) || 5) * 48; // 48 work weeks
        const annualCommute = dailyCommuteCost * officeDaysYear;
        const annualMeals = dailyMealCoffee * officeDaysYear;
        const remoteSetupCost = parseFloat(params.remoteSetupCost) || 1000;

        const totalAnnualOfficeExpenses = annualCommute + annualMeals + annualOfficeClothing;
        const netAnnualSavings = totalAnnualOfficeExpenses - remoteSetupCost;

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
        COUNTRIES: REMOTAX_COUNTRIES
    };
}));
