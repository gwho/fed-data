/**
 * Trading Signals Module
 *
 * Calculates trading signals from FRED economic indicators.
 * These signals can be used by external trading systems to make
 * macro-informed investment decisions.
 *
 * Signal Range: -1 (strong bearish) to +1 (strong bullish)
 *
 * @see docs/SIGNALS_API.md for full documentation
 */

import { getFredSeriesCached, FredSeriesData } from './fredApi';

/**
 * Result of a single signal calculation
 */
export interface SignalResult {
  name: string;
  value: number;           // -1 to 1
  interpretation: 'strong_bearish' | 'bearish' | 'neutral' | 'bullish' | 'strong_bullish';
  confidence: number;      // 0 to 1
  explanation: string;     // Human-readable reason
  indicators: Record<string, number | null>;  // Raw data used
  updatedAt: string;       // ISO timestamp
}

/**
 * Complete response from the signals API
 */
export interface SignalsResponse {
  signals: {
    rate: SignalResult;
    volatility: SignalResult;
    credit: SignalResult;
    housing: SignalResult;
    composite: SignalResult;
  };
  meta: {
    calculatedAt: string;
    version: string;
  };
}

/**
 * Helper: Get the latest value from a FRED series
 */
function getLatestValue(data: FredSeriesData[]): number | null {
  if (!data || data.length === 0) return null;
  const latest = data[data.length - 1];
  const value = parseFloat(latest.value);
  return isNaN(value) ? null : value;
}

/**
 * Helper: Get value from N periods ago
 */
function getValueNPeriodsAgo(data: FredSeriesData[], periods: number): number | null {
  if (!data || data.length < periods + 1) return null;
  const index = data.length - 1 - periods;
  if (index < 0) return null;
  const value = parseFloat(data[index].value);
  return isNaN(value) ? null : value;
}

/**
 * Helper: Calculate simple moving average of last N values
 */
