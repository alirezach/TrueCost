#!/usr/bin/env node
/**
 * scripts/crawl-sites.mjs
 *
 * Re-runnable research tool used to (re-)verify the price selectors documented in
 * SITE_SELECTORS.md and shipped in assets/script/site-adapters.js. It drives a real headless
 * Chromium (via Playwright) so it sees the same client-rendered DOM a human visitor would,
 * unlike a plain `fetch`/`curl` which only sees the pre-hydration HTML on most of these sites.
 *
 * Usage:
 *   npm install                # installs playwright (devDependency)
 *   npx playwright install chromium
 *   node scripts/crawl-sites.mjs [--out=crawl-report.json]
 *
 * This is a developer/maintainer tool, not something shipped in the extension bundle. Iranian
 * e-commerce sites redesign often (see PLAN.md, section 4.3) - re-run this periodically and diff
 * the output against SITE_SELECTORS.md to catch drift early.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT_FILE = outArg ? outArg.split('=')[1] : 'crawl-report.json';

// One or more URLs per site: a product/detail page AND a listing page where practical, since
// prices are sometimes exposed differently on each (see the technolife.com PDP-vs-listing gap
// documented in SITE_SELECTORS.md).
const TARGETS = [
  { id: 'digikala_product', url: 'https://www.digikala.com/product/dkp-10431820/' },
  { id: 'digikala_search', url: 'https://www.digikala.com/search/category-mobile-phone/' },
  { id: 'torob_product', url: 'https://torob.com/p/b7c5734c-4aa7-4ab3-baa4-7b092cca69c7/%D8%AA%D9%88%D8%B1-%D8%B9%D8%B1%D9%88%D8%B3-%DA%A9%D8%AF-650/' },
  { id: 'torob_search', url: 'https://torob.com/search/?query=%DA%AF%D9%88%D8%B4%DB%8C' },
  { id: 'emalls_product', url: 'https://emalls.ir/%D9%85%D8%B4%D8%AE%D8%B5%D8%A7%D8%AA_%D8%B4%D9%85%D8%B9-%D8%A8%D9%88%D8%B4-%D8%A7%D9%88%D8%B1%D8%AC%DB%8C%D9%86%D8%A7%D9%84-%D8%A7%D9%84%D9%85%D8%A7%D9%86-%D8%AA%DB%8C%D9%BE-%DB%B5~id~27451080' },
  { id: 'technolife_home', url: 'https://www.technolife.com/' },
  { id: 'okala_home', url: 'https://www.okala.com/' },
  { id: 'tapsi_shop_home', url: 'https://tapsi.shop/' },
  { id: 'snappfood_home', url: 'https://snappfood.ir/' },
  { id: 'bama_home', url: 'https://bama.ir/' },
  { id: 'divar_category', url: 'https://divar.ir/s/tehran/mobile-phones' }
];

// Executed inside the page - keep this dependency-free (no access to Node/Playwright APIs).
function extractPriceLeaves() {
  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }
  function classPath(el, depth) {
    const parts = [];
    let node = el;
    for (let i = 0; i < depth && node; i++) {
      const cls = node.className && typeof node.className === 'string'
        ? '.' + node.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '';
      parts.unshift(node.tagName.toLowerCase() + cls);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }
  const CURRENCY_RE = /(تومان|ریال|Toman|IRR|IRT)/;
  const results = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (!text || text.length < 2 || text.length > 60) continue;
    const hasCurrencyWord = CURRENCY_RE.test(text);
    const digits = text.replace(/[^\d۰-۹]/g, '');
    if (digits.length < 3) continue;
    if (!hasCurrencyWord && digits.length < 5) continue;
    if (!isVisible(el)) continue;
    const cls = typeof el.className === 'string' ? el.className.trim() : '';
    const sig = el.tagName + '|' + cls;
    if (seen.has(sig)) continue;
    seen.add(sig);
    results.push({
      tag: el.tagName.toLowerCase(),
      className: cls,
      id: el.id || null,
      text: text.slice(0, 80),
      path: classPath(el, 4),
      attrs: Array.from(el.attributes).map((a) => `${a.name}="${a.value}"`).slice(0, 6).join(' ')
    });
  }
  const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((s) => s.textContent)
    .filter(Boolean);
  return { url: location.href, count: results.length, results: results.slice(0, 60), jsonLd: jsonLd.slice(0, 5) };
}

async function crawlOne(browser, target) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    locale: 'fa-IR',
    viewport: { width: 1366, height: 900 },
    geolocation: { latitude: 35.6892, longitude: 51.389 },
    permissions: ['geolocation']
  });
  const page = await context.newPage();
  const out = { id: target.id, url: target.url, ok: false };
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);
    for (const sel of ['button:has-text("متوجه شدم")', 'button:has-text("بستن")', '[aria-label="Close"]', '.modal-close', 'button:has-text("تایید")']) {
      const btn = await page.$(sel).catch(() => null);
      if (btn) await btn.click({ timeout: 1000 }).catch(() => {});
    }
    await page.mouse.wheel(0, 1200).catch(() => {});
    await page.waitForTimeout(1500);
    out.data = await page.evaluate(extractPriceLeaves);
    out.ok = true;
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  } finally {
    await context.close();
  }
  return out;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  for (const target of TARGETS) {
    process.stderr.write(`Crawling ${target.id} ...\n`);
    const result = await crawlOne(browser, target);
    report.push(result);
    process.stderr.write(`  -> ok=${result.ok} count=${result.data ? result.data.count : 0} err=${result.error || ''}\n`);
  }
  await browser.close();
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2), 'utf-8');
  process.stderr.write(`Done. Wrote ${OUT_FILE}\n`);
}

main();
