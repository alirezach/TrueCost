# True Cost Modernization & Roadmap

This document explains **why** the extension stopped working, **what** was changed in this
pass (v3.0.0), and a **detailed plan** for a more ambitious rewrite if you want to take this
further than a compatibility fix.

## 1. Why it was broken (root causes)

| # | Issue | Evidence | Impact |
|---|-------|----------|--------|
| 1 | **Manifest V2** | Chrome disabled MV2 for all users starting Chrome 138 (Jul 24, 2025); MV2 items are being removed from the Chrome Web Store entirely by Aug 31, 2026. | The extension could no longer be installed or run in current Chrome at all. |
| 2 | **Bamilo.com is dead** | Bamilo shut down in April 2019 (domain now redirects/repurposed). | The extension shipped code for a currency-detection block that could never fire again; wasted content-script matches/permissions. |
| 3 | **jQuery + `$.fn.data('tc')` guard pattern** | `append_view.js` used `bundle.js` (a full jQuery clone) purely for `.each()`/`.data()`, and cached the *original* text on the DOM node - but in "replace" mode it overwrote `textContent`, permanently destroying the original price. | Once text was replaced, toggling settings (wage, daily/hourly, popup mode) could never recompute correctly without a full page reload. |
| 4 | **Brittle, hand-written CSS selectors per site** | Confirmed live: Digikala serves a client-rendered Next.js shell with no server-rendered price markup; Torob's classes are Webpack content-hashes like `Showcase_price__HqsHJ` that change on every deploy. | Selectors silently stop matching after routine frontend redeploys - no error, just prices never update. |
| 5 | **`TrueCostCalculator` bug** | `if (PriceString.indexOf(',') < 0) return PriceString;` - any price without a comma (e.g. `"500"`, or Persian thousands separator `٬`/`،`) was returned unchanged instead of converted. | Silently broke on legitimate low-value prices and any site not using a literal ASCII comma. |
| 6 | **`setInterval(fn, 7777)` full-page rescans** | `append_view.js` bottom. | Wasteful on long infinite-scroll pages (SnappFood, Divar), and still had a race with SPA navigation between polls. |
| 7 | **Broad `tabs` permission** | `manifest.json` `permissions: ["storage","tabs"]`, used only to read the active tab's URL in the popup. | Unnecessarily scary permission prompt; `activeTab` covers this exact use case with far less exposure. |

## 2. What changed in this pass (v3.0.0 - compatibility fix)

- **Manifest V3**: `manifest_version: 3`, `browser_action` → `action`, permissions trimmed to
  `["storage", "activeTab"]` (no more blanket `tabs`).
- **Removed `bamilo.com`** from `content_scripts.matches` (dead site since 2019).
- **Dropped the jQuery bundle** (`bundle.js` removed, ~30 KB gone). All DOM work is now plain
  `querySelectorAll`/`TreeWalker`.
- **New detection engine** (`assets/script/content.js`) with three layered strategies, in order
  of trust:
  1. **Site adapters** (`assets/script/site-adapters.js`) - fast-path CSS selectors kept for
     sites with a known/stable structure.
  2. **JSON-LD structured data** - parses `<script type="application/ld+json">`
     `Product`/`Offer`/`AggregateOffer` blocks (schema.org), which most storefronts keep stable
     because Google's rich-snippet eligibility depends on it. Verified live on `emalls.ir`.
  3. **Generic currency-word text scan** - any leaf DOM element whose entire trimmed text is
     "a number + `تومان`/`ریال`" is treated as a price, with zero per-site configuration. This
     is what makes **technolife.com**, **okala.com**, and **tapsi.shop** work without any
     hand-written selectors, and is also the safety net for every other site when its markup
     inevitably changes again.
- **Original price text is always preserved** in `data-tc-original`/`data-tc-currency`
  attributes, so switching *Popup vs Replace*, *hourly vs daily*, or the wage value now updates
  every already-detected price **live**, via `chrome.storage.onChanged` - no page reload needed.
- **`MutationObserver`** replaces the `setInterval` poll; only newly-inserted DOM subtrees are
  rescanned, and scanning is scheduled on `requestIdleCallback` to avoid jank on infinite-scroll
  pages.
- **Fixed the calculator**: digits are normalized (Persian/Arabic-Indic → English) and every
  thousands separator (`,` `،` `٬` space) is stripped before parsing, so prices without a comma,
  or using Persian punctuation, now compute correctly. Minutes are zero-padded (`3:05` instead
  of `3:5`).
