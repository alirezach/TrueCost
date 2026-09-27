# Releasing True Cost

The Chrome extension version is defined by `manifest.json`. The first Chrome Web Store submission uses **2.0.0**; `manifest_version: 3` refers to the Chrome extension platform and must not be confused with the extension version. Older GitHub releases (for example v3.4.2) were development artifacts, not the Chrome Web Store version history.

## First store submission (2.0.0)

1. In GitHub Actions, open the manual **Release** workflow on the `main` branch. Select **current** for `version_bump`. Do not select the default **patch**, which would create 2.0.1 instead of 2.0.0.
2. Wait for the workflow to pass all tests and the packaged ZIP manifest/icon checks. If it fails, fix the failure before uploading anything.
3. Download `TrueCost-2.0.0-chrome.zip` from the **Assets** of release `v2.0.0`. Do not upload GitHub's auto-generated **Source code (zip)** archive.
4. Upload that ZIP to the Chrome Web Store. Check that its root contains `manifest.json` and paths such as `assets/img/icons/truecost_16.png`, with no leading `./` in the manifest.

## Subsequent updates

After the first successful 2.0.0 release, run the same workflow with **patch** for 2.0.1, **minor** for 2.1.0, or **major** for 3.0.0. Always upload the new release asset ZIP, not a source archive. Never change `manifest_version` as part of ordinary extension version bumps. The workflow uses `manifest.json` as the source of truth, runs `npm ci` and `npm test`, validates the ZIP, and commits the bumped manifest version for future releases.

`package.json` and `package-lock.json` are Node development-tool metadata, not the packaged extension version; keep them synchronized with each other when updating npm metadata, but do not use them to infer the Chrome Web Store version.
