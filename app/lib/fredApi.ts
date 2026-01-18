const FRED_API_BASE = 'https://api.stlouisfed.org/fred';
const API_KEY = process.env.NEXT_PUBLIC_FRED_API_KEY || '';

export interface FredSeriesData {
  date: string;
  value: string;
}

export interface FredObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

export async function getFredSeries(seriesId: string, startDate?: string): Promise<FredSeriesData[]> {
  if (!API_KEY || API_KEY === 'your_fred_api_key_here') {
    console.warn('FRED API key not configured. Using sample data.');
    return getSampleData(seriesId);
  }

  try {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: API_KEY,
      file_type: 'json',
    });

    if (startDate) {
      params.append('observation_start', startDate);
    }

    const response = await fetch(`${FRED_API_BASE}/series/observations?${params}`);

    if (!response.ok) {
      console.error('FRED API error:', response.status);
      return getSampleData(seriesId);
    }

    const data = await response.json();

    return data.observations
      .filter((obs: FredObservation) => obs.value !== '.')
      .map((obs: FredObservation) => ({
        date: obs.date,
        value: obs.value,
      }));
  } catch (error) {
    console.error('Error fetching FRED data:', error);
    return getSampleData(seriesId);
  }
}

function getSampleData(seriesId: string): FredSeriesData[] {
  switch (seriesId) {
    case 'CPIAUCSL': // CPI - Last 3 years (modified sample values)
      return [
        { date: '2024-01-01', value: '310.500' },
        { date: '2025-01-01', value: '320.750' },
        { date: '2026-01-01', value: '328.900' },
      ];
    case 'UNRATE': // Unemployment Rate
      return [
        { date: '2024-01-01', value: '3.7' },
        { date: '2024-02-01', value: '3.9' },
        { date: '2024-03-01', value: '3.8' },
        { date: '2024-04-01', value: '3.9' },
        { date: '2024-05-01', value: '4.0' },
        { date: '2024-06-01', value: '4.1' },
        { date: '2024-07-01', value: '4.3' },
        { date: '2024-08-01', value: '4.2' },
        { date: '2024-09-01', value: '4.1' },
        { date: '2024-10-01', value: '4.1' },
        { date: '2024-11-01', value: '4.2' },
        { date: '2024-12-01', value: '4.0' },
      ];
    case 'GS10': // 10-Year Treasury
      return [
        { date: '2024-01-01', value: '3.88' },
        { date: '2024-02-01', value: '4.25' },
        { date: '2024-03-01', value: '4.20' },
        { date: '2024-04-01', value: '4.63' },
        { date: '2024-05-01', value: '4.49' },
        { date: '2024-06-01', value: '4.29' },
        { date: '2024-07-01', value: '4.16' },
        { date: '2024-08-01', value: '3.86' },
        { date: '2024-09-01', value: '3.78' },
        { date: '2024-10-01', value: '4.09' },
        { date: '2024-11-01', value: '4.42' },
        { date: '2024-12-01', value: '4.58' },
      ];
    case 'TB3MS': // 3-Month Treasury
      return [
        { date: '2024-01-01', value: '5.39' },
        { date: '2024-02-01', value: '5.42' },
        { date: '2024-03-01', value: '5.43' },
        { date: '2024-04-01', value: '5.36' },
        { date: '2024-05-01', value: '5.32' },
        { date: '2024-06-01', value: '5.22' },
        { date: '2024-07-01', value: '5.26' },
        { date: '2024-08-01', value: '5.22' },
        { date: '2024-09-01', value: '4.97' },
        { date: '2024-10-01', value: '4.51' },
        { date: '2024-11-01', value: '4.38' },
        { date: '2024-12-01', value: '4.32' },
      ];
    case 'FEDFUNDS': // Federal Funds Effective Rate
      return [
        { date: '2024-01-01', value: '5.33' },
        { date: '2024-02-01', value: '5.33' },
        { date: '2024-03-01', value: '5.33' },
        { date: '2024-04-01', value: '5.33' },
        { date: '2024-05-01', value: '5.33' },
        { date: '2024-06-01', value: '5.33' },
        { date: '2024-07-01', value: '5.33' },
        { date: '2024-08-01', value: '5.33' },
        { date: '2024-09-01', value: '4.83' },
        { date: '2024-10-01', value: '4.83' },
        { date: '2024-11-01', value: '4.58' },
        { date: '2024-12-01', value: '4.33' },
      ];
    case 'CPILFESL': // Core CPI (excludes food & energy)
      return [
        { date: '2024-01-01', value: '310.326' },
        { date: '2024-02-01', value: '311.054' },
        { date: '2024-03-01', value: '312.230' },
        { date: '2024-04-01', value: '312.877' },
        { date: '2024-05-01', value: '313.231' },
        { date: '2024-06-01', value: '313.534' },
        { date: '2024-07-01', value: '314.464' },
        { date: '2024-08-01', value: '315.097' },
        { date: '2024-09-01', value: '315.709' },
        { date: '2024-10-01', value: '316.315' },
        { date: '2024-11-01', value: '316.836' },
        { date: '2024-12-01', value: '317.228' },
      ];
    case 'PCEPI': // Personal Consumption Expenditures Price Index
      return [
        { date: '2024-01-01', value: '124.418' },
        { date: '2024-02-01', value: '124.852' },
        { date: '2024-03-01', value: '125.389' },
        { date: '2024-04-01', value: '125.753' },
        { date: '2024-05-01', value: '125.923' },
        { date: '2024-06-01', value: '126.003' },
        { date: '2024-07-01', value: '126.346' },
        { date: '2024-08-01', value: '126.528' },
        { date: '2024-09-01', value: '126.720' },
        { date: '2024-10-01', value: '127.064' },
        { date: '2024-11-01', value: '127.312' },
        { date: '2024-12-01', value: '127.589' },
      ];
    case 'PCEPILFE': // Core PCE (Fed's preferred measure)
      return [
        { date: '2024-01-01', value: '124.001' },
        { date: '2024-02-01', value: '124.391' },
        { date: '2024-03-01', value: '124.730' },
        { date: '2024-04-01', value: '125.011' },
        { date: '2024-05-01', value: '125.186' },
        { date: '2024-06-01', value: '125.341' },
        { date: '2024-07-01', value: '125.565' },
        { date: '2024-08-01', value: '125.764' },
        { date: '2024-09-01', value: '125.959' },
        { date: '2024-10-01', value: '126.208' },
        { date: '2024-11-01', value: '126.424' },
        { date: '2024-12-01', value: '126.648' },
      ];
    case 'CPIUFDSL': // Food CPI
      return [
        { date: '2024-01-01', value: '308.654' },
        { date: '2024-02-01', value: '309.287' },
        { date: '2024-03-01', value: '309.823' },
        { date: '2024-04-01', value: '310.451' },
        { date: '2024-05-01', value: '311.123' },
        { date: '2024-06-01', value: '311.534' },
        { date: '2024-07-01', value: '312.098' },
        { date: '2024-08-01', value: '312.234' },
        { date: '2024-09-01', value: '312.678' },
        { date: '2024-10-01', value: '313.045' },
        { date: '2024-11-01', value: '313.412' },
        { date: '2024-12-01', value: '313.789' },
      ];
    case 'CPIENGSL': // Energy CPI
      return [
        { date: '2024-01-01', value: '285.342' },
        { date: '2024-02-01', value: '287.123' },
        { date: '2024-03-01', value: '292.456' },
        { date: '2024-04-01', value: '295.789' },
        { date: '2024-05-01', value: '298.234' },
        { date: '2024-06-01', value: '294.567' },
        { date: '2024-07-01', value: '291.234' },
        { date: '2024-08-01', value: '288.456' },
        { date: '2024-09-01', value: '285.789' },
        { date: '2024-10-01', value: '287.123' },
        { date: '2024-11-01', value: '289.456' },
        { date: '2024-12-01', value: '291.789' },
      ];
    case 'CUSR0000SAH': // Housing CPI
      return [
        { date: '2024-01-01', value: '340.234' },
        { date: '2024-02-01', value: '341.123' },
        { date: '2024-03-01', value: '342.456' },
        { date: '2024-04-01', value: '343.234' },
        { date: '2024-05-01', value: '344.567' },
        { date: '2024-06-01', value: '345.234' },
        { date: '2024-07-01', value: '346.123' },
        { date: '2024-08-01', value: '347.456' },
        { date: '2024-09-01', value: '348.234' },
        { date: '2024-10-01', value: '349.123' },
        { date: '2024-11-01', value: '350.234' },
        { date: '2024-12-01', value: '351.123' },
      ];
    case 'CPIMEDSL': // Medical Care CPI
      return [
        { date: '2024-01-01', value: '565.234' },
        { date: '2024-02-01', value: '566.456' },
        { date: '2024-03-01', value: '567.789' },
        { date: '2024-04-01', value: '568.234' },
        { date: '2024-05-01', value: '569.567' },
        { date: '2024-06-01', value: '570.123' },
        { date: '2024-07-01', value: '571.456' },
        { date: '2024-08-01', value: '572.234' },
        { date: '2024-09-01', value: '573.567' },
        { date: '2024-10-01', value: '574.123' },
        { date: '2024-11-01', value: '575.456' },
        { date: '2024-12-01', value: '576.789' },
      ];
    case 'A191RL1Q225SBEA': // Real GDP Growth Rate (Quarterly, Year-over-Year)
      return [
        { date: '2023-12-01', value: '3.1' },
        { date: '2024-03-01', value: '3.0' },
        { date: '2024-06-01', value: '2.9' },
        { date: '2024-09-01', value: '2.8' },
        { date: '2024-12-01', value: '2.5' },
      ];
    case 'SP500': // S&P 500 Stock Market Index
      return [
        { date: '2024-01-01', value: '4783.45' },
        { date: '2024-02-01', value: '4997.91' },
        { date: '2024-03-01', value: '5254.35' },
        { date: '2024-04-01', value: '5035.69' },
        { date: '2024-05-01', value: '5277.51' },
        { date: '2024-06-01', value: '5460.48' },
        { date: '2024-07-01', value: '5522.30' },
        { date: '2024-08-01', value: '5648.40' },
        { date: '2024-09-01', value: '5762.48' },
        { date: '2024-10-01', value: '5705.45' },
        { date: '2024-11-01', value: '5969.34' },
        { date: '2024-12-01', value: '5881.63' },
      ];
    case 'NASDAQCOM': // Nasdaq Composite Index
      return [
        { date: '2024-01-01', value: '15128.58' },
        { date: '2024-02-01', value: '15854.12' },
        { date: '2024-03-01', value: '16379.46' },
        { date: '2024-04-01', value: '15768.93' },
        { date: '2024-05-01', value: '16848.72' },
        { date: '2024-06-01', value: '17219.34' },
        { date: '2024-07-01', value: '17582.11' },
        { date: '2024-08-01', value: '17896.22' },
        { date: '2024-09-01', value: '18214.07' },
        { date: '2024-10-01', value: '17942.88' },
        { date: '2024-11-01', value: '18733.55' },
        { date: '2024-12-01', value: '18421.19' },
      ];
    case 'DJIA': // Dow Jones Industrial Average
      return [
        { date: '2024-01-01', value: '37689.54' },
        { date: '2024-02-01', value: '38987.24' },
        { date: '2024-03-01', value: '39512.18' },
        { date: '2024-04-01', value: '38197.83' },
        { date: '2024-05-01', value: '39462.75' },
        { date: '2024-06-01', value: '39913.42' },
        { date: '2024-07-01', value: '40122.09' },
        { date: '2024-08-01', value: '40789.55' },
        { date: '2024-09-01', value: '41203.21' },
        { date: '2024-10-01', value: '40651.37' },
        { date: '2024-11-01', value: '41872.44' },
        { date: '2024-12-01', value: '41433.18' },
      ];
    case 'VIXCLS': // CBOE Volatility Index
      return [
        { date: '2024-01-01', value: '14.8' },
        { date: '2024-02-01', value: '15.6' },
        { date: '2024-03-01', value: '13.9' },
        { date: '2024-04-01', value: '17.2' },
        { date: '2024-05-01', value: '14.1' },
        { date: '2024-06-01', value: '12.9' },
        { date: '2024-07-01', value: '13.6' },
        { date: '2024-08-01', value: '14.4' },
        { date: '2024-09-01', value: '15.1' },
        { date: '2024-10-01', value: '18.3' },
        { date: '2024-11-01', value: '16.7' },
        { date: '2024-12-01', value: '15.3' },
      ];
    case 'BAA10Y': // Moody's Baa Corporate Bond Yield Relative to 10Y Treasury
      return [
        { date: '2024-01-01', value: '3.5' },
        { date: '2024-02-01', value: '3.4' },
        { date: '2024-03-01', value: '3.2' },
        { date: '2024-04-01', value: '3.6' },
        { date: '2024-05-01', value: '3.3' },
        { date: '2024-06-01', value: '3.1' },
        { date: '2024-07-01', value: '3.0' },
        { date: '2024-08-01', value: '3.2' },
        { date: '2024-09-01', value: '3.4' },
        { date: '2024-10-01', value: '3.7' },
        { date: '2024-11-01', value: '3.4' },
        { date: '2024-12-01', value: '3.2' },
      ];
    case 'AAA10Y': // Moody's Aaa Corporate Bond Yield Relative to 10Y Treasury
      return [
        { date: '2024-01-01', value: '2.1' },
        { date: '2024-02-01', value: '2.0' },
        { date: '2024-03-01', value: '1.9' },
        { date: '2024-04-01', value: '2.2' },
        { date: '2024-05-01', value: '2.0' },
        { date: '2024-06-01', value: '1.8' },
        { date: '2024-07-01', value: '1.7' },
        { date: '2024-08-01', value: '1.9' },
        { date: '2024-09-01', value: '2.0' },
        { date: '2024-10-01', value: '2.3' },
        { date: '2024-11-01', value: '2.1' },
        { date: '2024-12-01', value: '2.0' },
      ];
    case 'NYA': // NYSE Composite Index
      return [
        { date: '2024-01-01', value: '16623.45' },
        { date: '2024-02-01', value: '17118.32' },
        { date: '2024-03-01', value: '17534.67' },
        { date: '2024-04-01', value: '16897.12' },
        { date: '2024-05-01', value: '17645.89' },
        { date: '2024-06-01', value: '17922.14' },
        { date: '2024-07-01', value: '18103.55' },
        { date: '2024-08-01', value: '18476.21' },
        { date: '2024-09-01', value: '18829.77' },
        { date: '2024-10-01', value: '18514.96' },
        { date: '2024-11-01', value: '19187.33' },
        { date: '2024-12-01', value: '18942.08' },
      ];
    case 'CIVPART': // Labor Force Participation Rate
      return [
        { date: '2024-01-01', value: '62.5' },
        { date: '2024-02-01', value: '62.5' },
        { date: '2024-03-01', value: '62.7' },
        { date: '2024-04-01', value: '62.7' },
        { date: '2024-05-01', value: '62.5' },
        { date: '2024-06-01', value: '62.6' },
        { date: '2024-07-01', value: '62.7' },
        { date: '2024-08-01', value: '62.7' },
        { date: '2024-09-01', value: '62.7' },
        { date: '2024-10-01', value: '62.6' },
        { date: '2024-11-01', value: '62.5' },
        { date: '2024-12-01', value: '62.5' },
      ];
    case 'PAYEMS': // Total Nonfarm Payrolls (in thousands)
      return [
        { date: '2024-01-01', value: '157533' },
        { date: '2024-02-01', value: '157808' },
        { date: '2024-03-01', value: '158098' },
        { date: '2024-04-01', value: '158215' },
        { date: '2024-05-01', value: '158387' },
        { date: '2024-06-01', value: '158523' },
        { date: '2024-07-01', value: '158632' },
        { date: '2024-08-01', value: '158774' },
        { date: '2024-09-01', value: '159028' },
        { date: '2024-10-01', value: '159134' },
        { date: '2024-11-01', value: '159361' },
        { date: '2024-12-01', value: '159567' },
      ];
    case 'ICSA': // Initial Claims (Weekly Unemployment Claims)
      return [
        { date: '2024-01-01', value: '218000' },
        { date: '2024-02-01', value: '212000' },
        { date: '2024-03-01', value: '210000' },
        { date: '2024-04-01', value: '215000' },
        { date: '2024-05-01', value: '232000' },
        { date: '2024-06-01', value: '238000' },
        { date: '2024-07-01', value: '245000' },
        { date: '2024-08-01', value: '231000' },
        { date: '2024-09-01', value: '225000' },
        { date: '2024-10-01', value: '228000' },
        { date: '2024-11-01', value: '215000' },
        { date: '2024-12-01', value: '220000' },
      ];
    case 'AHETPI': // Average Hourly Earnings (Private Employees)
      return [
        { date: '2024-01-01', value: '34.55' },
        { date: '2024-02-01', value: '34.62' },
        { date: '2024-03-01', value: '34.69' },
        { date: '2024-04-01', value: '34.80' },
        { date: '2024-05-01', value: '34.91' },
        { date: '2024-06-01', value: '35.00' },
        { date: '2024-07-01', value: '35.08' },
        { date: '2024-08-01', value: '35.21' },
        { date: '2024-09-01', value: '35.36' },
        { date: '2024-10-01', value: '35.46' },
        { date: '2024-11-01', value: '35.61' },
        { date: '2024-12-01', value: '35.69' },
      ];
    case 'A191RP1Q027SBEA': // Nominal GDP Growth Rate (Quarterly)
      return [
        { date: '2023-12-01', value: '5.8' },
        { date: '2024-03-01', value: '5.5' },
        { date: '2024-06-01', value: '5.6' },
        { date: '2024-09-01', value: '4.9' },
        { date: '2024-12-01', value: '4.7' },
      ];
    case 'INDPRO': // Industrial Production Index (2017=100)
      return [
        { date: '2024-01-01', value: '102.8' },
        { date: '2024-02-01', value: '102.6' },
        { date: '2024-03-01', value: '102.9' },
        { date: '2024-04-01', value: '103.1' },
        { date: '2024-05-01', value: '103.4' },
        { date: '2024-06-01', value: '103.2' },
        { date: '2024-07-01', value: '103.5' },
        { date: '2024-08-01', value: '103.3' },
        { date: '2024-09-01', value: '103.6' },
        { date: '2024-10-01', value: '103.8' },
        { date: '2024-11-01', value: '103.5' },
        { date: '2024-12-01', value: '103.9' },
      ];
    case 'RSAFS': // Retail Sales (Millions of Dollars)
      return [
        { date: '2024-01-01', value: '700234' },
        { date: '2024-02-01', value: '698456' },
        { date: '2024-03-01', value: '705678' },
        { date: '2024-04-01', value: '712345' },
        { date: '2024-05-01', value: '718901' },
        { date: '2024-06-01', value: '721234' },
        { date: '2024-07-01', value: '725678' },
        { date: '2024-08-01', value: '728901' },
        { date: '2024-09-01', value: '732456' },
        { date: '2024-10-01', value: '738234' },
        { date: '2024-11-01', value: '752345' },
        { date: '2024-12-01', value: '768901' },
      ];
    case 'TCU': // Total Capacity Utilization (Percent)
      return [
        { date: '2024-01-01', value: '78.5' },
        { date: '2024-02-01', value: '78.3' },
        { date: '2024-03-01', value: '78.6' },
        { date: '2024-04-01', value: '78.8' },
        { date: '2024-05-01', value: '79.1' },
        { date: '2024-06-01', value: '78.9' },
        { date: '2024-07-01', value: '79.2' },
        { date: '2024-08-01', value: '79.0' },
        { date: '2024-09-01', value: '79.3' },
        { date: '2024-10-01', value: '79.5' },
        { date: '2024-11-01', value: '79.2' },
        { date: '2024-12-01', value: '79.6' },
      ];
    case 'DTWEXBGS': // Trade Weighted U.S. Dollar Index: Broad, Goods and Services
      return [
        { date: '2024-01-01', value: '122.45' },
        { date: '2024-02-01', value: '123.12' },
        { date: '2024-03-01', value: '122.89' },
        { date: '2024-04-01', value: '123.67' },
        { date: '2024-05-01', value: '124.23' },
        { date: '2024-06-01', value: '123.98' },
        { date: '2024-07-01', value: '124.56' },
        { date: '2024-08-01', value: '123.34' },
        { date: '2024-09-01', value: '122.78' },
        { date: '2024-10-01', value: '123.45' },
        { date: '2024-11-01', value: '124.89' },
        { date: '2024-12-01', value: '125.23' },
      ];
    case 'DEXUSEU': // U.S. Dollars to Euro Spot Exchange Rate
      return [
        { date: '2024-01-01', value: '0.9123' },
        { date: '2024-02-01', value: '0.9245' },
        { date: '2024-03-01', value: '0.9189' },
        { date: '2024-04-01', value: '0.9334' },
        { date: '2024-05-01', value: '0.9456' },
        { date: '2024-06-01', value: '0.9378' },
        { date: '2024-07-01', value: '0.9512' },
        { date: '2024-08-01', value: '0.9289' },
        { date: '2024-09-01', value: '0.9156' },
        { date: '2024-10-01', value: '0.9234' },
        { date: '2024-11-01', value: '0.9445' },
        { date: '2024-12-01', value: '0.9523' },
      ];
    case 'DEXUSUK': // U.S. Dollars to British Pound Spot Exchange Rate
      return [
        { date: '2024-01-01', value: '0.7856' },
        { date: '2024-02-01', value: '0.7923' },
        { date: '2024-03-01', value: '0.7889' },
        { date: '2024-04-01', value: '0.7967' },
        { date: '2024-05-01', value: '0.8012' },
        { date: '2024-06-01', value: '0.7945' },
        { date: '2024-07-01', value: '0.8034' },
        { date: '2024-08-01', value: '0.7878' },
        { date: '2024-09-01', value: '0.7823' },
        { date: '2024-10-01', value: '0.7901' },
        { date: '2024-11-01', value: '0.8023' },
        { date: '2024-12-01', value: '0.8067' },
      ];
    case 'DEXJPUS': // Japanese Yen to U.S. Dollar Spot Exchange Rate
      return [
        { date: '2024-01-01', value: '142.35' },
        { date: '2024-02-01', value: '148.67' },
        { date: '2024-03-01', value: '151.23' },
        { date: '2024-04-01', value: '154.89' },
        { date: '2024-05-01', value: '156.12' },
        { date: '2024-06-01', value: '160.45' },
        { date: '2024-07-01', value: '157.89' },
        { date: '2024-08-01', value: '145.67' },
        { date: '2024-09-01', value: '143.23' },
        { date: '2024-10-01', value: '149.78' },
        { date: '2024-11-01', value: '152.34' },
        { date: '2024-12-01', value: '154.12' },
      ];
    case 'DEXCHUS': // Chinese Yuan to U.S. Dollar Spot Exchange Rate
      return [
        { date: '2024-01-01', value: '7.1234' },
        { date: '2024-02-01', value: '7.1456' },
        { date: '2024-03-01', value: '7.1789' },
        { date: '2024-04-01', value: '7.2123' },
        { date: '2024-05-01', value: '7.2345' },
        { date: '2024-06-01', value: '7.2567' },
        { date: '2024-07-01', value: '7.2789' },
        { date: '2024-08-01', value: '7.2456' },
        { date: '2024-09-01', value: '7.2123' },
        { date: '2024-10-01', value: '7.1989' },
        { date: '2024-11-01', value: '7.2234' },
        { date: '2024-12-01', value: '7.2456' },
      ];
    case 'DEXMXUS': // Mexican Peso to U.S. Dollar Spot Exchange Rate
      return [
        { date: '2024-01-01', value: '17.12' },
        { date: '2024-02-01', value: '17.34' },
        { date: '2024-03-01', value: '16.89' },
        { date: '2024-04-01', value: '16.67' },
        { date: '2024-05-01', value: '16.45' },
        { date: '2024-06-01', value: '18.23' },
        { date: '2024-07-01', value: '18.56' },
        { date: '2024-08-01', value: '19.12' },
        { date: '2024-09-01', value: '19.45' },
        { date: '2024-10-01', value: '19.89' },
        { date: '2024-11-01', value: '20.12' },
        { date: '2024-12-01', value: '20.34' },
      ];
    case 'DEXINUS': // Indian Rupee to U.S. Dollar Spot Exchange Rate
      return [
        { date: '2024-01-01', value: '83.12' },
        { date: '2024-02-01', value: '83.34' },
        { date: '2024-03-01', value: '83.45' },
        { date: '2024-04-01', value: '83.67' },
        { date: '2024-05-01', value: '83.89' },
        { date: '2024-06-01', value: '83.56' },
        { date: '2024-07-01', value: '83.78' },
        { date: '2024-08-01', value: '83.91' },
        { date: '2024-09-01', value: '83.67' },
        { date: '2024-10-01', value: '83.45' },
        { date: '2024-11-01', value: '84.12' },
        { date: '2024-12-01', value: '84.23' },
      ];
    case 'DEXCAUS': // Canadian Dollar to U.S. Dollar Spot Exchange Rate
      return [
        { date: '2024-01-01', value: '1.3234' },
        { date: '2024-02-01', value: '1.3456' },
        { date: '2024-03-01', value: '1.3567' },
        { date: '2024-04-01', value: '1.3689' },
        { date: '2024-05-01', value: '1.3712' },
        { date: '2024-06-01', value: '1.3645' },
        { date: '2024-07-01', value: '1.3723' },
        { date: '2024-08-01', value: '1.3534' },
        { date: '2024-09-01', value: '1.3456' },
        { date: '2024-10-01', value: '1.3578' },
        { date: '2024-11-01', value: '1.3689' },
        { date: '2024-12-01', value: '1.3734' },
      ];
    case 'DEXUSAL': // Australian Dollar to U.S. Dollar Spot Exchange Rate
      return [
        { date: '2024-01-01', value: '1.4823' },
        { date: '2024-02-01', value: '1.5234' },
        { date: '2024-03-01', value: '1.5456' },
        { date: '2024-04-01', value: '1.5678' },
        { date: '2024-05-01', value: '1.5523' },
        { date: '2024-06-01', value: '1.5345' },
        { date: '2024-07-01', value: '1.5167' },
        { date: '2024-08-01', value: '1.4923' },
        { date: '2024-09-01', value: '1.4756' },
        { date: '2024-10-01', value: '1.4934' },
        { date: '2024-11-01', value: '1.5123' },
        { date: '2024-12-01', value: '1.5289' },
      ];
    case 'CSUSHPISA': // S&P/Case-Shiller U.S. National Home Price Index (2000=100)
      return [
        { date: '2024-01-01', value: '312.45' },
        { date: '2024-02-01', value: '313.67' },
        { date: '2024-03-01', value: '315.23' },
        { date: '2024-04-01', value: '317.89' },
        { date: '2024-05-01', value: '319.56' },
        { date: '2024-06-01', value: '321.34' },
        { date: '2024-07-01', value: '322.78' },
        { date: '2024-08-01', value: '323.45' },
        { date: '2024-09-01', value: '324.12' },
        { date: '2024-10-01', value: '324.89' },
        { date: '2024-11-01', value: '325.67' },
        { date: '2024-12-01', value: '326.23' },
      ];
    case 'HOUST': // Housing Starts (Thousands of Units, SAAR)
      return [
        { date: '2024-01-01', value: '1331' },
        { date: '2024-02-01', value: '1345' },
        { date: '2024-03-01', value: '1321' },
        { date: '2024-04-01', value: '1356' },
        { date: '2024-05-01', value: '1362' },
        { date: '2024-06-01', value: '1353' },
        { date: '2024-07-01', value: '1338' },
        { date: '2024-08-01', value: '1356' },
        { date: '2024-09-01', value: '1354' },
        { date: '2024-10-01', value: '1311' },
        { date: '2024-11-01', value: '1289' },
        { date: '2024-12-01', value: '1372' },
      ];
    case 'PERMIT': // New Private Housing Units Authorized by Building Permits (Thousands, SAAR)
      return [
        { date: '2024-01-01', value: '1470' },
        { date: '2024-02-01', value: '1523' },
        { date: '2024-03-01', value: '1458' },
        { date: '2024-04-01', value: '1440' },
        { date: '2024-05-01', value: '1399' },
        { date: '2024-06-01', value: '1446' },
        { date: '2024-07-01', value: '1454' },
        { date: '2024-08-01', value: '1475' },
        { date: '2024-09-01', value: '1425' },
        { date: '2024-10-01', value: '1416' },
        { date: '2024-11-01', value: '1505' },
        { date: '2024-12-01', value: '1483' },
      ];
    case 'MORTGAGE30US': // 30-Year Fixed Rate Mortgage Average in the United States (Percent)
      return [
        { date: '2024-01-01', value: '6.62' },
        { date: '2024-02-01', value: '6.74' },
        { date: '2024-03-01', value: '6.82' },
        { date: '2024-04-01', value: '6.96' },
        { date: '2024-05-01', value: '7.09' },
        { date: '2024-06-01', value: '6.95' },
        { date: '2024-07-01', value: '6.77' },
        { date: '2024-08-01', value: '6.46' },
        { date: '2024-09-01', value: '6.11' },
        { date: '2024-10-01', value: '6.32' },
        { date: '2024-11-01', value: '6.79' },
        { date: '2024-12-01', value: '6.60' },
      ];
    case 'FIXHAI': // Fixed Rate Mortgage Housing Affordability Index
      return [
        { date: '2024-01-01', value: '103.8' },
        { date: '2024-02-01', value: '102.4' },
        { date: '2024-03-01', value: '101.2' },
        { date: '2024-04-01', value: '99.7' },
        { date: '2024-05-01', value: '98.3' },
        { date: '2024-06-01', value: '99.8' },
        { date: '2024-07-01', value: '101.5' },
        { date: '2024-08-01', value: '104.6' },
        { date: '2024-09-01', value: '107.9' },
        { date: '2024-10-01', value: '105.3' },
        { date: '2024-11-01', value: '100.8' },
        { date: '2024-12-01', value: '102.5' },
      ];
    case 'HSN1F': // New One Family Houses Sold (Thousands, SAAR)
      return [
        { date: '2024-01-01', value: '664' },
        { date: '2024-02-01', value: '662' },
        { date: '2024-03-01', value: '693' },
        { date: '2024-04-01', value: '634' },
        { date: '2024-05-01', value: '619' },
        { date: '2024-06-01', value: '617' },
        { date: '2024-07-01', value: '739' },
        { date: '2024-08-01', value: '716' },
        { date: '2024-09-01', value: '738' },
        { date: '2024-10-01', value: '610' },
        { date: '2024-11-01', value: '664' },
        { date: '2024-12-01', value: '698' },
      ];
    case 'EXHOSLUSM495S': // Existing Home Sales (Millions, SAAR)
      return [
        { date: '2024-01-01', value: '4.01' },
        { date: '2024-02-01', value: '3.96' },
        { date: '2024-03-01', value: '4.19' },
        { date: '2024-04-01', value: '4.14' },
        { date: '2024-05-01', value: '4.11' },
        { date: '2024-06-01', value: '3.89' },
        { date: '2024-07-01', value: '3.95' },
        { date: '2024-08-01', value: '3.86' },
        { date: '2024-09-01', value: '3.84' },
        { date: '2024-10-01', value: '3.96' },
        { date: '2024-11-01', value: '4.15' },
        { date: '2024-12-01', value: '4.24' },
      ];
    case 'PCE': // Personal Consumption Expenditures (Billions of Dollars)
      return [
        { date: '2024-01-01', value: '18234.5' },
        { date: '2024-02-01', value: '18312.8' },
        { date: '2024-03-01', value: '18389.6' },
        { date: '2024-04-01', value: '18456.3' },
        { date: '2024-05-01', value: '18523.7' },
        { date: '2024-06-01', value: '18598.4' },
        { date: '2024-07-01', value: '18667.2' },
        { date: '2024-08-01', value: '18734.9' },
        { date: '2024-09-01', value: '18812.5' },
        { date: '2024-10-01', value: '18889.3' },
        { date: '2024-11-01', value: '18967.8' },
        { date: '2024-12-01', value: '19045.6' },
      ];
    case 'PCEDG': // Personal Consumption Expenditures: Durable Goods (Billions)
      return [
        { date: '2024-01-01', value: '2345.6' },
        { date: '2024-02-01', value: '2367.8' },
        { date: '2024-03-01', value: '2389.4' },
        { date: '2024-04-01', value: '2412.7' },
        { date: '2024-05-01', value: '2434.5' },
        { date: '2024-06-01', value: '2456.9' },
        { date: '2024-07-01', value: '2478.3' },
        { date: '2024-08-01', value: '2501.2' },
        { date: '2024-09-01', value: '2523.8' },
        { date: '2024-10-01', value: '2545.6' },
        { date: '2024-11-01', value: '2568.9' },
        { date: '2024-12-01', value: '2591.4' },
      ];
    case 'PCESV': // Personal Consumption Expenditures: Services (Billions)
      return [
        { date: '2024-01-01', value: '12456.3' },
        { date: '2024-02-01', value: '12512.4' },
        { date: '2024-03-01', value: '12567.8' },
        { date: '2024-04-01', value: '12623.5' },
        { date: '2024-05-01', value: '12678.9' },
        { date: '2024-06-01', value: '12734.6' },
        { date: '2024-07-01', value: '12789.2' },
        { date: '2024-08-01', value: '12845.7' },
        { date: '2024-09-01', value: '12901.3' },
        { date: '2024-10-01', value: '12956.8' },
        { date: '2024-11-01', value: '13012.4' },
        { date: '2024-12-01', value: '13068.9' },
      ];
    case 'RSFSDP': // Retail Sales: Food Services and Drinking Places (Millions)
      return [
        { date: '2024-01-01', value: '93234' },
        { date: '2024-02-01', value: '93567' },
        { date: '2024-03-01', value: '94123' },
        { date: '2024-04-01', value: '94678' },
        { date: '2024-05-01', value: '95234' },
        { date: '2024-06-01', value: '95789' },
        { date: '2024-07-01', value: '96345' },
        { date: '2024-08-01', value: '96901' },
        { date: '2024-09-01', value: '97456' },
        { date: '2024-10-01', value: '98012' },
        { date: '2024-11-01', value: '98567' },
        { date: '2024-12-01', value: '99123' },
      ];
    case 'GAFO': // Retail Sales: Clothing, General Merchandise Stores (Millions)
      return [
        { date: '2024-01-01', value: '78234' },
        { date: '2024-02-01', value: '77891' },
        { date: '2024-03-01', value: '78456' },
        { date: '2024-04-01', value: '79123' },
        { date: '2024-05-01', value: '79678' },
        { date: '2024-06-01', value: '80234' },
        { date: '2024-07-01', value: '80789' },
        { date: '2024-08-01', value: '81345' },
        { date: '2024-09-01', value: '81901' },
        { date: '2024-10-01', value: '82456' },
        { date: '2024-11-01', value: '83123' },
        { date: '2024-12-01', value: '85678' },
      ];
    case 'PSAVERT': // Personal Saving Rate (Percent of Disposable Income)
      return [
        { date: '2024-01-01', value: '4.1' },
        { date: '2024-02-01', value: '4.3' },
        { date: '2024-03-01', value: '4.2' },
        { date: '2024-04-01', value: '4.0' },
        { date: '2024-05-01', value: '3.9' },
        { date: '2024-06-01', value: '4.1' },
        { date: '2024-07-01', value: '4.4' },
        { date: '2024-08-01', value: '4.8' },
        { date: '2024-09-01', value: '4.6' },
        { date: '2024-10-01', value: '4.4' },
        { date: '2024-11-01', value: '4.2' },
        { date: '2024-12-01', value: '4.5' },
      ];
    case 'DSPI': // Disposable Personal Income (Billions of Dollars)
      return [
        { date: '2024-01-01', value: '21234.5' },
        { date: '2024-02-01', value: '21312.8' },
        { date: '2024-03-01', value: '21389.6' },
        { date: '2024-04-01', value: '21467.3' },
        { date: '2024-05-01', value: '21545.7' },
        { date: '2024-06-01', value: '21623.4' },
        { date: '2024-07-01', value: '21701.2' },
        { date: '2024-08-01', value: '21779.9' },
        { date: '2024-09-01', value: '21858.5' },
        { date: '2024-10-01', value: '21937.3' },
        { date: '2024-11-01', value: '22016.8' },
        { date: '2024-12-01', value: '22095.6' },
      ];
    case 'UMCSENT': // University of Michigan: Consumer Sentiment (Index 1966:Q1=100)
      return [
        { date: '2024-01-01', value: '79.2' },
        { date: '2024-02-01', value: '76.9' },
        { date: '2024-03-01', value: '79.4' },
        { date: '2024-04-01', value: '77.2' },
        { date: '2024-05-01', value: '69.1' },
        { date: '2024-06-01', value: '68.2' },
        { date: '2024-07-01', value: '66.4' },
        { date: '2024-08-01', value: '67.9' },
        { date: '2024-09-01', value: '70.1' },
        { date: '2024-10-01', value: '70.5' },
        { date: '2024-11-01', value: '71.8' },
        { date: '2024-12-01', value: '74.0' },
      ];
    case 'CSCICP03USM665S': // Consumer Confidence Index (Index 1985=100)
      return [
        { date: '2024-01-01', value: '110.7' },
        { date: '2024-02-01', value: '104.8' },
        { date: '2024-03-01', value: '103.1' },
        { date: '2024-04-01', value: '97.5' },
        { date: '2024-05-01', value: '101.3' },
        { date: '2024-06-01', value: '100.4' },
        { date: '2024-07-01', value: '101.9' },
        { date: '2024-08-01', value: '105.6' },
        { date: '2024-09-01', value: '108.7' },
        { date: '2024-10-01', value: '108.7' },
        { date: '2024-11-01', value: '111.7' },
        { date: '2024-12-01', value: '104.7' },
      ];
    default:
      return [];
  }
}
