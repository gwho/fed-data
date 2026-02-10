/**
 * FRED Series Registry
 *
 * Central source of truth for all Federal Reserve Economic Data (FRED) series
 * used in the application. Each entry documents the series code, full name,
 * measurement units, and publication frequency.
 *
 * **Why this exists:**
 * - Single place to look up what any FRED series code means
 * - Helps onboarding: search by full name to find the code
 * - Machine-readable supplement to the markdown tables in HOOKS.md §3
 *
 * **Usage note:**
 * Domain hooks continue to use string literals directly for readability:
 * ```typescript
 * getFredSeriesCached('CPILFESL', oneYearAgo)  // clear in context
 * ```
 * This file exists as a documentation registry, not a required hook dependency.
 *
 * **Cross-domain series** (same series used in 2+ hooks):
 * - `RSAFS`:           useEconomicGrowthData + useConsumerSpendingData
 * - `A191RL1Q225SBEA`: useEconomicGrowthData + useKeyIndicatorsData
 * - `MORTGAGE30US`:    useHousingData + useKeyIndicatorsData
 * - `SP500`:           useMarketIndicesData + useKeyIndicatorsData
 *
 * @see app/hooks/HOOKS.md — Section 3: FRED Series Registry (human-readable tables)
 * @see app/hooks/domain/ — Hook files for series usage context
 */

