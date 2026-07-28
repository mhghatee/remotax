/* ==========================================
   REMOTAX.DEV - HIGH-PRECISION TAX ENGINE
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- Currency Configurations ---
    const CURRENCY_SYMBOLS = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        CAD: '$'
    };

    // 20 Country Specific Regimes & Insight Content
    const COUNTRY_CONFIG = {
        ES: {
            name: "Spain",
            symbol: "EUR",
            regimeName: "Apply Beckham Law (24% Flat Rate)",
            regimeHelp: "Special tax regime allowing qualifying expats & founders to pay a flat 24% tax rate up to €600,000.",
            insightTitle: "Spain Beckham Law & Expat Tax",
            insightDesc: "Spain's Beckham Law avoids progressive tax rates up to 47%. Non-residents pay a flat 24% tax on Spanish-source earned income, and foreign wealth/investment income is exempt.",
            hasRegime: true,
            defaultRegime: true
        },
        PT: {
            name: "Portugal",
            symbol: "EUR",
            regimeName: "Apply NHR / Digital Nomad Incentive (20% Flat)",
            regimeHelp: "Incentive for foreign high-value remote workers providing a flat 20% rate on qualified income.",
            insightTitle: "Portugal D8 & Tax Incentives",
            insightDesc: "Portugal's Digital Nomad D8 visa requires ~€3,280 monthly foreign income. Under qualifying tax incentives, eligible remote workers benefit from reduced 20% flat tax rates.",
            hasRegime: true,
            defaultRegime: true
        },
        DE: {
            name: "Germany",
            symbol: "EUR",
            regimeName: "Apply Single Filer Basic Tax-Free Allowance (€11,784)",
            regimeHelp: "Germany exempts the first €11,784 of taxable income (Grundfreibetrag) for single filers.",
            insightTitle: "Germany Einkommensteuer & Social Cover",
            insightDesc: "Germany features robust social security. The first €11,784 is tax-free. Standard income tax ranges from 14% to 42% for high earners, plus health & pension contributions.",
            hasRegime: true,
            defaultRegime: true
        },
        GB: {
            name: "United Kingdom",
            symbol: "GBP",
            regimeName: "Apply UK Personal Allowance (£12,570 Tax-Free)",
            regimeHelp: "First £12,570 of earned income is tax-free under UK tax laws.",
            insightTitle: "UK Income Tax & National Insurance",
            insightDesc: "The UK applies a £12,570 tax-free personal allowance. Income between £12,571 and £50,270 is taxed at 20% (Basic Rate), and 40% above £50,270.",
            hasRegime: true,
            defaultRegime: true
        },
        US: {
            name: "United States",
            symbol: "USD",
            regimeName: "Apply US Standard Deduction ($14,600 Single)",
            regimeHelp: "Deducts $14,600 from your taxable gross income before calculating federal brackets.",
            insightTitle: "US Federal & Self-Employment FICA",
            insightDesc: "US remote workers pay federal progressive brackets starting at 10%. Self-employed B2B contractors pay 15.3% FICA for Medicare and Social Security.",
            hasRegime: true,
            defaultRegime: true
        },
        CA: {
            name: "Canada",
            symbol: "CAD",
            regimeName: "Apply Basic Personal Amount ($15,705)",
            regimeHelp: "Deducts basic personal non-refundable tax credit allowance.",
            insightTitle: "Canada Federal + Provincial Average",
            insightDesc: "Canada combines Federal tax brackets (15% to 33%) with provincial income tax. B2B contractors can deduct home office and equipment expenses.",
            hasRegime: true,
            defaultRegime: true
        },
        NL: {
            name: "Netherlands",
            symbol: "EUR",
            regimeName: "Apply 30% Tax-Free Expat Ruling",
            regimeHelp: "Allows 30% of gross salary to be received tax-free for qualifying highly skilled migrants.",
            insightTitle: "Netherlands 30% Expat Ruling",
            insightDesc: "The Dutch 30% ruling grants qualifying expat remote workers a tax-free allowance of up to 30% of gross income, significantly boosting net take-home pay.",
            hasRegime: true,
            defaultRegime: true
        },
        AE: {
            name: "United Arab Emirates",
            symbol: "USD",
            regimeName: "0% Personal Income Tax Regime",
            regimeHelp: "UAE applies 0% personal income tax and 0% social security on foreign remote workers.",
            insightTitle: "Dubai / UAE 0% Income Tax Destination",
            insightDesc: "The UAE imposes 0% personal income tax for remote workers and digital nomads under the Dubai Remote Work Visa program. 100% of earned gross income is retained.",
            hasRegime: true,
            defaultRegime: true
        },
        TH: {
            name: "Thailand",
            symbol: "USD",
            regimeName: "Apply Destination Thailand Visa (DTV) 17% Cap",
            regimeHelp: "Thailand's DTV & LTR visas offer 17% flat tax or foreign-sourced income tax exemption if not remitted in same year.",
            insightTitle: "Thailand DTV & Remote Worker Tax",
            insightDesc: "Thailand's new Destination Thailand Visa (DTV) allows 5-year stay for remote workers. Foreign earned income remitted in subsequent years enjoys major tax benefits.",
            hasRegime: true,
            defaultRegime: true
        },
        IT: {
            name: "Italy",
            symbol: "EUR",
            regimeName: "Apply Lavoratori Impatriati (50% - 70% Tax Base Exemption)",
            regimeHelp: "Reduces taxable gross income base by up to 70% for qualifying workers moving tax residency to Italy.",
            insightTitle: "Italy Impatriati Regime",
            insightDesc: "Italy's Impatriati tax regime exempts 50% to 70% of earned income from Italian personal income tax (IRPEF) for up to 5 years upon moving tax residence.",
            hasRegime: true,
            defaultRegime: true
        },
        GR: {
            name: "Greece",
            symbol: "EUR",
            regimeName: "Apply 50% Tax Reduction Incentive for Expats",
            regimeHelp: "Cuts total taxable income base by 50% for 7 years for remote workers relocating tax residency to Greece.",
            insightTitle: "Greece 50% Expat Tax Reduction",
            insightDesc: "Greece incentivizes remote workers and expats moving tax residency to Greece with a 50% exemption on income tax for up to 7 consecutive years.",
            hasRegime: true,
            defaultRegime: true
        },
        MT: {
            name: "Malta",
            symbol: "EUR",
            regimeName: "Apply Nomad Residence Permit Flat 10% Tax Rate",
            regimeHelp: "Malta's Nomad Residence Permit caps income tax at a flat 10% for remote work earnings.",
            insightTitle: "Malta Nomad Residence & 10% Flat Rate",
            insightDesc: "Malta offers a popular Nomad Residence Permit for non-EU remote workers, providing a favorable 10% flat income tax rate with full Schengen travel access.",
            hasRegime: true,
            defaultRegime: true
        },
        CY: {
            name: "Cyprus",
            symbol: "EUR",
            regimeName: "Apply 50% Exemption for First Employment / Non-Dom",
            regimeHelp: "Exempts 50% of employment/freelance income exceeding €55,000 for non-domiciled residents.",
            insightTitle: "Cyprus Non-Domicile Tax Advantages",
            insightDesc: "Cyprus Non-Dom tax status provides a 50% tax exemption on remuneration exceeding €55,000/year, combined with 0% defense tax on dividends and interest.",
            hasRegime: true,
            defaultRegime: true
        },
        MC: {
            name: "Monaco",
            symbol: "EUR",
            regimeName: "0% Personal Income Tax Status",
            regimeHelp: "Monaco levies zero personal income tax on resident individuals (excluding French nationals).",
            insightTitle: "Monaco Zero Income Tax Haven",
            insightDesc: "Monaco residents pay 0% personal income tax, 0% capital gains tax, and 0% wealth tax on worldwide income.",
            hasRegime: true,
            defaultRegime: true
        },
        EE: {
            name: "Estonia",
            symbol: "EUR",
            regimeName: "Apply e-Residency B2B Corporate Retention (0% Undistributed)",
            regimeHelp: "Corporate income tax is 0% on retained & reinvested company earnings.",
            insightTitle: "Estonia e-Residency & Digital Nomad Tax",
            insightDesc: "Estonia's e-Residency allows remote founders to manage EU companies with 0% corporate tax on reinvested income, and a flat 20% income tax on personal withdrawals.",
            hasRegime: true,
            defaultRegime: true
        },
        SG: {
            name: "Singapore",
            symbol: "USD",
            regimeName: "Apply Territorial Foreign Earned Exemption",
            regimeHelp: "Foreign-source remote income not remitted into Singapore is generally exempt from Singapore tax.",
            insightTitle: "Singapore Territorial Tax System",
            insightDesc: "Singapore operates a territorial tax system. Personal income tax rates start at 0% and max out at 24% for high earners, with 0% capital gains tax.",
            hasRegime: true,
            defaultRegime: true
        },
        MX: {
            name: "Mexico",
            symbol: "USD",
            regimeName: "Apply Residencia Temporal Foreign Source Exemption",
            regimeHelp: "Foreign remote earnings billed to non-Mexican clients are exempt from local ISR tax if tax resident elsewhere.",
            insightTitle: "Mexico Temporary Resident Remote Tax",
            insightDesc: "Mexico is a global digital nomad hub (Mexico City, Tulum). Foreign-source income for temporary residents billing foreign clients outside Mexico enjoys major tax benefits.",
            hasRegime: true,
            defaultRegime: true
        },
        ID: {
            name: "Indonesia (Bali)",
            symbol: "USD",
            regimeName: "Apply Second Home Visa Foreign Income Exemption",
            regimeHelp: "Exempts foreign-sourced income earned by digital nomads living in Bali on foreign visas.",
            insightTitle: "Indonesia (Bali) Digital Nomad Taxes",
            insightDesc: "Indonesia's Bali Remote Work & Second Home visas allow foreign digital nomads to live in Bali tax-free on foreign-sourced income earned from abroad.",
            hasRegime: true,
            defaultRegime: true
        },
        AU: {
            name: "Australia",
            symbol: "USD",
            regimeName: "Apply Tax-Free Threshold ($18,200 AUD)",
            regimeHelp: "First $18,200 AUD of income is tax-free for Australian tax residents.",
            insightTitle: "Australia Resident Income Tax Brackets",
            insightDesc: "Australian tax residents benefit from an $18,200 tax-free threshold. Progressive tax rates range from 19% up to 45% for high earners.",
            hasRegime: true,
            defaultRegime: true
        },
        CH: {
            name: "Switzerland",
            symbol: "USD",
            regimeName: "Apply Average Federal + Cantonal Tax (~18%)",
            regimeHelp: "Combines Swiss Federal Direct Tax with average cantonal/municipal tax rates.",
            insightTitle: "Switzerland Federal & Cantonal Taxation",
            insightDesc: "Switzerland offers competitive cantonal tax rates (e.g. Zug, Schwyz) averaging 12% to 22% total effective tax rate, plus high quality of living.",
            hasRegime: true,
            defaultRegime: true
        }
    };

    // --- DOM Elements ---
    const countrySelect = document.getElementById('country-select');
    const incomeInput = document.getElementById('income-input');
    const incomeSlider = document.getElementById('income-slider');
    const globalCurrency = document.getElementById('global-currency');
    const regimeContainer = document.getElementById('regime-container');
    const regimeToggle = document.getElementById('special-regime-toggle');
    const regimeText = document.getElementById('regime-text');
    const regimeHelp = document.getElementById('regime-help');
    const empTypeRadios = document.getElementsByName('emp-type');
    const filingStatusSelect = document.getElementById('filing-status');
    const copySummaryBtn = document.getElementById('copy-summary-btn');

    // Output Elements
    const netMonthlyAmount = document.getElementById('net-monthly-amount');
    const netAnnualAmount = document.getElementById('net-annual-amount');
    const effectiveTaxBadge = document.getElementById('effective-tax-badge');
    const barNet = document.getElementById('bar-net');
    const barTax = document.getElementById('bar-tax');
    const barSocial = document.getElementById('bar-social');
    const pctNet = document.getElementById('pct-net');
    const pctTax = document.getElementById('pct-tax');
    const pctSocial = document.getElementById('pct-social');

    const valGross = document.getElementById('val-gross');
    const valTax = document.getElementById('val-tax');
    const valSocial = document.getElementById('val-social');
    const valNetAnnual = document.getElementById('val-net-annual');
    const valNetMonthly = document.getElementById('val-net-monthly');

    const insightTitle = document.getElementById('insight-title');
    const insightDesc = document.getElementById('insight-desc');

    // --- State Variables ---
    let currentCurrencySymbol = '$';

    // Sync Slider & Number Input
    incomeSlider.addEventListener('input', (e) => {
        incomeInput.value = e.target.value;
        calculateTaxes();
    });

    incomeInput.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value) || 0;
        if (val > 500000) val = 500000;
        incomeSlider.value = val;
        calculateTaxes();
    });

    globalCurrency.addEventListener('change', (e) => {
        currentCurrencySymbol = CURRENCY_SYMBOLS[e.target.value] || '$';
        calculateTaxes();
    });

    countrySelect.addEventListener('change', () => {
        updateCountryUI();
        calculateTaxes();
    });

    regimeToggle.addEventListener('change', calculateTaxes);
    filingStatusSelect.addEventListener('change', calculateTaxes);

    Array.from(empTypeRadios).forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.radio-card').forEach(card => card.classList.remove('active'));
            e.target.closest('.radio-card').classList.add('active');
            calculateTaxes();
        });
    });

    // Update Country UI Labels & Insights
    function updateCountryUI() {
        const countryKey = countrySelect.value;
        const config = COUNTRY_CONFIG[countryKey];

        if (config) {
            regimeText.textContent = config.regimeName;
            regimeHelp.textContent = config.regimeHelp;
            regimeToggle.checked = config.defaultRegime;

            insightTitle.textContent = config.insightTitle;
            insightDesc.textContent = config.insightDesc;

            globalCurrency.value = config.symbol;
            currentCurrencySymbol = CURRENCY_SYMBOLS[config.symbol];
        }
    }

    // --- Tax Calculation Engine (20 Countries) ---
    function calculateTaxes() {
        const gross = parseFloat(incomeInput.value) || 0;
        const country = countrySelect.value;
        const useRegime = regimeToggle.checked;
        const empType = document.querySelector('input[name="emp-type"]:checked').value;

        let incomeTax = 0;
        let socialSecurity = 0;

        switch (country) {
            case 'ES': // Spain
                if (useRegime) {
                    incomeTax = gross <= 600000 ? gross * 0.24 : (600000 * 0.24) + ((gross - 600000) * 0.47);
                } else {
                    incomeTax = calculateProgressiveTax(gross, [
                        { limit: 12450, rate: 0.19 },
                        { limit: 20200, rate: 0.24 },
                        { limit: 35200, rate: 0.30 },
                        { limit: 60000, rate: 0.37 },
                        { limit: 300000, rate: 0.45 },
                        { limit: Infinity, rate: 0.47 }
                    ]);
                }
                socialSecurity = empType === 'contractor' ? Math.min(gross * 0.08, 4300) : gross * 0.0635;
                break;

            case 'PT': // Portugal
                if (useRegime) {
                    incomeTax = gross * 0.20;
                } else {
                    incomeTax = calculateProgressiveTax(gross, [
                        { limit: 7703, rate: 0.1325 },
                        { limit: 11623, rate: 0.18 },
                        { limit: 16472, rate: 0.23 },
                        { limit: 21321, rate: 0.26 },
                        { limit: 27146, rate: 0.327 },
                        { limit: 39791, rate: 0.37 },
                        { limit: 51997, rate: 0.435 },
                        { limit: 80000, rate: 0.45 },
                        { limit: Infinity, rate: 0.48 }
                    ]);
                }
                socialSecurity = empType === 'contractor' ? gross * 0.15 : gross * 0.11;
                break;

            case 'DE': // Germany
                const taxableDE = Math.max(0, gross - (useRegime ? 11784 : 0));
                incomeTax = calculateProgressiveTax(taxableDE, [
                    { limit: 17005, rate: 0.14 },
                    { limit: 66760, rate: 0.24 },
                    { limit: 277825, rate: 0.42 },
                    { limit: Infinity, rate: 0.45 }
                ]);
                socialSecurity = empType === 'contractor' ? Math.min(gross * 0.14, 8000) : Math.min(gross * 0.195, 12000);
                break;

            case 'GB': // United Kingdom
                const taxableUK = Math.max(0, gross - (useRegime ? 12570 : 0));
                incomeTax = calculateProgressiveTax(taxableUK, [
                    { limit: 37700, rate: 0.20 },
                    { limit: 125140, rate: 0.40 },
                    { limit: Infinity, rate: 0.45 }
                ]);
                socialSecurity = empType === 'contractor' ? Math.min(gross * 0.09, 4500) : Math.min(gross * 0.08, 5000);
                break;

            case 'US': // United States
                const taxableUS = Math.max(0, gross - (useRegime ? 14600 : 0));
                incomeTax = calculateProgressiveTax(taxableUS, [
                    { limit: 11600, rate: 0.10 },
                    { limit: 47150, rate: 0.12 },
                    { limit: 100525, rate: 0.22 },
                    { limit: 191950, rate: 0.24 },
                    { limit: 243725, rate: 0.32 },
                    { limit: 609350, rate: 0.35 },
                    { limit: Infinity, rate: 0.37 }
                ]);
                socialSecurity = empType === 'contractor' ? gross * 0.153 : gross * 0.0765;
                break;

            case 'CA': // Canada
                const taxableCA = Math.max(0, gross - (useRegime ? 15705 : 0));
                incomeTax = calculateProgressiveTax(taxableCA, [
                    { limit: 55867, rate: 0.20 },
                    { limit: 111733, rate: 0.295 },
                    { limit: 173205, rate: 0.36 },
                    { limit: 246752, rate: 0.43 },
                    { limit: Infinity, rate: 0.48 }
                ]);
                socialSecurity = Math.min(gross * 0.0595, 3867);
                break;

            case 'NL': // Netherlands
                let taxableNL = useRegime ? gross * 0.70 : gross;
                incomeTax = calculateProgressiveTax(taxableNL, [
                    { limit: 75518, rate: 0.3697 },
                    { limit: Infinity, rate: 0.495 }
                ]);
                socialSecurity = empType === 'contractor' ? Math.min(gross * 0.08, 3500) : gross * 0.06;
                break;

            case 'AE': // UAE / Dubai (0% Tax)
                incomeTax = 0;
                socialSecurity = 0;
                break;

            case 'TH': // Thailand
                if (useRegime) {
                    incomeTax = gross * 0.17; // DTV / LTR flat 17% rate
                } else {
                    incomeTax = calculateProgressiveTax(gross, [
                        { limit: 150000, rate: 0.05 },
                        { limit: 300000, rate: 0.10 },
                        { limit: 500000, rate: 0.15 },
                        { limit: 750000, rate: 0.20 },
                        { limit: 1000000, rate: 0.25 },
                        { limit: 2000000, rate: 0.30 },
                        { limit: Infinity, rate: 0.35 }
                    ]);
                }
                socialSecurity = 0;
                break;

            case 'IT': // Italy
                let taxableIT = useRegime ? gross * 0.30 : gross; // 70% Impatriati exemption
                incomeTax = calculateProgressiveTax(taxableIT, [
                    { limit: 28000, rate: 0.23 },
                    { limit: 50000, rate: 0.35 },
                    { limit: Infinity, rate: 0.43 }
                ]);
                socialSecurity = empType === 'contractor' ? gross * 0.12 : gross * 0.0919;
                break;

            case 'GR': // Greece
                let taxableGR = useRegime ? gross * 0.50 : gross; // 50% Expat exemption
                incomeTax = calculateProgressiveTax(taxableGR, [
                    { limit: 10000, rate: 0.09 },
                    { limit: 20000, rate: 0.22 },
                    { limit: 30000, rate: 0.28 },
                    { limit: 40000, rate: 0.36 },
                    { limit: Infinity, rate: 0.44 }
                ]);
                socialSecurity = gross * 0.07;
                break;

            case 'MT': // Malta
                incomeTax = useRegime ? gross * 0.10 : calculateProgressiveTax(gross, [
                    { limit: 9100, rate: 0.0 },
                    { limit: 14500, rate: 0.15 },
                    { limit: 60000, rate: 0.25 },
                    { limit: Infinity, rate: 0.35 }
                ]);
                socialSecurity = Math.min(gross * 0.10, 2600);
                break;

            case 'CY': // Cyprus
                let taxableCY = useRegime && gross > 55000 ? gross * 0.50 : gross;
                incomeTax = calculateProgressiveTax(taxableCY, [
                    { limit: 19500, rate: 0.0 },
                    { limit: 28000, rate: 0.20 },
                    { limit: 36300, rate: 0.25 },
                    { limit: 60000, rate: 0.30 },
                    { limit: Infinity, rate: 0.35 }
                ]);
                socialSecurity = gross * 0.083;
                break;

            case 'MC': // Monaco
                incomeTax = 0;
                socialSecurity = 0;
                break;

            case 'EE': // Estonia
                incomeTax = gross * 0.20; // 20% Flat rate
                socialSecurity = empType === 'contractor' ? 0 : gross * 0.033;
                break;

            case 'SG': // Singapore
                incomeTax = calculateProgressiveTax(gross, [
                    { limit: 20000, rate: 0.0 },
                    { limit: 30000, rate: 0.02 },
                    { limit: 40000, rate: 0.035 },
                    { limit: 80000, rate: 0.07 },
                    { limit: 120000, rate: 0.115 },
                    { limit: 160000, rate: 0.15 },
                    { limit: 200000, rate: 0.18 },
                    { limit: 320000, rate: 0.19 },
                    { limit: Infinity, rate: 0.24 }
                ]);
                socialSecurity = 0; // Foreigners exempt from CPF
                break;

            case 'MX': // Mexico
                if (useRegime) {
                    incomeTax = 0; // Foreign source non-Mexican client exemption
                } else {
                    incomeTax = calculateProgressiveTax(gross, [
                        { limit: 15000, rate: 0.10 },
                        { limit: 50000, rate: 0.20 },
                        { limit: Infinity, rate: 0.30 }
                    ]);
                }
                socialSecurity = 0;
                break;

            case 'ID': // Indonesia (Bali)
                incomeTax = useRegime ? 0 : calculateProgressiveTax(gross, [
                    { limit: 4000, rate: 0.05 },
                    { limit: 16000, rate: 0.15 },
                    { limit: 33000, rate: 0.25 },
                    { limit: Infinity, rate: 0.35 }
                ]);
                socialSecurity = 0;
                break;

            case 'AU': // Australia
                const taxableAU = Math.max(0, gross - (useRegime ? 18200 : 0));
                incomeTax = calculateProgressiveTax(taxableAU, [
                    { limit: 45000, rate: 0.19 },
                    { limit: 120000, rate: 0.325 },
                    { limit: 180000, rate: 0.37 },
                    { limit: Infinity, rate: 0.45 }
                ]);
                socialSecurity = gross * 0.02; // Medicare Levy
                break;

            case 'CH': // Switzerland
                incomeTax = gross * (useRegime ? 0.18 : 0.22); // Federal + Canton Average
                socialSecurity = gross * 0.053; // AVS/AI
                break;
        }

        // Calculate Totals
        const annualNet = Math.max(0, gross - incomeTax - socialSecurity);
        const monthlyNet = annualNet / 12;
        const effectiveRate = gross > 0 ? ((incomeTax + socialSecurity) / gross) * 100 : 0;

        // Render Values to UI
        valGross.textContent = formatCurrency(gross);
        valTax.textContent = `-${formatCurrency(incomeTax)}`;
        valSocial.textContent = `-${formatCurrency(socialSecurity)}`;
        valNetAnnual.textContent = formatCurrency(annualNet);
        valNetMonthly.textContent = formatCurrency(monthlyNet);

        netMonthlyAmount.textContent = formatCurrency(monthlyNet);
        netAnnualAmount.textContent = `Annual Net: ${formatCurrency(annualNet)} / year`;
        effectiveTaxBadge.textContent = `Effective Tax & Social Rate: ${effectiveRate.toFixed(1)}%`;

        // Render Bar Widths & Percentages
        const netPct = Math.max(0, (annualNet / gross) * 100);
        const taxPct = Math.max(0, (incomeTax / gross) * 100);
        const socialPct = Math.max(0, (socialSecurity / gross) * 100);

        barNet.style.width = `${netPct}%`;
        barTax.style.width = `${taxPct}%`;
        barSocial.style.width = `${socialPct}%`;

        pctNet.textContent = `${netPct.toFixed(0)}%`;
        pctTax.textContent = `${taxPct.toFixed(0)}%`;
        pctSocial.textContent = `${socialPct.toFixed(0)}%`;
    }

    // Helper: Progressive Tax Bracket Calculator
    function calculateProgressiveTax(income, brackets) {
        let tax = 0;
        let previousLimit = 0;

        for (const bracket of brackets) {
            if (income > previousLimit) {
                const taxableInBracket = Math.min(income, bracket.limit) - previousLimit;
                tax += taxableInBracket * bracket.rate;
                previousLimit = bracket.limit;
            } else {
                break;
            }
        }
        return tax;
    }

    // Helper: Currency Formatter
    function formatCurrency(amount) {
        return currentCurrencySymbol + Math.round(amount).toLocaleString('en-US');
    }

    // Clipboard Copy Feature for Summary
    copySummaryBtn.addEventListener('click', () => {
        const country = COUNTRY_CONFIG[countrySelect.value].name;
        const gross = valGross.textContent;
        const netMonth = valNetMonthly.textContent;
        const netYear = valNetAnnual.textContent;
        const effRate = effectiveTaxBadge.textContent;

        const summaryText = `⚡ REMOTAX TAX SUMMARY (${country})\n` +
            `• Gross Annual Income: ${gross}\n` +
            `• Estimated Monthly Net Pay: ${netMonth}\n` +
            `• Estimated Annual Net Pay: ${netYear}\n` +
            `• ${effRate}\n` +
            `Calculated at https://remotax.dev`;

        navigator.clipboard.writeText(summaryText).then(() => {
            const origText = copySummaryBtn.textContent;
            copySummaryBtn.textContent = '✓ Copied!';
            copySummaryBtn.style.borderColor = '#10b981';
            setTimeout(() => {
                copySummaryBtn.textContent = origText;
                copySummaryBtn.style.borderColor = '';
            }, 2000);
        });
    });

    // Initialize UI
    updateCountryUI();
    calculateTaxes();
});
