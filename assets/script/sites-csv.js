/**
 * sites-csv.js
 * Shared CSV parsing + hostname-matching helpers for the collaborative site
 * selector database (data/sites.csv). Loaded by BOTH the background service
 * worker (via importScripts) and content scripts (via manifest
 * content_scripts), so the exact same parsing/matching logic runs everywhere -
 * one source of truth. See CONTRIBUTING.md for the column reference and how
 * to contribute a new row.
 *
 * Design goals:
 *  - Never throw on malformed input: one bad contributor row (typo, stray
 *    comma) must not break the whole database for every user - skip it.
 *  - No dependencies: this file is loaded via a plain <script>/importScripts,
 *    so it stays a small hand-rolled RFC 4180-ish parser (quoted fields,
 *    doubled-quote escaping, CRLF/LF).
 */
(function (global) {
    'use strict';

    var EXPECTED_COLUMNS = [
        'id', 'hostname', 'url_pattern', 'price_selectors', 'currency_label_selectors',
        'default_currency', 'enabled', 'last_verified', 'contributor', 'notes_en', 'notes_fa'
    ];

    function parseCsv(text) {
        var rows = [];
        var row = [];
        var field = '';
        var inQuotes = false;
        var i = 0;
        var len = text.length;

        function pushField() { row.push(field); field = ''; }
        function pushRow() { pushField(); rows.push(row); row = []; }

        while (i < len) {
            var ch = text.charAt(i);
            if (inQuotes) {
                if (ch === '"') {
                    if (text.charAt(i + 1) === '"') { field += '"'; i += 2; continue; }
                    inQuotes = false; i += 1; continue;
                }
                field += ch; i += 1; continue;
            }
            if (ch === '"') { inQuotes = true; i += 1; continue; }
            if (ch === ',') { pushField(); i += 1; continue; }
            if (ch === '\r') { i += 1; continue; } // normalize CRLF -> LF
            if (ch === '\n') { pushRow(); i += 1; continue; }
            field += ch; i += 1;
        }
        if (field.length > 0 || row.length > 0) { pushRow(); }
        return rows.filter(function (r) { return !(r.length === 1 && r[0] === ''); });
    }

    function splitMulti(value) {
        return String(value || '')
            .split('|')
            .map(function (s) { return s.trim(); })
            .filter(Boolean);
    }

    /**
     * Parses the sites.csv text into an array of adapter objects:
     *   { id, hostname, urlPattern, priceSelectors, currencyLabelSelectors,
     *     defaultCurrency, lastVerified, contributor, notesEn, notesFa }
     * Rows missing `id`/`hostname`, or with `enabled` set to "false", are
     * skipped. Returns [] (never throws) on unparsable input.
     */
    function parseSitesCsv(text) {
        var adapters = [];
        try {
            var rows = parseCsv(String(text || ''));
            if (rows.length < 2) {
                return adapters;
            }
            var headers = rows[0].map(function (h) { return String(h || '').trim(); });

            for (var r = 1; r < rows.length; r++) {
                var cells = rows[r];
                var obj = {};
                headers.forEach(function (h, idx) {
                    obj[h] = cells[idx] !== undefined ? String(cells[idx]).trim() : '';
                });

                if (!obj.id || !obj.hostname) { continue; }
                if (String(obj.enabled).toLowerCase() === 'false') { continue; }

                var priceSelectors = splitMulti(obj.price_selectors);
                var currencyLabelSelectors = splitMulti(obj.currency_label_selectors);

                adapters.push({
                    id: obj.id,
                    hostname: obj.hostname.toLowerCase().replace(/^www\./, ''),
                    urlPattern: obj.url_pattern || '',
                    priceSelectors: priceSelectors,
                    currencyLabelSelectors: currencyLabelSelectors.length ? currencyLabelSelectors : undefined,
                    defaultCurrency: obj.default_currency || 'Toman',
                    lastVerified: obj.last_verified || '',
                    contributor: obj.contributor || '',
                    notesEn: obj.notes_en || '',
                    notesFa: obj.notes_fa || ''
                });
            }
        } catch (e) {
            // Never let a malformed CSV break page rendering - callers fall back
            // to their own bundled/cached copy when this returns [].
            return [];
        }
        return adapters;
    }

    /** Suffix-based hostname match: "digikala.com" matches "www.digikala.com" and "digikala.com". */
    function hostMatchesAdapter(host, adapter) {
        if (!host || !adapter || !adapter.hostname) { return false; }
        var bare = String(host).toLowerCase().replace(/^www\./, '');
        return bare === adapter.hostname || bare.slice(-(adapter.hostname.length + 1)) === '.' + adapter.hostname;
    }

    function findSiteAdapter(adapters, hostname) {
        if (!Array.isArray(adapters)) { return null; }
        for (var i = 0; i < adapters.length; i++) {
            if (hostMatchesAdapter(hostname, adapters[i])) {
                return adapters[i];
            }
        }
        return null;
    }

    global.TC_SITES_CSV_COLUMNS = EXPECTED_COLUMNS;
    global.TC_parseSitesCsv = parseSitesCsv;
    global.TC_findSiteAdapter = findSiteAdapter;
})(typeof self !== 'undefined' ? self : this);
