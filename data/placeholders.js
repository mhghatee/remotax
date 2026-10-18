/**
 * REMOTAX CANONICAL PLACEHOLDER REGISTRY (data/placeholders.js)
 * Single Source of Statutory Truth for programmatic SEO content & templates.
 * 
 * Maps every statutory number, bracket rate, social security ceiling,
 * deduction allowance, and engine calculation to canonical {{...}} tokens.
 */

const fs = require('fs');
const path = require('path');
const { REMOTAX_COUNTRIES } = require('./countries');
const taxEngine = require('../engine/taxEngine');

function formatCurrency(val, symbol, decimals = 0) {
    if (val === null || val === undefined) return '';
    const rounded = decimals > 0 ? Number(val).toFixed(decimals) : Math.round(Number(val));
    const parts = String(rounded).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol}${parts.join('.')}`;
}

function buildPlaceholders() {
    const p = {};

    // FX Benchmark Placeholders
    const fxPath = path.join(__dirname, 'fx.json');
    if (fs.existsSync(fxPath)) {
        const fxData = JSON.parse(fs.readFileSync(fxPath, 'utf8'));
        p['fx.date'] = fxData.date;
        p['fx.rates.usd'] = String(fxData.rates.USD);
        p['fx.rates.thb'] = String(fxData.rates.THB);
        p['fx.rates.aed'] = Number(fxData.rates.AED).toFixed(4);
        p['fx.source'] = fxData.source;
    }

    // 1. SPAIN (ES)
    const es = REMOTAX_COUNTRIES.ES;
    p['es.taxYear'] = String(es.taxYear);
    p['es.currency'] = es.currency;
    p['es.symbol'] = es.symbol;
    p['es.city'] = es.city;
    p['es.livingCost'] = es.livingCost.toLocaleString();
    p['es.livingCostFormatted'] = formatCurrency(es.livingCost, es.symbol);
    p['es.daysResidency'] = '183';
    p['es.taxBrackets.minRatePercent'] = '19%';
    p['es.taxBrackets.maxRatePercent'] = '47%';
    p['es.taxBrackets.minRate'] = '19.00%';
    p['es.taxBrackets.maxRate'] = '47.00%';
    p['es.taxBrackets.bracketRange'] = '19% to 47%';
    p['es.taxBrackets.bracketRangeLong'] = '19.00% to 47.00%';
    p['es.taxBrackets.minBracketLimit'] = formatCurrency(12450, es.symbol);
    p['es.taxBrackets.topThresholdFormatted'] = formatCurrency(300000, es.symbol);
    p['es.deductions.workExpenseAllowanceFormatted'] = formatCurrency(es.deductions.workExpenseAllowance, es.symbol);
    p['es.deductions.standardAllowanceFormatted'] = formatCurrency(es.deductions.standardAllowance, es.symbol);
    p['es.deductions.jointDeductionFormatted'] = formatCurrency(es.deductions.jointDeduction, es.symbol);

    p['es.employee.ratePercent'] = '6.50%';
    p['es.employee.rate'] = '6.50%';
    p['es.employee.contingencyRatePercent'] = '4.70%';
    p['es.employee.unemploymentRatePercent'] = '1.55%';
    p['es.employee.trainingRatePercent'] = '0.10%';
    p['es.employee.meiRatePercent'] = '0.15%';
    p['es.employee.maxMonthlyBaseFormatted'] = formatCurrency(es.socialSecurity.employeeMaxMonthlyBase, es.symbol, 2);
    p['es.employee.maxAnnualBaseFormatted'] = formatCurrency(es.socialSecurity.employeeMaxAnnualBase, es.symbol, 2);
    p['es.employee.maxAnnualSSFormatted'] = formatCurrency(es.socialSecurity.employeeMaxAnnual, es.symbol, 2);
    p['es.employee.maxAnnualSSRoundedFormatted'] = formatCurrency(es.socialSecurity.employeeMaxAnnual, es.symbol);

    p['es.autonomo.tramoCount'] = '15';
    p['es.autonomo.expenseProvisionPercent'] = '7%';
    p['es.autonomo.totalRatePercent'] = '31.50%';
    p['es.autonomo.minMonthlyNetFormatted'] = formatCurrency(670, es.symbol);
    p['es.autonomo.maxMonthlyNetThresholdFormatted'] = formatCurrency(6000, es.symbol);
    p['es.autonomo.minCuotaFormatted'] = formatCurrency(205.88, es.symbol, 2);
    p['es.autonomo.maxCuotaFormatted'] = formatCurrency(607.35, es.symbol, 2);
    p['es.autonomo.minAnnualSSFormatted'] = formatCurrency(2470.56, es.symbol, 2);
    p['es.autonomo.maxAnnualSSFormatted'] = formatCurrency(es.socialSecurity.contractorMaxAnnual, es.symbol, 2);
    p['es.autonomo.maxAnnualSSRoundedFormatted'] = formatCurrency(es.socialSecurity.contractorMaxAnnual, es.symbol);
    p['es.autonomo.optionalMaxMonthlyBaseFormatted'] = formatCurrency(es.socialSecurity.autonomoOptionalMaxMonthlyBase, es.symbol, 2);
    p['es.autonomo.optionalMaxMonthlyCuotaFormatted'] = formatCurrency(es.socialSecurity.autonomoOptionalMaxMonthlyCuota, es.symbol, 2);
    p['es.autonomo.optionalMaxAnnualSSFormatted'] = formatCurrency(es.socialSecurity.autonomoOptionalMaxAnnual, es.symbol, 2);
    p['es.autonomo.tablaGeneralTramo'] = '12';
    p['es.autonomo.tablaReducidaTramo'] = '1';
    p['es.autonomo.boeCitation'] = 'Orden PJC/297/2026 (BOE-A-2026-7296), Artículo 18';

    p['es.beckham.ratePercent'] = '24%';
    p['es.beckham.rate'] = '24.00%';
    p['es.beckham.capFormatted'] = formatCurrency(600000, es.symbol);
    p['es.beckham.overflowRatePercent'] = '47%';
    p['es.beckham.priorNonResidencyYears'] = '5';
    p['es.beckham.regimeDurationYears'] = '6';
    p['es.beckham.applicationDeadlineMonths'] = '6';
    p['es.beckham.foreignInvoicingLimitPercent'] = '20%';
    p['es.beckham.advantageThresholdFormatted'] = formatCurrency(60000, es.symbol);

    const esEmp100kStd = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'ES', workerType: 'employee', useSpecialRegime: false });
    const esEmp100kBeck = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'ES', workerType: 'employee', useSpecialRegime: true });
    const esCon100kStd = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'ES', workerType: 'contractor', useSpecialRegime: false });
    const esCon100kBeck = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'ES', workerType: 'contractor', useSpecialRegime: true });

    p['es.netPay100kStdEmployeeFormatted'] = formatCurrency(esEmp100kStd.netAnnual, es.symbol);
    p['es.effectiveRate100kStdEmployee'] = `${esEmp100kStd.effectiveTaxRate}%`;
    p['es.netPay100kBeckhamEmployeeFormatted'] = formatCurrency(esEmp100kBeck.netAnnual, es.symbol);
    p['es.effectiveRate100kBeckhamEmployee'] = `${esEmp100kBeck.effectiveTaxRate}%`;
    p['es.netPay100kStdContractorFormatted'] = formatCurrency(esCon100kStd.netAnnual, es.symbol);
    p['es.effectiveRate100kStdContractor'] = `${esCon100kStd.effectiveTaxRate}%`;
    p['es.netPay100kBeckhamContractorFormatted'] = formatCurrency(esCon100kBeck.netAnnual, es.symbol);
    p['es.effectiveRate100kBeckhamContractor'] = `${esCon100kBeck.effectiveTaxRate}%`;

    // 2. PORTUGAL (PT)
    const pt = REMOTAX_COUNTRIES.PT;
    p['pt.taxYear'] = String(pt.taxYear);
    p['pt.currency'] = pt.currency;
    p['pt.symbol'] = pt.symbol;
    p['pt.city'] = pt.city;
    p['pt.livingCost'] = pt.livingCost.toLocaleString();
    p['pt.livingCostFormatted'] = formatCurrency(pt.livingCost, pt.symbol);
    p['pt.daysResidency'] = '183';
    p['pt.iasFormatted'] = formatCurrency(pt.socialSecurity.iasValue2026, pt.symbol, 2);
    p['pt.taxBrackets.minRatePercent'] = '12.5%';
    p['pt.taxBrackets.maxRatePercent'] = '48%';
    p['pt.taxBrackets.minRate'] = '12.50%';
    p['pt.taxBrackets.maxRate'] = '48.00%';
    p['pt.taxBrackets.bracketRange'] = '12.5% to 48%';
    p['pt.taxBrackets.bracketRangeLong'] = '12.50% to 48.00%';
    p['pt.taxBrackets.minBracketLimit'] = formatCurrency(8342, pt.symbol);
    p['pt.taxBrackets.topThresholdFormatted'] = formatCurrency(86634, pt.symbol);
    p['pt.deductions.standardAllowanceFormatted'] = formatCurrency(pt.deductions.standardAllowance, pt.symbol, 2);
    p['pt.deductions.categoryBCoefficientPercent'] = '75%';

    p['pt.employee.ratePercent'] = '11%';
    p['pt.employee.rate'] = '11.00%';
    p['pt.contractor.ratePercent'] = '21.4%';
    p['pt.contractor.rate'] = '21.40%';
    p['pt.contractor.baseMultiplierPercent'] = '70%';
    p['pt.contractor.effectiveSSRatePercent'] = '14.98%';
    p['pt.contractor.iasMultiplier'] = '12';
    p['pt.contractor.maxMonthlyBaseFormatted'] = formatCurrency(pt.socialSecurity.contractorMaxMonthlyBase, pt.symbol, 2);
    p['pt.contractor.maxAnnualBaseFormatted'] = formatCurrency(pt.socialSecurity.contractorMaxAnnualBase, pt.symbol, 2);
    p['pt.contractor.maxAnnualSSFormatted'] = formatCurrency(pt.socialSecurity.freelancerMaxAnnual, pt.symbol, 2);
    p['pt.contractor.maxAnnualSSRoundedFormatted'] = formatCurrency(pt.socialSecurity.freelancerMaxAnnual, pt.symbol);

    p['pt.ifici.ratePercent'] = '20%';
    p['pt.ifici.rate'] = '20.00%';
    p['pt.ifici.durationYears'] = '10';
    p['pt.citizenshipYears'] = '5';

    const ptEmp100kStd = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'PT', workerType: 'employee', useSpecialRegime: false });
    const ptEmp100kIfici = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'PT', workerType: 'employee', useSpecialRegime: true });
    const ptCon100kStd = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'PT', workerType: 'contractor', useSpecialRegime: false });
    const ptCon100kIfici = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'PT', workerType: 'contractor', useSpecialRegime: true });

    p['pt.netPay100kStdEmployeeFormatted'] = formatCurrency(ptEmp100kStd.netAnnual, pt.symbol);
    p['pt.effectiveRate100kStdEmployee'] = `${ptEmp100kStd.effectiveTaxRate}%`;
    p['pt.netPay100kIficiEmployeeFormatted'] = formatCurrency(ptEmp100kIfici.netAnnual, pt.symbol);
    p['pt.effectiveRate100kIficiEmployee'] = `${ptEmp100kIfici.effectiveTaxRate}%`;
    p['pt.netPay100kStdContractorFormatted'] = formatCurrency(ptCon100kStd.netAnnual, pt.symbol);
    p['pt.effectiveRate100kStdContractor'] = `${ptCon100kStd.effectiveTaxRate}%`;
    p['pt.netPay100kIficiContractorFormatted'] = formatCurrency(ptCon100kIfici.netAnnual, pt.symbol);
    p['pt.effectiveRate100kIficiContractor'] = `${ptCon100kIfici.effectiveTaxRate}%`;

    // 3. ITALY (IT)
    const it = REMOTAX_COUNTRIES.IT;
    p['it.taxYear'] = String(it.taxYear);
    p['it.currency'] = it.currency;
    p['it.symbol'] = it.symbol;
    p['it.city'] = it.city;
    p['it.livingCost'] = it.livingCost.toLocaleString();
    p['it.livingCostFormatted'] = formatCurrency(it.livingCost, it.symbol);
    p['it.daysResidency'] = '183';
    p['it.taxBrackets.bracket1RatePercent'] = '23%';
    p['it.taxBrackets.bracket2RatePercent'] = '33%';
    p['it.taxBrackets.bracket3RatePercent'] = '43%';
    p['it.taxBrackets.bracketRange'] = '23% to 43%';
    p['it.taxBrackets.bracket1LimitFormatted'] = formatCurrency(28000, it.symbol);
    p['it.taxBrackets.bracket2LimitFormatted'] = formatCurrency(50000, it.symbol);
    p['it.surcharges.averageRatePercent'] = '2.50%';

    p['it.inps.massimaleFormatted'] = formatCurrency(it.socialSecurity.employeeMaxAnnualBase, it.symbol);
    p['it.inps.primaFasciaFormatted'] = formatCurrency(it.socialSecurity.primaFascia, it.symbol);
    p['it.employee.baseRatePercent'] = '9.19%';
    p['it.employee.excessRatePercent'] = '10.19%';
    p['it.employee.maxAnnualSSFormatted'] = formatCurrency(it.socialSecurity.employeeMaxAnnual, it.symbol, 2);
    p['it.employee.maxAnnualSSRoundedFormatted'] = formatCurrency(it.socialSecurity.employeeMaxAnnual, it.symbol);
    p['it.gestioneSeparata.ratePercent'] = '26.07%';
    p['it.gestioneSeparata.maxAnnualSSFormatted'] = formatCurrency(it.socialSecurity.freelancerMaxAnnual, it.symbol, 2);
    p['it.gestioneSeparata.maxAnnualSSRoundedFormatted'] = formatCurrency(it.socialSecurity.freelancerMaxAnnual, it.symbol);

    p['it.impatriati.exemptionPercent'] = '50%';
    p['it.impatriati.childExemptionPercent'] = '60%';
    p['it.impatriati.capFormatted'] = formatCurrency(600000, it.symbol);
    p['it.impatriati.durationYears'] = '5';
    p['it.impatriati.priorNonResidencyYears'] = '3';
    p['it.impatriati.minimumStayYears'] = '4';

    const itEmp100kStd = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'IT', workerType: 'employee', useSpecialRegime: false });
    const itEmp100kImp = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'IT', workerType: 'employee', useSpecialRegime: true });
    const itCon100kStd = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'IT', workerType: 'contractor', useSpecialRegime: false });
    const itCon100kImp = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'IT', workerType: 'contractor', useSpecialRegime: true });

    p['it.netPay100kStdEmployeeFormatted'] = formatCurrency(itEmp100kStd.netAnnual, it.symbol);
    p['it.effectiveRate100kStdEmployee'] = `${itEmp100kStd.effectiveTaxRate}%`;
    p['it.netPay100kImpatriatiEmployeeFormatted'] = formatCurrency(itEmp100kImp.netAnnual, it.symbol);
    p['it.effectiveRate100kImpatriatiEmployee'] = `${itEmp100kImp.effectiveTaxRate}%`;
    p['it.netPay100kStdContractorFormatted'] = formatCurrency(itCon100kStd.netAnnual, it.symbol);
    p['it.effectiveRate100kStdContractor'] = `${itCon100kStd.effectiveTaxRate}%`;
    p['it.netPay100kImpatriatiContractorFormatted'] = formatCurrency(itCon100kImp.netAnnual, it.symbol);
    p['it.effectiveRate100kImpatriatiContractor'] = `${itCon100kImp.effectiveTaxRate}%`;

    // 4. UAE (AE)
    const ae = REMOTAX_COUNTRIES.AE;
    p['ae.taxYear'] = String(ae.taxYear);
    p['ae.currency'] = ae.currency;
    p['ae.symbol'] = ae.symbol;
    p['ae.city'] = ae.city;
    p['ae.livingCost'] = ae.livingCost.toLocaleString();
    p['ae.livingCostFormatted'] = formatCurrency(ae.livingCost, ae.symbol);
    p['ae.livingCostUSDFormatted'] = `$${ae.livingCost.toLocaleString()} / mo`;
    p['ae.livingCostEURFormatted'] = `€${ae.livingCostEUR.toLocaleString()} / mo`;
    p['ae.livingCostBothFormatted'] = `$${ae.livingCost.toLocaleString()} / mo (~€${ae.livingCostEUR.toLocaleString()})`;
    p['ae.daysResidency'] = String(ae.daysResidency || 183);
    p['ae.incomeTaxRatePercent'] = '0%';
    p['ae.socialSecurityRatePercent'] = '0%';
    p['ae.corporateTaxThresholdAEDFormatted'] = 'AED 1,000,000';
    p['ae.corporateTaxProfitThresholdAEDFormatted'] = 'AED 375,000';
    p['ae.corporateTaxRatePercent'] = '9%';

    const aeEmp100k = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'AE', workerType: 'employee', currency: 'EUR' });
    p['ae.netPay100kFormatted'] = formatCurrency(aeEmp100k.netAnnual, '€');
    p['ae.netPay100kEURFormatted'] = `€${aeEmp100k.netAnnual.toLocaleString()}`;
    p['ae.effectiveRate100k'] = `${aeEmp100k.effectiveTaxRate}%`;
    const aeNetEURMonthly = Math.round(aeEmp100k.netAnnual / 12);
    p['ae.leftover100kEURFormatted'] = `€${(aeNetEURMonthly - ae.livingCostEUR).toLocaleString()} / mo`;

    // 5. THAILAND (TH)
    const th = REMOTAX_COUNTRIES.TH;
    p['th.taxYear'] = String(th.taxYear);
    p['th.currency'] = th.currency;
    p['th.symbol'] = th.symbol;
    p['th.city'] = th.city;
    p['th.livingCost'] = th.livingCost.toLocaleString();
    p['th.livingCostEUR'] = String(th.livingCostEUR);
    p['th.livingCostFormatted'] = `${th.symbol}${th.livingCost.toLocaleString()} / mo`;
    p['th.livingCostTHBFormatted'] = `${th.symbol}${th.livingCost.toLocaleString()} / mo`;
    p['th.livingCostEURFormatted'] = `€${th.livingCostEUR.toLocaleString()} / mo`;
    p['th.livingCostBothFormatted'] = `${th.symbol}${th.livingCost.toLocaleString()} / mo (~€${th.livingCostEUR.toLocaleString()})`;
    p['th.livingCostUSDFormatted'] = `$${Math.round(th.livingCost / 33.415).toLocaleString()} / mo`;
    p['th.daysResidency'] = String(th.daysResidency || 180);
    p['th.fxRateUSD'] = '33.415';
    p['th.fxRateEUR'] = '37.602';
    p['th.taxBrackets.minRatePercent'] = '0%';
    p['th.taxBrackets.maxRatePercent'] = '35%';
    p['th.taxBrackets.rangePercent'] = '0% to 35%';
    p['th.deductions.employmentExpenseRatePercent'] = '50%';
    p['th.deductions.employmentExpenseCapFormatted'] = formatCurrency(th.deductions.employmentExpenseCap, th.symbol);
    p['th.deductions.standardAllowanceFormatted'] = formatCurrency(th.deductions.standardAllowance, th.symbol);
    p['th.deductions.totalDeductionsFormatted'] = formatCurrency(160000, th.symbol);
    p['th.socialSecurity.ratePercent'] = '0%';

    const th100k = taxEngine.calculateTax({ grossIncome: 100000, countryCode: 'TH', workerType: 'employee', useSpecialRegime: false, currency: 'EUR' });
    p['th.netPay100kRemittedEURFormatted'] = `€${th100k.netAnnual.toLocaleString()}`;
    p['th.netPay100kRemittedUSDFormatted'] = `$${Math.round(th100k.netAnnual * 1.1253).toLocaleString()}`;
    p['th.effectiveRate100kRemitted'] = `${th100k.effectiveTaxRate}%`;
    const thNetEURMonthly = Math.round(th100k.netAnnual / 12);
    p['th.leftover100kEURFormatted'] = `€${(thNetEURMonthly - th.livingCostEUR).toLocaleString()} / mo`;

    // Aliases matching prompt specifications
    p['es.ss.employeeCap'] = p['es.employee.maxAnnualSSRoundedFormatted'];
    p['es.ss.employeeCapDecimals'] = p['es.employee.maxAnnualSSFormatted'];
    p['es.ss.autonomoCap'] = p['es.autonomo.maxAnnualSSRoundedFormatted'];
    p['es.ss.autonomoCapDecimals'] = p['es.autonomo.maxAnnualSSFormatted'];
    p['es.ss.autonomoOptionalMax'] = p['es.autonomo.optionalMaxAnnualSSFormatted'];
    p['it.gs.rate'] = p['it.gestioneSeparata.ratePercent'];
    p['it.gs.cap'] = p['it.gestioneSeparata.maxAnnualSSRoundedFormatted'];
    p['it.gs.capDecimals'] = p['it.gestioneSeparata.maxAnnualSSFormatted'];
    p['it.ss.employeeCap'] = p['it.employee.maxAnnualSSRoundedFormatted'];
    p['it.ss.employeeCapDecimals'] = p['it.employee.maxAnnualSSFormatted'];
    p['pt.ss.contractorCap'] = p['pt.contractor.maxAnnualSSRoundedFormatted'];
    p['pt.ss.contractorCapDecimals'] = p['pt.contractor.maxAnnualSSFormatted'];
    p['pt.ss.contractorAnnualBase'] = p['pt.contractor.maxAnnualBaseFormatted'];

    // Additional specific placeholders
    p['th.dtv.assetRequirementTHBFormatted'] = '฿500,000';
    p['th.dtv.assetRequirementUSDFormatted'] = '$14,000';
    p['th.dtv.assetRequirementEURFormatted'] = '€13,000';
    p['th.dtv.consularFeeTHBFormatted'] = '฿10,000';
    p['th.dtv.extensionFeeTHBFormatted'] = '฿1,900';
    p['th.dtv.validityYears'] = '5';
    p['th.dtv.stayDays'] = '180';
    p['th.taxBrackets.bracket1LimitFormatted'] = '฿150,000';
    p['th.taxBrackets.bracket2LimitFormatted'] = '฿300,000';
    p['th.taxBrackets.bracket3LimitFormatted'] = '฿500,000';
    p['th.taxBrackets.bracket1RatePercent'] = '0%';
    p['th.taxBrackets.bracket2RatePercent'] = '5%';
    p['th.taxBrackets.bracket3RatePercent'] = '10%';
    p['th.taxBrackets.bracket4RatePercent'] = '15%';
    p['th.taxBrackets.bracket5RatePercent'] = '20%';
    p['th.taxBrackets.bracket6RatePercent'] = '25%';
    p['th.taxBrackets.bracket7RatePercent'] = '30%';
    p['th.taxBrackets.bracket8RatePercent'] = '35%';

    p['ae.vwp.durationYears'] = '1';
    p['ae.vwp.salaryRequirementUSDFormatted'] = '$3,500';
    p['ae.vwp.salaryRequirementAnnualUSDFormatted'] = '$42,000';
    p['ae.vwp.applicationFeeUSDFormatted'] = '$287';
    p['ae.corporateTaxThresholdUSDFormatted'] = '~$272,250';
    p['ae.corporateTaxProfitThresholdUSDFormatted'] = '~$102,000';
    p['ae.goldenVisaYears'] = '10';
    p['ae.taxResidencyDays'] = '183';
    p['ae.taxResidencyTiesDays'] = '90';

    // Systematic multi-tier benchmarks (50k, 100k, 150k) across all countries
    const benchmarks = [50000, 100000, 150000];
    const countryCodes = ['ES', 'PT', 'IT', 'AE', 'TH'];
    const workerTypes = ['employee', 'contractor'];

    for (const code of countryCodes) {
        const c = REMOTAX_COUNTRIES[code];
        const cLower = code.toLowerCase();
        for (const wt of workerTypes) {
            for (const gross of benchmarks) {
                const kStr = `${gross / 1000}k`;

                // Standard scenario
                const std = taxEngine.calculateTax({ grossIncome: gross, countryCode: code, workerType: wt, useSpecialRegime: false, currency: 'EUR' });
                p[`calc.net.${cLower}.${wt}.${kStr}`] = formatCurrency(std.netAnnual, '€');
                p[`calc.tax.${cLower}.${wt}.${kStr}`] = formatCurrency(std.incomeTax, '€');
                p[`calc.ss.${cLower}.${wt}.${kStr}`] = formatCurrency(std.socialSecurity, '€');
                p[`calc.rate.${cLower}.${wt}.${kStr}`] = `${std.effectiveTaxRate}%`;

                // Special regime scenario
                const spec = taxEngine.calculateTax({ grossIncome: gross, countryCode: code, workerType: wt, useSpecialRegime: true, currency: 'EUR' });
                p[`calc.net.${cLower}.special.${wt}.${kStr}`] = formatCurrency(spec.netAnnual, '€');
                p[`calc.tax.${cLower}.special.${wt}.${kStr}`] = formatCurrency(spec.incomeTax, '€');
                p[`calc.ss.${cLower}.special.${wt}.${kStr}`] = formatCurrency(spec.socialSecurity, '€');
                p[`calc.rate.${cLower}.special.${wt}.${kStr}`] = `${spec.effectiveTaxRate}%`;

                // Regime specific aliases
                if (code === 'ES') {
                    p[`calc.net.es.beckham.${wt}.${kStr}`] = formatCurrency(spec.netAnnual, '€');
                    p[`calc.rate.es.beckham.${wt}.${kStr}`] = `${spec.effectiveTaxRate}%`;
                } else if (code === 'PT') {
                    p[`calc.net.pt.ifici.${wt}.${kStr}`] = formatCurrency(spec.netAnnual, '€');
                    p[`calc.rate.pt.ifici.${wt}.${kStr}`] = `${spec.effectiveTaxRate}%`;
                } else if (code === 'IT') {
                    p[`calc.net.it.impatriati.${wt}.${kStr}`] = formatCurrency(spec.netAnnual, '€');
                    p[`calc.rate.it.impatriati.${wt}.${kStr}`] = `${spec.effectiveTaxRate}%`;
                }
            }
        }
    }

    return p;
}

const PLACEHOLDERS = buildPlaceholders();

/**
 * Deep recursive string interpolation function replacing all {{key}} with values.
 */
function interpolate(obj, placeholders = PLACEHOLDERS) {
    if (typeof obj === 'string') {
        return obj.replace(/\{\{([a-zA-Z0-9._-]+)\}\}/g, (match, key) => {
            if (Object.prototype.hasOwnProperty.call(placeholders, key)) {
                return placeholders[key];
            }
            return match;
        });
    } else if (Array.isArray(obj)) {
        return obj.map(item => interpolate(item, placeholders));
    } else if (obj !== null && typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = interpolate(v, placeholders);
        }
        return out;
    }
    return obj;
}

module.exports = {
    PLACEHOLDERS,
    buildPlaceholders,
    interpolate
};
