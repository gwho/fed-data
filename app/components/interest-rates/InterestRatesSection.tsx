'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartCard from '../ChartCard';

interface ChartData {
  date: string;
  value: number;
}

interface InterestRatesSectionProps {
  tenYearData: ChartData[];
  threeMonthData: ChartData[];
  fedFundsData: ChartData[];
  mortgageData: ChartData[];
  loading: boolean;
  error: Error | null;
}

export default function InterestRatesSection({ tenYearData, threeMonthData, fedFundsData, mortgageData, loading, error }: InterestRatesSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
      {/* Chart 1: 10-Year Treasury */}
      <ChartCard title="Interest Rates: Long-Term Government Bond Yields: 10-Year" loading={loading} error={error}>
        {tenYearData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={tenYearData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[3.5, 5]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#16a34a"
                strokeWidth={2}
                name="10-Year Yield (%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500">No data available</div>
        )}
      </ChartCard>

      {/* Chart 2: 3-Month Treasury */}
      <ChartCard title="Interest Rates: 3-Month or 90-Day Rates and Yields" loading={loading} error={error}>
        {threeMonthData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={threeMonthData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[4, 6]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#9333ea"
                strokeWidth={2}
                name="3-Month Rate (%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500">No data available</div>
        )}
      </ChartCard>

      {/* Chart 3: Federal Funds Rate */}
      <ChartCard title="Federal Funds Effective Rate" loading={loading} error={error}>
        {fedFundsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={fedFundsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[4, 5.5]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#dc2626"
                strokeWidth={2}
                name="Fed Funds Rate (%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500">No data available</div>
        )}
      </ChartCard>

      {/* Chart 4: 30-Year Mortgage Rate */}
      <ChartCard title="30-Year Fixed Rate Mortgage Average" loading={loading} error={error}>
        {mortgageData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={mortgageData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[6, 7.5]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ea580c"
                strokeWidth={2}
                name="Mortgage Rate (%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500">No data available</div>
        )}
      </ChartCard>
    </div>
  );
}
