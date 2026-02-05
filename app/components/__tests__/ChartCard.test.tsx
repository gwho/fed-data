import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ChartCard from '../ChartCard';

describe('ChartCard', () => {
  describe('default state (no loading, no error)', () => {
    it('renders the title', () => {
      const { getByText } = render(
        <ChartCard title="Test Title">
          <div>chart content</div>
        </ChartCard>
      );
      expect(getByText('Test Title')).toBeDefined();
    });

    it('renders children', () => {
      const { getByText } = render(
        <ChartCard title="Test">
          <div>chart content</div>
        </ChartCard>
      );
      expect(getByText('chart content')).toBeDefined();
    });
  });

  describe('loading state', () => {
    it('shows loading text and suppresses children', () => {
      const { getByText, queryByText } = render(
        <ChartCard title="Test" loading={true}>
          <div>chart content</div>
        </ChartCard>
      );
      expect(getByText('Loading data...')).toBeDefined();
      expect(queryByText('chart content')).toBeNull();
    });
  });

  describe('error state', () => {
    it('shows error message and suppresses children when error is set', () => {
      const { getByText, queryByText } = render(
        <ChartCard title="Test" error={new Error('API failure')}>
          <div>chart content</div>
        </ChartCard>
      );
      expect(getByText('Failed to load data')).toBeDefined();
      expect(getByText('Please refresh the page to try again')).toBeDefined();
      expect(queryByText('chart content')).toBeNull();
    });

    it('does not show error when error is null', () => {
      const { queryByText, getByText } = render(
        <ChartCard title="Test" error={null}>
          <div>chart content</div>
        </ChartCard>
      );
      expect(queryByText('Failed to load data')).toBeNull();
      expect(getByText('chart content')).toBeDefined();
    });
  });

  describe('priority: loading beats error', () => {
    it('shows loading text when both loading and error are set', () => {
      const { getByText, queryByText } = render(
        <ChartCard title="Test" loading={true} error={new Error('API failure')}>
          <div>chart content</div>
        </ChartCard>
      );
      expect(getByText('Loading data...')).toBeDefined();
      expect(queryByText('Failed to load data')).toBeNull();
      expect(queryByText('chart content')).toBeNull();
    });
  });

  describe('title visibility', () => {
    it('renders the title even when in error state', () => {
      const { getByText } = render(
        <ChartCard title="My Section Title" error={new Error('err')}>
          <div>x</div>
        </ChartCard>
      );
      expect(getByText('My Section Title')).toBeDefined();
    });

    it('renders the title even when in loading state', () => {
      const { getByText } = render(
        <ChartCard title="My Section Title" loading={true}>
          <div>x</div>
        </ChartCard>
      );
      expect(getByText('My Section Title')).toBeDefined();
    });
  });
});
