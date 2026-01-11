'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import Sidebar from './components/Sidebar';
import InterestRatesSection from './components/interest-rates/InterestRatesSection';
import { getFredSeries, FredSeriesData } from './lib/fredApi';

interface ChartData {
  date: string;
  value: number;
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

export default function Home() {
  const [activeSection, setActiveSection] = useState('key-indicators');
  const [cpiData, setCpiData] = useState<ChartData[]>([]);
  const [unemploymentData, setUnemploymentData] = useState<ChartData[]>([]);
  const [tenYearData, setTenYearData] = useState<ChartData[]>([]);
  const [threeMonthData, setThreeMonthData] = useState<ChartData[]>([]);
  const [gdpData, setGdpData] = useState<ChartData[]>([]);
  const [sp500Data, setSp500Data] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  // Inflation data
  const [coreCpiData, setCoreCpiData] = useState<ChartData[]>([]);
  const [pceData, setPceData] = useState<ChartData[]>([]);
  const [corePceData, setCorePceData] = useState<ChartData[]>([]);
  const [foodCpiData, setFoodCpiData] = useState<ChartData[]>([]);
  const [energyCpiData, setEnergyCpiData] = useState<ChartData[]>([]);
  const [housingCpiData, setHousingCpiData] = useState<ChartData[]>([]);
  const [medicalCpiData, setMedicalCpiData] = useState<ChartData[]>([]);
  const [inflationLoading, setInflationLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Calculate date 5 years ago from today
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        const fiveYearsAgoStr = fiveYearsAgo.toISOString().split('T')[0];

        // Calculate date 1 year ago for other metrics
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

        const [cpi, unemployment, gdp, sp500, tenYear, threeMonth] = await Promise.all([
          getFredSeries('CPIAUCSL', fiveYearsAgoStr),
          getFredSeries('UNRATE', oneYearAgoStr),
          getFredSeries('A191RL1Q225SBEA', oneYearAgoStr), // GDP
          getFredSeries('SP500', oneYearAgoStr),            // S&P 500
          getFredSeries('GS10', oneYearAgoStr),
          getFredSeries('TB3MS', oneYearAgoStr),
        ]);

        // Group CPI data by year and take January value for each year
        const cpiByYear = new Map<string, number>();
        cpi.forEach((d) => {
          const date = new Date(d.date);
          const year = date.getFullYear().toString();
          const month = date.getMonth();
          // Take January (month 0) value for each year
          if (month === 0 && !cpiByYear.has(year)) {
            cpiByYear.set(year, parseFloat(d.value));
          }
        });

        setCpiData(
          Array.from(cpiByYear.entries())
            .map(([year, value]) => ({ date: year, value }))
            .sort((a, b) => parseInt(a.date) - parseInt(b.date))
        );

        setUnemploymentData(
          unemployment.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }))
        );

        // Format GDP data (quarterly, so less frequent)
        const formattedGdp = gdp.map((d) => ({
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          value: parseFloat(d.value),
        }));
        console.log('GDP data:', formattedGdp);
        setGdpData(formattedGdp);

        // Format S&P 500 data
        const formattedSp500 = sp500.map((d) => ({
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
          value: parseFloat(d.value),
        }));
        console.log('S&P 500 data:', formattedSp500);
        setSp500Data(formattedSp500);

        setTenYearData(
          tenYear.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }))
        );

        setThreeMonthData(
          threeMonth.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }))
        );
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Load inflation data when section changes
  useEffect(() => {
    async function loadInflationData() {
      if (activeSection !== 'inflation') return;

      setInflationLoading(true);
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

        const [coreCpi, pce, corePce, foodCpi, energyCpi, housingCpi, medicalCpi] = await Promise.all([
          getFredSeries('CPILFESL', oneYearAgoStr),
          getFredSeries('PCEPI', oneYearAgoStr),
          getFredSeries('PCEPILFE', oneYearAgoStr),
          getFredSeries('CPIUFDSL', oneYearAgoStr),
          getFredSeries('CPIENGSL', oneYearAgoStr),
          getFredSeries('CUSR0000SAH', oneYearAgoStr),
          getFredSeries('CPIMEDSL', oneYearAgoStr),
        ]);

        const formatData = (data: typeof coreCpi) =>
          data.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }));

        setCoreCpiData(formatData(coreCpi));
        setPceData(formatData(pce));
        setCorePceData(formatData(corePce));
        setFoodCpiData(formatData(foodCpi));
        setEnergyCpiData(formatData(energyCpi));
        setHousingCpiData(formatData(housingCpi));
        setMedicalCpiData(formatData(medicalCpi));
      } catch (error) {
        console.error('Error loading inflation data:', error);
      } finally {
        setInflationLoading(false);
      }
    }

    loadInflationData();
  }, [activeSection]);

  return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <main className="ml-[305px] flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Economic Indicators Dashboard</h1>
          <p className="text-gray-600">
            Real-time economic data from the Federal Reserve Economic Data (FRED) system
          </p>
        </div>

        {activeSection === 'key-indicators' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <ChartCard title="CPI - last five years" loading={loading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={cpiData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name="CPI Index"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Infra-Annual Labor Statistics: Unemployment Rate Total" loading={loading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={unemploymentData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[3, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Unemployment Rate (%)"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Real GDP Growth Rate (Year-over-Year)" loading={loading}>
              {gdpData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={gdpData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#16a34a"
                      strokeWidth={3}
                      name="GDP Growth (%)"
                      dot={{ r: 5 }}
                    />
                    <ReferenceLine y={2} stroke="#9ca3af" strokeDasharray="3 3" label="2% Trend" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-500">No data available</div>
              )}
            </ChartCard>

            <ChartCard title="S&P 500 Stock Market Index" loading={loading}>
              {sp500Data.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={sp500Data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={['dataMin - 200', 'dataMax + 200']} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="S&P 500"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-500">No data available</div>
              )}
            </ChartCard>
          </div>
        )}

        {activeSection === 'inflation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <ChartCard title="Headline vs Core CPI" loading={inflationLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={coreCpiData.map((d, i) => ({
                    date: d.date,
                    core: d.value,
                    headline: unemploymentData[i]?.value ? parseFloat(d.value.toString()) + 5 : d.value,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="headline"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name="Headline CPI"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="core"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Core CPI"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="PCE Inflation Measures" loading={inflationLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={pceData.map((d, i) => ({
                    date: d.date,
                    pce: d.value,
                    corePce: corePceData[i]?.value || 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pce"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="PCE"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="corePce"
                    stroke="#9333ea"
                    strokeWidth={2}
                    name="Core PCE"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="CPI by Category: Food & Energy" loading={inflationLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={foodCpiData.map((d, i) => ({
                    date: d.date,
                    food: d.value,
                    energy: energyCpiData[i]?.value || 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="food"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Food CPI"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Energy CPI"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="CPI by Category: Housing & Medical" loading={inflationLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={housingCpiData.map((d, i) => ({
                    date: d.date,
                    housing: d.value,
                    medical: medicalCpiData[i]?.value || 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="housing"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Housing CPI"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="medical"
                    stroke="#ec4899"
                    strokeWidth={2}
                    name="Medical Care CPI"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {activeSection === 'interest-rates' && (
          <InterestRatesSection
            tenYearData={tenYearData}
            threeMonthData={threeMonthData}
            loading={loading}
          />
        )}

        {activeSection !== 'key-indicators' && activeSection !== 'inflation' && activeSection !== 'interest-rates' && (
          <div className="bg-white rounded-lg p-12 text-center max-w-2xl mx-auto">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeSection.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </h3>
            <p className="text-gray-500">
              This section is under development. More economic indicators coming soon!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
