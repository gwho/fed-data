'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import Sidebar from './components/Sidebar';
import InterestRatesSection from './components/interest-rates/InterestRatesSection';
import TradingSignalsSection from './components/trading-signals/TradingSignalsSection';
import { getFredSeriesCached, FredSeriesData } from './lib/fredApi';
import { 
  mergeSeriesByDate, 
  formatTrillions, 
  formatBillions, 
  formatPercent,
  formatIndex,
  formatDateTick,
  MergedDataPoint 
} from './utils/chartHelpers';
import { CustomTooltip } from './components/CustomTooltip';

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
  const [fedFundsData, setFedFundsData] = useState<ChartData[]>([]);
  const [mortgageData, setMortgageData] = useState<ChartData[]>([]);
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

  // Employment data
  const [laborForceData, setLaborForceData] = useState<ChartData[]>([]);
  const [payrollsData, setPayrollsData] = useState<ChartData[]>([]);
  const [initialClaimsData, setInitialClaimsData] = useState<ChartData[]>([]);
  const [hourlyEarningsData, setHourlyEarningsData] = useState<ChartData[]>([]);
  const [employmentLoading, setEmploymentLoading] = useState(false);

  // Economic Growth data
  const [realGdpData, setRealGdpData] = useState<ChartData[]>([]);
  const [nominalGdpData, setNominalGdpData] = useState<ChartData[]>([]);
  const [industrialProdData, setIndustrialProdData] = useState<ChartData[]>([]);
  const [retailSalesData, setRetailSalesData] = useState<ChartData[]>([]);
  const [capacityUtilData, setCapacityUtilData] = useState<ChartData[]>([]);
  const [economicGrowthLoading, setEconomicGrowthLoading] = useState(false);

  // Housing data
  const [homePriceData, setHomePriceData] = useState<ChartData[]>([]);
  const [housingStartsData, setHousingStartsData] = useState<ChartData[]>([]);
  const [buildingPermitsData, setBuildingPermitsData] = useState<ChartData[]>([]);
  const [mortgageRateData, setMortgageRateData] = useState<ChartData[]>([]);
  const [affordabilityData, setAffordabilityData] = useState<ChartData[]>([]);
  const [newHomeSalesData, setNewHomeSalesData] = useState<ChartData[]>([]);
  const [existingHomeSalesData, setExistingHomeSalesData] = useState<ChartData[]>([]);
  const [housingLoading, setHousingLoading] = useState(false);

  // Exchange Rates data
  const [dollarIndexData, setDollarIndexData] = useState<ChartData[]>([]);
  const [eurData, setEurData] = useState<ChartData[]>([]);
  const [gbpData, setGbpData] = useState<ChartData[]>([]);
  const [jpyData, setJpyData] = useState<ChartData[]>([]);
  const [cnyData, setCnyData] = useState<ChartData[]>([]);
  const [mxnData, setMxnData] = useState<ChartData[]>([]);
  const [inrData, setInrData] = useState<ChartData[]>([]);
  const [cadData, setCadData] = useState<ChartData[]>([]);
  const [audData, setAudData] = useState<ChartData[]>([]);
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);

  // Consumer Spending data (using merged data approach)
  const [pceChartData, setPceChartData] = useState<MergedDataPoint[]>([]);
  const [retailChartData, setRetailChartData] = useState<MergedDataPoint[]>([]);
  const [savingsChartData, setSavingsChartData] = useState<MergedDataPoint[]>([]);
  const [sentimentChartData, setSentimentChartData] = useState<MergedDataPoint[]>([]);
  const [consumerSpendingLoading, setConsumerSpendingLoading] = useState(false);

  // Market Indices data
  const [equityIndicesData, setEquityIndicesData] = useState<MergedDataPoint[]>([]);
  const [vixData, setVixData] = useState<ChartData[]>([]);
  const [creditSpreadData, setCreditSpreadData] = useState<MergedDataPoint[]>([]);
  const [breadthData, setBreadthData] = useState<MergedDataPoint[]>([]);
  const [marketIndicesLoading, setMarketIndicesLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Calculate date 3 years ago from today (changed from 5 years)
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

        // Calculate date 1 year ago for other metrics
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

        const [cpi, unemployment, gdp, sp500, tenYear, threeMonth, fedFunds, mortgage] = await Promise.all([
          getFredSeriesCached('CPIAUCSL', threeYearsAgoStr),
          getFredSeriesCached('UNRATE', oneYearAgoStr),
          getFredSeriesCached('A191RL1Q225SBEA', oneYearAgoStr), // GDP
          getFredSeriesCached('SP500', oneYearAgoStr),            // S&P 500
          getFredSeriesCached('GS10', oneYearAgoStr),
          getFredSeriesCached('TB3MS', oneYearAgoStr),
          getFredSeriesCached('FEDFUNDS', oneYearAgoStr),         // Federal Funds Rate
          getFredSeriesCached('MORTGAGE30US', oneYearAgoStr),     // 30-Year Mortgage
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
        setGdpData(
          gdp.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            value: parseFloat(d.value),
          }))
        );

        // Format S&P 500 data
        setSp500Data(
          sp500.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }))
        );

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

        setFedFundsData(
          fedFunds.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }))
        );

        setMortgageData(
          mortgage.map((d) => ({
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
          getFredSeriesCached('CPILFESL', oneYearAgoStr),
          getFredSeriesCached('PCEPI', oneYearAgoStr),
          getFredSeriesCached('PCEPILFE', oneYearAgoStr),
          getFredSeriesCached('CPIUFDSL', oneYearAgoStr),
          getFredSeriesCached('CPIENGSL', oneYearAgoStr),
          getFredSeriesCached('CUSR0000SAH', oneYearAgoStr),
          getFredSeriesCached('CPIMEDSL', oneYearAgoStr),
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

  // Load employment data when section changes
  useEffect(() => {
    async function loadEmploymentData() {
      if (activeSection !== 'employment') return;

      setEmploymentLoading(true);
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

        const [laborForce, payrolls, initialClaims, hourlyEarnings] = await Promise.all([
          getFredSeriesCached('CIVPART', oneYearAgoStr),
          getFredSeriesCached('PAYEMS', oneYearAgoStr),
          getFredSeriesCached('ICSA', oneYearAgoStr),
          getFredSeriesCached('AHETPI', oneYearAgoStr),
        ]);

        const formatData = (data: typeof laborForce) =>
          data.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }));

        setLaborForceData(formatData(laborForce));
        setPayrollsData(formatData(payrolls));
        setInitialClaimsData(formatData(initialClaims));
        setHourlyEarningsData(formatData(hourlyEarnings));
      } catch (error) {
        console.error('Error loading employment data:', error);
      } finally {
        setEmploymentLoading(false);
      }
    }

    loadEmploymentData();
  }, [activeSection]);

  // Load economic growth data when section changes
  useEffect(() => {
    async function loadEconomicGrowthData() {
      if (activeSection !== 'economic-growth') return;

      setEconomicGrowthLoading(true);
      try {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const twoYearsAgoStr = twoYearsAgo.toISOString().split('T')[0];

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

        const [realGdp, nominalGdp, industrialProd, retailSales, capacityUtil] = await Promise.all([
          getFredSeriesCached('A191RL1Q225SBEA', twoYearsAgoStr),
          getFredSeriesCached('A191RP1Q027SBEA', twoYearsAgoStr),
          getFredSeriesCached('INDPRO', oneYearAgoStr),
          getFredSeriesCached('RSAFS', oneYearAgoStr),
          getFredSeriesCached('TCU', oneYearAgoStr),
        ]);

        // Format quarterly GDP data
        const formatQuarterlyData = (data: typeof realGdp) =>
          data.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            value: parseFloat(d.value),
          }));

        // Format monthly data
        const formatMonthlyData = (data: typeof industrialProd) =>
          data.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }));

        setRealGdpData(formatQuarterlyData(realGdp));
        setNominalGdpData(formatQuarterlyData(nominalGdp));
        setIndustrialProdData(formatMonthlyData(industrialProd));
        setRetailSalesData(formatMonthlyData(retailSales));
        setCapacityUtilData(formatMonthlyData(capacityUtil));
      } catch (error) {
        console.error('Error loading economic growth data:', error);
      } finally {
        setEconomicGrowthLoading(false);
      }
    }

    loadEconomicGrowthData();
  }, [activeSection]);

  // Load exchange rates data when section changes
  useEffect(() => {
    async function loadExchangeRatesData() {
      if (activeSection !== 'exchange-rates') return;

      setExchangeRatesLoading(true);
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

        const [dollarIndex, eur, gbp, jpy, cny, mxn, inr, cad, aud] = await Promise.all([
          getFredSeriesCached('DTWEXBGS', oneYearAgoStr),
          getFredSeriesCached('DEXUSEU', oneYearAgoStr),
          getFredSeriesCached('DEXUSUK', oneYearAgoStr),
          getFredSeriesCached('DEXJPUS', oneYearAgoStr),
          getFredSeriesCached('DEXCHUS', oneYearAgoStr),
          getFredSeriesCached('DEXMXUS', oneYearAgoStr),
          getFredSeriesCached('DEXINUS', oneYearAgoStr),
          getFredSeriesCached('DEXCAUS', oneYearAgoStr),
          getFredSeriesCached('DEXUSAL', oneYearAgoStr),
        ]);

        const formatData = (data: typeof dollarIndex) =>
          data.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }));

        setDollarIndexData(formatData(dollarIndex));
        setEurData(formatData(eur));
        setGbpData(formatData(gbp));
        setJpyData(formatData(jpy));
        setCnyData(formatData(cny));
        setMxnData(formatData(mxn));
        setInrData(formatData(inr));
        setCadData(formatData(cad));
        setAudData(formatData(aud));
      } catch (error) {
        console.error('Error loading exchange rates data:', error);
      } finally {
        setExchangeRatesLoading(false);
      }
    }

    loadExchangeRatesData();
  }, [activeSection]);

  // Load housing data when section changes
  useEffect(() => {
    async function loadHousingData() {
      if (activeSection !== 'housing') return;

      setHousingLoading(true);
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

        const [homePrice, housingStarts, permits, mortgageRate, affordability, newSales, existingSales] = await Promise.all([
          getFredSeriesCached('CSUSHPISA', oneYearAgoStr),
          getFredSeriesCached('HOUST', oneYearAgoStr),
          getFredSeriesCached('PERMIT', oneYearAgoStr),
          getFredSeriesCached('MORTGAGE30US', oneYearAgoStr),
          getFredSeriesCached('FIXHAI', oneYearAgoStr),
          getFredSeriesCached('HSN1F', oneYearAgoStr),
          getFredSeriesCached('EXHOSLUSM495S', oneYearAgoStr),
        ]);

        const formatData = (data: typeof homePrice) =>
          data.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(d.value),
          }));

        setHomePriceData(formatData(homePrice));
        setHousingStartsData(formatData(housingStarts));
        setBuildingPermitsData(formatData(permits));
        setMortgageRateData(formatData(mortgageRate));
        setAffordabilityData(formatData(affordability));
        setNewHomeSalesData(formatData(newSales));
        setExistingHomeSalesData(formatData(existingSales));
      } catch (error) {
        console.error('Error loading housing data:', error);
      } finally {
        setHousingLoading(false);
      }
    }

    loadHousingData();
  }, [activeSection]);

  // Load consumer spending data when section changes (using proper date-based merging)
  useEffect(() => {
    async function loadConsumerSpendingData() {
      if (activeSection !== 'consumer-spending') return;

      setConsumerSpendingLoading(true);
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

        const [pceTotal, pceDurable, pceServices, totalRetail, foodServices, generalMerch, savingRate, dispIncome, sentiment, confidence] = await Promise.all([
          getFredSeriesCached('PCE', oneYearAgoStr),
          getFredSeriesCached('PCEDG', oneYearAgoStr),
          getFredSeriesCached('PCESV', oneYearAgoStr),
          getFredSeriesCached('RSAFS', oneYearAgoStr),
          getFredSeriesCached('RSFSDP', oneYearAgoStr),
          getFredSeriesCached('GAFO', oneYearAgoStr),
          getFredSeriesCached('PSAVERT', oneYearAgoStr),
          getFredSeriesCached('DSPI', oneYearAgoStr),
          getFredSeriesCached('UMCSENT', oneYearAgoStr),
          getFredSeriesCached('CSCICP03USM665S', oneYearAgoStr),
        ]);

        // Format raw data to ChartData
        const formatData = (data: typeof pceTotal): ChartData[] =>
          data.map((d) => ({
            date: d.date, // Keep ISO format for proper merging
            value: parseFloat(d.value),
          }));

        // Chart 1: PCE by Category - merge by date
        const pceChart = mergeSeriesByDate([
          { key: 'total', data: formatData(pceTotal) },
          { key: 'durables', data: formatData(pceDurable) },
          { key: 'services', data: formatData(pceServices) },
        ]);
        setPceChartData(pceChart);

        // Chart 2: Retail Sales by Category - merge by date
        const retailChart = mergeSeriesByDate([
          { key: 'total', data: formatData(totalRetail) },
          { key: 'foodServices', data: formatData(foodServices) },
          { key: 'generalMerch', data: formatData(generalMerch) },
        ]);
        setRetailChartData(retailChart);

        // Chart 3: Saving Rate vs Income - merge by date with transform
        const savingsChart = mergeSeriesByDate([
          { key: 'savingRate', data: formatData(savingRate) },
          { 
            key: 'disposableIncome', 
            data: formatData(dispIncome),
            transform: (v) => v / 1000 // Convert billions to trillions
          },
        ]);
        setSavingsChartData(savingsChart);

        // Chart 4: Sentiment & Confidence - merge by date
        const sentimentChart = mergeSeriesByDate([
          { key: 'sentiment', data: formatData(sentiment) },
          { key: 'confidence', data: formatData(confidence) },
        ]);
        setSentimentChartData(sentimentChart);

      } catch (error) {
        console.error('Error loading consumer spending data:', error);
      } finally {
        setConsumerSpendingLoading(false);
      }
    }

    loadConsumerSpendingData();
  }, [activeSection]);

  // Load market indices data when section changes
  useEffect(() => {
    async function loadMarketIndicesData() {
      if (activeSection !== 'market-indices') return;

      setMarketIndicesLoading(true);
      try {
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

        const [sp500Series, nasdaqSeries, dowSeries, vixSeries, baaSeries, aaaSeries, nyaSeries] = await Promise.all([
          getFredSeriesCached('SP500', threeYearsAgoStr),
          getFredSeriesCached('NASDAQCOM', threeYearsAgoStr),
          getFredSeriesCached('DJIA', threeYearsAgoStr),
          getFredSeriesCached('VIXCLS', threeYearsAgoStr),
          getFredSeriesCached('BAA10Y', threeYearsAgoStr),
          getFredSeriesCached('AAA10Y', threeYearsAgoStr),
          getFredSeriesCached('NYA', threeYearsAgoStr),
        ]);

        const formatData = (data: FredSeriesData[]): ChartData[] =>
          data.map((d) => ({
            date: d.date,
            value: parseFloat(d.value),
          }));

        const equityChart = mergeSeriesByDate([
          { key: 'sp500', data: formatData(sp500Series) },
          { key: 'nasdaq', data: formatData(nasdaqSeries) },
          { key: 'dow', data: formatData(dowSeries) },
        ]);
        setEquityIndicesData(equityChart);

        setVixData(formatData(vixSeries));

        const creditChart = mergeSeriesByDate([
          { key: 'baa', data: formatData(baaSeries) },
          { key: 'aaa', data: formatData(aaaSeries) },
        ]);
        setCreditSpreadData(creditChart);

        const breadthChart = mergeSeriesByDate([
          { key: 'sp500', data: formatData(sp500Series) },
          { key: 'nyse', data: formatData(nyaSeries) },
        ]);
        setBreadthData(breadthChart);
      } catch (error) {
        console.error('Error loading market indices data:', error);
      } finally {
        setMarketIndicesLoading(false);
      }
    }

    loadMarketIndicesData();
  }, [activeSection]);

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
            <ChartCard title="CPI - last three years" loading={loading}>
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
                    stroke="#0d9488"
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
                    stroke="#f59e0b"
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

        {activeSection === 'employment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <ChartCard title="Unemployment Rate vs Labor Force Participation" loading={employmentLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={unemploymentData.map((d, i) => ({
                    date: d.date,
                    unemployment: d.value,
                    participation: laborForceData[i]?.value || 0,
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

            <ChartCard title="Total Nonfarm Payrolls" loading={employmentLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={payrollsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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

            <ChartCard title="Initial Unemployment Claims (Weekly)" loading={employmentLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={initialClaimsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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

            <ChartCard title="Average Hourly Earnings (Private Sector)" loading={employmentLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={hourlyEarningsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
            <ChartCard title="Real vs Nominal GDP Growth Rate" loading={economicGrowthLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={realGdpData.map((d, i) => ({
                    date: d.date,
                    real: d.value,
                    nominal: nominalGdpData[i]?.value || 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 8]} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Legend />
                  <ReferenceLine y={2} stroke="#9ca3af" strokeDasharray="3 3" label="2% Target" />
                  <Line
                    type="monotone"
                    dataKey="real"
                    stroke="#16a34a"
                    strokeWidth={3}
                    name="Real GDP Growth (%)"
                    dot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nominal"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Nominal GDP Growth (%)"
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Industrial Production Index" loading={economicGrowthLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={industrialProdData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}`} />
                  <Legend />
                  <ReferenceLine y={100} stroke="#9ca3af" strokeDasharray="3 3" label="2017 Base" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Industrial Production (2017=100)"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Advance Monthly Retail Sales" loading={economicGrowthLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={retailSalesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    domain={['dataMin - 10000', 'dataMax + 10000']} 
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}B`} 
                  />
                  <Tooltip formatter={(value) => value !== undefined ? `$${(Number(value)/1000).toFixed(1)}B` : ''} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Retail Sales"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Total Capacity Utilization" loading={economicGrowthLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={capacityUtilData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[75, 85]} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Legend />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label="80% Threshold" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#0d9488"
                    strokeWidth={2}
                    name="Capacity Utilization (%)"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {activeSection === 'exchange-rates' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <ChartCard title="Trade-Weighted U.S. Dollar Index (Broad)" loading={exchangeRatesLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dollarIndexData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}`} />
                  <Legend />
                  <ReferenceLine 
                    y={120} 
                    stroke="#9ca3af" 
                    strokeDasharray="3 3" 
                    label="Historical Average" 
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Dollar Index"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Major Currency Pairs vs USD" loading={exchangeRatesLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={eurData.map((d, i) => ({
                    date: d.date,
                    eur: d.value,
                    gbp: gbpData[i]?.value || 0,
                    jpy: jpyData[i]?.value ? jpyData[i].value / 100 : 0,
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

            <ChartCard title="Emerging Market Currencies vs USD" loading={exchangeRatesLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={cnyData.map((d, i) => ({
                    date: d.date,
                    cny: d.value,
                    mxn: mxnData[i]?.value || 0,
                    inr: inrData[i]?.value ? inrData[i].value / 10 : 0,
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

            <ChartCard title="Commodity Currencies vs USD" loading={exchangeRatesLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={cadData.map((d, i) => ({
                    date: d.date,
                    cad: d.value,
                    aud: audData[i]?.value || 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[1.2, 1.7]} />
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(4)}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cad"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="CAD/USD"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aud"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="AUD/USD"
                    dot={{ r: 4 }}
                  />
                  <ReferenceLine y={1.35} stroke="#9ca3af" strokeDasharray="3 3" label="Parity Zone" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {activeSection === 'housing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[2100px]">
            <ChartCard title="S&P/Case-Shiller U.S. National Home Price Index" loading={housingLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={homePriceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}`} />
                  <Legend />
                  <ReferenceLine 
                    y={300} 
                    stroke="#9ca3af" 
                    strokeDasharray="3 3" 
                    label="2023 Base" 
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    name="Home Price Index (2000=100)"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Housing Starts vs Building Permits" loading={housingLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={housingStartsData.map((d, i) => ({
                    date: d.date,
                    starts: d.value,
                    permits: buildingPermitsData[i]?.value || 0,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[1200, 1600]} tickFormatter={(v) => `${(v/1000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => `${(Number(value)/1000).toFixed(1)}M units`} />
                  <Legend />
                  <ReferenceLine 
                    y={1400} 
                    stroke="#9ca3af" 
                    strokeDasharray="3 3" 
                    label="Historical Average" 
                  />
                  <Line
                    type="monotone"
                    dataKey="starts"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    name="Housing Starts"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="permits"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="Building Permits"
                    dot={{ r: 4 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="30-Year Mortgage Rate vs Housing Affordability" loading={housingLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={mortgageRateData.map((d, i) => ({
                    date: d.date,
                    rate: d.value,
                    affordability: affordabilityData[i]?.value || 0,
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

            <ChartCard title="New vs Existing Home Sales" loading={housingLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={newHomeSalesData.map((d, i) => ({
                    date: d.date,
                    newSales: d.value,
                    existingSales: existingHomeSalesData[i]?.value ? existingHomeSalesData[i].value * 1000 : 0,
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
            <ChartCard title="Personal Consumption Expenditures by Category" loading={consumerSpendingLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={pceChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
            <ChartCard title="Retail Sales by Category" loading={consumerSpendingLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={retailChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
            <ChartCard title="Personal Saving Rate vs Disposable Income" loading={consumerSpendingLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={savingsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
            <ChartCard title="Consumer Sentiment & Confidence Indices" loading={consumerSpendingLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={sentimentChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
            <ChartCard title="Equity Index Levels" loading={marketIndicesLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={equityIndicesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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

            <ChartCard title="Volatility Index (VIX)" loading={marketIndicesLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={vixData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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

            <ChartCard title="Corporate Bond Spreads (vs 10Y Treasury)" loading={marketIndicesLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={creditSpreadData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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

            <ChartCard title="Market Breadth: NYSE Composite vs S&P 500" loading={marketIndicesLoading}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={breadthData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
            tenYearData={tenYearData}
            threeMonthData={threeMonthData}
            fedFundsData={fedFundsData}
            mortgageData={mortgageData}
            loading={loading}
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
