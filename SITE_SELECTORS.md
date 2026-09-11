# Site Selector Research (live crawls: 2026-08-15, re-verified 2026-09-10)

> **Note:** the selectors themselves now live in the collaborative table **`data/sites.csv`**
> (see `CONTRIBUTING.md` for the column reference and how to submit a fix as a pull request).
> `assets/script/site-adapters.js` is just a thin loader that reads whatever the background
> worker cached from that CSV - it no longer hard-codes any selector. This document remains the
> **research evidence log** for why each row in `data/sites.csv` looks the way it does.

This table is the evidence behind `data/sites.csv`. Every row was captured with
a **real headless Chromium browser** (Playwright), not a static `curl` fetch, so it reflects what
actually renders after client-side JS runs - the same thing a human visitor's browser sees.

Method: for each URL, the page was loaded, given ~6-8s to hydrate, common consent/location
modals were dismissed, then every "leaf" DOM element (no child elements) whose text looked like a
price (a run of digits with separators, alone or next to `تومان`/`ریال`) was collected, along with
its tag, class list, a 4-ancestor path, and any `application/ld+json` blocks on the page.

## Findings

| Site | Page tested | Confirmed price element(s) | Currency word inline? | JSON-LD present? | Selector shipped |
|---|---|---|---|---|---|
| **digikala.com** | product page (`/product/dkp-10431820/`) + search/category page (re-verified 2026-09-10) | `span[data-testid="price-final"]` → `۵۸۴,۸۰۰`; `[data-testid="price-no-discount"]` → `۳۴۰,۰۰۰` (was-price). Same testids confirmed live on search/category listing pages too | No (bare number) | No (empty on this page) | `[data-testid="price-final"]`, `[data-testid="price-no-discount"]` |
| **torob.com** | product page + search results | `a.price.seller-element` / `div.inStoreSellerCard_price__Q3_cf` / `div.ProductCard_desktop_product-price-text__y20OV` → `۱٫۷۰۰٫۰۰۰ تومان`, `از ۲٫۹۰۰٫۰۰۰ تومان` | **Yes** | Yes - `Product`/`AggregateOffer`, real Rial amount | `[class*="price" i]` (substring, survives hash churn); generic engine alone already covers it |
| **emalls.ir** | product page | `span.shop-price`, `.price` → `۱,۵۵۵,۰۰۰` (bare); `b` inside `.price-achare` → `۵۰۰,۰۰۰ تومان` | Mixed (some bare) | Yes - `Product`/`AggregateOffer`, real Rial amount, confirmed `/10` matches the displayed Toman figure | `.price`, `.shop-price` (+ JSON-LD cross-check for the bare ones) |
| **technolife.com** | product page (`/product-58643/...`) + homepage (re-crawled 2026-09-10) | Product page: bare `p` elements → `14,800,000` / `۱۴٬۸۰۰٬۰۰۰`. **Homepage/listing cards (new 2026-09-10):** current price is a `p` whose only stable hook is Technolife's custom color token — `p.text-gray-primary` → `۲٬۹۹۰٬۰۰۰` or `p.text-primary-shade-1` → `۳۴۱٬۰۰۰٬۰۰۰`; was-prices are `p` + `line-through` + `text-gray`/`text-primary-tint-5` (deliberately not targeted — `p` restriction avoids matching the `a` product-title links and `time` countdowns that share the color tokens) | No | **Product pages only**: `Product`/`AggregateOffer`, and here the raw JSON-LD number (`14800000`) equals the *displayed* Toman number exactly (no `/10`, despite `priceCurrency: "IRR"`); homepage JSON-LD has no per-product offers | `p.text-gray-primary`, `p.text-primary-shade-1` (listing/home; product pages still rely on the JSON-LD cross-check) |
| **okala.com** | homepage carousel | `p.body-price-tag` (current), `p.body-price-tag-2.line-through` (was-price), both carry `aria-label="قیمت کالا"` on the current-price paragraph | No | Only `Organization` (no per-product data on the pages reached) | `[aria-label="قیمت کالا"]`, `.body-price-tag` |
| **tapsi.shop** | homepage (re-crawled 2026-09-10) | **Now renders product cards without login.** `span[data-test-id="product-card-final-price"]` → `۲۴۷٬۰۰۰`; `span[data-test-id="product-card-original-price"]` → `۲۶۳٬۰۰۰` (was-price); one hashed-MUI span carries `۱۵۳,۰۰۰ تومان` inline (generic engine catches that one) | Mixed | `Organization`/`WebSite`/`LocalBusiness` only | `span[data-test-id="product-card-final-price"]`, `span[data-test-id="product-card-original-price"]` (new 2026-09-10) |
| **snappfood.ir** | homepage, search, a chain page | Site returned a generic error page to the automated crawler every time (likely bot/geo protection); **re-attempted 2026-09-10, still error page** | - | - | kept previous `​.kk-price`/`.price-value` as best-effort; **unverified** |
| **bama.ir** | homepage, `/car`, `/car/samand-lx` | homepage/`/car` rendered no individual ad prices in the time budget; `/car/samand-lx` timed out | - | - | kept previous `span[itemprop=price]` as best-effort; **unverified this pass** |
| **divar.ir** | category listing (`/s/tehran/mobile-phones`) | `div.kt-post-card__description` → `۹۹,۰۰۰,۰۰۰ تومان` | **Yes** | Yes - large `Product`/`Offer` array, real Rial amounts | `.kt-post-card__description` (+ old ad-detail-page selectors kept, unverified) |

