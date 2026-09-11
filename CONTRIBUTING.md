# Contributing to True Cost

Thanks for your interest in contributing!

## Development Setup

1. Clone the repo: `git clone https://github.com/alirezach/TrueCost.git`
2. Load in Chrome: `chrome://extensions` → Enable Developer Mode → Load Unpacked → select the repo folder
3. Make changes, refresh the extension icon to test

## Running Tests

```bash
npm install
npm test
```

## Proposing a New Site Selector

All per-site selectors live in a single collaborative table: **`data/sites.csv`**. This is a
plain CSV file (open it in Excel/Sheets/any text editor) so anyone can add or fix a row and send
a pull request - no JavaScript knowledge required. The extension fetches this file from GitHub on
install and lets users pull updates on demand from the "Site Database" section in Settings (see
§ "How selector updates reach users" below), so a merged PR helps everyone within a week without
an extension store release.

### Columns

| Column | Required | Meaning |
|---|---|---|
| `id` | yes | Short unique slug, e.g. `digikala` |
| `hostname` | yes | Bare hostname without `www.`, e.g. `digikala.com`. Matches the hostname itself and any subdomain. |
| `url_pattern` | no | Informational match pattern shown in docs/UI, e.g. `https://www.digikala.com/*` |
| `price_selectors` | no | One or more CSS selectors, separated by `\|` (pipe), tried in order. Leave empty to rely on the generic JSON-LD/currency-word engine only. |
| `currency_label_selectors` | no | CSS selectors (pipe-separated) for a separate "currency unit" label to blank out when replacing text in-place |
| `default_currency` | yes | `Toman` or `Rial` |
| `enabled` | yes | `true` or `false` - set to `false` to temporarily disable a broken row without deleting it |
| `last_verified` | recommended | ISO date (`YYYY-MM-DD`) you last confirmed the selector live |
| `contributor` | recommended | Your name/handle, for credit |
| `notes_en` / `notes_fa` | recommended | Short context for future maintainers (why this selector, any caveats) |

Selectors containing a literal `"` or `,` must be CSV-quoted with doubled quotes, e.g.
`"[data-testid=""price-final""]"`. See existing rows in `data/sites.csv` for examples.

**After editing `data/sites.csv`, also bump `"updated_at"` in `data/sites-meta.json`** (ISO-8601
UTC, e.g. `2026-09-20T00:00:00Z`) - this tiny file is what the extension polls weekly to detect
that an update exists, without re-downloading the full CSV every time.

### How selector updates reach users

1. On **first install**, the extension fetches `data/sites.csv` live from GitHub and uses it
   immediately (falling back to the bundled copy if offline).
2. Thereafter, it checks the small `data/sites-meta.json` file **weekly**. If your merged PR
   bumped `updated_at`, every user's Settings page shows an "Update available" hint with an
   **Update now** button - selectors are never silently swapped out from under an already-working
   setup.

### Alternative: the in-page picker

If you don't want to inspect the DOM by hand, use the **manual picker** (gear icon in the popup →
"Pick a price on this page"). It highlights elements on hover, computes a CSS selector on click,
and saves it locally to your own browser immediately. It also has a "Suggest this to all users"
button that opens a pre-filled GitHub issue with the selector/URL/sample text - a maintainer can
turn that into a `data/sites.csv` row and PR on your behalf.

## Proposing Wage Updates

Edit `data/wage-dataset.json` and open a pull request. Include your source URL and a brief note in both Farsi and English.

## Code Style

- Plain JavaScript (no build step, no TypeScript yet)
- IIFE pattern for content scripts
- RTL/Farsi-first UI
- `ponytail:` comments for deliberate simplifications

## Pull Requests

- Keep PRs focused on a single change
- Describe what changed and why
- Test on at least one supported site before submitting