export const FRED_SERIES = {

  // ---------------------------------------------------------------------------
  // INFLATION — 7 series, date range: oneYearAgo
  // Hook: useInflationData
  // ---------------------------------------------------------------------------
  INFLATION: {
    CORE_CPI: {
      code: 'CPILFESL',
      name: 'Consumer Price Index for All Urban Consumers: All Items Less Food and Energy',
      units: 'Index 1982-1984=100',
      frequency: 'Monthly',
    },
    PCE_PRICE_INDEX: {
      code: 'PCEPI',
      name: 'Personal Consumption Expenditures: Chain-type Price Index',
      units: 'Index 2017=100',
      frequency: 'Monthly',
    },
    CORE_PCE: {
      code: 'PCEPILFE',
      name: 'Personal Consumption Expenditures Excluding Food and Energy',
      units: 'Index 2017=100',
      frequency: 'Monthly',
    },
    FOOD_CPI: {
      code: 'CPIUFDSL',
      name: 'Consumer Price Index for All Urban Consumers: Food',
      units: 'Index 1982-1984=100',
      frequency: 'Monthly',
    },
    ENERGY_CPI: {
      code: 'CPIENGSL',
      name: 'Consumer Price Index for All Urban Consumers: Energy',
      units: 'Index 1982-1984=100',
      frequency: 'Monthly',
    },
    SHELTER_CPI: {
      code: 'CUSR0000SAH',
      name: 'Consumer Price Index for All Urban Consumers: Shelter',
      units: 'Index 1982-1984=100',
      frequency: 'Monthly',
    },
    MEDICAL_CPI: {
      code: 'CPIMEDSL',
      name: 'Consumer Price Index for All Urban Consumers: Medical Care',
      units: 'Index 1982-1984=100',
      frequency: 'Monthly',
    },
  },

  // ---------------------------------------------------------------------------
  // EMPLOYMENT — 4 series, date range: oneYearAgo
  // Hook: useEmploymentData
  // ---------------------------------------------------------------------------
  EMPLOYMENT: {
    LABOR_FORCE_PARTICIPATION: {
      code: 'CIVPART',
      name: 'Civilian Labor Force Participation Rate',
      units: 'Percent',
      frequency: 'Monthly',
    },
    NONFARM_PAYROLLS: {
      code: 'PAYEMS',
      name: 'All Employees, Total Nonfarm',
      units: 'Thousands of Persons',
      frequency: 'Monthly',
    },
    INITIAL_CLAIMS: {
      code: 'ICSA',
      name: 'Initial Claims',
      units: 'Thousands',
      frequency: 'Weekly',
    },
    HOURLY_EARNINGS: {
      code: 'AHETPI',
      name: 'Average Hourly Earnings of Production and Nonsupervisory Employees, Total Private',
      units: 'Dollars per Hour',
      frequency: 'Monthly',
    },
  },

  // ---------------------------------------------------------------------------
  // ECONOMIC_GROWTH — 5 series, mixed date ranges
  //   GDP series: twoYearsAgo (quarterly — need 8+ points)
  //   Others:     oneYearAgo  (monthly — 12 points sufficient)
  // Hook: useEconomicGrowthData
  // Cross-domain: RETAIL_SALES (RSAFS) also in CONSUMER_SPENDING
  //               REAL_GDP (A191RL1Q225SBEA) also in KEY_INDICATORS
  // ---------------------------------------------------------------------------
  ECONOMIC_GROWTH: {
    REAL_GDP: {
      code: 'A191RL1Q225SBEA',
      name: 'Real Gross Domestic Product',
      units: 'Percent Change from Previous Period',
      frequency: 'Quarterly',
      // Also used in: KEY_INDICATORS (oneYearAgo range, not aggregated)
    },
    NOMINAL_GDP: {
      code: 'A191RP1Q027SBEA',
      name: 'Gross Domestic Product',
      units: 'Billions of Chained 2017 Dollars',
      frequency: 'Quarterly',
    },
    INDUSTRIAL_PRODUCTION: {
      code: 'INDPRO',
      name: 'Industrial Production: Total Index',
      units: 'Index 2017=100',
      frequency: 'Monthly',
    },
    RETAIL_SALES: {
      code: 'RSAFS',
      name: 'Advance Retail Sales: Retail and Food Services, Total',
      units: 'Millions of Dollars',
      frequency: 'Monthly',
      // Also used in: CONSUMER_SPENDING (same series, same date range)
    },
    CAPACITY_UTILIZATION: {
      code: 'TCU',
      name: 'Capacity Utilization: Total Industry',
      units: 'Percent of Capacity',
      frequency: 'Monthly',
    },
  },

  // ---------------------------------------------------------------------------
  // HOUSING — 7 series, date range: oneYearAgo
  // Hook: useHousingData
  // Cross-domain: MORTGAGE_RATE_30Y (MORTGAGE30US) also in KEY_INDICATORS
  // ---------------------------------------------------------------------------
  HOUSING: {
    HOME_PRICE_INDEX: {
      code: 'CSUSHPISA',
      name: 'S&P/Case-Shiller U.S. National Home Price Index',
      units: 'Index Jan 2000=100 (Seasonally Adjusted)',
      frequency: 'Monthly',
    },
    HOUSING_STARTS: {
      code: 'HOUST',
      name: 'Housing Starts: Total: New Privately Owned Housing Units Started',
      units: 'Thousands of Units',
      frequency: 'Monthly',
    },
    BUILDING_PERMITS: {
      code: 'PERMIT',
      name: 'New Private Housing Units Authorized by Building Permits',
      units: 'Thousands of Units',
      frequency: 'Monthly',
    },
    MORTGAGE_RATE_30Y: {
      code: 'MORTGAGE30US',
      name: '30-Year Fixed Rate Mortgage Average in the United States',
      units: 'Percent',
      frequency: 'Weekly',
      // Also used in: KEY_INDICATORS (oneYearAgo range)
    },
    AFFORDABILITY_INDEX: {
      code: 'FIXHAI',
      name: 'Housing Affordability Index',
      units: 'Index (higher value = less affordable)',
      frequency: 'Monthly',
    },
    NEW_HOME_SALES: {
      code: 'HSN1F',
      name: 'New One Family Houses Sold: United States',
      units: 'Thousands',
      frequency: 'Monthly',
    },
    EXISTING_HOME_SALES: {
      code: 'EXHOSLUSM495S',
      name: 'Existing Home Sales',
      units: 'Thousands of Units',
      frequency: 'Monthly',
    },
  },

  // ---------------------------------------------------------------------------
  // EXCHANGE_RATES — 9 series, date range: oneYearAgo
  // Hook: useExchangeRatesData
  // Note: DOLLAR_INDEX (DTWEXBGS) is the baseline — measures USD strength
  //       against a basket of currencies. All other series are bilateral rates.
  // ---------------------------------------------------------------------------
  EXCHANGE_RATES: {
    DOLLAR_INDEX: {
      code: 'DTWEXBGS',
      name: 'Trade Weighted U.S. Dollar Index: Broad, Goods and Services',
      units: 'Index Jan 2006=100',
      frequency: 'Monthly',
    },
    USD_EUR: {
      code: 'DEXUSEU',
      name: 'U.S. / Euro Foreign Exchange Rate',
      units: 'Euro per U.S. Dollar',
      frequency: 'Daily',
    },
    USD_GBP: {
      code: 'DEXUSUK',
      name: 'U.S. / U.K. Foreign Exchange Rate',
      units: 'British Pounds per U.S. Dollar',
      frequency: 'Daily',
    },
    USD_JPY: {
      code: 'DEXJPUS',
      name: 'Japan / U.S. Foreign Exchange Rate',
      units: 'Japanese Yen per U.S. Dollar',
      frequency: 'Daily',
    },
    USD_CNY: {
      code: 'DEXCHUS',
      name: 'China / U.S. Foreign Exchange Rate',
      units: 'Yuan per U.S. Dollar',
      frequency: 'Daily',
    },
    USD_MXN: {
      code: 'DEXMXUS',
      name: 'Mexico / U.S. Foreign Exchange Rate',
      units: 'Mexican Pesos per U.S. Dollar',
      frequency: 'Daily',
    },
    USD_INR: {
      code: 'DEXINUS',
      name: 'India / U.S. Foreign Exchange Rate',
      units: 'Indian Rupees per U.S. Dollar',
      frequency: 'Daily',
    },
    USD_CAD: {
      code: 'DEXCAUS',
      name: 'Canada / U.S. Foreign Exchange Rate',
      units: 'Canadian Dollars per U.S. Dollar',
      frequency: 'Daily',
    },
    USD_AUD: {
      code: 'DEXUSAL',
      name: 'Australia / U.S. Foreign Exchange Rate',
      units: 'Australian Dollars per U.S. Dollar',
      frequency: 'Daily',
    },
  },

  // ---------------------------------------------------------------------------
  // CONSUMER_SPENDING — 10 series → 4 merged charts, date range: oneYearAgo
  // Hook: useConsumerSpendingData
  // Cross-domain: RETAIL_SALES (RSAFS) also in ECONOMIC_GROWTH
  // Note: DISPOSABLE_INCOME (DSPI) is divided ÷1000 (billions → trillions)
  //       in the savings chart transform to share a Y-axis with saving rate (%).
  // ---------------------------------------------------------------------------
  CONSUMER_SPENDING: {
    PCE_TOTAL: {
      code: 'PCE',
      name: 'Personal Consumption Expenditures',
      units: 'Billions of Dollars',
      frequency: 'Monthly',
    },
    PCE_DURABLES: {
      code: 'PCEDG',
      name: 'Personal Consumption Expenditures: Durable Goods',
      units: 'Billions of Dollars',
      frequency: 'Monthly',
    },
    PCE_SERVICES: {
      code: 'PCESV',
      name: 'Personal Consumption Expenditures: Services',
      units: 'Billions of Dollars',
      frequency: 'Monthly',
    },
    RETAIL_SALES: {
      code: 'RSAFS',
      name: 'Advance Retail Sales: Retail and Food Services, Total',
      units: 'Millions of Dollars',
      frequency: 'Monthly',
      // Also used in: ECONOMIC_GROWTH (same series, same date range)
    },
    FOOD_SERVICES_SALES: {
      code: 'RSFSDP',
      name: 'Advance Retail Sales: Food Services and Drinking Places',
      units: 'Millions of Dollars',
      frequency: 'Monthly',
    },
    GENERAL_MERCH_SALES: {
      code: 'GAFO',
      name: 'Advance Retail Sales: General Merchandise Stores',
      units: 'Millions of Dollars',
      frequency: 'Monthly',
    },
    PERSONAL_SAVING_RATE: {
      code: 'PSAVERT',
      name: 'Personal Saving Rate',
      units: 'Percent',
      frequency: 'Monthly',
    },
    DISPOSABLE_INCOME: {
      code: 'DSPI',
      name: 'Disposable Personal Income',
      units: 'Billions of Dollars (displayed as trillions via ÷1000 transform)',
      frequency: 'Monthly',
    },
    CONSUMER_SENTIMENT: {
      code: 'UMCSENT',
      name: 'University of Michigan: Consumer Sentiment',
      units: 'Index 1966:Q1=100',
      frequency: 'Monthly',
    },
    CONSUMER_CONFIDENCE: {
      code: 'CSCICP03USM665S',
      name: 'Consumer Opinion Surveys: Confidence Indicators',
      units: 'Amplitude Adjusted Index',
      frequency: 'Monthly',
    },
  },

  // ---------------------------------------------------------------------------
  // MARKET_INDICES — 7 series → 3 merged charts + 1 standalone
  //   Date range: threeYearsAgo (market cycles span 1-2 years; need context)
  // Hook: useMarketIndicesData
  // Cross-domain: SP500 also in KEY_INDICATORS (oneYearAgo)
  // ---------------------------------------------------------------------------
  MARKET_INDICES: {
    SP500: {
      code: 'SP500',
      name: 'S&P 500',
      units: 'Index',
      frequency: 'Daily',
      // Also used in: KEY_INDICATORS (oneYearAgo range)
    },
    NASDAQ: {
      code: 'NASDAQCOM',
      name: 'NASDAQ Composite Index',
      units: 'Index',
      frequency: 'Daily',
    },
    DOW_JONES: {
      code: 'DJIA',
      name: 'Dow Jones Industrial Average',
      units: 'Index',
      frequency: 'Daily',
    },
    VIX: {
      code: 'VIXCLS',
      name: 'CBOE Volatility Index: VIX',
      units: 'Index',
      frequency: 'Daily',
    },
    BAA_SPREAD: {
      code: 'BAA10Y',
      name: "Moody's Seasoned Baa Corporate Bond Yield Relative to Yield on 10-Year Treasury Constant Maturity",
      units: 'Percent',
      frequency: 'Daily',
    },
    AAA_SPREAD: {
      code: 'AAA10Y',
      name: "Moody's Seasoned Aaa Corporate Bond Yield Relative to Yield on 10-Year Treasury Constant Maturity",
      units: 'Percent',
      frequency: 'Daily',
    },
    NYSE_COMPOSITE: {
      code: 'NYA',
      name: 'NYSE Composite Index',
      units: 'Index',
      frequency: 'Daily',
    },
  },

  // ---------------------------------------------------------------------------
  // KEY_INDICATORS — 8 series, mixed date ranges
  //   CPIAUCSL: threeYearsAgo (aggregated to yearly January values for bar chart)
  //   All others: oneYearAgo
  // Hook: useKeyIndicatorsData (always-on — no isActive parameter)
  // Cross-domain: MORTGAGE_RATE_30Y = HOUSING.MORTGAGE_RATE_30Y
  //               REAL_GDP          = ECONOMIC_GROWTH.REAL_GDP
  //               SP500             = MARKET_INDICES.SP500
  // ---------------------------------------------------------------------------
  KEY_INDICATORS: {
    CPI_ALL_ITEMS: {
      code: 'CPIAUCSL',
      name: 'Consumer Price Index for All Urban Consumers: All Items',
      units: 'Index 1982-1984=100',
      frequency: 'Monthly',
      // Special: 3 years fetched, aggregated to 3 yearly January values
    },
    UNEMPLOYMENT_RATE: {
      code: 'UNRATE',
      name: 'Unemployment Rate',
      units: 'Percent',
      frequency: 'Monthly',
    },
    TREASURY_10Y: {
      code: 'GS10',
      name: 'Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity',
      units: 'Percent',
      frequency: 'Daily',
    },
    TREASURY_3M: {
      code: 'TB3MS',
      name: '3-Month Treasury Bill Secondary Market Rate, Discount Basis',
      units: 'Percent',
      frequency: 'Monthly',
    },
    FED_FUNDS_RATE: {
      code: 'FEDFUNDS',
      name: 'Federal Funds Effective Rate',
      units: 'Percent',
      frequency: 'Daily',
    },
    MORTGAGE_RATE_30Y: {
      code: 'MORTGAGE30US',
      name: '30-Year Fixed Rate Mortgage Average in the United States',
      units: 'Percent',
      frequency: 'Weekly',
      // Also used in: HOUSING.MORTGAGE_RATE_30Y
    },
    REAL_GDP: {
      code: 'A191RL1Q225SBEA',
      name: 'Real Gross Domestic Product',
      units: 'Percent Change from Previous Period',
      frequency: 'Quarterly',
      // Also used in: ECONOMIC_GROWTH.REAL_GDP (twoYearsAgo range)
    },
    SP500: {
      code: 'SP500',
      name: 'S&P 500',
      units: 'Index',
      frequency: 'Daily',
      // Also used in: MARKET_INDICES.SP500 (threeYearsAgo range)
    },
  },

} as const;

/**
 * Union type of all FRED series codes used in the application.
 *
 * Derived automatically from the registry — adding a new series to `FRED_SERIES`
 * automatically widens this type.
 *
 * @example
 * ```typescript
 * function fetchSeries(code: FredSeriesCode) {
 *   return getFredSeriesCached(code, oneYearAgo);
 * }
 * ```
 */
// Helper: extract union of all values in an object type
type _Values<T> = T[keyof T];

// Step 1: for each domain, build a union of its series entries
// Step 2: build a union of all those per-domain unions
// Step 3: extract the 'code' field — distributes correctly over the union
type _AllSeriesEntries = _Values<{
  [D in keyof typeof FRED_SERIES]: _Values<typeof FRED_SERIES[D]>
}>;
export type FredSeriesCode = _AllSeriesEntries['code'];

