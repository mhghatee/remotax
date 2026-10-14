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
        livingCost: 1850,
        supportsFilingStatus: true,
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 12450, rate: 0.19 },
            { limit: 20200, rate: 0.24 },
            { limit: 35200, rate: 0.30 },
            { limit: 60000, rate: 0.37 },
            { limit: 300000, rate: 0.45 },
            { limit: Infinity, rate: 0.47 }
        ],
        socialSecurity: {
            employeeRate: 0.0635,
            contractorRate: 0.08,
            freelancerMaxAnnual: 4300,
            description: "Seguridad Social contribution with Cuota de Autónomos base"
        },
        regimes: [
            {
                id: "beckham_law",
                name: "Beckham Law (24% Flat Rate)",
                description: "Special expat tax regime (Art. 93 IRPF): 24% flat rate up to €600,000 for foreign talent and digital nomads moving to Spain.",
                eligibilityNote: "Requires not having been a Spanish tax resident in the prior 5 years. Employment or digital nomad visa contract required.",
                cap: 600000,
                flatRate: 0.24,
                overflowRate: 0.47
            }
        ],
        deductions: {
            standardAllowance: 5550,
            jointDeduction: 3400
        },
        sources: [
            { title: "Agencia Tributaria - IRPF Brackets 2026", url: "https://sede.agenciatributaria.gob.es", org: "Spanish Tax Agency" },
            { title: "Seguridad Social - Bases y Tipos de Cotización", url: "https://seg-social.es", org: "Ministry of Inclusion and Social Security" }
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
        livingCost: 1650,
        supportsFilingStatus: false,
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 7703, rate: 0.1325 },
            { limit: 11623, rate: 0.18 },
            { limit: 16472, rate: 0.23 },
            { limit: 21321, rate: 0.26 },
            { limit: 27146, rate: 0.327 },
            { limit: 39791, rate: 0.37 },
            { limit: 51997, rate: 0.435 },
            { limit: 80000, rate: 0.45 },
            { limit: Infinity, rate: 0.48 }
        ],
        socialSecurity: {
            employeeRate: 0.11,
            contractorRate: 0.15,
            freelancerMaxAnnual: 7200,
            description: "Segurança Social mandatory contributions"
        },
        regimes: [
            {
                id: "d8_incentive",
                name: "NHR 2.0 / Scientific & Innovation Tax Incentive (20% Flat)",
                description: "Fixed 20% personal income tax rate on eligible high-value remote and innovation earnings.",
                eligibilityNote: "D8 visa grants residence. The 20% flat rate requires qualifying under the new Tax Incentive for Scientific Research and Innovation (IFICI).",
                cap: Infinity,
                flatRate: 0.20
            }
        ],
        deductions: { standardAllowance: 4104 },
        sources: [
            { title: "Autoridade Tributária e Aduaneira - Tax Brackets", url: "https://portaldasfinancas.gov.pt", org: "Portuguese Tax Authority" },
            { title: "Segurança Social Direta", url: "https://seg-social.pt", org: "Portuguese Social Security" }
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
        livingCost: 2250,
        supportsFilingStatus: false,
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
                eligibilityNote: "Applies to local UAE taxes only. Does not exempt remote workers from tax obligations in their country of citizenship (e.g. US citizens under FATCA) or home tax residency.",
                cap: Infinity,
                flatRate: 0.00
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [
            { title: "Federal Tax Authority (FTA) UAE", url: "https://tax.gov.ae", org: "UAE Federal Tax Authority" },
            { title: "Dubai Virtual Working Program", url: "https://visitdubai.com", org: "Department of Economy and Tourism" }
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
        city: "Rome / Milan",
        livingCost: 1750,
        supportsFilingStatus: false,
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 28000, rate: 0.23 },
            { limit: 50000, rate: 0.35 },
            { limit: Infinity, rate: 0.43 }
        ],
        socialSecurity: {
            employeeRate: 0.0919,
            contractorRate: 0.12,
            freelancerMaxAnnual: 6000,
            description: "INPS Gestione Separata & social contributions"
        },
        regimes: [
            {
                id: "impatriati",
                name: "Lavoratori Impatriati (50% - 70% Exemption)",
                description: "Reduces taxable gross base by 50% to 70% for eligible relocating talent.",
                eligibilityNote: "Requires moving tax residency to Italy and staying a minimum of 2 fiscal years.",
                taxableMultiplier: 0.30
            }
        ],
        deductions: { standardAllowance: 0 },
        sources: [
            { title: "Agenzia delle Entrate - Agevolazioni Impatriati", url: "https://agenziaentrate.gov.it", org: "Italian Revenue Agency" }
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
        currency: "USD",
        symbol: "$",
        city: "Bangkok",
        livingCost: 1100,
        supportsFilingStatus: false,
        workerTypes: ["employee", "freelancer", "contractor"],
        taxBrackets: [
            { limit: 150000, rate: 0.05 },
            { limit: 300000, rate: 0.10 },
            { limit: 500000, rate: 0.15 },
            { limit: 750000, rate: 0.20 },
            { limit: 1000000, rate: 0.25 },
            { limit: 2000000, rate: 0.30 },
            { limit: Infinity, rate: 0.35 }
        ],
        socialSecurity: { employeeRate: 0, contractorRate: 0, freelancerMaxAnnual: 0, description: "Exempt for DTV remote workers" },
        regimes: [
            {
                id: "dtv_17",
                name: "Destination Thailand Visa (DTV) Remote Worker Framework",
                description: "Foreign-source remote income remitted in subsequent calendar years enjoys tax exemption; qualifying LTR regimes offer 17% flat tax cap.",
                eligibilityNote: "Foreign income not remitted to Thailand in the same calendar year in which it was earned is not taxed under Thai domestic tax rules.",
                flatRate: 0.17
            }
        ],
        deductions: { standardAllowance: 60000 },
        sources: [
            { title: "Revenue Department Thailand - Personal Income Tax", url: "https://rd.go.th", org: "Thai Revenue Department" }
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { REMOTAX_COUNTRIES };
}