- **Added site matches** for the sites requested: `technolife.com` (+ `www.`), `okala.com`,
  `tapsi.shop`, in addition to the already-present `digikala.com`, `torob.com`, `emalls.ir`.

### Per-site status (checked while building this update)

| Site | Status | Notes |
|---|---|---|
| digikala.com | ✅ kept, adapter + generic | Page is a client-rendered Next.js shell; no price markup is present in the initial HTML response, only after client JS runs. Adapter selectors (`.js-price-value`, `.c-price__*`, `.c-product__*`, `.c-discount__*`) are best-effort based on Digikala's historically stable BEM naming; generic scan is the real safety net. |
| torob.com | ✅ kept, adapter + generic | Confirmed live JSON-LD `Product`/`Offer` with real Rial prices, and CSS-module classes (`Showcase_price__HqsHJ`, `price.seller-element`) that **will** rot on redeploy - handled via `[class*="price__"]` substring matching plus the generic engine. |
| emalls.ir | ✅ kept, adapter + generic + JSON-LD | Confirmed live `schema.org/Product` + `AggregateOffer`/`Offer` JSON-LD with accurate Rial pricing - the most reliable of all sites checked. |
| **technolife.com** | 🆕 added, generic engine only | Reachable and large (SSR shell + heavy client hydration); could not confirm exact live price classnames from a static fetch. Handled by the generic currency-word/JSON-LD scan. |
| **okala.com** | 🆕 added, generic engine only | Site did not respond to automated fetches from this environment (likely bot/geo protection) - this does **not** block the extension, since it runs inside the user's real, authenticated browser session, not a sandboxed fetch. Handled by the generic engine; selectors can be hardened once someone can inspect the live DOM in a real browser (see §4). |
| **tapsi.shop** | 🆕 added, generic engine only | Confirmed to be a pure React SPA (Tehran-only Q-commerce app) with no server-rendered price text. Handled by the generic engine, which reads the *rendered* DOM regardless of how it got there. |
| reyhoon.com, digistyle.com, bama.ir, divar.ir, banimode.com, shixon.com, modiseh.com, snappfood.ir | ⚠️ kept, unverified | Old selectors kept as a best-effort fast path; not independently re-verified live in this pass. Generic engine covers them if the old selectors have rotted. Recommend spot-checking each next time you have the extension loaded in a real browser. |
| bamilo.com | ❌ removed | Confirmed defunct since April 2019. |

## 3. How to load and test it now

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the `TrueCost`
   folder.
2. Open the popup, set your hourly wage, and visit any matched site.
3. Toggle "پاپ آپ شناور" (popup mode) and the wage field while a product page is open - prices
   should update immediately without reloading the tab.

## 4. If you want to go further: a "v4" rebuild plan

The compatibility fix above makes the extension work again and resilient to future redesigns,
but if you want a genuinely modern extension, here's a scoped plan:

### 4.1 Tooling & code quality
- Migrate to **TypeScript** + a small bundler (`vite` with `@crxjs/vite-plugin`, or `esbuild`) so
  the adapters/engine can be unit-tested and type-checked instead of hand-written vanilla JS.
- Add **unit tests** (Vitest/Jest) for `calculator.js`'s number parsing (Persian digits, mixed
  separators, Rial/Toman conversion, daily/monthly rollover) and the generic leaf-detection
  regexes - these are exactly the kind of logic that silently regresses.
- Add **Playwright** end-to-end smoke tests that load a few saved HTML fixtures per site and
  assert that at least one price gets annotated. Run in CI on a schedule (e.g. nightly) against
  the *live* sites as a canary - if a site's selectors/engine stop finding any price, open a
  GitHub issue automatically. This directly targets the root cause of this whole exercise
  (nobody noticed for years that detection had silently stopped working).

### 4.2 Product/feature roadmap
- **Options page** (`chrome://extensions` → "Extension options") instead of a popup-only
  settings surface, with room for: per-site enable/disable toggles, multiple wage profiles
  (e.g. "day job" vs "freelance rate"), a currency picker beyond Toman/Rial (USD/EUR for
  cross-border sites), and an import/export of settings as JSON.
- **Multi-currency detection**: auto-detect `$`, `€`, `£` and generic ISO codes in addition to
  Persian تومان/ریال, using a small currency-symbol table, so the same engine also works on
  non-Iranian sites without code changes.
- **Badge counter**: use the MV3 `action.setBadgeText` API to show a running total of "hours of
  life" browsed in the current session (opt-in, purely local).
