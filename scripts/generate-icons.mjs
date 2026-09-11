#!/usr/bin/env node
/**
 * scripts/generate-icons.mjs
 *
 * Rasterizes assets/img/truecost-logo.svg into the PNG icon set referenced by
 * manifest.json (assets/img/icons/truecost_<size>.png). Run after any logo change:
 *
 *   npm run icons
 *
 * Uses the same headless Chromium as the selector crawler (Playwright) with a
 * transparent background, so the icons keep the extension's rounded/irregular
 * silhouette instead of being stamped onto a solid square.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const SVG_PATH = 'assets/img/truecost-logo.svg';
const OUT_DIR = 'assets/img/icons';
const SIZES = [16, 24, 32, 48, 64, 128, 256];

const svg = fs.readFileSync(SVG_PATH, 'utf8');
const browser = await chromium.launch();

try {
    const page = await browser.newPage();
    for (const size of SIZES) {
        const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden">${sized}</body></html>`;
        await page.setViewportSize({ width: size, height: size });
        await page.setContent(html);
        await page.screenshot({ path: `${OUT_DIR}/truecost_${size}.png`, omitBackground: true });
        process.stderr.write(`  wrote ${OUT_DIR}/truecost_${size}.png\n`);
    }
} finally {
    await browser.close();
}
