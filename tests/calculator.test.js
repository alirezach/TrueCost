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

it('daily mode breaks into days and work hours (never silently converts to months)', () => {
const opts = Object.assign({}, defaultOptions, { daily: 1, language: 'en' });
// 47253 (hourly) * 8 (daily_hours) * 30 = 11,340,720 Toman -> 30 work days -> 30d 0h
// (old bug: this used to silently show "1 month" instead of days)
const result = TrueCostCalculator('11,340,720', 'Toman', opts);
expect(result).toBe('30d 0h');
});

it('monthly mode uses 30 days of daily_hours', () => {
const opts = Object.assign({}, defaultOptions, { daily: 2, language: 'en' });
// 47253 (hourly) * 8 (daily_hours) * 30 = 11,340,720 Toman -> exactly 1.00 month
// New format: months + days + hours (e.g. "1mo 0d 0h") instead of a bare decimal
const result = TrueCostCalculator('11,340,720', 'Toman', opts);
expect(result).toBe('1mo 0d 0h');
});

it('daily mode measures the leftover in work hours, not 24h clock hours', () => {
const opts = Object.assign({}, defaultOptions, { daily: 1, language: 'en' });
// 12 hours of work with 8-hour work-days -> 1d 4h
// (old bug: leftover was multiplied by 24, showing "1d 12h" - which users read as 20 hours)
const result = TrueCostCalculator('567,036', 'Toman', opts); // 47253 * 12
expect(result).toBe('1d 4h');
});

it('daily mode shows pure leftover hours below one work-day', () => {
const opts = Object.assign({}, defaultOptions, { daily: 1, language: 'en' });
// 7 hours of work with 8-hour work-days -> 0d 7h (old bug: "0d 21h")
const result = TrueCostCalculator('330,771', 'Toman', opts); // 47253 * 7
expect(result).toBe('0d 7h');
});

it('daily mode Persian output matches the hours mode total', () => {
const opts = Object.assign({}, defaultOptions, { daily: 1 });
// Same 12 hours of work: hours mode shows «۱۲:۰۰ ساعت کار», day mode must agree
const result = TrueCostCalculator('567,036', 'Toman', opts);
expect(result).toBe('۱ روز و ۴ ساعت');
});

it('daily mode honours a custom daily_hours', () => {
const opts = Object.assign({}, defaultOptions, { daily: 1, daily_hours: 6, language: 'en' });
// 12 hours of work with 6-hour work-days -> 2d 0h
const result = TrueCostCalculator('567,036', 'Toman', opts);
expect(result).toBe('2d 0h');
});

it('daily mode rolls a near-full day up cleanly', () => {
const opts = Object.assign({}, defaultOptions, { daily: 1, language: 'en' });
// 755,575 / 47253 = 15.99 hours -> 1.99 work-days -> rounds to 2d 0h, not 1d 8h
const result = TrueCostCalculator('755,575', 'Toman', opts);
expect(result).toBe('2d 0h');
});

it('monthly mode keeps leftover work-days and work hours', () => {
const opts = Object.assign({}, defaultOptions, { daily: 2, language: 'en' });
// 252 hours of work = 1 month (240h) + 12h -> 1mo 1d 4h
const result = TrueCostCalculator('11,907,756', 'Toman', opts); // 47253 * 252
expect(result).toBe('1mo 1d 4h');
});

it('monthly mode Persian output for a full month', () => {
const opts = Object.assign({}, defaultOptions, { daily: 2 });
const result = TrueCostCalculator('11,340,720', 'Toman', opts);
expect(result).toBe('۱ ماه و ۰ روز و ۰ ساعت');
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