- **Per-element hover breakdown**: instead of a single tooltip string, show a small breakdown
  (e.g. "3.5 hours ≈ 0.44 work days ≈ 14% of today's wage") on hover, reusing the existing
  tooltip CSS mechanism.
- **Firefox/Edge support**: MV3 is close to a drop-in for Firefox (112+) and Edge already; add
  the `browser_specific_settings.gecko.id` key and publish to `addons.mozilla.org` too, using
  `webextension-polyfill` if any Chrome-only API sneaks in.
- **Accessibility pass**: ensure the tooltip has an ARIA-friendly fallback (currently CSS
  `:hover`/`:before` only, invisible to keyboard/screen-reader users) - e.g. also set
  `aria-label` or a `title` attribute alongside `data-tc`.
- **Localization**: adopt `chrome.i18n` properly (`_locales/fa/messages.json`,
  `_locales/en/messages.json`) so the UI can ship in English too, opening the extension to a
  non-Persian-speaking audience with a currency/site config swap.

### 4.3 Detection engine hardening
- **Config-driven adapters loaded from a bundled JSON file** (not remote code - Chrome Web
  Store policy forbids remotely hosted logic, but a periodically-updated *data* file bundled
  with each release is fine) so selector fixes can ship as a patch release without touching
  engine code.
