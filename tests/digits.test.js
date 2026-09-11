/**
 * Unit tests for digits.js
 * Run with: npx vitest run tests/digits.test.js
 */

// Load IIFE globals
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const digitsSrc = readFileSync(resolve(__dirname, '../assets/script/digits.js'), 'utf8');
eval(digitsSrc); // exposes toEnglishDigits / toPersianDigits on global

describe('toEnglishDigits', () => {
  it('converts Persian digits', () => {
    expect(toEnglishDigits('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
  });

  it('converts Arabic-Indic digits', () => {
    expect(toEnglishDigits('١٢٣٤٥٦٧٨٩٠')).toBe('1234567890');
  });

  it('leaves English digits untouched', () => {
    expect(toEnglishDigits('12345')).toBe('12345');
  });

  it('handles mixed content', () => {
    expect(toEnglishDigits('قیمت: ۱۲,۳۴۵ تومان')).toBe('قیمت: 12,345 تومان');
  });

  it('handles empty string', () => {
    expect(toEnglishDigits('')).toBe('');
  });

  it('handles null/undefined gracefully', () => {
    expect(toEnglishDigits(null)).toBe('');
    expect(toEnglishDigits(undefined)).toBe('');
  });
});

describe('toPersianDigits', () => {
  it('converts English digits to Persian', () => {
    expect(toPersianDigits('1234567890')).toBe('۱۲۳۴۵۶۷۸۹۰');
  });

  it('round-trips with toEnglishDigits', () => {
    const original = '۹۸۷۶۵۴۳۲۱۰';
    expect(toEnglishDigits(toPersianDigits(toEnglishDigits(original)))).toBe(toEnglishDigits(original));
  });
});
