/**
 * popup.js – popup controller for the True Cost extension.
 *
 * Storage keys (chrome.storage.sync):
 *   hourly_wages  – hourly wage number (Toman)
 *   daily_hours   – work hours per day
 *   daily         – calculation mode: 0 = hours (default), 1 = days, 2 = months
 *   show_popup    – 1 = floating badge on hover, 0 = inline replacement (default)
 *   is_active     – 1 = extension active, 0 = paused
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

    var SUPPORTED_SITES = [
        'https://torob.com',
        'https://emalls.ir',
        'https://www.digikala.com',
        'https://www.technolife.com',
        'https://technolife.com',
        'https://www.okala.com',
        'https://tapsi.shop',
        'https://bama.ir',
        'https://divar.ir',
        'https://snappfood.ir'
    ];

    function markCurrentTabSupport() {
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            var url = tabs && tabs[0] && typeof tabs[0].url === 'string' ? tabs[0].url : '';
            var supported = SUPPORTED_SITES.some(function (site) { return url.indexOf(site) > -1; });
            document.getElementById('popup_header').classList.toggle('inactive', !supported);
            document.getElementById('popup_form').classList.toggle('blurred', !supported);
            document.getElementById('supported_notice').classList.toggle('active', !supported);
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
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['assets/script/picker.js']
                }, function () {
                    el.pickStatus.hidden = false;
                    if (chrome.runtime.lastError) {
                        el.pickStatus.textContent = 'خطا: امکان اجرای picker روی این صفحه وجود ندارد';
                        el.pickStatus.classList.add('error');
                        return;
                    }
                    el.pickStatus.classList.remove('error');
                    el.pickBtn.classList.add('active');
                    el.pickStatus.textContent = 'نشانه‌گر فعال شد — یک قیمت را کلیک کنید';
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
