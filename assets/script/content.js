/**
 * content.js
 * Main content-script engine: finds prices on the page and swaps them for a "life time" value.
 *
 * This replaces the old jQuery + per-site if/else blocks (append_view.js) with:
 *  1. Adapter selectors (site-adapters.js) - fast path, best-effort, may go stale.
 *  2. JSON-LD structured data (schema.org Product/Offer) - very stable, used by most modern
 *     storefronts for SEO rich snippets, so it tends to survive redesigns that break selectors.
 *  3. A generic "currency word" text scan - works on ANY site, no maintenance required.
 * A MutationObserver (instead of `setInterval(fn, 7777)`) reacts to SPA navigation/lazy
 * loading, and settings changes are applied live via `chrome.storage.onChanged` instead of
 * requiring a page refresh.
 */
(function () {
    'use strict';

    var CURRENCY_WORD_REGEX = /(تومان|ریال)/;
    var LABEL_PREFIX_REGEX = /^(از|شروع از|قیمت|starting from)[\s:]*/;
    // ٬ (U+066C ARABIC THOUSANDS SEPARATOR) and ٫ (U+066B ARABIC DECIMAL SEPARATOR) are both used
    // as grouping marks in the wild (confirmed live on torob.com and technolife.com), in addition
    // to the plain comma and Arabic comma.
    var SEPARATOR_CHARS = ',،٬\u066C\u066B \u200c\u00a0';
    var ALLOWED_LEAF_CHARS_REGEX = new RegExp('^[۰-۹0-9' + SEPARATOR_CHARS + ']+$');
    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, IFRAME: 1 };

    var settings = null;
    var adapter = null;
    var customAdapter = null; // per-hostname override saved via the manual picker (see picker.js)
    var knownTomanAmounts = null; // Set of integer amounts (Toman-equivalent) pulled from schema.org data
    var processedElements = [];
    var pendingNodes = [];
    var scheduled = false;

    function getSettings(callback) {
        chrome.storage.sync.get(
            ['hourly_wages', 'daily_hours', 'is_active', 'daily', 'show_popup', 'language'],
            function (result) {
                callback({
                    hourly_wages: Number(result.hourly_wages) || 0,
                    daily_hours: Number(result.daily_hours) || 8,
                    is_active: result.is_active === undefined ? 1 : result.is_active,
                    daily: Number(result.daily) || 0,
                    show_popup: result.show_popup === 1 ? 1 : 0,
                    language: result.language === 'en' ? 'en' : 'fa'
                });
            }
        );
    }

    // ---- JSON-LD structured data -------------------------------------------------------

    function collectJsonLdAmounts() {
        var amounts = {};

        // Iranian storefronts are inconsistent about what a schema.org "price" number actually
        // means: some (emalls.ir, divar.ir, torob.com) report the true Rial amount even though
        // the page displays it divided by 10 in Toman; others (technolife.com) report a number
        // that already equals the displayed Toman figure verbatim despite labelling
        // `priceCurrency: "IRR"`. Rather than trust the currency code, we register BOTH possible
        // on-page representations (the raw figure, and the raw figure divided by 10) as valid
        // "this bare number is a real price" signals, and always feed the *displayed* digits to
        // the calculator as Toman - see detectKnownTomanAmount() below.
        function pushAmount(value) {
            if (value === undefined || value === null) {
                return;
            }
            var digits = window.toEnglishDigits(String(value)).replace(/[^\d]/g, '');
            if (!digits) {
                return;
            }
            var num = parseInt(digits, 10);
            if (num > 0) {
                amounts[num] = true;
                amounts[Math.round(num / 10)] = true;
            }
        }

        function visit(node) {
            if (!node || typeof node !== 'object') {
                return;
            }
            if (node['@graph']) {
                var graph = Array.isArray(node['@graph']) ? node['@graph'] : [node['@graph']];
                graph.forEach(visit);
            }
            var offers = node.offers;
            if (offers) {
                var offerList = Array.isArray(offers) ? offers : [offers];
                offerList.forEach(function (offer) {
                    if (!offer || typeof offer !== 'object') {
                        return;
                    }
                    pushAmount(offer.price);
                    pushAmount(offer.lowPrice);
                    pushAmount(offer.highPrice);
                    if (offer.offers) {
                        var nested = Array.isArray(offer.offers) ? offer.offers : [offer.offers];
                        nested.forEach(function (o) { pushAmount(o && o.price); });
                    }
                });
            }
            pushAmount(node.price);
            pushAmount(node.lowPrice);
            pushAmount(node.highPrice);
        }

        var scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(function (script) {
            var data;
            try {
                data = JSON.parse(script.textContent);
            } catch (e) {
                return;
            }
            (Array.isArray(data) ? data : [data]).forEach(visit);
        });

        return amounts;
    }

    // ---- Element processing -------------------------------------------------------------

    // Floating badge ("پاپ‌آپ شناور" mode): a single reusable element appended to
    // document.body and positioned near the hovered price. CSS pseudo-element
    // tooltips (::before with content: attr(data-tc)) are invisible on most of these
    // storefronts because price elements sit inside overflow:hidden containers that
    // clip anything rendered outside the element's box - a fixed-position body child
    // cannot be clipped that way.
    var floatBadge = null;
    var floatHideTimer = null;

    function ensureFloatBadge() {
        if (!floatBadge) {
            floatBadge = document.createElement('div');
            floatBadge.className = 'tc-float';
            floatBadge.setAttribute('dir', 'auto');
            document.body.appendChild(floatBadge);
        }
        return floatBadge;
    }

    function showFloatBadge(el) {
        var value = el.getAttribute('data-tc');
        if (!value) {
            return;
        }
        var badge = ensureFloatBadge();
        badge.textContent = value;
        badge.classList.add('show');
        var rect = el.getBoundingClientRect();
        var top = rect.top - badge.offsetHeight - 8;
        if (top < 8) {
            top = rect.bottom + 8; // flip below when there is no room above
        }
        var left = rect.left + rect.width / 2 - badge.offsetWidth / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - badge.offsetWidth - 8));
        badge.style.top = top + 'px';
        badge.style.left = left + 'px';
    }

    function hideFloatBadge() {
        if (floatBadge) {
            floatBadge.classList.remove('show');
        }
    }

    // Delegated hover handling for every processed element (survives DOM updates).
    document.addEventListener('mouseover', function (event) {
        if (!settings || !settings.show_popup) {
            return;
        }
        var target = event.target && event.target.closest ? event.target.closest('[data-tc]') : null;
        if (target) {
            if (floatHideTimer) {
                clearTimeout(floatHideTimer);
                floatHideTimer = null;
            }
            showFloatBadge(target);
        }
    });
    document.addEventListener('mouseout', function (event) {
        if (!settings || !settings.show_popup) {
            return;
        }
        var target = event.target && event.target.closest ? event.target.closest('[data-tc]') : null;
        if (target) {
            // Small delay so moving between child nodes does not flicker the badge.
            if (floatHideTimer) {
                clearTimeout(floatHideTimer);
            }
            floatHideTimer = setTimeout(hideFloatBadge, 60);
        }
    });

    function applyDisplay(el) {
        var original = el.dataset.tcOriginal;
        var currency = el.dataset.tcCurrency;
        if (original === undefined) {
            return;
        }
        var calculated = window.TrueCostCalculator(original, currency, settings);
        if (calculated === null) {
            return;
        }
        if (settings.show_popup) {
            if (el.textContent !== original) {
                el.textContent = original;
            }
            el.setAttribute('data-tc', calculated);
            el.classList.add('tc-target');
        } else {
            el.removeAttribute('data-tc');
            el.classList.remove('tc-target');
            el.textContent = calculated;
        }
    }

    function processElement(el, currency) {
        if (el.dataset.tcOriginal !== undefined) {
            return; // already tracked; applyDisplay() handles recomputation on settings change
        }
        var original = el.textContent;
        if (!original || !original.trim()) {
            return;
        }
        el.dataset.tcOriginal = original;
        el.dataset.tcCurrency = currency;
        processedElements.push(el);
        applyDisplay(el);
    }

    function clearCurrencyLabels(root, currentAdapter) {
        if (settings.show_popup || !currentAdapter || !currentAdapter.currencyLabelSelectors) {
            return;
        }
        currentAdapter.currencyLabelSelectors.forEach(function (selector) {
            queryIncludingSelf(root, selector).forEach(function (el) {
                if (el.dataset.tcCleared === undefined) {
                    el.dataset.tcCleared = '1';
                    el.textContent = '';
                }
            });
        });
    }

    function queryIncludingSelf(root, selector) {
        var results = [];
        if (root.nodeType === 1 && root.matches && root.matches(selector)) {
            results.push(root);
        }
        if (root.querySelectorAll) {
            results = results.concat(Array.prototype.slice.call(root.querySelectorAll(selector)));
        }
        return results;
    }

    // ---- Detection strategies -------------------------------------------------------------

    function isLeafCandidate(el) {
        return el.nodeType === 1
            && !SKIP_TAGS[el.tagName]
            && !(el instanceof SVGElement) // SVG text (e.g. price-history charts) can't host our tooltip/:before overlay
            && el.children.length === 0
            && el.dataset.tcOriginal === undefined;
    }

    function detectGenericCurrencyLeaf(el) {
        var text = el.textContent;
        if (!text) {
            return null;
        }
        var trimmed = text.trim();
        if (trimmed.length < 2 || trimmed.length > 40 || !CURRENCY_WORD_REGEX.test(trimmed)) {
            return null;
        }
        var currency = /ریال/.test(trimmed) ? 'Rial' : 'Toman';
        var withoutCurrency = trimmed.replace(CURRENCY_WORD_REGEX, '').replace(LABEL_PREFIX_REGEX, '').trim();
        if (!withoutCurrency || !ALLOWED_LEAF_CHARS_REGEX.test(window.toEnglishDigits(withoutCurrency).trim())) {
            return null;
        }
        var digits = window.toEnglishDigits(withoutCurrency).replace(/[^\d]/g, '');
        if (digits.length < 2) {
            return null;
        }
        return currency;
    }

    function detectKnownTomanAmount(el) {
        if (!knownTomanAmounts) {
            return null;
        }
        var text = el.textContent;
        if (!text) {
            return null;
        }
        var trimmed = text.trim();
        if (trimmed.length < 2 || trimmed.length > 20) {
            return null;
        }
        if (!ALLOWED_LEAF_CHARS_REGEX.test(window.toEnglishDigits(trimmed))) {
            return null;
        }
        var digits = window.toEnglishDigits(trimmed).replace(/[^\d]/g, '');
        if (digits.length < 4) {
            return null;
        }
        var num = parseInt(digits, 10);
        // The bare number matched a schema.org price on this page (see collectJsonLdAmounts) -
        // treat it as the already-displayed Toman figure.
        return knownTomanAmounts[num] ? 'Toman' : null;
    }

    function activeAdapters() {
        var list = [];
        if (adapter) {
            list.push(adapter);
        }
        if (customAdapter) {
            list.push(customAdapter);
        }
        return list;
    }

    function scanRoot(root) {
        if (!settings || !settings.is_active || !settings.hourly_wages) {
            return;
        }

        activeAdapters().forEach(function (currentAdapter) {
            if (!currentAdapter.priceSelectors) {
                return;
            }
            currentAdapter.priceSelectors.forEach(function (selector) {
                var matches;
                try {
                    matches = queryIncludingSelf(root, selector);
                } catch (e) {
                    return; // a malformed/unsupported selector (e.g. from a custom adapter) must not break the page
                }
                matches.forEach(function (el) {
                    if (el.dataset.tcOriginal === undefined && el.textContent && el.textContent.trim()) {
                        var currency = /ریال/.test(el.textContent) ? 'Rial' : (currentAdapter.defaultCurrency || 'Toman');
                        processElement(el, currency);
                    }
                });
            });
            clearCurrencyLabels(root, currentAdapter);
        });

        var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
        var node = isLeafCandidate(root) ? root : walker.nextNode();
        while (node) {
            if (isLeafCandidate(node)) {
                var leafCurrency = detectGenericCurrencyLeaf(node) || detectKnownTomanAmount(node);
                if (leafCurrency) {
                    processElement(node, leafCurrency);
                }
            }
            node = walker.nextNode();
        }
    }

    function refreshAll() {
        processedElements.forEach(applyDisplay);
    }

    // Restore every processed element to its original text (used when the user
    // deactivates the extension) so no converted prices remain on the page.
    function deactivateAll() {
        hideFloatBadge();
        processedElements.forEach(function (el) {
            if (el.dataset.tcOriginal !== undefined) {
                el.textContent = el.dataset.tcOriginal;
            }
            el.removeAttribute('data-tc');
            el.classList.remove('tc-target');
            delete el.dataset.tcOriginal;
            delete el.dataset.tcCurrency;
        });
        processedElements = [];
        pendingNodes = [];
    }

    // ---- Scheduling -------------------------------------------------------------------

    function flushPending() {
        scheduled = false;
        var nodes = pendingNodes;
        pendingNodes = [];
        nodes.forEach(scanRoot);
    }

    function schedule(node) {
        pendingNodes.push(node);
        if (!scheduled) {
            scheduled = true;
            var run = window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); };
            run(flushPending);
        }
    }

    var observing = false;

    function startObserving() {
        if (observing) {
            return;
        }
        observing = true;
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) {
                        schedule(node);
                    }
                });
            });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function loadCustomAdapter(callback) {
        var host = window.location.hostname;
        chrome.storage.sync.get(['custom_adapters'], function (result) {
            var all = result.custom_adapters || {};
            var entry = all[host];
            if (!entry || !entry.selector) {
                customAdapter = null;
            } else {
                customAdapter = {
                    id: 'custom:' + host,
                    defaultCurrency: entry.currency || 'Toman',
                    priceSelectors: [entry.selector]
                };
            }
            callback();
        });
    }

    function init() {
        window.TC_getAdapter(window.location.hostname, function (foundAdapter) {
            adapter = foundAdapter;
            getSettings(function (loadedSettings) {
                settings = loadedSettings;
                if (!settings.is_active) {
                    return;
                }
                knownTomanAmounts = collectJsonLdAmounts();
                loadCustomAdapter(function () {
                    scanRoot(document.body);
                    startObserving();
                });
            });
        });
    }

    // React to settings changes without requiring a page reload.
    chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'local' && settings && changes.site_adapters_cache) {
            // The user clicked "Update now" in Settings, or a fresh cache just landed -
            // re-resolve the adapter for this hostname and rescan without a reload.
            window.TC_getAdapter(window.location.hostname, function (foundAdapter) {
                adapter = foundAdapter;
                scanRoot(document.body);
            });
        }
        if (areaName !== 'sync' || !settings) {
            return;
        }
        if (changes.custom_adapters) {
            loadCustomAdapter(function () {
                scanRoot(document.body);
            });
        }
        getSettings(function (loadedSettings) {
            var wasActive = settings.is_active;
            settings = loadedSettings;
            if (!settings.is_active) {
                // User paused the extension: put every page element back to the original price.
                deactivateAll();
                return;
            }
            if (!wasActive) {
                knownTomanAmounts = knownTomanAmounts || collectJsonLdAmounts();
            }
            if (processedElements.length === 0) {
                // Nothing tracked yet (e.g. the wage was unset when the page loaded):
                // a plain refreshAll() would be a no-op, so scan the page first.
                scanRoot(document.body);
            }
            refreshAll();
            startObserving();
        });
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
