'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import Sidebar from './components/Sidebar';
import InterestRatesSection from './components/interest-rates/InterestRatesSection';
import TradingSignalsSection from './components/trading-signals/TradingSignalsSection';
import {
  formatTrillions,
  formatBillions,
  formatPercent,
  formatIndex,
  formatDateTick,
} from './utils/chartHelpers';
import { CustomTooltip } from './components/CustomTooltip';
import {
  useInflationData,
  useEmploymentData,
  useEconomicGrowthData,
  useHousingData,
  useExchangeRatesData,
  useConsumerSpendingData,
  useMarketIndicesData,
  useKeyIndicatorsData,
} from './hooks';
import ChartCard from './components/ChartCard';
import { LineChartCard } from './components/charts';
import { CHART_COLORS } from './constants/chartConfig';

export default function Home() {
  const [activeSection, setActiveSection] = useState('key-indicators');
  const keyIndicators = useKeyIndicatorsData();
  const inflation = useInflationData(activeSection === 'inflation');
  const employment = useEmploymentData(activeSection === 'employment');
  const economicGrowth = useEconomicGrowthData(activeSection === 'economic-growth');
  const housing = useHousingData(activeSection === 'housing');
  const exchangeRates = useExchangeRatesData(activeSection === 'exchange-rates');
  const consumerSpending = useConsumerSpendingData(activeSection === 'consumer-spending');
  const marketIndices = useMarketIndicesData(activeSection === 'market-indices');

  return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <main className="ml-[305px] flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Federal Reserve Analytics Hub</h1>
          <p className="text-gray-600">
            Real-time economic data from the Federal Reserve Economic Data (FRED) system
          </p>
        </div>

        {activeSection === 'key-indicators' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <LineChartCard
              title="CPI - last three years"
              data={keyIndicators.data.cpi}
              series={[{ dataKey: 'value', name: 'CPI Index', color: CHART_COLORS.TEAL }]}
              domain={['dataMin - 10', 'dataMax + 10']}
              loading={keyIndicators.loading}
              error={keyIndicators.error}
            />
            <LineChartCard
              title="Infra-Annual Labor Statistics: Unemployment Rate Total"
              data={keyIndicators.data.unemployment}
              series={[{ dataKey: 'value', name: 'Unemployment Rate (%)', color: CHART_COLORS.AMBER }]}
              domain={[3, 5]}
              loading={keyIndicators.loading}
              error={keyIndicators.error}
            />
            <LineChartCard
              title="Real GDP Growth Rate (Year-over-Year)"
              data={keyIndicators.data.gdp}
              series={[{ dataKey: 'value', name: 'GDP Growth (%)', color: CHART_COLORS.GREEN, strokeWidth: 3, dotRadius: 5 }]}
              domain={[0, 5]}
              referenceLines={[{ y: 2, label: '2% Trend', dashed: true }]}
              loading={keyIndicators.loading}
              error={keyIndicators.error}
            />
            <LineChartCard
              title="S&P 500 Stock Market Index"
              data={keyIndicators.data.sp500}
              series={[{ dataKey: 'value', name: 'S&P 500', color: CHART_COLORS.BLUE }]}
              domain={['dataMin - 200', 'dataMax + 200']}
              loading={keyIndicators.loading}
              error={keyIndicators.error}
            />
          </div>
        )}

        {activeSection === 'inflation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <LineChartCard
              title="Headline vs Core CPI"
              data={inflation.data.coreCpi.map((d, i) => ({
                date: d.date,
                core: d.value,
                headline: keyIndicators.data.unemployment[i]?.value ? parseFloat(d.value.toString()) + 5 : d.value,
              }))}
              series={[
                { dataKey: 'headline', name: 'Headline CPI', color: '#2563eb' },
                { dataKey: 'core', name: 'Core CPI', color: CHART_COLORS.RED },
              ]}
              loading={inflation.loading}
              error={inflation.error}
            />
            <LineChartCard
              title="PCE Inflation Measures"
              data={inflation.data.pce.map((d, i) => ({
                date: d.date,
                pce: d.value,
                corePce: inflation.data.corePce[i]?.value || 0,
              }))}
              series={[
                { dataKey: 'pce', name: 'PCE', color: CHART_COLORS.GREEN },
                { dataKey: 'corePce', name: 'Core PCE', color: CHART_COLORS.VIOLET },
              ]}
              loading={inflation.loading}
              error={inflation.error}
            />
            <LineChartCard
              title="CPI by Category: Food & Energy"
              data={inflation.data.foodCpi.map((d, i) => ({
                date: d.date,
                food: d.value,
                energy: inflation.data.energyCpi[i]?.value || 0,
              }))}
              series={[
                { dataKey: 'food', name: 'Food CPI', color: CHART_COLORS.GREEN },
                { dataKey: 'energy', name: 'Energy CPI', color: CHART_COLORS.AMBER },
              ]}
              loading={inflation.loading}
              error={inflation.error}
            />
            <LineChartCard
              title="CPI by Category: Housing & Medical"
              data={inflation.data.housingCpi.map((d, i) => ({
                date: d.date,
                housing: d.value,
                medical: inflation.data.medicalCpi[i]?.value || 0,
              }))}
              series={[
                { dataKey: 'housing', name: 'Housing CPI', color: CHART_COLORS.BLUE },
                { dataKey: 'medical', name: 'Medical Care CPI', color: CHART_COLORS.PINK },
              ]}
              loading={inflation.loading}
              error={inflation.error}
            />
          </div>
        )}

        {activeSection === 'employment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <ChartCard title="Unemployment Rate vs Labor Force Participation" loading={employment.loading} error={employment.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={keyIndicators.data.unemployment.map((d, i) => ({
                    date: d.date,
                    unemployment: d.value,
                    participation: employment.data.laborForce[i]?.value || 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" domain={[3, 5]} />
                  <YAxis yAxisId="right" orientation="right" domain={[60, 65]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="unemployment"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Unemployment Rate (%)"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="participation"
                    stroke="#0d9488"
                    strokeWidth={2}
                    name="Labor Force Participation (%)"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Total Nonfarm Payrolls" loading={employment.loading} error={employment.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={employment.data.payrolls} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 500', 'dataMax + 500']} tickFormatter={(v) => `${(v/1000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => value !== undefined ? `${(Number(value)/1000).toFixed(2)}M` : ''} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Total Payrolls"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Initial Unemployment Claims (Weekly)" loading={employment.loading} error={employment.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={employment.data.initialClaims} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 10000', 'dataMax + 10000']} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => value !== undefined ? `${(Number(value)/1000).toFixed(0)}K` : ''} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Initial Claims"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Average Hourly Earnings (Private Sector)" loading={employment.loading} error={employment.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={employment.data.hourlyEarnings} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                  <Tooltip formatter={(value) => value !== undefined ? `$${Number(value).toFixed(2)}` : ''} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Hourly Earnings"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {activeSection === 'economic-growth' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <LineChartCard
              title="Real vs Nominal GDP Growth Rate"
              data={economicGrowth.data.realGdp.map((d, i) => ({
                date: d.date,
                real: d.value,
                nominal: economicGrowth.data.nominalGdp[i]?.value || 0,
              }))}
              series={[
                { dataKey: 'real', name: 'Real GDP Growth (%)', color: CHART_COLORS.GREEN, strokeWidth: 3, dotRadius: 5 },
                { dataKey: 'nominal', name: 'Nominal GDP Growth (%)', color: CHART_COLORS.BLUE, strokeDasharray: '5 5' },
              ]}
              domain={[0, 8]}
              referenceLines={[{ y: 2, label: '2% Target', dashed: true }]}
              loading={economicGrowth.loading}
              error={economicGrowth.error}
            />
            <LineChartCard
              title="Industrial Production Index"
              data={economicGrowth.data.industrialProd}
              series={[{ dataKey: 'value', name: 'Industrial Production (2017=100)', color: CHART_COLORS.PURPLE }]}
              domain={['dataMin - 1', 'dataMax + 1']}
              referenceLines={[{ y: 100, label: '2017 Base', dashed: true }]}
              loading={economicGrowth.loading}
              error={economicGrowth.error}
            />
            <LineChartCard
              title="Advance Monthly Retail Sales"
              data={economicGrowth.data.retailSales}
              series={[{ dataKey: 'value', name: 'Retail Sales', color: CHART_COLORS.AMBER }]}
              domain={['dataMin - 10000', 'dataMax + 10000']}
              yTickFormatter={(v) => `$${(v/1000).toFixed(0)}B`}
              loading={economicGrowth.loading}
              error={economicGrowth.error}
            />
            <LineChartCard
              title="Total Capacity Utilization"
              data={economicGrowth.data.capacityUtil}
              series={[{ dataKey: 'value', name: 'Capacity Utilization (%)', color: CHART_COLORS.TEAL }]}
              domain={[75, 85]}
              referenceLines={[{ y: 80, label: '80% Threshold', dashed: true, color: CHART_COLORS.SCARLET }]}
              loading={economicGrowth.loading}
              error={economicGrowth.error}
            />
          </div>
        )}

        {activeSection === 'exchange-rates' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <LineChartCard
              title="Trade-Weighted U.S. Dollar Index (Broad)"
              data={exchangeRates.data.dollarIndex}
              series={[{ dataKey: 'value', name: 'Dollar Index', color: CHART_COLORS.BLUE, strokeWidth: 3 }]}
              domain={['dataMin - 2', 'dataMax + 2']}
              referenceLines={[{ y: 120, label: 'Historical Average', dashed: true }]}
              loading={exchangeRates.loading}
              error={exchangeRates.error}
            />

            <ChartCard title="Major Currency Pairs vs USD" loading={exchangeRates.loading} error={exchangeRates.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={exchangeRates.data.eur.map((d, i) => ({
                    date: d.date,
                    eur: d.value,
                    gbp: exchangeRates.data.gbp[i]?.value || 0,
                    jpy: exchangeRates.data.jpy[i]?.value ? exchangeRates.data.jpy[i].value / 100 : 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" domain={[0.7, 1.0]} />
                  <YAxis yAxisId="right" orientation="right" domain={[1.3, 1.7]} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'JPY/USD (÷100)') {
                        return `¥${(Number(value) * 100).toFixed(2)}`;
                      }
                      return `$${Number(value).toFixed(4)}`;
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="eur"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    name="EUR/USD"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="gbp"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="GBP/USD"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="jpy"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="JPY/USD (÷100)"
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Emerging Market Currencies vs USD" loading={exchangeRates.loading} error={exchangeRates.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={exchangeRates.data.cny.map((d, i) => ({
                    date: d.date,
                    cny: d.value,
                    mxn: exchangeRates.data.mxn[i]?.value || 0,
                    inr: exchangeRates.data.inr[i]?.value ? exchangeRates.data.inr[i].value / 10 : 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" domain={[6, 22]} label={{ value: 'CNY, MXN', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[7, 10]} label={{ value: 'INR (÷10)', angle: 90, position: 'insideRight' }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'CNY/USD') return `¥${Number(value).toFixed(2)}`;
                      if (name === 'MXN/USD') return `$${Number(value).toFixed(2)}`;
                      if (name === 'INR/USD (÷10)') return `₹${(Number(value) * 10).toFixed(2)}`;
                      return Number(value).toFixed(2);
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cny"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="CNY/USD"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="mxn"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="MXN/USD"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="inr"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="INR/USD (÷10)"
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <LineChartCard
              title="Commodity Currencies vs USD"
              data={exchangeRates.data.cad.map((d, i) => ({
                date: d.date,
                cad: d.value,
                aud: exchangeRates.data.aud[i]?.value || 0,
              }))}
              series={[
                { dataKey: 'cad', name: 'CAD/USD', color: CHART_COLORS.RED },
                { dataKey: 'aud', name: 'AUD/USD', color: CHART_COLORS.GREEN },
              ]}
              domain={[1.2, 1.7]}
              referenceLines={[{ y: 1.35, label: 'Parity Zone', dashed: true }]}
              loading={exchangeRates.loading}
              error={exchangeRates.error}
            />
          </div>
        )}

        {activeSection === 'housing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <LineChartCard
              title="S&P/Case-Shiller U.S. National Home Price Index"
              data={housing.data.homePrice}
              series={[{ dataKey: 'value', name: 'Home Price Index (2000=100)', color: CHART_COLORS.PURPLE, strokeWidth: 3 }]}
              domain={['dataMin - 5', 'dataMax + 5']}
              referenceLines={[{ y: 300, label: '2023 Base', dashed: true }]}
              loading={housing.loading}
              error={housing.error}
            />
            <LineChartCard
              title="Housing Starts vs Building Permits"
              data={housing.data.housingStarts.map((d, i) => ({
                date: d.date,
                starts: d.value,
                permits: housing.data.buildingPermits[i]?.value || 0,
              }))}
              series={[
                { dataKey: 'starts', name: 'Housing Starts', color: CHART_COLORS.CYAN },
                { dataKey: 'permits', name: 'Building Permits', color: CHART_COLORS.ORANGE, strokeDasharray: '5 5' },
              ]}
              domain={[1200, 1600]}
              yTickFormatter={(v) => `${(v/1000).toFixed(1)}M`}
              referenceLines={[{ y: 1400, label: 'Historical Average', dashed: true }]}
              loading={housing.loading}
              error={housing.error}
            />

            <ChartCard title="30-Year Mortgage Rate vs Housing Affordability" loading={housing.loading} error={housing.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={housing.data.mortgageRate.map((d, i) => ({
                    date: d.date,
                    rate: d.value,
                    affordability: housing.data.affordability[i]?.value || 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    yAxisId="left" 
                    domain={[5.5, 7.5]} 
                    label={{ value: 'Mortgage Rate (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[95, 110]} 
                    label={{ value: 'Affordability Index', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === '30-Year Rate') return `${Number(value).toFixed(2)}%`;
                      if (name === 'Affordability Index') return `${Number(value).toFixed(1)}`;
                      return Number(value).toFixed(2);
                    }}
                  />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={7} stroke="#ef4444" strokeDasharray="3 3" label="7% Rate" />
                  <ReferenceLine yAxisId="right" y={100} stroke="#10b981" strokeDasharray="3 3" label="100 = Affordable" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="rate"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="30-Year Rate"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="affordability"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Affordability Index"
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="New vs Existing Home Sales" loading={housing.loading} error={housing.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={housing.data.newHomeSales.map((d, i) => ({
                    date: d.date,
                    newSales: d.value,
                    existingSales: housing.data.existingHomeSales[i]?.value ? housing.data.existingHomeSales[i].value * 1000 : 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[500, 4500]} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}M` : `${v}K`} />
                  <Tooltip 
                    formatter={(value) => {
                      const num = Number(value);
                      if (num >= 1000) return `${(num/1000).toFixed(2)}M units`;
                      return `${num.toFixed(0)}K units`;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="newSales"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="New Home Sales"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="existingSales"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Existing Home Sales"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {activeSection === 'consumer-spending' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            {/* Chart 1: Personal Consumption Expenditures by Type */}
            <ChartCard title="Personal Consumption Expenditures by Category" loading={consumerSpending.loading} error={consumerSpending.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={consumerSpending.data.pceChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis tickFormatter={(v) => formatTrillions(v)} />
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        formatters={{
                          total: formatTrillions,
                          durables: formatTrillions,
                          services: formatTrillions,
                        }}
                      />
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Total PCE"
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="durables"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Durable Goods"
                    dot={{ r: 3 }}
                    strokeDasharray="5 5"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="services"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Services"
                    dot={{ r: 3 }}
                    strokeDasharray="3 3"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 2: Retail Sales by Category */}
            <ChartCard title="Retail Sales by Category" loading={consumerSpending.loading} error={consumerSpending.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={consumerSpending.data.retailChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis tickFormatter={(v) => formatBillions(v)} />
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        formatters={{
                          total: formatBillions,
                          foodServices: formatBillions,
                          generalMerch: formatBillions,
                        }}
                      />
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    name="Total Retail Sales"
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="foodServices"
                    stroke="#ec4899"
                    strokeWidth={2}
                    name="Food Services & Bars"
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="generalMerch"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    name="General Merchandise"
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 3: Personal Saving Rate vs Disposable Income */}
            <ChartCard title="Personal Saving Rate vs Disposable Income" loading={consumerSpending.loading} error={consumerSpending.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={consumerSpending.data.savingsChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis 
                    yAxisId="left" 
                    domain={[3, 6]} 
                    label={{ value: 'Saving Rate (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[20, 23]} 
                    tickFormatter={(v) => formatTrillions(v)}
                    label={{ value: 'Disposable Income', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        formatters={{
                          savingRate: formatPercent,
                          disposableIncome: formatTrillions,
                        }}
                      />
                    }
                  />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={4.5} stroke="#9ca3af" strokeDasharray="3 3" label="Historical Avg" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="savingRate"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Saving Rate"
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="disposableIncome"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Disposable Income"
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 4: Consumer Sentiment & Confidence Indices */}
            <ChartCard title="Consumer Sentiment & Confidence Indices" loading={consumerSpending.loading} error={consumerSpending.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={consumerSpending.data.sentimentChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis 
                    yAxisId="left" 
                    domain={[60, 120]} 
                    label={{ value: 'Sentiment (1966=100)', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[90, 120]} 
                    label={{ value: 'Confidence (1985=100)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        formatters={{
                          sentiment: formatIndex,
                          confidence: formatIndex,
                        }}
                      />
                    }
                  />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={85} stroke="#9ca3af" strokeDasharray="3 3" label="Sentiment Neutral" />
                  <ReferenceLine yAxisId="right" y={100} stroke="#9ca3af" strokeDasharray="3 3" label="Confidence Neutral" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="sentiment"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="U.Mich. Sentiment"
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="confidence"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Consumer Confidence"
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {activeSection === 'market-indices' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <ChartCard title="Equity Index Levels" loading={marketIndices.loading} error={marketIndices.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={marketIndices.data.equityIndices} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} />
                  <YAxis tickFormatter={(value) => formatIndex(Number(value))} />
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        formatters={{
                          sp500: formatIndex,
                          nasdaq: formatIndex,
                          dow: formatIndex,
                        }}
                      />
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sp500"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="S&P 500"
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="nasdaq"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Nasdaq Composite"
                    dot={{ r: 3 }}
                    strokeDasharray="5 5"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="dow"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Dow Jones Industrial Average"
                    dot={{ r: 3 }}
                    strokeDasharray="3 3"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Volatility Index (VIX)" loading={marketIndices.loading} error={marketIndices.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={marketIndices.data.vix} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} />
                  <YAxis tickFormatter={(value) => formatIndex(Number(value))} />
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        formatters={{
                          value: formatIndex,
                        }}
                      />
                    }
                  />
                  <Legend />
                  <ReferenceLine y={20} stroke="#9ca3af" strokeDasharray="3 3" label="Elevated Volatility" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="VIX"
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Corporate Bond Spreads (vs 10Y Treasury)" loading={marketIndices.loading} error={marketIndices.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={marketIndices.data.creditSpread} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} />
                  <YAxis tickFormatter={(value) => formatPercent(Number(value))} />
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        formatters={{
                          baa: formatPercent,
                          aaa: formatPercent,
                        }}
                      />
                    }
                  />
                  <Legend />
                  <ReferenceLine y={2} stroke="#9ca3af" strokeDasharray="3 3" label="Tight" />
                  <ReferenceLine y={4} stroke="#ef4444" strokeDasharray="3 3" label="Stressed" />
                  <Line
                    type="monotone"
                    dataKey="baa"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Baa Spread"
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="aaa"
                    stroke="#0d9488"
                    strokeWidth={2}
                    name="Aaa Spread"
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Market Breadth: NYSE Composite vs S&P 500" loading={marketIndices.loading} error={marketIndices.error}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={marketIndices.data.breadth} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} />
                  <YAxis tickFormatter={(value) => formatIndex(Number(value))} />
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        formatters={{
                          sp500: formatIndex,
                          nyse: formatIndex,
                        }}
                      />
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sp500"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="S&P 500"
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="nyse"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="NYSE Composite"
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {activeSection === 'interest-rates' && (
          <InterestRatesSection
            tenYearData={keyIndicators.data.tenYear}
            threeMonthData={keyIndicators.data.threeMonth}
            fedFundsData={keyIndicators.data.fedFunds}
            mortgageData={keyIndicators.data.mortgage}
            loading={keyIndicators.loading}
            error={keyIndicators.error}
          />
        )}

        {activeSection === 'trading-signals' && (
          <TradingSignalsSection isActive={activeSection === 'trading-signals'} />
        )}

        {activeSection !== 'key-indicators' && activeSection !== 'inflation' && activeSection !== 'employment' && activeSection !== 'economic-growth' && activeSection !== 'exchange-rates' && activeSection !== 'housing' && activeSection !== 'consumer-spending' && activeSection !== 'market-indices' && activeSection !== 'interest-rates' && activeSection !== 'trading-signals' && (
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
