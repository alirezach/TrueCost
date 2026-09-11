/**
 * picker.js – Manual price element picker.
 * Injected by popup.js via chrome.scripting.executeScript.
 * Lets the user click a price element on the page; computes a CSS selector
 * and saves it as a custom adapter in chrome.storage.sync.custom_adapters.
 */
(function () {
    'use strict';

    // Double-injection guard
    if (window.__tcPickerActive) {
        return;
    }
    window.__tcPickerActive = true;

    // ---- Injected style ----
    var style = document.createElement('style');
    style.textContent =
        '#tc-picker-banner {' +
        '  position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
        '  background:#2d527c;color:#fff;padding:12px 16px;text-align:center;' +
        '  font-family:sans-serif;font-size:14px;direction:rtl;' +
        '  box-shadow:0 2px 8px rgba(0,0,0,0.3);' +
        '}' +
        '#tc-picker-banner a{color:#fff;text-decoration:underline;cursor:pointer;margin:0 8px;}' +
        '.tc-picker-highlight{' +
        '  outline:3px solid #ff6b35!important;outline-offset:2px;' +
        '  background:rgba(255,107,53,0.08)!important;' +
        '}' +
        '#tc-picker-confirm{' +
        '  position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
        '  background:#fff;border-radius:12px;padding:20px;min-width:320px;max-width:420px;' +
        '  box-shadow:0 4px 24px rgba(0,0,0,0.25);font-family:sans-serif;direction:rtl;' +
        '}' +
        '#tc-picker-confirm h3{margin:0 0 12px;font-size:15px;color:#2d527c;}' +
        '#tc-picker-confirm .tc-row{margin-bottom:10px;}' +
        '#tc-picker-confirm label{display:block;font-size:12px;color:#666;margin-bottom:3px;}' +
        '#tc-picker-confirm .tc-val{background:#f5f5f5;padding:6px 8px;border-radius:6px;font-size:12px;direction:ltr;text-align:left;word-break:break-all;max-height:60px;overflow:auto;}' +
        '#tc-picker-confirm input[type=radio]{margin-left:4px;}' +
        '#tc-picker-confirm .tc-btns{display:flex;gap:8px;margin-top:12px;justify-content:flex-start;}' +
        '#tc-picker-confirm button{padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-family:inherit;}' +
        '#tc-picker-confirm .btn-save{background:#2d527c;color:#fff;}' +
        '#tc-picker-confirm .btn-save:hover{background:#1e3a5f;}' +
        '#tc-picker-confirm .btn-again{background:#eee;color:#333;}' +
        '#tc-picker-confirm .btn-cancel{background:#fee;color:#c00;}' +
        '#tc-picker-confirm .btn-suggest{background:#e8f0fe;color:#2d527c;font-size:11px;margin-right:auto;}' +
        '#tc-picker-confirm .tc-suggest-row{margin-top:8px;border-top:1px solid #eee;padding-top:8px;}' +
        '';
    document.head.appendChild(style);

    // ---- Banner ----
    var banner = document.createElement('div');
    banner.id = 'tc-picker-banner';
    banner.textContent = 'یک عنصر قیمت را انتخاب کنید — Escape برای لغو';
    document.body.appendChild(banner);

    // ---- State ----
    var highlighted = null;
    var captured = false;

    // ---- Selector computation ----
    function computeSelector(el) {
        // Prefer stable attributes
        if (el.dataset && el.dataset.testid) {
            return '[data-testid="' + el.dataset.testid + '"]';
        }
        if (el.getAttribute && el.getAttribute('aria-label')) {
            return '[aria-label="' + el.getAttribute('aria-label') + '"]';
        }
        if (el.className && typeof el.className === 'string') {
            var classes = el.className.trim().split(/\s+/).filter(function (c) {
                return c && !c.match(/^(tc-|active|selected)/);
            });
            if (classes.length > 0 && classes.length <= 3) {
                var sel = classes.map(function (c) { return '.' + CSS.escape(c); }).join('');
                try {
                    if (document.querySelectorAll(sel).length === 1) {
                        return sel;
                    }
                } catch (e) { /* fall through to structural path */ }
            }
        }
        // Structural nth-child path
        var parts = [];
        var node = el;
        while (node && node !== document.body) {
            if (node.nodeType === 1) {
                var tag = node.tagName.toLowerCase();
                var parent = node.parentElement;
                if (parent) {
                    var siblings = Array.prototype.filter.call(parent.children, function (c) {
                        return c.tagName === node.tagName;
                    });
                    if (siblings.length > 1) {
                        var idx = siblings.indexOf(node) + 1;
                        tag += ':nth-of-type(' + idx + ')';
                    }
                }
                parts.unshift(tag);
            }
            node = node.parentElement;
        }
        return parts.join(' > ');
    }

    // ---- Mouse move handler ----
    function onMouseMove(e) {
        if (captured) return;
        if (highlighted) {
            highlighted.classList.remove('tc-picker-highlight');
        }
        highlighted = e.target;
        if (highlighted && highlighted !== banner && highlighted !== document.body) {
            highlighted.classList.add('tc-picker-highlight');
        }
    }

    // ---- Click handler ----
    function onClick(e) {
        if (captured) return;
        e.preventDefault();
        e.stopPropagation();
        captured = true;

        var el = e.target;
        if (!el || el === banner || el === document.body) {
            captured = false;
            return;
        }

        if (highlighted) {
            highlighted.classList.remove('tc-picker-highlight');
        }

        var text = (el.textContent || '').trim().substring(0, 200);
        var selector = computeSelector(el);

        showConfirmPanel(el, text, selector);
    }

    function showConfirmPanel(el, text, selector) {
        var panel = document.createElement('div');
        panel.id = 'tc-picker-confirm';
        panel.innerHTML =
            '<h3>انتخاب قیمت ثبت شد</h3>' +
            '<div class="tc-row"><label>متن عنصر:</label><div class="tc-val">' + escapeHtml(text) + '</div></div>' +
            '<div class="tc-row"><label>CSS Selector:</label><div class="tc-val">' + escapeHtml(selector) + '</div></div>' +
            '<div class="tc-row">' +
            '<label>واحد پول:</label>' +
            '<label><input type="radio" name="tc-cur" value="Toman" checked> تومان</label>' +
            '<label><input type="radio" name="tc-cur" value="Rial"> ریال</label>' +
            '</div>' +
            '<div class="tc-btns">' +
            '<button class="btn-save">ذخیره</button>' +
            '<button class="btn-again">انتخاب مجدد</button>' +
            '<button class="btn-cancel">لغو</button>' +
            '</div>' +
            '<div class="tc-suggest-row">' +
            '<button class="btn-suggest">پیشنهاد این سایت به همه کاربران</button>' +
            '</div>';

        document.body.appendChild(panel);

        // Save button
        panel.querySelector('.btn-save').addEventListener('click', function () {
            var cur = panel.querySelector('input[name="tc-cur"]:checked').value;
            var host = window.location.hostname;
            chrome.storage.sync.get(['custom_adapters'], function (result) {
                var all = result.custom_adapters || {};
                all[host] = { selector: selector, currency: cur };
                chrome.storage.sync.set({ custom_adapters: all }, function () {
                    cleanup();
                    // Notify content.js to re-scan
                    window.postMessage({ type: 'TC_ADAPTER_SAVED', host: host }, '*');
                });
            });
        });

        // Pick again
        panel.querySelector('.btn-again').addEventListener('click', function () {
            panel.remove();
            captured = false;
        });

        // Cancel
        panel.querySelector('.btn-cancel').addEventListener('click', cleanup);

        // Suggest to all users — opens a pre-filled GitHub issue
        panel.querySelector('.btn-suggest').addEventListener('click', function () {
            var title = encodeURIComponent('New site selector: ' + window.location.hostname);
            var body = encodeURIComponent(
                '**Site**: ' + window.location.hostname + '\n' +
                '**URL**: ' + window.location.href + '\n' +
                '**Selector**: `' + selector + '`\n' +
                '**Currency**: ' + (panel.querySelector('input[name="tc-cur"]:checked').value) + '\n' +
                '**Sample text**: ' + text + '\n\n' +
                '---\n_This issue was auto-filled by the True Cost manual picker._'
            );
            window.open('https://github.com/alirezach/TrueCost/issues/new?title=' + title + '&body=' + body, '_blank');
        });
    }

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---- Escape key handler ----
    function onKeyDown(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
    }

    // ---- Cleanup ----
    function cleanup() {
        if (highlighted) {
            highlighted.classList.remove('tc-picker-highlight');
        }
        if (banner) banner.remove();
        var panel = document.getElementById('tc-picker-confirm');
        if (panel) panel.remove();
        if (style) style.remove();
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
        window.__tcPickerActive = false;
    }

    // ---- Start ----
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
})();
