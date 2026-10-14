/* =========================================================================
   REMOTAX — GLOBAL REMOTE WORK FINANCIAL INTELLIGENCE PLATFORM
   Unified UI Controller & State Manager (Tax Year: 2026)
   Conforms to Remotax Platform Specification (Sections 2, 4, 5, 6, 7, 8, 9, 10, 13, 26, 27, 28, 44)
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const CANONICAL_BASE_URL = 'https://afrix.ir/remotax/';

    // --- Currency Symbol Mapping ---
    const CURRENCY_SYMBOLS = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        CAD: '$'
    };

    // --- DOM Elements ---
    const countrySelect = document.getElementById('country-select');
    const incomeInput = document.getElementById('income-input');
    const incomeSlider = document.getElementById('income-slider');
    const globalCurrency = document.getElementById('global-currency-select') || document.getElementById('global-currency');
    const regimeToggle = document.getElementById('special-regime-toggle');
    const regimeText = document.getElementById('regime-text');
    const regimeHelp = document.getElementById('regime-help');
    const filingStatusSelect = document.getElementById('filing-status');
    const copySummaryBtn = document.getElementById('copy-summary-btn');
    const resetCalcBtn = document.getElementById('reset-calc-btn');

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

    // Current State
    let currentCurrencySymbol = '$';

    /**
     * Robust number parser (Section 6)
     * Handles `$100,000`, `100 000`, `€85,000`, negative numbers, decimals, empty input
     */
    function sanitizeInput(val, fallback = 0) {
        if (typeof window.RemotaxEngine !== 'undefined' && window.RemotaxEngine.parseValidNumber) {
            return window.RemotaxEngine.parseValidNumber(val, fallback);
        }
        if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? fallback : Math.max(0, val);
        if (!val) return fallback;
        const cleaned = String(val).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) || !isFinite(num) ? fallback : Math.max(0, num);
    }

    /**
     * Currency Formatter
     */
    function formatCurrency(amount) {
        return currentCurrencySymbol + Math.round(amount).toLocaleString('en-US');
    }

    /**
     * Core Calculation & UI Dispatcher
     */
    function calculateTaxes() {
        if (!countrySelect || !incomeInput) return;

        const gross = sanitizeInput(incomeInput.value, 0);
        const country = (countrySelect.value || 'ES').toUpperCase();
        const useRegime = regimeToggle ? regimeToggle.checked : true;
        const empRadio = document.querySelector('input[name="emp-type"]:checked');
        const empType = empRadio ? empRadio.value : 'contractor';
        const filingStatus = filingStatusSelect ? filingStatusSelect.value : 'single';

        let res;
        if (typeof window.RemotaxEngine !== 'undefined' && window.RemotaxEngine.calculateTax) {
            res = window.RemotaxEngine.calculateTax({
                grossIncome: gross,
                countryCode: country,
                workerType: empType,
                filingStatus: filingStatus,
                useSpecialRegime: useRegime
            });
        } else {
            // Fallback if engine is not yet loaded
            const tax = useRegime ? gross * 0.24 : gross * 0.30;
            const soc = empType === 'contractor' ? Math.min(gross * 0.08, 4300) : gross * 0.0635;
            const net = Math.max(0, gross - tax - soc);
            res = {
                grossIncome: gross,
                incomeTax: Math.round(tax),
                socialSecurity: Math.round(soc),
                netAnnual: Math.round(net),
                netMonthly: Math.round(net / 12),
                effectiveTaxRate: gross > 0 ? parseFloat((((tax + soc) / gross) * 100).toFixed(1)) : 0,
                city: "Madrid",
                country: "Spain",
                tier: "💎 Wealth Accumulator",
                monthlyLivingCost: 1850,
                netMonthlySavings: Math.round((net / 12) - 1850)
            };
        }

        // Render Values
        if (valGross) valGross.textContent = formatCurrency(res.grossIncome);
        if (valTax) valTax.textContent = `-${formatCurrency(res.incomeTax)}`;
        if (valSocial) valSocial.textContent = `-${formatCurrency(res.socialSecurity)}`;
        if (valNetAnnual) valNetAnnual.textContent = formatCurrency(res.netAnnual);
        if (valNetMonthly) valNetMonthly.textContent = formatCurrency(res.netMonthly);

        if (netMonthlyAmount) netMonthlyAmount.textContent = formatCurrency(res.netMonthly);
        if (netAnnualAmount) netAnnualAmount.textContent = `Annual Net: ${formatCurrency(res.netAnnual)} / year`;
        if (effectiveTaxBadge) effectiveTaxBadge.textContent = `Effective Tax & Social Rate: ${res.effectiveTaxRate}%`;

        // Render Visual Bars
        const netPct = gross > 0 ? Math.max(0, (res.netAnnual / gross) * 100) : 0;
        const taxPct = gross > 0 ? Math.max(0, (res.incomeTax / gross) * 100) : 0;
        const socialPct = gross > 0 ? Math.max(0, (res.socialSecurity / gross) * 100) : 0;

        if (barNet) barNet.style.width = `${netPct}%`;
        if (barTax) barTax.style.width = `${taxPct}%`;
        if (barSocial) barSocial.style.width = `${socialPct}%`;

        if (pctNet) pctNet.textContent = `${Math.round(netPct)}%`;
        if (pctTax) pctTax.textContent = `${Math.round(taxPct)}%`;
        if (pctSocial) pctSocial.textContent = `${Math.round(socialPct)}%`;

        // Render Lifestyle & Purchasing Power Index
        const lifestyleCityTitle = document.getElementById('lifestyle-city-title');
        const lifestyleTierBadge = document.getElementById('lifestyle-tier-badge');
        const valLivingCost = document.getElementById('val-living-cost');
        const valNetSavings = document.getElementById('val-net-savings');
        const lifestyleInsightDesc = document.getElementById('lifestyle-insight-desc');

        if (lifestyleCityTitle) {
            lifestyleCityTitle.textContent = `${res.city} (${res.country}) Lifestyle`;
            if (valLivingCost) valLivingCost.textContent = `${formatCurrency(res.monthlyLivingCost)}/mo`;
            if (valNetSavings) valNetSavings.textContent = `${formatCurrency(res.netMonthlySavings)}/mo`;
            if (lifestyleTierBadge) lifestyleTierBadge.textContent = res.tier;

            if (lifestyleInsightDesc) {
                if (res.netMonthlySavings >= 0) {
                    lifestyleInsightDesc.textContent = `In ${res.city}, a take-home pay of ${formatCurrency(res.netMonthly)} covers average rent and living costs (${formatCurrency(res.monthlyLivingCost)}), leaving an estimated ${formatCurrency(res.netMonthlySavings)} in net monthly savings.`;
                } else {
                    lifestyleInsightDesc.textContent = `In ${res.city}, average living costs (${formatCurrency(res.monthlyLivingCost)}) exceed your projected monthly take-home pay (${formatCurrency(res.netMonthly)}). Consider tax incentives or higher rates.`;
                }
            }
        }
    }

    /**
     * Update Country Specific UI
     */
    function updateCountryUI() {
        if (!countrySelect) return;
        const countryKey = countrySelect.value;
        const config = (window.RemotaxEngine && window.RemotaxEngine.COUNTRIES) 
            ? window.RemotaxEngine.COUNTRIES[countryKey] 
            : null;

        if (config) {
            if (regimeText && config.regimes && config.regimes[0]) {
                regimeText.textContent = config.regimes[0].name;
            }
            if (regimeHelp && config.regimes && config.regimes[0]) {
                regimeHelp.textContent = config.regimes[0].description;
            }
            if (regimeToggle) {
                regimeToggle.checked = true;
                const regimeGroup = document.getElementById('special-regime-group');
                if (regimeGroup) regimeGroup.style.display = config.regimes && config.regimes.length > 0 ? 'flex' : 'none';
            }

            if (insightTitle) insightTitle.textContent = `${config.country} 2026 Tax Framework`;
            if (insightDesc && config.regimes && config.regimes[0]) {
                insightDesc.textContent = config.regimes[0].description + " " + (config.regimes[0].eligibilityNote || "");
            }

            // Sync Currency
            currentCurrencySymbol = config.symbol || '$';
            if (globalCurrency) globalCurrency.value = config.currency || 'USD';
            const prefixSymbol = document.getElementById('currency-prefix-symbol');
            if (prefixSymbol) prefixSymbol.textContent = currentCurrencySymbol;

            // Filing status support
            if (filingStatusSelect) {
                const filingGroup = filingStatusSelect.closest('.input-group') || filingStatusSelect.closest('.form-group');
                if (filingGroup) {
                    if (config.supportsFilingStatus) {
                        filingStatusSelect.disabled = false;
                        filingGroup.style.opacity = '1';
                    } else {
                        filingStatusSelect.value = 'single';
                        filingStatusSelect.disabled = true;
                        filingGroup.style.opacity = '0.65';
                    }
                }
            }
        }
    }

    // --- Input Event Listeners ---
    if (incomeSlider && incomeInput) {
        incomeSlider.addEventListener('input', (e) => {
            incomeInput.value = e.target.value;
            calculateTaxes();
        });

        ['input', 'keyup', 'change'].forEach(evt => {
            incomeInput.addEventListener(evt, (e) => {
                let val = sanitizeInput(e.target.value, 0);
                if (val > 1000000) val = 1000000;
                incomeSlider.value = val;
                calculateTaxes();
            });
        });
    }

    // Radio Card Selector
    document.querySelectorAll('.radio-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[name="emp-type"]');
            if (radio) radio.checked = true;
            calculateTaxes();
        });
    });

    if (globalCurrency) {
        globalCurrency.addEventListener('change', (e) => {
            currentCurrencySymbol = CURRENCY_SYMBOLS[e.target.value] || '$';
            const prefixSymbol = document.getElementById('currency-prefix-symbol');
            if (prefixSymbol) prefixSymbol.textContent = currentCurrencySymbol;
            calculateTaxes();
        });
    }

    if (countrySelect) {
        countrySelect.addEventListener('change', () => {
            updateCountryUI();
            calculateTaxes();
        });
    }

    if (regimeToggle) regimeToggle.addEventListener('change', calculateTaxes);
    if (filingStatusSelect) filingStatusSelect.addEventListener('change', calculateTaxes);

    // --- Reset Calculator (Section 44) ---
    if (resetCalcBtn) {
        resetCalcBtn.addEventListener('click', () => {
            if (countrySelect) countrySelect.value = 'ES';
            if (incomeInput) incomeInput.value = 100000;
            if (incomeSlider) incomeSlider.value = 100000;
            if (filingStatusSelect) filingStatusSelect.value = 'single';
            if (regimeToggle) regimeToggle.checked = true;

            const contractorRadio = document.querySelector('input[name="emp-type"][value="contractor"]');
            if (contractorRadio) {
                contractorRadio.checked = true;
                document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
                const contractorCard = contractorRadio.closest('.radio-card');
                if (contractorCard) contractorCard.classList.add('active');
            }

            updateCountryUI();
            calculateTaxes();
        });
    }

    // --- Clipboard Copy Feature (Section 26) ---
    if (copySummaryBtn) {
        copySummaryBtn.addEventListener('click', () => {
            const country = countrySelect ? countrySelect.options[countrySelect.selectedIndex].text : "Spain";
            const gross = valGross ? valGross.textContent : "$100,000";
            const netMonth = valNetMonthly ? valNetMonthly.textContent : "$5,975";
            const netYear = valNetAnnual ? valNetAnnual.textContent : "$71,700";
            const effRate = effectiveTaxBadge ? effectiveTaxBadge.textContent : "28.3%";
            const empType = document.querySelector('input[name="emp-type"]:checked')?.value || "contractor";

            const summaryText = `⚡ REMOTAX FINANCIAL SUMMARY (Tax Year: 2026)\n` +
                `• Country: ${country}\n` +
                `• Classification: ${empType === 'employee' ? 'Employee (EOR)' : 'B2B Contractor / Freelancer'}\n` +
                `• Gross Annual Income: ${gross}\n` +
                `• Estimated Monthly Net Pay: ${netMonth}\n` +
                `• Estimated Annual Net Pay: ${netYear}\n` +
                `• ${effRate}\n` +
                `• Disclaimer: Estimates for financial comparison only; not formal tax advice.\n` +
                `Calculated at ${CANONICAL_BASE_URL}`;

            const copySuccess = () => {
                const origText = copySummaryBtn.textContent;
                copySummaryBtn.textContent = '✓ Copied to Clipboard!';
                copySummaryBtn.style.borderColor = '#10b981';
                setTimeout(() => {
                    copySummaryBtn.textContent = origText;
                    copySummaryBtn.style.borderColor = '';
                }, 2500);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(summaryText).then(copySuccess).catch(() => {
                    fallbackCopyText(summaryText, copySuccess);
                });
            } else {
                fallbackCopyText(summaryText, copySuccess);
            }
        });
    }

    function fallbackCopyText(text, callback) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            if (callback) callback();
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    }

    // --- Benchmark Salary Tabs & Calculator Synchronization (Section 28) ---
    const benchmarkBtns = document.querySelectorAll('.benchmark-btn');
    const shareInfographicBtn = document.getElementById('share-infographic-btn');

    benchmarkBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            benchmarkBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const salary = sanitizeInput(btn.getAttribute('data-salary'), 100000);

            // Synchronize with main calculator (Section 28)
            if (incomeInput && incomeSlider) {
                incomeInput.value = salary;
                incomeSlider.value = salary;
                calculateTaxes();
            }

            updateInfographicData(salary);
        });
    });

    function updateInfographicData(salary) {
        const netAE = salary;
        const netES = salary <= 600000 ? salary * 0.72 : salary * 0.53;
        const netPT = salary * 0.65;
        const netDE = salary * 0.54;

        const infoNetAE = document.getElementById('info-net-ae');
        const infoNetES = document.getElementById('info-net-es');
        const infoNetPT = document.getElementById('info-net-pt');
        const infoNetDE = document.getElementById('info-net-de');

        if (infoNetAE) infoNetAE.textContent = '$' + Math.round(netAE).toLocaleString();
        if (infoNetES) infoNetES.textContent = '$' + Math.round(netES).toLocaleString();
        if (infoNetPT) infoNetPT.textContent = '$' + Math.round(netPT).toLocaleString();
        if (infoNetDE) infoNetDE.textContent = '$' + Math.round(netDE).toLocaleString();
    }

    if (shareInfographicBtn) {
        shareInfographicBtn.addEventListener('click', () => {
            const activeBtn = document.querySelector('.benchmark-btn.active');
            const salaryText = activeBtn ? activeBtn.textContent : '$100,000 / yr';

            const text = `📊 REMOTAX GLOBAL REMOTE WORKER BENCHMARK (${salaryText})\n` +
                `🇦🇪 Dubai (UAE): $100,000 Net (0% Tax)\n` +
                `🇪🇸 Spain (Beckham Law): $72,000 Net (24% Flat)\n` +
                `🇵🇹 Portugal (D8 / NHR 2.0): $65,000 Net (20% Flat)\n` +
                `🇩🇪 Germany: $54,000 Net (Standard Bracket)\n\n` +
                `Compare 20 countries on Remotax: ${CANONICAL_BASE_URL}`;

            fallbackCopyText(text, () => {
                const origText = shareInfographicBtn.innerHTML;
                shareInfographicBtn.innerHTML = '<span>✓ Comparison Copied to Clipboard!</span>';
                shareInfographicBtn.style.background = '#10b981';
                setTimeout(() => {
                    shareInfographicBtn.innerHTML = origText;
                    shareInfographicBtn.style.background = '';
                }, 2500);
            });
        });
    }

    // --- Smart Match Nomad Quiz Engine (Section 27) ---
    const quizState = { income: null, goal: null, work: null };
    let currentQuizStep = 1;

    const quizProgress = document.getElementById('quiz-progress');
    const quizResultCard = document.getElementById('quiz-result-card');
    const quizRestartBtn = document.getElementById('quiz-restart-btn');
    const quizLoadCalcBtn = document.getElementById('quiz-load-calc-btn');

    let matchedCountryCode = 'AE';
    let matchedIncomeVal = 100000;

    document.querySelectorAll('.quiz-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.getAttribute('data-field');
            const val = btn.getAttribute('data-val');
            quizState[field] = val;

            if (currentQuizStep < 3) {
                const currStepEl = document.querySelector(`.quiz-step[data-step="${currentQuizStep}"]`);
                if (currStepEl) currStepEl.style.display = 'none';

                currentQuizStep++;
                const nextStepEl = document.querySelector(`.quiz-step[data-step="${currentQuizStep}"]`);
                if (nextStepEl) nextStepEl.style.display = 'block';

                if (quizProgress) quizProgress.style.width = `${(currentQuizStep / 3) * 100}%`;
            } else {
                calculateQuizMatch();
            }
        });
    });

    // Previous Question Button Handler
    document.querySelectorAll('.quiz-prev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentQuizStep > 1) {
                const currStepEl = document.querySelector(`.quiz-step[data-step="${currentQuizStep}"]`);
                if (currStepEl) currStepEl.style.display = 'none';

                currentQuizStep--;
                const prevStepEl = document.querySelector(`.quiz-step[data-step="${currentQuizStep}"]`);
                if (prevStepEl) prevStepEl.style.display = 'block';

                if (quizProgress) quizProgress.style.width = `${(currentQuizStep / 3) * 100}%`;
            }
        });
    });

    function calculateQuizMatch() {
        const step3El = document.querySelector('.quiz-step[data-step="3"]');
        if (step3El) step3El.style.display = 'none';

        if (quizProgress) quizProgress.style.width = '100%';

        const { income, goal, work } = quizState;

        let match = {
            code: 'AE',
            flag: '🇦🇪',
            name: 'Dubai, United Arab Emirates',
            tag: '0% Income Tax • Virtual Work Visa',
            desc: 'Dubai offers 100% tax exemption on foreign remote earnings with 0% personal income tax and simple 1-year renewable visa eligibility.',
            incomeVal: 120000
        };

        if (goal === 'eu_residency' || (income === 'mid' && goal !== 'zero_tax')) {
            match = {
                code: 'ES',
                flag: '🇪🇸',
                name: 'Spain (Madrid & Barcelona)',
                tag: 'Beckham Law 24% Flat Rate • EU Residency',
                desc: 'Spain\'s Beckham Law caps income tax at a flat 24% up to €600,000, offering EU residency and high quality of living.',
                incomeVal: 90000
            };
        } else if (goal === 'tropical') {
            match = {
                code: 'TH',
                flag: '🇹🇭',
                name: 'Thailand (Bangkok & Chiang Mai)',
                tag: 'Destination Thailand Visa (DTV) • Low Cost',
                desc: 'Thailand offers a 5-year Destination Thailand Visa (DTV) with foreign-earned income exemptions and ultra-low living costs.',
                incomeVal: 50000
            };
        } else if (income === 'low' && goal === 'eu_residency') {
            match = {
                code: 'PT',
                flag: '🇵🇹',
                name: 'Portugal (Lisbon & Algarve)',
                tag: 'D8 Digital Nomad Visa • 20% Tax Incentive',
                desc: 'Portugal\'s D8 Visa requires €3,280 monthly foreign income and grants Schengen residency with competitive 20% tax rates.',
                incomeVal: 55000
            };
        }

        matchedCountryCode = match.code;
        matchedIncomeVal = match.incomeVal;

        const resFlag = document.getElementById('res-flag');
        const resName = document.getElementById('res-country-name');
        const resTag = document.getElementById('res-tag');
        const resDesc = document.getElementById('res-desc');

        if (resFlag) resFlag.textContent = match.flag;
        if (resName) resName.textContent = match.name;
        if (resTag) resTag.textContent = match.tag;
        if (resDesc) resDesc.textContent = match.desc;

        if (quizResultCard) quizResultCard.style.display = 'block';
    }

    if (quizRestartBtn) {
        quizRestartBtn.addEventListener('click', () => {
            currentQuizStep = 1;
            quizState.income = null;
            quizState.goal = null;
            quizState.work = null;

            if (quizResultCard) quizResultCard.style.display = 'none';
            document.querySelectorAll('.quiz-step').forEach(step => step.style.display = 'none');
            const step1El = document.querySelector('.quiz-step[data-step="1"]');
            if (step1El) step1El.style.display = 'block';
            if (quizProgress) quizProgress.style.width = '33%';
        });
    }

    if (quizLoadCalcBtn) {
        quizLoadCalcBtn.addEventListener('click', () => {
            if (countrySelect) countrySelect.value = matchedCountryCode;
            if (incomeInput) incomeInput.value = matchedIncomeVal;
            if (incomeSlider) incomeSlider.value = matchedIncomeVal;

            updateCountryUI();
            calculateTaxes();

            const calcEl = document.getElementById('calculator');
            if (calcEl) calcEl.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // --- Hub Tabbed Switcher ---
    const hubTabBtns = document.querySelectorAll('.hub-tab-btn');
    const hubPanels = document.querySelectorAll('.hub-panel');

    hubTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            hubTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            hubPanels.forEach(panel => {
                panel.style.display = 'none';
                panel.classList.remove('active-panel');
            });

            const activePanel = document.getElementById(`panel-${targetTab}`);
            if (activePanel) {
                activePanel.style.display = 'block';
                activePanel.classList.add('active-panel');
            }
        });
    });

    // --- Mobile Menu Toggle & Keyboard Accessibility (Section 2 & 34) ---
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const mainNavLinks = document.getElementById('main-nav-links');

    if (mobileMenuBtn && mainNavLinks) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenuBtn.classList.toggle('active');
            mainNavLinks.classList.toggle('mobile-active');
        });

        mainNavLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                mainNavLinks.classList.remove('mobile-active');
            });
        });

        // Click outside closes menu
        document.addEventListener('click', (e) => {
            if (!mainNavLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileMenuBtn.classList.remove('active');
                mainNavLinks.classList.remove('mobile-active');
            }
        });

        // Escape key closes menu (Section 2)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mainNavLinks.classList.contains('mobile-active')) {
                mobileMenuBtn.classList.remove('active');
                mainNavLinks.classList.remove('mobile-active');
            }
        });
    }

    // Initialize UI
    updateCountryUI();
    calculateTaxes();
});
