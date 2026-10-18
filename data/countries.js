/**
 * REMOTAX STATUTORY TAX DATA MODEL (Tax Year: 2026)
 * Conforms to Remotax Platform Specification v1.0 (Sections 10, 11, 14, 15, 16, 17, 18, 31)
 */
const REMOTAX_COUNTRIES = {
    ES: {
        country: "Spain",
        countryCode: "ES",
        taxYear: 2026,
        currency: "EUR",
        symbol: "€",
        city: "Madrid",
        daysResidency: 183,
        daysResidencySource: "Ley 35/2006 (IRPF), Art. 9.1.a",
        daysResidencyUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a9",
        livingCost: 1850,
        livingCostEUR: 1850,
        livingCostLabel: "Remotax estimate",
        livingCostSource: "Remotax Cost of Living Model (Madrid)",
        livingCostUrl: "/methodology/#living-costs",
        livingCostAssumptions: "Single remote worker in Madrid, 1-bedroom apartment in city center + utilities + groceries + transit (October 2026)",
        supportsFilingStatus: true,
        taxTablesStatus: "verified",
        socialSecurityStatus: "verified",
        dataStatus: "verified",
        verifiedOn: "2026-10-16",
        modelNotes: "IRPF statutory brackets 2026 (19% to 47%). Employees include €2,000 general deductible expenses (Art. 19.2.f LIRPF) and €5,550 standard personal allowance. Employee Social Security is 6.50% (including 0.15% MEI, Orden PJC/297/2026) capped at monthly base €5,101.20 (€61,214.40/yr; max €3,978.94/yr). Autónomos (contractors) are modeled under official BOE tabla general (tramos 1 al 12) y tabla reducida (tramos 1 al 3) of Orden PJC/297/2026 (BOE-A-2026-7296, Art. 18) using the minimum base of each tramo after 7% generic deductible expenses (minimum cuotas range from €205.88/mo in tabla reducida tramo 1 to €607.35/mo in tabla general tramo 12; baseline model cap €7,288.20/yr). Autónomos electing the optional maximum base (€5,101.20/mo) pay up to €1,606.88/mo (€19,282.54/yr). Beckham Law applies 24% flat rate up to €600,000 for qualifying applicants.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 12450, rate: 0.19, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a63" },
            { limit: 20200, rate: 0.24, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a63" },
            { limit: 35200, rate: 0.30, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a63" },
            { limit: 60000, rate: 0.37, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a63" },
            { limit: 300000, rate: 0.45, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a63" },
            { limit: Infinity, rate: 0.47, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a63" }
        ],
        socialSecurity: {
            employeeRate: 0.065,
            employeeMaxMonthlyBase: 5101.20,
            employeeMaxAnnualBase: 61214.40,
            employeeMaxAnnual: 3978.94,
            contractorRate: "tramos",
            contractorMaxAnnual: 7288.20,
            autonomoOptionalMaxMonthlyBase: 5101.20,
            autonomoOptionalMaxMonthlyCuota: 1606.88,
            autonomoOptionalMaxAnnual: 19282.54,
            description: "Seguridad Social 2026: 6.50% employee rate (includes 0.15% MEI, Orden PJC/297/2026) capped at €5,101.20/mo (€61,214.40/yr base; max €3,978.94/yr); Autónomos cuota evaluated across official BOE tabla general (tramos 1 al 12) y tabla reducida (tramos 1 al 3) under Orden PJC/297/2026 (BOE-A-2026-7296, Art. 18). Tabla reducida tramo 1 base mínima 653,59 € (cuota mínima 205,88 €/mes); Tabla general tramo 12 (>6.000 €/mes) base mínima 1.928,10 € (cuota mínima 607,35 €/mes, modelo cap €7.288,20/año). An autónomo electing the optional maximum base pays up to €1,606.88/mo (€19,282.54/yr).",
            tramos: [
                { tramo: 1, tabla: "reducida", tramoBOE: 1, minMonthlyNet: 0, maxMonthlyNet: 670, baseMin: 653.59, cuotaMinMonthly: 205.88, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 2, tabla: "reducida", tramoBOE: 2, minMonthlyNet: 670, maxMonthlyNet: 900, baseMin: 718.95, cuotaMinMonthly: 226.47, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 3, tabla: "reducida", tramoBOE: 3, minMonthlyNet: 900, maxMonthlyNet: 1166.70, baseMin: 849.67, cuotaMinMonthly: 267.65, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 4, tabla: "general", tramoBOE: 1, minMonthlyNet: 1166.70, maxMonthlyNet: 1300, baseMin: 950.98, cuotaMinMonthly: 299.56, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 5, tabla: "general", tramoBOE: 2, minMonthlyNet: 1300, maxMonthlyNet: 1500, baseMin: 960.78, cuotaMinMonthly: 302.65, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 6, tabla: "general", tramoBOE: 3, minMonthlyNet: 1500, maxMonthlyNet: 1700, baseMin: 960.78, cuotaMinMonthly: 302.65, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 7, tabla: "general", tramoBOE: 4, minMonthlyNet: 1700, maxMonthlyNet: 1850, baseMin: 1143.79, cuotaMinMonthly: 360.29, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 8, tabla: "general", tramoBOE: 5, minMonthlyNet: 1850, maxMonthlyNet: 2030, baseMin: 1209.15, cuotaMinMonthly: 380.88, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 9, tabla: "general", tramoBOE: 6, minMonthlyNet: 2030, maxMonthlyNet: 2330, baseMin: 1274.51, cuotaMinMonthly: 401.47, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 10, tabla: "general", tramoBOE: 7, minMonthlyNet: 2330, maxMonthlyNet: 2760, baseMin: 1356.21, cuotaMinMonthly: 427.21, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 11, tabla: "general", tramoBOE: 8, minMonthlyNet: 2760, maxMonthlyNet: 3190, baseMin: 1437.91, cuotaMinMonthly: 452.94, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 12, tabla: "general", tramoBOE: 9, minMonthlyNet: 3190, maxMonthlyNet: 3620, baseMin: 1519.61, cuotaMinMonthly: 478.68, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 13, tabla: "general", tramoBOE: 10, minMonthlyNet: 3620, maxMonthlyNet: 4050, baseMin: 1601.31, cuotaMinMonthly: 504.41, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 14, tabla: "general", tramoBOE: 11, minMonthlyNet: 4050, maxMonthlyNet: 6000, baseMin: 1732.03, cuotaMinMonthly: 545.59, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" },
                { tramo: 15, tabla: "general", tramoBOE: 12, minMonthlyNet: 6000, maxMonthlyNet: Infinity, baseMin: 1928.10, cuotaMinMonthly: 607.35, sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296#a18" }
            ]
        },
        regimes: [
            {
                id: "beckham_law",
                name: "Beckham Law (24% Flat Rate)",
                description: "Special expat tax regime (Art. 93 IRPF): 24% flat rate up to €600,000 for foreign talent and digital nomads moving to Spain.",
                eligibilityNote: "Requires not having been a Spanish tax resident in the prior 5 years. Remote employment or digital nomad visa contract under Ley 28/2022 required. 6-month application deadline.",
                cap: 600000,
                flatRate: 0.24,
                overflowRate: 0.47,
                sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a93"
            }
        ],
        deductions: {
            standardAllowance: 5550,
            jointDeduction: 3400,
            workExpenseAllowance: 2000
        },
        sources: [
            { title: "Boletín Oficial del Estado - Ley 35/2006 IRPF (Escala General Estatal y Autonómica)", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764", org: "Gobierno de España", evidenceNote: "Arts 63 and 74 set state and autonomous community statutory IRPF bracket rates." },
            { title: "Boletín Oficial del Estado - Orden PJC/297/2026 (Cotización y MEI 2026)", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7296", org: "Ministerio de la Presidencia, Justicia y Relaciones con las Cortes", evidenceNote: "Art. 3 sets max base 5101.20 EUR and MEI; Art. 18 sets tramos." },
            { title: "Remotax Cost of Living Benchmark - Madrid", url: "/methodology/#living-costs", org: "Remotax Research", evidenceNote: "Remotax modeled living cost estimate for a single remote worker in Madrid (October 2026)." }
        ],
        lastUpdated: "October 2026"
    },
    PT: {
        country: "Portugal",
        countryCode: "PT",
        taxYear: 2026,
        currency: "EUR",
        symbol: "€",
        city: "Lisbon",
        daysResidency: 183,
        daysResidencySource: "Código do IRS (CIRS), Art. 16.º n.º 1 alínea a)",
        daysResidencyUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs16.aspx",
        livingCost: 1750,
        livingCostEUR: 1750,
        livingCostLabel: "Remotax estimate",
        livingCostSource: "Remotax Cost of Living Model (Lisbon)",
        livingCostUrl: "/methodology/#living-costs",
        livingCostAssumptions: "Single remote worker in Lisbon, 1-bedroom apartment in city center + utilities + groceries + transit (October 2026)",
        supportsFilingStatus: false,
        taxTablesStatus: "verified",
        socialSecurityStatus: "estimate",
        dataStatus: "verified",
        verifiedOn: "2026-10-16",
        modelNotes: "IRS progressive brackets 2026 (12.5% to 48%). For contractors, Category B Simplified Regime models the statutory 75% taxable income coefficient (Art. 31/151 CIRS). Social Security: uncapped 11% for employees; for contractors, 21.4% on 70% relevant income capped at 12 × IAS monthly base (IAS €537.13, €77,346.72 base, max €16,552.20/yr; 1st-year exemption available upon request but not modeled by default). IFICI/NHR 2.0 provides 20% flat rate strictly for certified R&D/scientific activities.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 8342, rate: 0.125, sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx" },
            { limit: 12587, rate: 0.157, sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx" },
            { limit: 17838, rate: 0.212, sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx" },
            { limit: 23089, rate: 0.241, sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx" },
            { limit: 29397, rate: 0.311, sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx" },
            { limit: 43090, rate: 0.349, sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx" },
            { limit: 46566, rate: 0.431, sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx" },
            { limit: 86634, rate: 0.446, sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx" },
            { limit: Infinity, rate: 0.48, sourceUrl: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx" }
        ],
        socialSecurity: {
            employeeRate: 0.11,
            contractorRate: 0.214,
            contractorBaseMultiplier: 0.70,
            iasValue2026: 537.13,
            contractorMaxMonthlyBase: 6445.56,
            contractorMaxAnnualBase: 77346.72,
            freelancerMaxAnnual: 16552.20,
            description: "Segurança Social: 11% uncapped for employees; 21.4% on 70% relevant income base for independent contractors, subject to 12 × IAS monthly statutory ceiling (IAS €537.13, €77,346.72 annual base, max €16,552.20/yr). First-year exemption not modeled by default."
        },
        regimes: [
            {
                id: "d8_incentive",
                name: "IFICI / Scientific & Innovation Incentive (20% Flat Rate)",
                description: "Fixed 20% IRS rate applies strictly to qualifying scientific research, higher education teaching, and certified R&D innovation activities (Art. 58.º-A EBF). NHR is closed to new applicants.",
                eligibilityNote: "Requires certified qualifying activity in research or innovation under IFICI. D8 digital nomad visa provides residency only; standard remote work without certified innovation is taxed under standard progressive IRS (12.5% to 48%).",
                cap: Infinity,
                flatRate: 0.20
            }
        ],
        deductions: { standardAllowance: 4587.09, categoryBCoefficient: 0.75 },
        sources: [
            { title: "Autoridade Tributária e Aduaneira - CIRS Artigo 68.º (Escalões de IRS 2026)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx", org: "Autoridade Tributária e Aduaneira", evidenceNote: "Art 68 CIRS sets standard progressive IRS tax brackets from 12.5% to 48.0%." },
            { title: "Autoridade Tributária e Aduaneira - CIRS Artigo 31.º (Regime Simplificado Categoria B)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs31.aspx", org: "Autoridade Tributária e Aduaneira", evidenceNote: "Art 31 CIRS establishes 75% taxable coefficient under Category B simplified regime." },
            { title: "Autoridade Tributária e Aduaneira - CIRS Artigo 25.º (Dedução Específica)", url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs25.aspx", org: "Autoridade Tributária e Aduaneira", evidenceNote: "Art 25 CIRS establishes specific employment deduction allowance of 4587.09 EUR." },
            { title: "Diário da República - Portaria n.º 480-A/2025/1 (Valor do IAS 2026)", url: "https://diariodarepublica.pt/dr/detalhe/portaria/480-a-2025-103328249", org: "Ministérios das Finanças e do Trabalho, Solidariedade e Segurança Social", evidenceNote: "Sets Indexante dos Apoios Sociais (IAS) at 537.13 EUR for 2026." },
            { title: "Remotax Cost of Living Benchmark - Lisbon", url: "/methodology/#living-costs", org: "Remotax Research", evidenceNote: "Remotax modeled living cost estimate for a single remote worker in Lisbon (October 2026)." }
        ],
        lastUpdated: "October 2026"
    },
    AE: {
        country: "United Arab Emirates",
        countryCode: "AE",
        taxYear: 2026,
        currency: "USD",
        symbol: "$",
        city: "Dubai",
        daysResidency: 183,
        daysResidencySource: "Cabinet Decision No. 85 of 2022 on Determination of Tax Residency, Art. 4(1)(b) / FTA Tax Residency Guide",
        daysResidencyUrl: "https://tax.gov.ae/en/services/issuance.of.tax.certificates.aspx",
        livingCost: 2250,
        livingCostEUR: 2000,
        livingCostLabel: "Remotax estimate",
        livingCostSource: "Remotax Cost of Living Model (Dubai)",
        livingCostUrl: "/methodology/#living-costs",
        livingCostAssumptions: "Single remote worker in Dubai, 1-bedroom apartment in Downtown/Marina + utilities + groceries + transit (October 2026)",
        supportsFilingStatus: false,
        taxTablesStatus: "verified",
        socialSecurityStatus: "verified",
        dataStatus: "verified",
        verifiedOn: "2026-10-16",
        modelNotes: "0% Personal Income Tax and 0% Social Security withholding for expatriate remote workers and digital nomads under the Dubai Virtual Working Program. Natural persons with local commercial business revenue exceeding AED 1,000,000/yr are subject to Corporate Tax under Cabinet Decision No. 49/2023.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: Infinity, rate: 0.00 }
        ],
        socialSecurity: {
            employeeRate: 0.00,
            contractorRate: 0.00,
            freelancerMaxAnnual: 0,
            description: "Zero statutory social security withholding for expatriate remote workers"
        },
        regimes: [
            {
                id: "zero_tax_haven",
                name: "0% Personal Income Tax",
                description: "0% UAE personal income tax under Dubai Virtual Working Program.",
                eligibilityNote: "Personal wages and employment earnings are 0% tax. Natural persons with UAE business/freelance revenue exceeding AED 1,000,000/year may be subject to UAE Corporate Tax (9% on taxable profit > AED 375,000 under Cabinet Decision 49/2023). Home country tax duties (e.g. US FATCA) remain.",
                cap: Infinity,
                flatRate: 0.00
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [
            { title: "Federal Tax Authority (FTA) - Corporate Tax for Natural Persons", url: "https://tax.gov.ae/en/taxes/corporate.tax/corporate.tax.topics/corporate.tax.for.natural.persons.aspx", org: "UAE Federal Tax Authority", evidenceNote: "Confirms 0% personal income tax on natural persons employment and non-business income." }
        ],
        lastUpdated: "October 2026"
    },
    DE: {
        country: "Germany",
        countryCode: "DE",
        taxYear: 2026,
        currency: "EUR",
        symbol: "€",
        city: "Berlin",
        livingCost: 2100,
        supportsFilingStatus: true,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 17005, rate: 0.14 },
            { limit: 66760, rate: 0.24 },
            { limit: 277825, rate: 0.42 },
            { limit: Infinity, rate: 0.45 }
        ],
        socialSecurity: {
            employeeRate: 0.195,
            contractorRate: 0.14,
            freelancerMaxAnnual: 12000,
            description: "Krankenversicherung, Rentenversicherung, Pflege & Arbeitslosenversicherung"
        },
        regimes: [
            {
                id: "grundfreibetrag",
                name: "Basic Tax-Free Allowance (€11,784 Single / €23,568 Married)",
                description: "Single filer basic non-taxable income allowance (Grundfreibetrag).",
                eligibilityNote: "Automatically applied to all German tax residents.",
                allowanceSingle: 11784,
                allowanceJoint: 23568
            }
        ],
        deductions: { standardAllowance: 11784, jointAllowance: 23568 },
        sources: [
            { title: "Bundesfinanzministerium - Einkommensteuer Grundtabelle", url: "https://bundesfinanzministerium.de", org: "Federal Ministry of Finance" }
        ],
        lastUpdated: "October 2026"
    },
    GB: {
        country: "United Kingdom",
        countryCode: "GB",
        taxYear: 2026,
        currency: "GBP",
        symbol: "£",
        city: "London",
        livingCost: 2850,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 37700, rate: 0.20 },
            { limit: 125140, rate: 0.40 },
            { limit: Infinity, rate: 0.45 }
        ],
        socialSecurity: {
            employeeRate: 0.08,
            contractorRate: 0.09,
            freelancerMaxAnnual: 5000,
            description: "National Insurance (Class 1 Employee / Class 4 Self-Employed)"
        },
        regimes: [
            {
                id: "personal_allowance",
                name: "UK Personal Allowance (£12,570 Tax-Free)",
                description: "First £12,570 of earned income is completely tax-free.",
                eligibilityNote: "Tapers off by £1 for every £2 of income above £100,000.",
                allowanceSingle: 12570
            }
        ],
        deductions: { standardAllowance: 12570 },
        sources: [
            { title: "HMRC Rates and Allowances: Income Tax", url: "https://gov.uk/income-tax-rates", org: "HM Revenue & Customs" }
        ],
        lastUpdated: "October 2026"
    },
    US: {
        country: "United States",
        countryCode: "US",
        taxYear: 2026,
        currency: "USD",
        symbol: "$",
        city: "Austin / New York",
        livingCost: 3200,
        supportsFilingStatus: true,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 11600, rate: 0.10 },
            { limit: 47150, rate: 0.12 },
            { limit: 100525, rate: 0.22 },
            { limit: 191950, rate: 0.24 },
            { limit: 243725, rate: 0.32 },
            { limit: 609350, rate: 0.35 },
            { limit: Infinity, rate: 0.37 }
        ],
        taxBracketsJoint: [
            { limit: 23200, rate: 0.10 },
            { limit: 94300, rate: 0.12 },
            { limit: 201050, rate: 0.22 },
            { limit: 383900, rate: 0.24 },
            { limit: 487450, rate: 0.32 },
            { limit: 731200, rate: 0.35 },
            { limit: Infinity, rate: 0.37 }
        ],
        socialSecurity: {
            employeeRate: 0.0765,
            contractorRate: 0.153,
            freelancerMaxAnnual: 18000,
            description: "FICA: 6.2% Social Security + 1.45% Medicare (15.3% for Self-Employed 1099)"
        },
        regimes: [
            {
                id: "standard_deduction",
                name: "Standard Deduction ($14,600 Single / $29,200 Married)",
                description: "Reduces taxable gross income before marginal federal brackets.",
                allowanceSingle: 14600,
                allowanceJoint: 29200
            }
        ],
        deductions: { standardAllowance: 14600, jointAllowance: 29200 },
        sources: [
            { title: "IRS Tax Year Inflation Adjustments", url: "https://irs.gov", org: "Internal Revenue Service" }
        ],
        lastUpdated: "October 2026"
    },
    CA: {
        country: "Canada",
        countryCode: "CA",
        taxYear: 2026,
        currency: "CAD",
        symbol: "$",
        city: "Toronto",
        livingCost: 2400,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 55867, rate: 0.20 },
            { limit: 111733, rate: 0.295 },
            { limit: 173205, rate: 0.36 },
            { limit: 246752, rate: 0.43 },
            { limit: Infinity, rate: 0.48 }
        ],
        socialSecurity: {
            employeeRate: 0.0595,
            contractorRate: 0.09,
            freelancerMaxAnnual: 3867,
            description: "Canada Pension Plan (CPP) & Employment Insurance (EI)"
        },
        regimes: [
            {
                id: "bpa",
                name: "Basic Personal Amount ($15,705)",
                description: "Federal basic personal tax credit deduction.",
                allowanceSingle: 15705
            }
        ],
        deductions: { standardAllowance: 15705 },
        sources: [
            { title: "Canada Revenue Agency (CRA) Tax Rates", url: "https://canada.ca/en/revenue-agency", org: "Canada Revenue Agency" }
        ],
        lastUpdated: "October 2026"
    },
    NL: {
        country: "Netherlands",
        countryCode: "NL",
        taxYear: 2026,
        currency: "EUR",
        symbol: "€",
        city: "Amsterdam",
        livingCost: 2600,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 75518, rate: 0.3697 },
            { limit: Infinity, rate: 0.495 }
        ],
        socialSecurity: {
            employeeRate: 0.06,
            contractorRate: 0.08,
            freelancerMaxAnnual: 3500,
            description: "Volksverzekeringen & Zvw healthcare insurance"
        },
        regimes: [
            {
                id: "thirty_percent_ruling",
                name: "30% Tax-Free Expat Ruling",
                description: "Exempts up to 30% of gross taxable salary for qualifying incoming highly skilled migrants.",
                eligibilityNote: "Requires recruited from abroad with specific expertise and salary meeting minimum statutory threshold.",
                taxableMultiplier: 0.70
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [
            { title: "Belastingdienst - Inkomstenbelasting & 30%-regeling", url: "https://belastingdienst.nl", org: "Dutch Tax Administration" }
        ],
        lastUpdated: "October 2026"
    },
    IT: {
        country: "Italy",
        countryCode: "IT",
        taxYear: 2026,
        currency: "EUR",
        symbol: "€",
        city: "Milan",
        daysResidency: 183,
        daysResidencySource: "Testo Unico delle Imposte sui Redditi (TUIR), Art. 2 comma 2 (D.P.R. 917/1986)",
        daysResidencyUrl: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1986-12-22;917!art2",
        livingCost: 1950,
        livingCostEUR: 1950,
        livingCostLabel: "Remotax estimate",
        livingCostSource: "Remotax Cost of Living Model (Milan)",
        livingCostUrl: "/methodology/#living-costs",
        livingCostAssumptions: "Single remote worker in Milan, 1-bedroom apartment in city center + utilities + groceries + transit (October 2026)",
        supportsFilingStatus: false,
        taxTablesStatus: "verified",
        socialSecurityStatus: "estimate",
        dataStatus: "verified",
        verifiedOn: "2026-10-16",
        modelNotes: "National IRPEF 2026 brackets (23%/33%/43%) plus regional/municipal surcharges (addizionali regionale e comunale modeled at an average 2.50%). Social security (INPS) applied on 100% of gross (unreduced by Impatriati) up to the statutory 2026 massimale of €122,295 (Circolare INPS n. 8/2026: massimale €122.295; 26.07% Gestione Separata for independent professionals without other cover, max €31,882.31/yr; Circolare INPS n. 6/2026: prima fascia €56,224 with employee 9.19% up to €56,224 plus additional 1% on excess up to €122,295, max €11,899.62/yr). Regime Impatriati exempts 50% (60% with minor child) up to €600,000 cap.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 28000, rate: 0.23, sourceUrl: "https://www.agenziaentrate.gov.it/portale/imposta-sul-reddito-delle-persone-fisiche-irpef-/aliquote-e-calcolo-dell-irpef" },
            { limit: 50000, rate: 0.33, sourceUrl: "https://www.agenziaentrate.gov.it/portale/imposta-sul-reddito-delle-persone-fisiche-irpef-/aliquote-e-calcolo-dell-irpef" },
            { limit: Infinity, rate: 0.43, sourceUrl: "https://www.agenziaentrate.gov.it/portale/imposta-sul-reddito-delle-persone-fisiche-irpef-/aliquote-e-calcolo-dell-irpef" }
        ],
        socialSecurity: {
            employeeRate: 0.0919,
            employeeExcessRate: 0.1019,
            primaFascia: 56224,
            employeeMaxAnnualBase: 122295,
            employeeMaxAnnual: 11899.62,
            contractorRate: 0.2607,
            contractorMaxAnnualBase: 122295,
            freelancerMaxAnnual: 31882.31,
            description: "INPS social security contributions up to statutory 2026 massimale ceiling of €122,295 (Circolare INPS n. 8/2026: massimale €122.295; 26.07% Gestione Separata for independent professionals, max €31,882.31; Circolare INPS n. 6/2026: prima fascia €56,224 with 9.19% employee up to €56,224 plus 1% extra on excess up to €122,295, max €11,899.62). Contributions calculated on 100% of gross."
        },
        regimes: [
            {
                id: "impatriati",
                name: "Regime Impatriati 2024-2026 (50% Tax Exemption)",
                description: "Exempts 50% of qualifying employment/self-employment income from IRPEF (taxable base multiplier 0.50), up to an annual gross cap of €600,000 for 5 tax years (D.Lgs. 209/2023, Art. 5).",
                eligibilityNote: "Requires moving tax residency to Italy, 3 prior non-resident fiscal years, commitment to stay at least 4 years, and high-specialization qualification. Exemption increases to 60% (multiplier 0.40) if relocating with a minor child. Social contributions (INPS) remain payable on 100% of gross up to €122,295 massimale.",
                taxableMultiplier: 0.50,
                taxableMultiplierChild: 0.40,
                cap: 600000,
                sourceUrl: "https://www.agenziaentrate.gov.it/portale/lavoratori-impatriati-209-2023/infogen-lavoratori-impatriati-209-2023-cittadini"
            }
        ],
        deductions: { standardAllowance: 0, averageAddizionaliRate: 0.025 },
        sources: [
            { title: "Agenzia delle Entrate - Aliquote e calcolo dell'Irpef 2026", url: "https://www.agenziaentrate.gov.it/portale/imposta-sul-reddito-delle-persone-fisiche-irpef-/aliquote-e-calcolo-dell-irpef", org: "Agenzia delle Entrate", evidenceNote: "Official Agenzia delle Entrate 2026 guide establishing statutory IRPEF brackets under Legge di Bilancio 2026." },
            { title: "Agenzia delle Entrate - Regime Lavoratori Impatriati (D.Lgs. 209/2023)", url: "https://www.agenziaentrate.gov.it/portale/lavoratori-impatriati-209-2023/infogen-lavoratori-impatriati-209-2023-cittadini", org: "Agenzia delle Entrate", evidenceNote: "Sets 50% exemption, €600,000 cap, and 4-year residency commitment." },
            { title: "INPS - Circolare n. 8 del 03-02-2026 (Massimale €122.295 e Gestione Separata 26,07%)", url: "https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.02.circolare-numero-8-del-03-02-2026_15153.html", org: "Istituto Nazionale della Previdenza Sociale", evidenceNote: "Circolare 8/2026 establishes 2026 massimale of 122295 EUR and Gestione Separata rate of 26.07%." },
            { title: "INPS - Circolare n. 6 del 30-01-2026 (Prima fascia pensionabile €56.224)", url: "https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.01.circolare-numero-6-del-30-01-2026_15151.html", org: "Istituto Nazionale della Previdenza Sociale", evidenceNote: "Circolare 6/2026 establishes first pensionable band of 56224 EUR triggering extra 1% contribution." },
            { title: "Remotax Cost of Living Benchmark - Milan", url: "/methodology/#living-costs", org: "Remotax Research", evidenceNote: "Remotax modeled living cost estimate for a single remote worker in Milan (October 2026)." }
        ],
        lastUpdated: "October 2026"
    },
    GR: {
        country: "Greece",
        countryCode: "GR",
        taxYear: 2026,
        currency: "EUR",
        symbol: "€",
        city: "Athens",
        livingCost: 1350,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 10000, rate: 0.09 },
            { limit: 20000, rate: 0.22 },
            { limit: 30000, rate: 0.28 },
            { limit: 40000, rate: 0.36 },
            { limit: Infinity, rate: 0.44 }
        ],
        socialSecurity: { employeeRate: 0.07, contractorRate: 0.07, freelancerMaxAnnual: 3000, description: "EFKA social security contributions" },
        regimes: [
            {
                id: "greece_50",
                name: "50% Expat Tax Base Exemption",
                description: "50% exemption on Greek income tax for up to 7 consecutive years for incoming remote workers.",
                eligibilityNote: "Requires not having been a Greek tax resident in 5 of the last 6 years.",
                taxableMultiplier: 0.50
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [
            { title: "Independent Authority for Public Revenue (AADE)", url: "https://aade.gr", org: "Greek Tax Authority" }
        ],
        lastUpdated: "October 2026"
    },
    TH: {
        country: "Thailand",
        countryCode: "TH",
        taxYear: 2026,
        currency: "THB",
        symbol: "฿",
        city: "Bangkok",
        daysResidency: 180,
        daysResidencySource: "Thai Revenue Code, Section 41 paragraph 3",
        daysResidencyUrl: "https://www.rd.go.th/english/6045.html",
        livingCost: 38500,
        livingCostEUR: 1024,
        fxRateEUR: 37.602,
        fxRateUSD: 35.0,
        livingCostLabel: "Remotax estimate",
        livingCostSource: "Remotax Cost of Living Model (Bangkok)",
        livingCostUrl: "/methodology/#living-costs",
        livingCostAssumptions: "Single remote worker in Bangkok, 1-bedroom modern condo near BTS/MRT + utilities + groceries + internet (October 2026)",
        supportsFilingStatus: false,
        taxTablesStatus: "verified",
        socialSecurityStatus: "verified",
        dataStatus: "verified",
        verifiedOn: "2026-10-16",
        modelNotes: "Thai Revenue Code statutory progressive PIT (0% to 35%) with 160,000 THB statutory deductions (50% expense cap ฿100,000 + ฿60,000 personal allowance). Under Revenue Department Instructions Por. 161/2566 & 162/2566, all foreign income remitted into Thailand (including ATM withdrawals and local card spending) is assessable. The optional 0% offshore scenario applies only when funds remain strictly outside Thailand.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 150000, rate: 0.00, sourceUrl: "https://www.rd.go.th/english/6045.html" },
            { limit: 300000, rate: 0.05, sourceUrl: "https://www.rd.go.th/english/6045.html" },
            { limit: 500000, rate: 0.10, sourceUrl: "https://www.rd.go.th/english/6045.html" },
            { limit: 750000, rate: 0.15, sourceUrl: "https://www.rd.go.th/english/6045.html" },
            { limit: 1000000, rate: 0.20, sourceUrl: "https://www.rd.go.th/english/6045.html" },
            { limit: 2000000, rate: 0.25, sourceUrl: "https://www.rd.go.th/english/6045.html" },
            { limit: 5000000, rate: 0.30, sourceUrl: "https://www.rd.go.th/english/6045.html" },
            { limit: Infinity, rate: 0.35, sourceUrl: "https://www.rd.go.th/english/6045.html" }
        ],
        socialSecurity: {
            employeeRate: 0.00,
            contractorRate: 0.00,
            freelancerMaxAnnual: 0,
            description: "Zero statutory social security withholding for foreign remote workers and digital nomads"
        },
        regimes: [
            {
                id: "th_offshore_unremitted",
                name: "Income stays offshore and is never transferred or spent in Thailand",
                description: "Foreign-sourced earnings kept completely abroad in overseas bank accounts and never remitted, transferred, or spent in Thailand (0% Thai tax).",
                eligibilityNote: "Warning: Thai Revenue Department Instructions Por. 161/2566 & 162/2566 clarify that ATM withdrawals, card purchases in Thailand, and bank transfers into Thailand from foreign funds constitute assessable remittance subject to progressive PIT (0%–35%). The DTV visa confers residency only without a statutory zero-tax status for remitted funds.",
                flatRate: 0.00,
                isOffshoreException: true
            }
        ],
        deductions: {
            standardAllowance: 60000,
            employmentExpenseRate: 0.50,
            employmentExpenseCap: 100000
        },
        sources: [
            { title: "Revenue Department Thailand - Personal Income Tax Rates & Allowances", url: "https://www.rd.go.th/english/6045.html", org: "Thai Revenue Department", evidenceNote: "Details progressive PIT brackets 0% to 35% and standard allowances under Thai Revenue Code." },
            { title: "Revenue Department Thailand - Departmental Instruction Por. 161/2566 & 162/2566", url: "https://www.rd.go.th/english/37749.html", org: "Thai Revenue Department", evidenceNote: "Instructions Por. 161/2566 and 162/2566 assess all foreign income remitted into Thailand." },
            { title: "Remotax Cost of Living Benchmark - Bangkok", url: "/methodology/#living-costs", org: "Remotax Research", evidenceNote: "Remotax modeled living cost estimate for a single remote worker in Bangkok (October 2026)." }
        ],
        lastUpdated: "October 2026"
    },
    SG: {
        country: "Singapore",
        countryCode: "SG",
        taxYear: 2026,
        currency: "USD",
        symbol: "$",
        city: "Singapore",
        livingCost: 2900,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 20000, rate: 0.0 },
            { limit: 30000, rate: 0.02 },
            { limit: 40000, rate: 0.035 },
            { limit: 80000, rate: 0.07 },
            { limit: 120000, rate: 0.115 },
            { limit: 160000, rate: 0.15 },
            { limit: 200000, rate: 0.18 },
            { limit: 320000, rate: 0.19 },
            { limit: Infinity, rate: 0.24 }
        ],
        socialSecurity: { employeeRate: 0, contractorRate: 0, freelancerMaxAnnual: 0, description: "CPF exempt for foreign pass holders" },
        regimes: [
            {
                id: "territorial_tax",
                name: "Territorial Tax (Foreign Sourced 0%)",
                description: "Singapore operates on a territorial basis: foreign earned income not received in Singapore is completely tax-free.",
                eligibilityNote: "Applies to bona fide foreign employment earnings.",
                flatRate: 0.0
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [
            { title: "Inland Revenue Authority of Singapore (IRAS)", url: "https://iras.gov.sg", org: "IRAS" }
        ],
        lastUpdated: "October 2026"
    },
    CH: {
        country: "Switzerland",
        countryCode: "CH",
        taxYear: 2026,
        currency: "USD",
        symbol: "$",
        city: "Zurich",
        livingCost: 3600,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: Infinity, rate: 0.18 }
        ],
        socialSecurity: { employeeRate: 0.053, contractorRate: 0.053, freelancerMaxAnnual: 6000, description: "AVS/AI/APG mandatory social insurance" },
        regimes: [
            {
                id: "cantonal_average",
                name: "Average Federal + Cantonal Tax (~18%)",
                description: "Combines Direct Federal Tax with average municipal and cantonal tax rates.",
                eligibilityNote: "Actual tax rate depends on the specific canton and municipality of residence (e.g., Zug 12%, Zurich 21%).",
                flatRate: 0.18
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [
            { title: "Federal Tax Administration (FTA) Switzerland", url: "https://estv.admin.ch", org: "Swiss FTA" }
        ],
        lastUpdated: "October 2026"
    },
    MT: {
        country: "Malta",
        countryCode: "MT",
        taxYear: 2026,
        currency: "EUR",
        symbol: "€",
        city: "Valletta",
        livingCost: 1550,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 9100, rate: 0.0 },
            { limit: 14500, rate: 0.15 },
            { limit: 60000, rate: 0.25 },
            { limit: Infinity, rate: 0.35 }
        ],
        socialSecurity: { employeeRate: 0.10, contractorRate: 0.10, freelancerMaxAnnual: 2600, description: "Class 1/2 Social Security" },
        regimes: [
            {
                id: "malta_nomad",
                name: "Malta Nomad Residence Permit (10% Flat Rate)",
                description: "Flat 10% income tax rate on income derived from authorized nomad work.",
                eligibilityNote: "Requires gross foreign income of at least €3,500/month.",
                flatRate: 0.10
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [{ title: "Commissioner for Revenue Malta", url: "https://cfr.gov.mt", org: "Malta Tax Authority" }],
        lastUpdated: "October 2026"
    },
    CY: {
        country: "Cyprus",
        countryCode: "CY",
        taxYear: 2026,
        currency: "EUR",
        symbol: "€",
        city: "Limassol",
        livingCost: 1600,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 19500, rate: 0.0 },
            { limit: 28000, rate: 0.20 },
            { limit: 36300, rate: 0.25 },
            { limit: 60000, rate: 0.30 },
            { limit: Infinity, rate: 0.35 }
        ],
        socialSecurity: { employeeRate: 0.083, contractorRate: 0.083, freelancerMaxAnnual: 4500, description: "Social Insurance + GeSY" },
        regimes: [
            {
                id: "cyprus_50",
                name: "Cyprus 50% Exemption (Income > €55,000)",
                description: "50% exemption on employment income for individuals who were not residents prior to employment.",
                eligibilityNote: "Applies for up to 17 years for first employment starting from 2022 onwards.",
                taxableMultiplier: 0.50
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [{ title: "Tax Department Ministry of Finance Cyprus", url: "https://mof.gov.cy/tax", org: "Cyprus Tax Department" }],
        lastUpdated: "October 2026"
    },
    EE: {
        country: "Estonia",
        countryCode: "EE",
        taxYear: 2026,
        currency: "EUR",
        symbol: "€",
        city: "Tallinn",
        livingCost: 1400,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: Infinity, rate: 0.20 }
        ],
        socialSecurity: { employeeRate: 0.033, contractorRate: 0.00, freelancerMaxAnnual: 0, description: "Unemployment insurance & pension contribution" },
        regimes: [
            {
                id: "estonia_flat",
                name: "20% Flat Income Tax",
                description: "Estonia features a simple 20% flat tax on personal distributed income.",
                flatRate: 0.20
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [{ title: "Estonian Tax and Customs Board (EMTA)", url: "https://emta.ee", org: "EMTA" }],
        lastUpdated: "October 2026"
    },
    AU: {
        country: "Australia",
        countryCode: "AU",
        taxYear: 2026,
        currency: "USD",
        symbol: "$",
        city: "Sydney / Melbourne",
        livingCost: 2600,
        supportsFilingStatus: false,
        taxTablesStatus: "needs-review",
        socialSecurityStatus: "approximation",
        dataStatus: "needs-review",
        verifiedOn: null,
        modelNotes: "Statutory brackets and social security contributions are preliminary estimates under review.",
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 45000, rate: 0.19 },
            { limit: 120000, rate: 0.325 },
            { limit: 180000, rate: 0.37 },
            { limit: Infinity, rate: 0.45 }
        ],
        socialSecurity: { employeeRate: 0.02, contractorRate: 0.02, freelancerMaxAnnual: 2500, description: "Medicare Levy (2%)" },
        regimes: [
            {
                id: "tax_free_threshold",
                name: "Tax-Free Threshold ($18,200)",
                description: "First $18,200 of earned income is tax-free for Australian tax residents.",
                allowanceSingle: 18200
            }
        ],
        deductions: { standardAllowance: 18200 },
        sources: [{ title: "Australian Taxation Office (ATO)", url: "https://ato.gov.au", org: "ATO" }],
        lastUpdated: "October 2026"
    }
};

const REMOTAX_FX_RATES = {
    valuationDate: "2026-10-16",
    benchmarkSource: "European Central Bank (ECB) Euro Foreign Exchange Reference Rates",
    sourceUrl: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html",
    rates: {
        EUR: 1.0000,
        USD: 1.1253,  // 1 EUR = 1.1253 USD (1 USD = 0.8886 EUR)
        THB: 37.602,  // 1 EUR = 37.602 THB (1 THB = 0.02659 EUR; ฿38,500 = €1,023.88 ≈ €1,024)
        AED: 4.1327   // 1 EUR = 4.1327 AED (pegged at 3.6725 AED/USD: 1.1253 * 3.6725)
    }
};

if (typeof window !== 'undefined') {
    window.REMOTAX_COUNTRIES = REMOTAX_COUNTRIES;
    window.REMOTAX_FX_RATES = REMOTAX_FX_RATES;
}
if (typeof globalThis !== 'undefined') {
    globalThis.REMOTAX_COUNTRIES = REMOTAX_COUNTRIES;
    globalThis.REMOTAX_FX_RATES = REMOTAX_FX_RATES;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { REMOTAX_COUNTRIES, REMOTAX_FX_RATES };
}

