/**
 * options.js – Settings page controller.
 * Manages: language toggle, currency display, wage input, suggested wages, custom adapters.
 */
(function () {
    'use strict';

    var STORAGE_KEYS = ['hourly_wages', 'daily_hours', 'is_active', 'daily', 'show_popup', 'language', 'currency', 'custom_adapters'];

    // ---- Helpers ----

    function toEnglishDigits(str) {
        return String(str)
            .replace(/۰/g, '0').replace(/۱/g, '1').replace(/۲/g, '2').replace(/۳/g, '3').replace(/۴/g, '4')
            .replace(/۵/g, '5').replace(/۶/g, '6').replace(/۷/g, '7').replace(/۸/g, '8').replace(/۹/g, '9');
    }

    function separateDigit(num) {
        var s = toEnglishDigits(String(num)).replace(/[^\d]/g, '');
        var n = s ? parseInt(s, 10) : 0;
        return n === 0 ? '' : n.toLocaleString('en-US');
    }

    // ---- Language ----

    var i18n = {
        fa: {
            pageTitle: 'تنظیمات - True Cost',
            pageHeading: 'تنظیمات',
            brandTagline: 'قیمت واقعی = ساعت کار شما',
            languageLabel: 'زبان برنامه',
            langFa: 'فارسی',
            langEn: 'English',
            currencyLabel: 'واحد نمایش دستمزد',
            curToman: 'تومان',
            curRial: 'ریال',
            wageSectionTitle: 'دستمزد به ساعت',
            wageLabel: 'دستمزد شما به ساعت',
            suggestedTitle: 'دستمزد پیشنهادی',
            suggestedHint: 'بر اساس داده‌های به‌روز، می‌توانید یکی از مقادیر زیر را انتخاب کنید.',
            customAdaptersTitle: 'انتخاب‌های دستی قیمت روی سایت‌ها',
            customAdaptersEmpty: 'هنوز هیچ انتخاب دستی‌ای ثبت نشده است.',
            footerText: 'ساخته شده با ❤ در Github',
            adapterDelete: 'حذف',
            wageSourceDataset: 'مقدار پیش‌فرض از دستمزد قانونی',
            siteDbTitle: 'پایگاه داده سایت‌ها',
            siteDbSourceRemote: 'برخط (GitHub)',
            siteDbSourceBundled: 'داخلی (آفلاین)',
            siteDbStatusTemplate: '{count} سایت پشتیبانی می‌شود · منبع: {source} · آخرین به‌روزرسانی: {date}',
            siteDbUpdateHint: 'نسخه‌ جدیدی از سلکتورهای سایت‌ها روی گیت‌هاب منتشر شده است.',
            siteDbUpdateButton: 'به‌روزرسانی هم‌اکنون',
            siteDbUpdateSuccess: 'پایگاه داده سایت‌ها با موفقیت به‌روزرسانی شد.',
            siteDbUpdateFailed: 'به‌روزرسانی ناموفق بود. اتصال اینترنت را بررسی کنید.',
            siteDbContribute: 'مشارکت در بهبود سلکتورها روی گیت‌هاب'
        },
        en: {
            pageTitle: 'Settings - True Cost',
            pageHeading: 'Settings',
            brandTagline: 'Real cost = your hours of work',
            languageLabel: 'Language',
            langFa: 'فارسی',
            langEn: 'English',
            currencyLabel: 'Wage display unit',
            curToman: 'Toman',
            curRial: 'Rial',
            wageSectionTitle: 'Hourly Wage',
            wageLabel: 'Your hourly wage',
            suggestedTitle: 'Suggested Wages',
            suggestedHint: 'Based on up-to-date data, you can pick one of the values below.',
            customAdaptersTitle: 'Manual Price Selectors',
            customAdaptersEmpty: 'No manual selectors saved yet.',
            footerText: 'Made with ❤ on Github',
            adapterDelete: 'Remove',
            wageSourceDataset: 'Default from statutory minimum wage',
            siteDbTitle: 'Site Database',
            siteDbSourceRemote: 'Live (GitHub)',
            siteDbSourceBundled: 'Bundled (offline)',
            siteDbStatusTemplate: '{count} sites supported · Source: {source} · Last updated: {date}',
            siteDbUpdateHint: 'A newer version of the site selector database is available on GitHub.',
            siteDbUpdateButton: 'Update now',
            siteDbUpdateSuccess: 'Site database updated successfully.',
            siteDbUpdateFailed: 'Update failed. Check your internet connection.',
            siteDbContribute: 'Contribute selector fixes on GitHub'
        }
    };

    function applyLanguage(lang) {
        var strings = i18n[lang] || i18n.fa;
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (strings[key]) {
                el.textContent = strings[key];
            }
        });
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
        document.title = strings.pageTitle;
    }

    function markSeg(segEl, attr, value) {
        segEl.querySelectorAll('.seg_btn').forEach(function (btn) {
            btn.classList.toggle('on', btn.getAttribute(attr) === value);
        });
    }

    // ---- Init ----

    document.addEventListener('DOMContentLoaded', function () {
        var langSeg = document.getElementById('language_seg');
        var curSeg = document.getElementById('currency_seg');
        var wageInput = document.getElementById('hourly_wages_input');
        var wageUnitLabel = document.getElementById('wage_unit_label');
        var wageSourceNote = document.getElementById('wage_source_note');
        var suggestedSection = document.getElementById('suggested_section');
        var suggestedList = document.getElementById('suggested_list');
        var adaptersList = document.getElementById('custom_adapters_list');
        var adaptersEmpty = document.getElementById('custom_adapters_empty');
        var siteDbStatusEl = document.getElementById('site_db_status');
        var siteDbBanner = document.getElementById('site_db_update_banner');
        var siteDbUpdateBtn = document.getElementById('site_db_update_btn');
        var siteDbUpdateResult = document.getElementById('site_db_update_result');
        var lastSiteDbStatus = null;

        // ---- Site database (collaborative sites.csv) status ----

        function formatSiteDbStatus(status, lang) {
            var strings = i18n[lang] || i18n.fa;
            if (!status) {
                return '';
            }
            var sourceLabel = status.source === 'remote' ? strings.siteDbSourceRemote : strings.siteDbSourceBundled;
            var dateStr = status.updatedAt
                ? new Date(status.updatedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fa-IR')
                : '-';
            return strings.siteDbStatusTemplate
                .replace('{count}', status.count)
                .replace('{source}', sourceLabel)
                .replace('{date}', dateStr);
        }

        function renderSiteDbStatus(status, lang) {
            lastSiteDbStatus = status;
            siteDbStatusEl.textContent = formatSiteDbStatus(status, lang);
            siteDbBanner.hidden = !status.updateAvailable;
        }

        function loadSiteDbStatus(lang) {
            chrome.runtime.sendMessage({ type: 'TC_GET_SITE_ADAPTERS_STATUS' }, function (status) {
                if (!status) {
                    return;
                }
                renderSiteDbStatus(status, lang);
            });
        }

        siteDbUpdateBtn.addEventListener('click', function () {
            siteDbUpdateBtn.disabled = true;
            chrome.runtime.sendMessage({ type: 'TC_APPLY_SITE_ADAPTERS_UPDATE' }, function (status) {
                siteDbUpdateBtn.disabled = false;
                chrome.storage.sync.get(['language'], function (r) {
                    var lang = r.language || 'fa';
                    if (!status || status.error) {
                        siteDbUpdateResult.textContent = i18n[lang].siteDbUpdateFailed;
                        return;
                    }
                    renderSiteDbStatus(status, lang);
                    siteDbUpdateResult.textContent = i18n[lang].siteDbUpdateSuccess;
                });
            });
        });

        chrome.storage.sync.get(STORAGE_KEYS, function (result) {
            // Language
            var lang = result.language || 'fa';
            markSeg(langSeg, 'data-lang', lang);
            applyLanguage(lang);

            // Currency
            var cur = result.currency || 'toman';
            markSeg(curSeg, 'data-cur', cur);
            wageUnitLabel.textContent = cur === 'rial' ? i18n[lang].curRial : i18n[lang].curToman;

            // Wage
            var wage = Number(result.hourly_wages) || 0;
            wageInput.value = separateDigit(wage);

            if (result.wage_source === 'dataset') {
                wageSourceNote.textContent = i18n[lang].wageSourceDataset;
            }

            loadSiteDbStatus(lang);
        });

        // Language segmented control
        langSeg.querySelectorAll('.seg_btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var lang = btn.getAttribute('data-lang');
                chrome.storage.sync.set({ language: lang }, function () {
                    markSeg(langSeg, 'data-lang', lang);
                    applyLanguage(lang);
                    chrome.storage.sync.get(['currency'], function (r) {
                        var cur = r.currency || 'toman';
                        wageUnitLabel.textContent = cur === 'rial' ? i18n[lang].curRial : i18n[lang].curToman;
                    });
                    if (lastSiteDbStatus) {
                        renderSiteDbStatus(lastSiteDbStatus, lang);
                    }
                });
            });
        });

        // Currency segmented control
        curSeg.querySelectorAll('.seg_btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var cur = btn.getAttribute('data-cur');
                chrome.storage.sync.set({ currency: cur }, function () {
                    markSeg(curSeg, 'data-cur', cur);
                    chrome.storage.sync.get(['language'], function (r) {
                        var lang = r.language || 'fa';
                        wageUnitLabel.textContent = cur === 'rial' ? i18n[lang].curRial : i18n[lang].curToman;
                    });
                });
            });
        });

        // Wage input
        wageInput.addEventListener('input', function () {
            wageInput.value = separateDigit(wageInput.value);
        });
        wageInput.addEventListener('change', function () {
            var raw = wageInput.value.replace(/[^\d]/g, '');
            chrome.storage.sync.set({ hourly_wages: raw ? parseInt(raw, 10) : 0, wage_source: 'manual' });
        });

        // Suggested wages from dataset
        chrome.runtime.sendMessage({ type: 'TC_GET_WAGE_DATASET' }, function (dataset) {
            if (!dataset || !Array.isArray(dataset.entries) || dataset.entries.length === 0) {
                return;
            }
            suggestedSection.hidden = false;
            suggestedList.innerHTML = '';
            dataset.entries.forEach(function (entry) {
                var item = document.createElement('div');
                item.className = 'suggested_item';
                var label = langSeg.querySelector('.seg_btn.on').getAttribute('data-lang') === 'en' ? (entry.label_en || entry.label_fa) : (entry.label_fa || entry.label_en);
                item.innerHTML =
                    '<span class="label">' + label + '</span>' +
                    '<span class="wage">' + separateDigit(entry.hourly_wage) + '</span>';
                item.addEventListener('click', function () {
                    chrome.storage.sync.set({ hourly_wages: entry.hourly_wage, wage_source: 'dataset' }, function () {
                        wageInput.value = separateDigit(entry.hourly_wage);
                        wageSourceNote.textContent = i18n[langSeg.querySelector('.seg_btn.on').getAttribute('data-lang')].wageSourceDataset;
                        suggestedList.querySelectorAll('.suggested_item').forEach(function (s) {
                            s.classList.remove('selected');
                        });
                        item.classList.add('selected');
                    });
                });
                suggestedList.appendChild(item);
            });
        });

        // Custom adapters
        chrome.storage.sync.get(['custom_adapters'], function (result) {
            var all = result.custom_adapters || {};
            var keys = Object.keys(all);
            if (keys.length === 0) {
                adaptersEmpty.hidden = false;
                return;
            }
            adaptersEmpty.hidden = true;
            keys.forEach(function (host) {
                var entry = all[host];
                var div = document.createElement('div');
                div.className = 'adapter_item';
                div.innerHTML =
                    '<div>' +
                    '<div class="host">' + host + '</div>' +
                    '<div class="selector">' + (entry.selector || '') + '</div>' +
                    '</div>' +
                    '<button class="btn_delete" title="Remove">✕</button>';
                div.querySelector('.btn_delete').addEventListener('click', function () {
                    delete all[host];
                    chrome.storage.sync.set({ custom_adapters: all }, function () {
                        div.remove();
                        if (Object.keys(all).length === 0) {
                            adaptersEmpty.hidden = false;
                        }
                    });
                });
                adaptersList.appendChild(div);
            });
        });

        // Version badge
        try {
            document.getElementById('version_badge').textContent = 'v' + chrome.runtime.getManifest().version;
        } catch (e) { /* file:// preview without the extension runtime */ }
    });
})();
