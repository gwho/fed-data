'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  value: number;
}

interface InterestRatesSectionProps {
  tenYearData: ChartData[];
  threeMonthData: ChartData[];
  loading: boolean;
}

function ChartCard({ title, children, loading }: { title: string; children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="bg-[#D9D9D9] p-4 rounded-lg">
      <h2 className="text-2xl font-bold text-black mb-4 font-[family-name:var(--font-geist-sans)]">
        {title}
      </h2>
      <div className="bg-white rounded min-h-[400px] flex items-center justify-center">
        {loading ? (
          <div className="text-gray-500">Loading data...</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function InterestRatesSection({ tenYearData, threeMonthData, loading }: InterestRatesSectionProps) {
  console.log('InterestRatesSection rendering', { tenYearDataLength: tenYearData.length, threeMonthDataLength: threeMonthData.length, loading });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
      {/* Chart 1: 10-Year Treasury */}
      <ChartCard title="Interest Rates: Long-Term Government Bond Yields: 10-Year" loading={loading}>
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
      <ChartCard title="Interest Rates: 3-Month or 90-Day Rates and Yields" loading={loading}>
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

      {/* Placeholder 3: Coming Soon */}
      <ChartCard title="Additional Rate Metrics" loading={false}>
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <svg
            className="h-16 w-16 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm">More interest rate metrics coming soon</p>
        </div>
      </ChartCard>

      {/* Placeholder 4: Coming Soon */}
      <ChartCard title="Yield Curve Analysis" loading={false}>
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <svg
            className="h-16 w-16 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <p className="text-sm">Yield curve visualization coming soon</p>
        </div>
      </ChartCard>
    </div>
  );
}
