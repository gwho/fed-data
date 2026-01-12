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
    default:
      return [];
  }
}
