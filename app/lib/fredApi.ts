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
    case 'CPIAUCSL': // CPI - Last 5 years
      return [
        { date: '2021-01-01', value: '261.582' },
        { date: '2022-01-01', value: '281.148' },
        { date: '2023-01-01', value: '299.170' },
        { date: '2024-01-01', value: '308.417' },
        { date: '2025-01-01', value: '318.500' },
        { date: '2026-01-01', value: '325.200' },
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
    default:
      return [];
  }
}
