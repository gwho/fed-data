import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import InterestRatesSection from '../InterestRatesSection';

describe('InterestRatesSection', () => {
  const mockTenYearData = [
    { date: 'Jan', value: 4.2 },
    { date: 'Feb', value: 4.3 },
  ];

  const mockThreeMonthData = [
    { date: 'Jan', value: 5.1 },
    { date: 'Feb', value: 5.2 },
  ];

  const mockFedFundsData = [
    { date: 'Jan', value: 4.5 },
    { date: 'Feb', value: 4.6 },
  ];

  const mockMortgageData = [
    { date: 'Jan', value: 6.8 },
    { date: 'Feb', value: 6.9 },
  ];

  describe('default state (with data)', () => {
    it('renders all four chart titles', () => {
      const { getByText } = render(
        <InterestRatesSection
          tenYearData={mockTenYearData}
          threeMonthData={mockThreeMonthData}
          fedFundsData={mockFedFundsData}
          mortgageData={mockMortgageData}
          loading={false}
          error={null}
        />
      );

      expect(getByText('Interest Rates: Long-Term Government Bond Yields: 10-Year')).toBeDefined();
      expect(getByText('Interest Rates: 3-Month or 90-Day Rates and Yields')).toBeDefined();
      expect(getByText('Federal Funds Effective Rate')).toBeDefined();
      expect(getByText('30-Year Fixed Rate Mortgage Average')).toBeDefined();
    });

    it('uses a 2-column grid layout', () => {
      const { container } = render(
        <InterestRatesSection
          tenYearData={mockTenYearData}
          threeMonthData={mockThreeMonthData}
          fedFundsData={mockFedFundsData}
          mortgageData={mockMortgageData}
          loading={false}
          error={null}
        />
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('grid');
      expect(grid.className).toContain('lg:grid-cols-2');
    });
  });

  describe('loading state', () => {
    it('passes loading prop to all ChartCards', () => {
      const { getAllByText } = render(
        <InterestRatesSection
          tenYearData={[]}
          threeMonthData={[]}
          fedFundsData={[]}
          mortgageData={[]}
          loading={true}
          error={null}
        />
      );

      // ChartCard shows "Loading data..." when loading is true
      const loadingTexts = getAllByText('Loading data...');
      expect(loadingTexts.length).toBe(4); // One for each chart
    });
  });

  describe('error state', () => {
    it('passes error prop to all ChartCards', () => {
      const testError = new Error('API failure');
      const { getAllByText } = render(
        <InterestRatesSection
          tenYearData={[]}
          threeMonthData={[]}
          fedFundsData={[]}
          mortgageData={[]}
          loading={false}
          error={testError}
        />
      );

      // ChartCard shows "Failed to load data" when error is set
      const errorTexts = getAllByText('Failed to load data');
      expect(errorTexts.length).toBe(4); // One for each chart
    });
  });

  describe('empty data state', () => {
    it('shows "No data available" message when data arrays are empty', () => {
      const { getAllByText } = render(
        <InterestRatesSection
          tenYearData={[]}
          threeMonthData={[]}
          fedFundsData={[]}
          mortgageData={[]}
          loading={false}
          error={null}
        />
      );

      const noDataTexts = getAllByText('No data available');
      expect(noDataTexts.length).toBe(4); // One for each chart
    });

    it('shows "No data available" for individual empty datasets', () => {
      const { getAllByText } = render(
        <InterestRatesSection
          tenYearData={[]} // empty
          threeMonthData={mockThreeMonthData} // has data
          fedFundsData={mockFedFundsData} // has data
          mortgageData={mockMortgageData} // has data
          loading={false}
          error={null}
        />
      );

      const noDataTexts = getAllByText('No data available');
      expect(noDataTexts.length).toBe(1); // Only for tenYearData
    });
  });

  describe('chart data rendering', () => {
    it('does not show "No data available" when data is present', () => {
      const { queryByText } = render(
        <InterestRatesSection
          tenYearData={mockTenYearData}
          threeMonthData={mockThreeMonthData}
          fedFundsData={mockFedFundsData}
          mortgageData={mockMortgageData}
          loading={false}
          error={null}
        />
      );

      expect(queryByText('No data available')).toBeNull();
    });
  });

  describe('props validation', () => {
    it('handles null error gracefully', () => {
      const { queryByText } = render(
        <InterestRatesSection
          tenYearData={mockTenYearData}
          threeMonthData={mockThreeMonthData}
          fedFundsData={mockFedFundsData}
          mortgageData={mockMortgageData}
          loading={false}
          error={null}
        />
      );

      expect(queryByText('Failed to load data')).toBeNull();
    });

    it('handles mixed data states correctly', () => {
      const { getAllByText, queryByText } = render(
        <InterestRatesSection
          tenYearData={mockTenYearData} // has data
          threeMonthData={[]} // empty
          fedFundsData={mockFedFundsData} // has data
          mortgageData={[]} // empty
          loading={false}
          error={null}
        />
      );

      const noDataTexts = getAllByText('No data available');
      expect(noDataTexts.length).toBe(2); // For threeMonth and mortgage
      expect(queryByText('Failed to load data')).toBeNull();
    });
  });
});
