/**
 * popup.js – popup controller for the True Cost extension.
 *
 * Storage keys (chrome.storage.sync):
 * hourly_wages – hourly wage number (Toman)
 * daily_hours – work hours per day
 * daily – calculation mode: 0 = hours (default), 1 = days, 2 = months
 * show_popup – 1 = floating badge on hover, 0 = inline replacement (default)
 * is_active – 1 = extension active, 0 = paused
 */
(function () {
    'use strict';

    function toEnglishDigits(str) {
        return String(str)
            .replace(/۰/g, '0').replace(/۱/g, '1').replace(/۲/g, '2').replace(/۳/g, '3').replace(/۴/g, '4')
            .replace(/۵/g, '5').replace(/۶/g, '6').replace(/۷/g, '7').replace(/۸/g, '8').replace(/۹/g, '9');
    }

    function separateDigit(value) {
        var digits = toEnglishDigits(value).replace(/[^\d]/g, '');
        var n = digits ? parseInt(digits, 10) : 0;
        return n === 0 ? '' : n.toLocaleString('en-US');
    }

    function store(patch) {
        chrome.storage.sync.set(patch);
    }

    var el = {};

    function setCalcMode(mode) {
        store({ daily: mode });
        el.calcMode.querySelectorAll('.seg_btn').forEach(function (btn) {
            btn.classList.toggle('on', Number(btn.dataset.mode) === mode);
        });
    }

    function refreshActiveState(isActive) {
        el.statusChip.textContent = isActive ? 'فعال' : 'غیرفعال';
        el.statusChip.classList.toggle('off', !isActive);
        el.statusBeacon.style.background = isActive ? 'var(--emerald)' : '#64748b';
        el.statusBeacon.style.boxShadow = isActive ? '0 0 14px rgba(16,185,129,.6)' : 'none';
        el.beaconPing.style.display = isActive ? 'block' : 'none';
        el.activeSub.textContent = isActive ? 'آماده جایگزینی قیمت در صفحات' : 'افزونه غیرفعال است';
    }

    // Sites with a verified adapter in data/sites.csv and a static content_script match in
    // manifest.json - kept in sync manually with that list. Any OTHER site can still be
    // activated per-visit/per-origin via the opt-in banner below (chrome.permissions.request),
    // which never runs without the user explicitly clicking "فعال‌سازی" for that exact site.
    var KNOWN_SITES = [
        'https://torob.com',
        'https://emalls.ir',
        'https://www.digikala.com',
        'https://www.technolife.com',
        'https://technolife.com',
        'https://www.okala.com',
        'https://tapsi.shop',
        'https://bama.ir',
        'https://divar.ir',
        'https://snappfood.ir',
        'https://snappshop.ir',
        'https://www.snappshop.ir',
        'https://khodro45.com',
        'https://www.khodro45.com',
        'https://shopino.app',
        'https://www.shopino.app'
    ];

    var CONTENT_SCRIPT_FILES = [
        'assets/script/digits.js',
        'assets/script/calculator.js',
        'assets/script/sites-csv.js',
        'assets/script/site-adapters.js',
        'assets/script/content.js'
    ];
    var CONTENT_STYLE_FILES = ['assets/style/tooltip.css'];

    function getOriginPattern(urlStr) {
        try {
            var u = new URL(urlStr);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') {
                return null;
            }
            return u.protocol + '//' + u.hostname + '/*';
        } catch (e) {
            return null;
        }
    }

    function setUnlockedUi(unlocked) {
        document.getElementById('popup_header').classList.toggle('inactive', !unlocked);
        document.getElementById('popup_form').classList.toggle('blurred', !unlocked);
    }

    function ensureExtraSiteBanner() {
        var banner = document.getElementById('extra_site_banner');
        if (banner) {
            return banner;
        }
        banner = document.createElement('div');
        banner.id = 'extra_site_banner';
        banner.className = 'btn_supported';
        banner.innerHTML =
            '<span id="extra_site_banner_text">این سایت در فهرست رسمی نیست. برای فعال‌سازی آزمایشی روی همین سایت، مرورگر یک مجوز دسترسی فقط برای همین دامنه از شما می‌پرسد.</span>' +
            '<button id="extra_site_enable_btn" type="button" class="chip">فعال‌سازی روی این سایت</button>';
        var header = document.getElementById('popup_header');
        header.insertAdjacentElement('afterend', banner);
        return banner;
    }

    function showExtraSiteBanner(originPattern, tabId) {
        var banner = ensureExtraSiteBanner();
        var textEl = document.getElementById('extra_site_banner_text');
        var btn = document.getElementById('extra_site_enable_btn');
        textEl.textContent = 'این سایت در فهرست رسمی نیست. برای فعال‌سازی آزمایشی روی همین سایت، مرورگر یک مجوز دسترسی فقط برای همین دامنه از شما می‌پرسد.';
        btn.disabled = false;
        btn.textContent = 'فعال‌سازی روی این سایت';
        btn.onclick = function () {
            btn.disabled = true;
            btn.textContent = 'در حال درخواست مجوز…';
            chrome.permissions.request({ origins: [originPattern] }, function (granted) {
                if (chrome.runtime.lastError || !granted) {
                    btn.disabled = false;
                    btn.textContent = 'فعال‌سازی روی این سایت';
                    textEl.textContent = 'مجوز داده نشد. بدون آن، افزونه فقط روی سایت‌های فهرست رسمی فعال می‌ماند.';
                    return;
                }
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: CONTENT_SCRIPT_FILES
                }, function () {
                    chrome.scripting.insertCSS({ target: { tabId: tabId }, files: CONTENT_STYLE_FILES }, function () { /* best-effort */ });
                    // Persist activation for future page loads/tabs on this origin without
                    // requiring the user to click the button again every time.
                    try {
                        chrome.scripting.registerContentScripts([{
                            id: 'tc-dynamic-' + originPattern,
                            matches: [originPattern],
                            js: CONTENT_SCRIPT_FILES,
                            css: CONTENT_STYLE_FILES,
                            runAt: 'document_idle'
                        }], function () { /* ignore "already registered" errors on repeat grants */ chrome.runtime.lastError; });
                    } catch (e) { /* registerContentScripts unavailable in older Chrome - the current tab still works via executeScript above */ }
                    banner.classList.remove('active');
                    setUnlockedUi(true);
                });
            });
        };
        banner.classList.add('active');
    }

    function hideExtraSiteBanner() {
        var banner = document.getElementById('extra_site_banner');
        if (banner) {
            banner.classList.remove('active');
        }
    }

    function markCurrentTabSupport() {
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            var tab = tabs && tabs[0];
            var url = tab && typeof tab.url === 'string' ? tab.url : '';
            var supported = KNOWN_SITES.some(function (site) { return url.indexOf(site) > -1; });

            if (supported) {
                document.getElementById('supported_notice').classList.remove('active');
                hideExtraSiteBanner();
                setUnlockedUi(true);
                return;
            }

            var originPattern = getOriginPattern(url);
            if (!originPattern || !tab || !tab.id) {
                // Non-http(s) pages (chrome://, file://, the Web Store, etc.) - nothing to activate.
                document.getElementById('supported_notice').classList.add('active');
                hideExtraSiteBanner();
                setUnlockedUi(false);
                return;
            }

            document.getElementById('supported_notice').classList.remove('active');

            chrome.permissions.contains({ origins: [originPattern] }, function (alreadyGranted) {
                if (alreadyGranted) {
                    hideExtraSiteBanner();
                    setUnlockedUi(true);
                } else {
                    setUnlockedUi(false);
                    showExtraSiteBanner(originPattern, tab.id);
                }
            });
        });
    }

    function bindEvents() {
        // Wage input: keep only digits, pretty-print with thousands separators
        el.hourlyWages.addEventListener('input', function () {
            el.hourlyWages.value = separateDigit(el.hourlyWages.value);
        });
        el.hourlyWages.addEventListener('change', function () {
            store({ hourly_wages: toEnglishDigits(el.hourlyWages.value).replace(/[^\d]/g, '') });
        });

        // Wage preset chips
        el.form.querySelectorAll('.chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var wage = chip.dataset.wage;
                el.hourlyWages.value = separateDigit(wage);
                store({ hourly_wages: wage });
            });
        });

        // Daily hours + steppers
        el.dailyHours.addEventListener('change', function () {
            store({ daily_hours: el.dailyHours.value });
        });
        document.getElementById('hours_up').addEventListener('click', function () {
            var v = Math.min(20, (parseInt(el.dailyHours.value, 10) || 8) + 1);
            el.dailyHours.value = v;
            store({ daily_hours: v });
        });
        document.getElementById('hours_down').addEventListener('click', function () {
            var v = Math.max(1, (parseInt(el.dailyHours.value, 10) || 8) - 1);
            el.dailyHours.value = v;
            store({ daily_hours: v });
        });

        // Calculation mode segmented control: 0 hour / 1 day / 2 month
        el.calcMode.querySelectorAll('.seg_btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setCalcMode(Number(btn.dataset.mode) || 0);
            });
        });

        // Toggles
        el.showPopup.addEventListener('change', function () {
            store({ show_popup: el.showPopup.checked ? 1 : 0 });
        });
        el.switch.addEventListener('change', function () {
            store({ is_active: el.switch.checked ? 1 : 0 });
            refreshActiveState(el.switch.checked);
        });

        // Settings + picker
        el.openSettings.addEventListener('click', function () {
            chrome.runtime.openOptionsPage();
        });
        el.pickBtn.addEventListener('click', function () {
            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                if (!tabs || !tabs[0] || !tabs[0].id) return;
                var tab = tabs[0];
                var originPattern = tab.url ? getOriginPattern(tab.url) : null;

                el.pickStatus.hidden = false;

                function injectPicker() {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['assets/script/picker.js']
                    }, function () {
                        if (chrome.runtime.lastError) {
                            el.pickStatus.textContent = 'خطا: امکان اجرای picker روی این صفحه وجود ندارد';
                            el.pickStatus.classList.add('error');
                            return;
                        }
                        el.pickStatus.classList.remove('error');
                        el.pickBtn.classList.add('active');
                        el.pickStatus.textContent = 'نشانه‌گر فعال شد — یک قیمت را کلیک کنید';
                    });
                }

                function injectEngineAndPicker() {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: CONTENT_SCRIPT_FILES
                    }, function () {
                        if (chrome.runtime.lastError) {
                            el.pickStatus.textContent = 'خطا: امکان فعال‌سازی موتور روی این صفحه وجود ندارد';
                            el.pickStatus.classList.add('error');
                            return;
                        }
                        chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: CONTENT_STYLE_FILES }, function () { /* best-effort */ });
                        injectPicker();
                    });
                }

                if (!originPattern) {
                    el.pickStatus.textContent = 'خطا: امکان اجرای picker روی این صفحه وجود ندارد';
                    el.pickStatus.classList.add('error');
                    return;
                }

                chrome.permissions.contains({ origins: [originPattern] }, function (granted) {
                    if (granted) {
                        // Host permission already exists (listed site or previously activated) -
                        // engine is either already running or can be safely injected now so the
                        // selector the user is about to save takes effect without a reload.
                        injectEngineAndPicker();
                        return;
                    }
                    // Not granted yet: ask for this exact origin, then inject engine + picker.
                    chrome.permissions.request({ origins: [originPattern] }, function (nowGranted) {
                        if (chrome.runtime.lastError || !nowGranted) {
                            el.pickStatus.textContent = 'بدون تأیید دسترسی، انتخابگر فقط در حالت پیش‌نمایش کار می‌کند و ذخیره نمی‌شود.';
                            el.pickStatus.classList.add('error');
                            return;
                        }
                        // Persist engine for future visits on this origin.
                        try {
                            chrome.scripting.registerContentScripts([{
                                id: 'tc-dynamic-' + originPattern,
                                matches: [originPattern],
                                js: CONTENT_SCRIPT_FILES,
                                css: CONTENT_STYLE_FILES,
                                runAt: 'document_idle'
                            }], function () { chrome.runtime.lastError; });
                        } catch (e) { /* older Chrome without registerContentScripts */ }
                        injectEngineAndPicker();
                    });
                });
            });
        });
    }

    function render(result) {
        // Defaults on first run
        if (result.daily === undefined) {
            store({ daily: 0 });
        }
        if (result.show_popup === undefined) {
            store({ show_popup: 0 }); // inline mode is the default, not the floating popup
        }
        if (result.hourly_wages === undefined) {
            store({ hourly_wages: 75605 }); // 1405 statutory minimum hourly wage
            result.hourly_wages = 75605;
        }
        if (result.daily_hours === undefined) {
            store({ daily_hours: 8 });
            result.daily_hours = 8;
        }
        if (result.is_active === undefined) {
            store({ is_active: 1 });
            result.is_active = 1;
        }

        el.hourlyWages.value = separateDigit(result.hourly_wages);
        el.dailyHours.value = result.daily_hours;
        el.showPopup.checked = Number(result.show_popup) === 1;
        el.switch.checked = Number(result.is_active) !== 0;
        setCalcMode(Number(result.daily) || 0);
        refreshActiveState(Number(result.is_active) !== 0);
    }

    document.addEventListener('DOMContentLoaded', function () {
        el = {
            form: document.getElementById('popup_form'),
            hourlyWages: document.getElementById('hourly_wages'),
            dailyHours: document.getElementById('daily_hours'),
            calcMode: document.getElementById('calc_mode'),
            showPopup: document.getElementById('show_popup'),
            switch: document.getElementById('switch'),
            openSettings: document.getElementById('open_settings_btn'),
            pickBtn: document.getElementById('pick_price_btn'),
            pickStatus: document.getElementById('pick_price_status'),
            statusChip: document.getElementById('status_chip'),
            statusBeacon: document.getElementById('status_beacon'),
            beaconPing: document.getElementById('status_beacon_ping'),
            activeSub: document.getElementById('active_sub')
        };

        bindEvents();

        try {
            document.getElementById('version_badge').textContent = 'v' + chrome.runtime.getManifest().version;
        } catch (e) { /* file:// preview without the extension runtime */ }

        chrome.storage.sync.get(
            ['hourly_wages', 'daily_hours', 'is_active', 'daily', 'show_popup'],
            render
        );

        markCurrentTabSupport();
    });
})();