## Notable engine fixes this research produced

- **Separator characters**: Torob uses `٫` (U+066B ARABIC DECIMAL SEPARATOR) and Technolife uses
  `٬` (U+066C ARABIC THOUSANDS SEPARATOR) as thousands grouping marks - both are now recognized
  (previously only `٬` was).
- **JSON-LD currency ambiguity**: sites disagree on whether a JSON-LD `price` number is the true
  Rial amount (divide by 10 to get the displayed Toman figure - emalls.ir, divar.ir, torob.com) or
  already equals the displayed Toman figure verbatim despite saying `"priceCurrency":"IRR"`
  (technolife.com). The engine now registers **both interpretations** as valid "this bare number
  is a real price" signals and always feeds the *displayed* digits to the calculator as Toman,
  instead of assuming Rial and getting Technolife off by 10x.
- **SVG exclusion**: emalls.ir's price-history chart renders numbers inside `<tspan>` (SVG); the
  engine now skips SVG elements since they can't host the CSS tooltip overlay.

## Re-verification pass (2026-09-10)

`scripts/crawl-sites.mjs` was re-run end-to-end (all 11 targets reachable this time; Playwright is
now a devDependency). Outcome per site:

- **Still matching, no change needed**: digikala (`price-final`/`price-no-discount` on product AND
  search pages), torob (`[class*="price" i]` still hits `Showcase_buy_box_text__*`,
  `a.price.seller-element`, `ProductCard_desktop_product-price-text__*`), emalls (`.shop-price`),
  okala (`[aria-label="قیمت کالا"]`), divar (`.kt-post-card__description`).
- **New selectors shipped**: tapsi.shop (see table) and technolife.com listing pages (see table).
- **Still unverifiable**: snappfood.ir (bot-blocked again), bama.ir detail pages (only homepage
  crawled this pass; the `itemprop` microdata selectors were left untouched).

## Known gaps / recommended follow-up

- **snappfood.ir** and **bama.ir** detail pages have no verified automated selector. Use the
  in-extension manual picker (see PLAN.md §4, "manual mode") to point the engine at the right
  element next time you're browsing one of these with a real, logged-in browser session, and it
  will be remembered (and optionally submitted upstream) without needing another research pass
  like this one.
- Re-run `scripts/crawl-sites.mjs` periodically (`npm run crawl`, e.g. from CI, see PLAN.md §4.1)
  since every finding above is a snapshot of one specific deploy of each site.
