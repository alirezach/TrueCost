# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in True Cost, please report it via [GitHub Issues](https://github.com/alirezach/TrueCost/issues). Do **not** disclose vulnerabilities publicly.

## Minimal Permissions Design

True Cost uses the minimum permissions necessary:

- **`storage`** – to save your wage and display settings locally
- **`activeTab`** – to inject the price picker on the current tab only
- **`scripting`** – to run the picker script on demand

No broad host permissions (`<all_urls>`) are requested. Content scripts are only injected on the specific sites listed in the manifest.

## Data Safety

- All data stays in your browser (`chrome.storage.sync`)
- No external servers are contacted except for a single GitHub raw file fetch (wage dataset)
- No user browsing data is collected or transmitted
