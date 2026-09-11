/**
 * Unit tests for calculator.js
 * Run with: npx vitest run tests/calculator.test.js
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeEach } from 'vitest';

// Load IIFE globals
const digitsSrc = readFileSync(resolve(__dirname, '../assets/script/digits.js'), 'utf8');
const calcSrc = readFileSync(resolve(__dirname, '../assets/script/calculator.js'), 'utf8');
eval(digitsSrc);
eval(calcSrc);

describe('TrueCostCalculator', () => {
  const defaultOptions = {
    hourly_wages: 47253,
    daily_hours: 8,
    is_active: 1,
    daily: 0,
    show_popup: 0,
    language: 'fa'
  };

  it('returns null for invalid input', () => {
    expect(TrueCostCalculator(null, 'Toman', defaultOptions)).toBeNull();
    expect(TrueCostCalculator('', 'Toman', defaultOptions)).toBeNull();
    expect(TrueCostCalculator('abc', 'Toman', defaultOptions)).toBeNull();
  });

  it('handles comma-separated Toman price', () => {
    const result = TrueCostCalculator('1,000,000', 'Toman', defaultOptions);
    expect(result).toBeTruthy();
    expect(result).toContain('ساعت');
  });

  it('handles comma-less Toman price', () => {
    const result = TrueCostCalculator('1000000', 'Toman', defaultOptions);
    expect(result).toBeTruthy();
  });

  it('handles Rial price (divides by 10)', () => {
    const result = TrueCostCalculator('10,000,000', 'Rial', defaultOptions);
    expect(result).toBeTruthy();
  });

  it('handles Persian digits', () => {
    const result = TrueCostCalculator('۱,۰۰۰,۰۰۰', 'Toman', defaultOptions);
    expect(result).toBeTruthy();
  });

  it('handles Arabic separators', () => {
    const result = TrueCostCalculator('۱٬۰۰۰٬۰۰۰', 'Toman', defaultOptions);
    expect(result).toBeTruthy();
  });

  it('returns English output when language is en', () => {
    const opts = Object.assign({}, defaultOptions, { language: 'en' });
    const result = TrueCostCalculator('1,000,000', 'Toman', opts);
    expect(result).toBeTruthy();
    expect(result).toMatch(/[hms]/);
  });

  it('handles daily mode', () => {
    const opts = Object.assign({}, defaultOptions, { daily: 1 });
    const result = TrueCostCalculator('1,000,000', 'Toman', opts);
    expect(result).toBeTruthy();
    expect(result).toContain('روز');
  });

  it('handles monthly mode', () => {
    const opts = Object.assign({}, defaultOptions, { daily: 2 });
    const result = TrueCostCalculator('100,000,000', 'Toman', opts);
    expect(result).toBeTruthy();
    expect(result).toContain('ماه');
  });

  it('monthly mode uses 30 days of daily_hours', () => {
    const opts = Object.assign({}, defaultOptions, { daily: 2, language: 'en' });
    // 47253 (hourly) * 8 (daily_hours) * 30 = 11,340,720 Toman -> exactly 1.00 month
    const result = TrueCostCalculator('11,340,720', 'Toman', opts);
    expect(result).toBe('1 months');
  });

  it('defaults to hour mode for unknown daily values', () => {
    const opts = Object.assign({}, defaultOptions, { daily: 99 });
    const result = TrueCostCalculator('1,000,000', 'Toman', opts);
    expect(result).toBeTruthy();
    expect(result).toContain('ساعت');
  });

  it('handles very small price', () => {
    const result = TrueCostCalculator('1,000', 'Toman', defaultOptions);
    expect(result).toBeTruthy();
  });

  it('handles very large price', () => {
    const result = TrueCostCalculator('500,000,000', 'Toman', defaultOptions);
    expect(result).toBeTruthy();
  });
});
