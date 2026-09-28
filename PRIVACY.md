# Privacy Policy

**True Cost** respects your privacy. This page describes exactly what the extension stores and which network requests it makes. The short version: your settings and every calculation stay in your browser, and the extension only ever downloads public data files from its own GitHub repository.

## What is stored, and where

- **Your settings** (hourly wage, wage source, workday hours, display mode, language, currency, and any manual price selectors you saved) live in `chrome.storage.sync`. If you are signed in to Chrome with Chrome Sync enabled, Chrome itself may sync these values between your own browsers under your Google account and Chrome's sync settings; the extension has no access to that channel beyond writing the values.
- **Caches** (the suggested-wage dataset, the site-selector database, and the "update available" flag) live in `chrome.storage.local` and never leave your browser.
- There is no True Cost account. No price, page content, or browsing history is stored beyond the caches above, and nothing is sent anywhere by the extension itself.

## Network requests

The extension contacts only `raw.githubusercontent.com`, to download public files from the [True Cost repository](https://github.com/alirezach/TrueCost):

| File | When | Why |
| --- | --- | --- |
| `data/wage-dataset.json` | On install/update, then weekly | Suggests a default hourly wage (e.g. the statutory minimum wage) |
| `data/sites.csv` | On install, and when you click "Update now" in Settings | The collaborative site-selector database used to detect prices |
| `data/sites-meta.json` | On install, on browser startup, then weekly | A tiny version file, so Settings can tell you when newer selectors exist |

Every one of these has a bundled copy inside the extension package as a fallback, so a failed request (offline, blocked network, timeout) never breaks anything: the extension simply uses the bundled copy. These plain GET requests carry no credentials and contain nothing but the request itself.

Two more network-touching actions exist, both only ever triggered by you:

- **"Suggest this site"** in the manual price picker opens a `github.com` "new issue" page in a browser tab. The page URL, the selector you picked, the currency, and the element's sample text travel as parameters of that page's URL so the form is pre-filled. Nothing is published unless you then submit the issue yourself on GitHub.
- Links in the popup and Settings (repository, supported-sites list, contribution links) open GitHub pages when you click them, like any normal link.

Content scripts make no network requests at all; price conversion runs entirely on your device.

## No tracking

- No analytics or tracking scripts
- No cookies
- No personal data collection
- No advertising
- No third-party services beyond the GitHub file downloads above

## Open source

This extension is fully open source. You can audit the code at any time at [github.com/alirezach/TrueCost](https://github.com/alirezach/TrueCost).
