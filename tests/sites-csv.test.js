/**
 * Unit tests for sites-csv.js
 * Run with: npx vitest run tests/sites-csv.test.js
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const src = readFileSync(resolve(__dirname, '../assets/script/sites-csv.js'), 'utf8');
eval(src); // exposes TC_parseSitesCsv / TC_findSiteAdapter on global

describe('TC_parseSitesCsv', () => {
  it('parses a basic row with pipe-separated selectors', () => {
    const csv =
      'id,hostname,url_pattern,price_selectors,currency_label_selectors,default_currency,enabled,last_verified,contributor,notes_en,notes_fa\n' +
      'digikala,digikala.com,https://www.digikala.com/*,"[data-testid=""price-final""]|[data-testid=""price-no-discount""]",,Toman,true,2026-08-15,maintainer,"note en","note fa"\n';
    const adapters = TC_parseSitesCsv(csv);
    expect(adapters).toHaveLength(1);
    expect(adapters[0].id).toBe('digikala');
    expect(adapters[0].hostname).toBe('digikala.com');
    expect(adapters[0].priceSelectors).toEqual([
      '[data-testid="price-final"]',
      '[data-testid="price-no-discount"]',
    ]);
    expect(adapters[0].defaultCurrency).toBe('Toman');
  });

  it('skips rows where enabled=false', () => {
    const csv =
      'id,hostname,url_pattern,price_selectors,currency_label_selectors,default_currency,enabled,last_verified,contributor,notes_en,notes_fa\n' +
      'foo,foo.com,,,,Toman,false,,,,\n';
    expect(TC_parseSitesCsv(csv)).toHaveLength(0);
  });

  it('skips rows missing id or hostname', () => {
    const csv =
      'id,hostname,url_pattern,price_selectors,currency_label_selectors,default_currency,enabled,last_verified,contributor,notes_en,notes_fa\n' +
      ',foo.com,,,,Toman,true,,,,\n' +
      'bar,,,,,Toman,true,,,,\n';
    expect(TC_parseSitesCsv(csv)).toHaveLength(0);
  });

  it('normalizes www. prefix out of hostname', () => {
    const csv =
      'id,hostname,url_pattern,price_selectors,currency_label_selectors,default_currency,enabled,last_verified,contributor,notes_en,notes_fa\n' +
      'x,www.example.com,,,,Toman,true,,,,\n';
    expect(TC_parseSitesCsv(csv)[0].hostname).toBe('example.com');
  });

  it('returns [] for empty or header-only input', () => {
    expect(TC_parseSitesCsv('')).toEqual([]);
    expect(TC_parseSitesCsv('id,hostname\n')).toEqual([]);
  });

  it('never throws on malformed input', () => {
    expect(() => TC_parseSitesCsv(undefined)).not.toThrow();
    expect(() => TC_parseSitesCsv('"unterminated quote')).not.toThrow();
  });

  it('leaves currency_label_selectors undefined when empty', () => {
    const csv =
      'id,hostname,url_pattern,price_selectors,currency_label_selectors,default_currency,enabled,last_verified,contributor,notes_en,notes_fa\n' +
      'x,example.com,,.price,,Toman,true,,,,\n';
    expect(TC_parseSitesCsv(csv)[0].currencyLabelSelectors).toBeUndefined();
  });
});

describe('TC_findSiteAdapter', () => {
  const adapters = TC_parseSitesCsv(
    'id,hostname,url_pattern,price_selectors,currency_label_selectors,default_currency,enabled,last_verified,contributor,notes_en,notes_fa\n' +
    'digikala,digikala.com,,.price,,Toman,true,,,,\n' +
    'divar,divar.ir,,.price,,Toman,true,,,,\n'
  );

  it('matches the bare hostname', () => {
    expect(TC_findSiteAdapter(adapters, 'digikala.com').id).toBe('digikala');
  });

  it('matches a www. subdomain', () => {
    expect(TC_findSiteAdapter(adapters, 'www.digikala.com').id).toBe('digikala');
  });

  it('matches an arbitrary subdomain via suffix match', () => {
    expect(TC_findSiteAdapter(adapters, 'm.divar.ir').id).toBe('divar');
  });

  it('does not match an unrelated host', () => {
    expect(TC_findSiteAdapter(adapters, 'example.com')).toBeNull();
  });

  it('does not match a host that merely contains the hostname as a substring', () => {
    expect(TC_findSiteAdapter(adapters, 'notdigikala.com')).toBeNull();
  });

  it('returns null for a non-array adapters argument', () => {
    expect(TC_findSiteAdapter(null, 'digikala.com')).toBeNull();
  });
});
