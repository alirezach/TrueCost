/**
 * site-adapters.js
 * Content-script-side loader for the collaborative site adapter database.
 *
 * Selectors used to be hand-written and baked directly into this file, which
 * meant every fix required a full extension update. They now live in
 * data/sites.csv - a plain CSV table anyone can open in a spreadsheet, edit,
 * and send as a pull request (see CONTRIBUTING.md for the column reference).
 *
 * The background service worker (background.js) fetches that CSV from GitHub
 * on install and periodically thereafter, parses it with sites-csv.js, and
 * caches the result in chrome.storage.local under `site_adapters_cache`.
 * This file's only job is to read that cache and find the adapter (if any)
 * for the current hostname - it does no network I/O itself, so it works
 * offline using whatever was last cached. If the cache is somehow empty
 * (e.g. a fresh profile before the background worker has had a chance to
 * run), the generic currency-word/JSON-LD engine in content.js still covers
 * every site with zero configuration.
 */
(function (global) {
    'use strict';

    function getAdapter(hostname, callback) {
        try {
            chrome.storage.local.get(['site_adapters_cache'], function (result) {
                var cache = result && result.site_adapters_cache;
                var adapters = (cache && Array.isArray(cache.adapters)) ? cache.adapters : [];
                var found = global.TC_findSiteAdapter ? global.TC_findSiteAdapter(adapters, hostname) : null;
                callback(found);
            });
        } catch (e) {
            callback(null);
        }
    }

    global.TC_getAdapter = getAdapter;
})(typeof window !== 'undefined' ? window : this);