function calculateSMA(data: FredSeriesData[], periods: number): number | null {
  if (!data || data.length < periods) return null;
  const slice = data.slice(-periods);
  const sum = slice.reduce((acc, d) => {
    const val = parseFloat(d.value);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  return sum / periods;
}

/**
 * Helper: Convert numeric signal to interpretation string
 */
function getInterpretation(value: number): SignalResult['interpretation'] {
  if (value >= 0.6) return 'strong_bullish';
  if (value >= 0.2) return 'bullish';
  if (value <= -0.6) return 'strong_bearish';
  if (value <= -0.2) return 'bearish';
  return 'neutral';
}

/**
 * Helper: Clamp value between -1 and 1
 */
function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

/**
 * Calculate Interest Rate Signal
 *
 * Based on:
 * 1. Fed Funds Rate trajectory (cuts = bullish, hikes = bearish)
 * 2. Yield curve slope (inverted = bearish)
 *
 * FRED Series: FEDFUNDS, GS10, TB3MS
 */
export async function calculateRateSignal(): Promise<SignalResult> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const startDate = oneYearAgo.toISOString().split('T')[0];

  const [fedFundsData, tenYearData, threeMonthData] = await Promise.all([
    getFredSeriesCached('FEDFUNDS', startDate),
    getFredSeriesCached('GS10', startDate),
    getFredSeriesCached('TB3MS', startDate),
  ]);

  const fedFundsCurrent = getLatestValue(fedFundsData);
  const fedFunds3mAgo = getValueNPeriodsAgo(fedFundsData, 3);
  const tenYearYield = getLatestValue(tenYearData);
  const threeMonthYield = getLatestValue(threeMonthData);

  // Calculate Fed Funds change (3-month)
  const fedFundsChange = fedFundsCurrent !== null && fedFunds3mAgo !== null
    ? fedFundsCurrent - fedFunds3mAgo
    : null;

  // Calculate yield curve slope (10Y - 3M)
  const yieldCurveSlope = tenYearYield !== null && threeMonthYield !== null
    ? tenYearYield - threeMonthYield
    : null;

  // Calculate signal components
  let rateChangeSignal = 0;
  if (fedFundsChange !== null) {
    // Fed cutting rates = bullish, hiking = bearish
    if (fedFundsChange <= -0.5) rateChangeSignal = 1;
    else if (fedFundsChange <= -0.25) rateChangeSignal = 0.5;
    else if (fedFundsChange >= 0.5) rateChangeSignal = -1;
    else if (fedFundsChange >= 0.25) rateChangeSignal = -0.5;
  }

  let yieldCurveSignal = 0;
  if (yieldCurveSlope !== null) {
    // Inverted yield curve = bearish
    if (yieldCurveSlope < -0.5) yieldCurveSignal = -1;
    else if (yieldCurveSlope < 0) yieldCurveSignal = -0.5;
    else if (yieldCurveSlope > 1.5) yieldCurveSignal = 0.5;
    else if (yieldCurveSlope > 0.5) yieldCurveSignal = 0.25;
  }

  // Weighted average (rate change more important)
  const signalValue = clamp(rateChangeSignal * 0.6 + yieldCurveSignal * 0.4);

  // Build explanation
  let explanation = '';
  if (fedFundsChange !== null) {
    if (fedFundsChange < 0) {
      explanation = `Fed Funds rate decreased ${Math.abs(fedFundsChange).toFixed(2)}% over 3 months, indicating easing monetary policy.`;
    } else if (fedFundsChange > 0) {
      explanation = `Fed Funds rate increased ${fedFundsChange.toFixed(2)}% over 3 months, indicating tightening monetary policy.`;
    } else {
      explanation = 'Fed Funds rate unchanged over 3 months.';
    }
  }
  if (yieldCurveSlope !== null && yieldCurveSlope < 0) {
    explanation += ` Yield curve is inverted (${yieldCurveSlope.toFixed(2)}%), a potential recession indicator.`;
  }

  const confidence = fedFundsCurrent !== null && yieldCurveSlope !== null ? 0.85 : 0.5;

  return {
    name: 'Interest Rate Signal',
    value: Math.round(signalValue * 100) / 100,
    interpretation: getInterpretation(signalValue),
    confidence,
    explanation: explanation || 'Insufficient data for rate signal calculation.',
    indicators: {
      fedFundsRate: fedFundsCurrent,
      fedFundsChange3m: fedFundsChange !== null ? Math.round(fedFundsChange * 100) / 100 : null,
      tenYearYield,
      threeMonthYield,
      yieldCurveSlope: yieldCurveSlope !== null ? Math.round(yieldCurveSlope * 100) / 100 : null,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate Volatility Signal
 *
 * Based on VIX (CBOE Volatility Index):
 * - VIX > 30 = High fear = bearish
 * - VIX > 25 = Elevated fear = slightly bearish
 * - VIX 15-20 = Normal = neutral
 * - VIX < 15 = Low fear/complacency = slightly bullish
 * - VIX < 12 = Very low fear = bullish (but watch for reversal)
 *
 * FRED Series: VIXCLS
 */
export async function calculateVolatilitySignal(): Promise<SignalResult> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const startDate = oneYearAgo.toISOString().split('T')[0];

  const vixData = await getFredSeriesCached('VIXCLS', startDate);

  const vixCurrent = getLatestValue(vixData);
  const vix20dayMA = calculateSMA(vixData, 20);

  let signalValue = 0;
  let explanation = '';

  if (vixCurrent !== null) {
    // Absolute VIX level signal
    if (vixCurrent > 35) {
      signalValue = -1;
      explanation = `VIX at ${vixCurrent.toFixed(1)} indicates extreme fear - risk-off environment.`;
    } else if (vixCurrent > 25) {
      signalValue = -0.6;
      explanation = `VIX at ${vixCurrent.toFixed(1)} indicates elevated fear - caution advised.`;
    } else if (vixCurrent > 20) {
      signalValue = -0.3;
      explanation = `VIX at ${vixCurrent.toFixed(1)} indicates above-average volatility.`;
    } else if (vixCurrent < 12) {
      signalValue = 0.5;
      explanation = `VIX at ${vixCurrent.toFixed(1)} indicates very low fear - bullish but watch for complacency.`;
    } else if (vixCurrent < 15) {
      signalValue = 0.7;
      explanation = `VIX at ${vixCurrent.toFixed(1)} indicates low fear - favorable risk environment.`;
    } else {
      signalValue = 0.2;
      explanation = `VIX at ${vixCurrent.toFixed(1)} indicates normal market conditions.`;
    }

    // Adjust based on trend vs MA
    if (vix20dayMA !== null) {
      const vixVsMA = (vixCurrent - vix20dayMA) / vix20dayMA;
      if (vixVsMA > 0.2) {
        signalValue = clamp(signalValue - 0.2);
        explanation += ` VIX rising vs 20-day average.`;
      } else if (vixVsMA < -0.2) {
        signalValue = clamp(signalValue + 0.2);
        explanation += ` VIX falling vs 20-day average.`;
      }
    }
  }

  signalValue = clamp(signalValue);
  const confidence = vixCurrent !== null ? 0.8 : 0.3;

  return {
    name: 'Volatility Signal',
    value: Math.round(signalValue * 100) / 100,
    interpretation: getInterpretation(signalValue),
    confidence,
    explanation: explanation || 'Insufficient data for volatility signal calculation.',
    indicators: {
      vixCurrent,
      vix20dayMA: vix20dayMA !== null ? Math.round(vix20dayMA * 100) / 100 : null,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate Credit Signal
 *
 * Based on corporate bond spreads:
 * - Widening spreads = credit stress = bearish
 * - Tightening spreads = risk appetite = bullish
 *
 * FRED Series: BAA10Y (Baa spread), AAA10Y (Aaa spread)
 */
export async function calculateCreditSignal(): Promise<SignalResult> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const startDate = oneYearAgo.toISOString().split('T')[0];

  const [baaSpreadData, aaaSpreadData] = await Promise.all([
    getFredSeriesCached('BAA10Y', startDate),
    getFredSeriesCached('AAA10Y', startDate),
  ]);

  const baaSpread = getLatestValue(baaSpreadData);
  const aaaSpread = getLatestValue(aaaSpreadData);
  const baaSpread3mAgo = getValueNPeriodsAgo(baaSpreadData, 3);

  // Calculate credit spread change
  const baaSpreadChange = baaSpread !== null && baaSpread3mAgo !== null
    ? baaSpread - baaSpread3mAgo
    : null;

  // Calculate Baa-Aaa spread (risk premium)
  const riskPremium = baaSpread !== null && aaaSpread !== null
    ? baaSpread - aaaSpread
    : null;

  let signalValue = 0;
  let explanation = '';

  if (baaSpread !== null) {
    // Absolute spread level
    if (baaSpread > 4) {
      signalValue = -0.8;
      explanation = `Baa spread at ${baaSpread.toFixed(2)}% indicates significant credit stress.`;
    } else if (baaSpread > 3) {
      signalValue = -0.4;
      explanation = `Baa spread at ${baaSpread.toFixed(2)}% indicates elevated credit risk.`;
    } else if (baaSpread < 1.5) {
      signalValue = 0.6;
      explanation = `Baa spread at ${baaSpread.toFixed(2)}% indicates strong risk appetite.`;
    } else if (baaSpread < 2) {
      signalValue = 0.3;
      explanation = `Baa spread at ${baaSpread.toFixed(2)}% indicates healthy credit conditions.`;
    } else {
      signalValue = 0;
      explanation = `Baa spread at ${baaSpread.toFixed(2)}% indicates normal credit conditions.`;
    }

    // Adjust based on spread change
    if (baaSpreadChange !== null) {
      if (baaSpreadChange > 0.5) {
        signalValue = clamp(signalValue - 0.3);
        explanation += ` Spreads widening rapidly (+${baaSpreadChange.toFixed(2)}% over 3 months).`;
      } else if (baaSpreadChange < -0.5) {
        signalValue = clamp(signalValue + 0.3);
        explanation += ` Spreads tightening (${baaSpreadChange.toFixed(2)}% over 3 months).`;
      }
    }
  }

  signalValue = clamp(signalValue);
  const confidence = baaSpread !== null ? 0.75 : 0.3;

  return {
    name: 'Credit Signal',
    value: Math.round(signalValue * 100) / 100,
    interpretation: getInterpretation(signalValue),
    confidence,
    explanation: explanation || 'Insufficient data for credit signal calculation.',
    indicators: {
      baaSpread,
      aaaSpread,
      baaSpreadChange: baaSpreadChange !== null ? Math.round(baaSpreadChange * 100) / 100 : null,
      riskPremium: riskPremium !== null ? Math.round(riskPremium * 100) / 100 : null,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate Housing Signal
 *
 * Based on:
 * 1. Home price momentum (Case-Shiller index)
 * 2. Housing starts trend
 *
 * FRED Series: CSUSHPISA, HOUST
 */
export async function calculateHousingSignal(): Promise<SignalResult> {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const startDate = twoYearsAgo.toISOString().split('T')[0];

  const [homePriceData, housingStartsData] = await Promise.all([
    getFredSeriesCached('CSUSHPISA', startDate),
    getFredSeriesCached('HOUST', startDate),
  ]);

  const homePriceCurrent = getLatestValue(homePriceData);
  const homePrice12mAgo = getValueNPeriodsAgo(homePriceData, 12);
  const housingStartsCurrent = getLatestValue(housingStartsData);
  const housingStarts3mAgo = getValueNPeriodsAgo(housingStartsData, 3);

  // Calculate year-over-year home price change
  const homePriceYoY = homePriceCurrent !== null && homePrice12mAgo !== null
    ? ((homePriceCurrent - homePrice12mAgo) / homePrice12mAgo) * 100
    : null;

  // Calculate housing starts momentum
  const startsChange = housingStartsCurrent !== null && housingStarts3mAgo !== null
    ? ((housingStartsCurrent - housingStarts3mAgo) / housingStarts3mAgo) * 100
    : null;

  let priceSignal = 0;
  let startsSignal = 0;
  let explanation = '';

  // Home price signal
  if (homePriceYoY !== null) {
    if (homePriceYoY > 10) {
      priceSignal = 0.5; // Strong appreciation
      explanation = `Home prices up ${homePriceYoY.toFixed(1)}% YoY - strong housing market.`;
    } else if (homePriceYoY > 5) {
      priceSignal = 0.3;
      explanation = `Home prices up ${homePriceYoY.toFixed(1)}% YoY - healthy appreciation.`;
    } else if (homePriceYoY < -5) {
      priceSignal = -0.6;
      explanation = `Home prices down ${Math.abs(homePriceYoY).toFixed(1)}% YoY - housing weakness.`;
    } else if (homePriceYoY < 0) {
      priceSignal = -0.3;
      explanation = `Home prices down ${Math.abs(homePriceYoY).toFixed(1)}% YoY - cooling market.`;
    } else {
      priceSignal = 0.1;
      explanation = `Home prices up ${homePriceYoY.toFixed(1)}% YoY - stable market.`;
    }
  }

  // Housing starts signal
  if (startsChange !== null) {
    if (startsChange > 10) {
      startsSignal = 0.4;
      explanation += ` Housing starts up ${startsChange.toFixed(1)}% over 3 months.`;
    } else if (startsChange < -10) {
      startsSignal = -0.4;
      explanation += ` Housing starts down ${Math.abs(startsChange).toFixed(1)}% over 3 months.`;
    }
  }

  // Weighted combination
  const signalValue = clamp(priceSignal * 0.6 + startsSignal * 0.4);
  const confidence = homePriceCurrent !== null ? 0.7 : 0.3;

  return {
    name: 'Housing Signal',
    value: Math.round(signalValue * 100) / 100,
    interpretation: getInterpretation(signalValue),
    confidence,
    explanation: explanation || 'Insufficient data for housing signal calculation.',
    indicators: {
      homePriceIndex: homePriceCurrent,
      homePriceYoYChange: homePriceYoY !== null ? Math.round(homePriceYoY * 100) / 100 : null,
      housingStarts: housingStartsCurrent,
      housingStartsChange3m: startsChange !== null ? Math.round(startsChange * 100) / 100 : null,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate Composite Signal
 *
 * Weighted average of all signals:
 * - Rate: 30% (monetary policy is key driver)
 * - Volatility: 25% (market sentiment)
 * - Credit: 25% (financial conditions)
 * - Housing: 20% (economic health indicator)
 */
export async function calculateCompositeSignal(
  rate: SignalResult,
  volatility: SignalResult,
  credit: SignalResult,
  housing: SignalResult
): Promise<SignalResult> {
  const weights = {
    rate: 0.30,
    volatility: 0.25,
    credit: 0.25,
    housing: 0.20,
  };

  // Weighted average
  const signalValue = clamp(
    rate.value * weights.rate +
    volatility.value * weights.volatility +
    credit.value * weights.credit +
    housing.value * weights.housing
  );

  // Average confidence weighted by signal weights
  const confidence =
    rate.confidence * weights.rate +
    volatility.confidence * weights.volatility +
    credit.confidence * weights.credit +
    housing.confidence * weights.housing;

  // Build explanation
  const bullishFactors: string[] = [];
  const bearishFactors: string[] = [];

  if (rate.value > 0.2) bullishFactors.push('supportive monetary policy');
  if (rate.value < -0.2) bearishFactors.push('tightening monetary policy');
  if (volatility.value > 0.2) bullishFactors.push('low market volatility');
  if (volatility.value < -0.2) bearishFactors.push('elevated market fear');
  if (credit.value > 0.2) bullishFactors.push('healthy credit conditions');
  if (credit.value < -0.2) bearishFactors.push('credit stress');
  if (housing.value > 0.2) bullishFactors.push('strong housing market');
  if (housing.value < -0.2) bearishFactors.push('housing weakness');

  let explanation = 'Macro environment is ';
  if (signalValue > 0.3) {
    explanation += 'favorable for risk assets. ';
  } else if (signalValue < -0.3) {
    explanation += 'challenging for risk assets. ';
  } else {
    explanation += 'mixed. ';
  }

  if (bullishFactors.length > 0) {
    explanation += `Bullish factors: ${bullishFactors.join(', ')}. `;
  }
  if (bearishFactors.length > 0) {
    explanation += `Bearish factors: ${bearishFactors.join(', ')}.`;
  }

  return {
    name: 'Composite Signal',
    value: Math.round(signalValue * 100) / 100,
    interpretation: getInterpretation(signalValue),
    confidence: Math.round(confidence * 100) / 100,
    explanation: explanation.trim(),
    indicators: {
      rateWeight: weights.rate,
      volatilityWeight: weights.volatility,
      creditWeight: weights.credit,
      housingWeight: weights.housing,
      rateContribution: Math.round(rate.value * weights.rate * 100) / 100,
      volatilityContribution: Math.round(volatility.value * weights.volatility * 100) / 100,
      creditContribution: Math.round(credit.value * weights.credit * 100) / 100,
      housingContribution: Math.round(housing.value * weights.housing * 100) / 100,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate all signals and return complete response
 */
export async function calculateAllSignals(): Promise<SignalsResponse> {
  // Calculate all individual signals in parallel
  const [rate, volatility, credit, housing] = await Promise.all([
    calculateRateSignal(),
    calculateVolatilitySignal(),
    calculateCreditSignal(),
    calculateHousingSignal(),
  ]);

  // Calculate composite from individual signals
  const composite = await calculateCompositeSignal(rate, volatility, credit, housing);

  return {
    signals: {
      rate,
      volatility,
      credit,
      housing,
      composite,
    },
    meta: {
      calculatedAt: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}

/**
 * Get a specific signal by type
 */
export async function getSignalByType(type: string): Promise<SignalResult | null> {
  switch (type.toLowerCase()) {
    case 'rate':
      return calculateRateSignal();
    case 'volatility':
      return calculateVolatilitySignal();
    case 'credit':
      return calculateCreditSignal();
    case 'housing':
      return calculateHousingSignal();
    case 'composite': {
      const all = await calculateAllSignals();
      return all.signals.composite;
    }
    default:
      return null;
  }
}