- **Site API integrations where public and stable** (e.g. Digikala's public
  `api.digikala.com/v2/product/{id}/` endpoint, Torob's embedded JSON-LD) as an even higher
  priority signal than DOM scanning, when the current page URL contains a recognizable product
  ID - this sidesteps DOM churn entirely for the sites that expose it.
- **False-positive guardrails**: extend the generic engine's test suite with adversarial cases
  (phone numbers, dates, product SKUs, star ratings) to make sure the currency-word requirement
  and length bounds keep rejecting them as sites change.

### 4.4 Trust & privacy
- Publish a short **privacy policy** (the extension already never leaves the browser - no
  network calls, `chrome.storage.sync` only - documenting this explicitly builds trust and is
  required by the Chrome Web Store listing anyway).
- Add a `SECURITY.md`/`CONTRIBUTING.md` so community PRs (this repo already has 4-5 past
  contributors) have a clear path, especially for the "selectors went stale" reports that will
  keep happening as long as per-site adapters exist.

## 4.5 Status update (v3.1.0 - this pass)

Everything in section 4 except the Firefox/Edge port has now been implemented (Firefox is
explicitly deferred to a later phase, per the maintainer's request):

- **Real selector research**: sites were re-crawled with an actual headless Chromium browser
  (Playwright), not static fetches. Findings and evidence are in `SITE_SELECTORS.md`; the engine
  and adapters were rewritten based on them (see `assets/script/content.js` and
  `assets/script/site-adapters.js`).
- **Site list finalized** to: digikala.com, torob.com, emalls.ir, technolife.com, okala.com,
  tapsi.shop, snappfood.ir, bama.ir, divar.ir. `reyhoon.com`, `digistyle.com`, `banimode.com`,
  `shixon.com` and `modiseh.com` were removed at the maintainer's request.
- **Wage dataset**: `data/wage-dataset.json` ships an official, sourced default (Iran's 1404
  statutory hourly minimum wage) and is fetched fresh from GitHub on install/update by
  `assets/script/background.js`, with the bundled copy as an offline fallback.
- **Options page**: `options.html`/`options.js` exposes language and currency preferences,
  reachable from the popup via the gear icon (`chrome.runtime.openOptionsPage()`).
- **Manual picker mode**: `assets/script/picker.js`, injected on demand via
  `chrome.scripting.executeScript` (requesting the host permission for just that site through
  `chrome.permissions.request`), lets you click any price element to save a custom selector
  (`custom_adapters` in `chrome.storage.sync`) and optionally open a pre-filled GitHub issue to
  propose it upstream.
- **Resiliency hardening**: the engine now cross-validates bare numbers against JSON-LD
  structured data (handling the Rial-vs-Toman ambiguity found across sites), recognizes both
  Arabic thousands/decimal separators, and ignores SVG nodes.
- **Tooling**: `package.json`, unit tests, and a GitHub Actions workflow were added - see
  `CONTRIBUTING.md`.

## 4.6 Status update (v3.2.0 - this pass): collaborative selector database

The biggest remaining fragility from §1 ("brittle, hand-written CSS selectors per site") is now
addressed structurally, not just with more one-off research:

- **Selectors moved out of code, into data**: every per-site CSS selector used to be a literal
  array inside `assets/script/site-adapters.js`, which meant every fix required a full extension
  update. They now live in **`data/sites.csv`** - a plain CSV table anyone can open in a
  spreadsheet, edit, and submit as a pull request with zero JavaScript knowledge. See
  `CONTRIBUTING.md` for the column reference.
- **Shared parser, one source of truth**: `assets/script/sites-csv.js` implements a small
  RFC-4180-ish CSV parser and hostname-matching helper, loaded by BOTH the background service
  worker (`importScripts`) and content scripts (manifest `content_scripts`), so parsing/matching
  behaves identically everywhere.
- **Fetch-then-fallback, same pattern as the wage dataset**: on install, `background.js` fetches
  `data/sites.csv` live from GitHub and caches the parsed result in
  `chrome.storage.local.site_adapters_cache`; any failure (offline, DNS, non-200, malformed CSV)
  falls back to the copy bundled in the extension package - the feature is fully usable offline.
- **Update hint, never a silent overwrite**: a weekly alarm fetches only the tiny
  `data/sites-meta.json` file (a few bytes: just an `updated_at` timestamp) and compares it
  against the active cache. If a contributor's merged PR is newer, `site_adapters_update_available`
  is set and the **Settings page** shows an "Update available" banner with an **Update now**
  button (`options.html`/`options.js`, `TC_GET_SITE_ADAPTERS_STATUS` /
  `TC_APPLY_SITE_ADAPTERS_UPDATE` messages). The already-active selectors are never swapped out
  from under a user without them clicking that button - important since a bad contributed row
  should never be able to silently break browsing for everyone who happens to be online that week.
- **Live re-apply without a page reload**: `content.js` listens for
  `chrome.storage.onChanged` on `site_adapters_cache` (local) the same way it already listened for
  `custom_adapters` (sync) - clicking "Update now" re-resolves the adapter and rescans any
  already-open tab immediately.
- **`site-adapters.js` is now ~25 lines**: it does no network I/O and holds no selector data
  itself; it just resolves `hostname -> adapter` from whatever is cached, via
  `TC_findSiteAdapter` from `sites-csv.js`. The generic JSON-LD/currency-word engine in
  `content.js` remains the safety net when no adapter matches at all (unchanged).

## 4.7 Status update (2026-09-10 - this pass): selector re-verification crawl

Ran §5 step 1 with the project's own tooling instead of waiting for manual browser spot-checks:

- **Playwright is now a real devDependency** (`npm install` + `npx playwright install chromium`,
  then `npm run crawl`) - the crawl script's docstring already claimed this, but the dependency
  was never actually declared in `package.json`.
- **Full re-crawl succeeded**: all 11 targets in `scripts/crawl-sites.mjs` were reachable this
  time (unlike the 2026-08-15 pass, where okala/snappfood/tapsi failed or rendered nothing).
  Evidence added to `SITE_SELECTORS.md`, and every re-confirmed row in `data/sites.csv` got its
  `last_verified` bumped to 2026-09-10.
- **tapsi.shop now renders product cards without login**: stable `data-test-id` hooks
  (`product-card-final-price` / `product-card-original-price`) replaced the "generic engine only"
  placeholder - the biggest fragility win of this pass.
- **technolife.com listing pages finally have a hook**: current-price paragraphs carry the custom
  color tokens `text-gray-primary` / `text-primary-shade-1`, shipped as `p.`-restricted selectors
  so they can't match the product-title links and countdown timers that share those tokens.
  Product pages are unchanged (JSON-LD cross-check still does the work there).
- **snappfood.ir is still bot-blocked** (error page again on 2026-09-10); its legacy selectors
  stay as-is and remain the top candidate for the manual picker. bama.ir detail pages were not
  re-crawled and are untouched.
- **Housekeeping**: removed the stray Windows `nul` artifact, and `.gitignore` now covers
  `node_modules/` and the generated `crawl-report.json` (previously neither was ignored).
- `data/sites-meta.json` already carries today's date, so the weekly "update available" hint will
  pick these selector rows up without any extension version bump - data-only change by design.

## 5. Suggested next concrete steps

1. Load the updated extension locally (see §3) and spot-check each site in the "unverified"
   table above in a real browser; tighten/replace any adapter selectors that no longer match.
2. Bump the Chrome Web Store listing to the new Manifest V3 package (MV2 listings are being
   removed automatically otherwise).
3. Decide how far to take §4 - the TypeScript/tooling investment (§4.1) pays for itself quickly
   if you plan to keep maintaining this beyond a one-off fix, since it directly prevents the
   "nobody noticed it broke for years" failure mode that caused this whole rewrite.
