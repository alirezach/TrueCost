/**
 * calculator.js
 * Pure conversion logic: turns a raw price string into a "life time" (hours/days) string.
 *
 * This is a rewrite of the old `TrueCostCalculator`. Fixes compared to the legacy version:
 *  - No longer silently gives up on prices that don't contain a comma (the old code returned
 *    the raw string unchanged for anything like "500" or "12.000" written without a ",").
 *  - Normalizes Persian/Arabic-Indic digits and every common thousands-separator
 *    (",", "،", "٬", " ") before parsing, instead of only handling "," and " ".
 *  - Returns `null` on invalid/zero input instead of an empty string or the original text,
 *    so callers can decide how to handle "not a price" cases explicitly.
 */
(function (global) {
    'use strict';

    /**
     * Extracts a positive integer amount out of a raw price string, tolerant of:
     *  - Persian/Arabic-Indic digits
     *  - "," "،" "٬" and whitespace as thousands separators
     *  - stray currency words/symbols mixed into the string
     * @param {string} rawText
     * @returns {number} NaN when nothing usable was found
     */
    function extractAmount(rawText) {
        if (rawText === undefined || rawText === null) {
            return NaN;
        }
        var normalized = global.toEnglishDigits(String(rawText));
        var digitsOnly = normalized.replace(/[^\d]/g, '');
        if (!digitsOnly) {
            return NaN;
        }
        return parseInt(digitsOnly, 10);
    }

    /**
     * @param {string} priceString Raw price text scraped from the page.
     * @param {"Toman"|"Rial"} unit Currency unit the raw price is expressed in.
     * @param {{hourly_wages:number, daily_hours:number, daily:number, language?:string}} options
     *   User settings. `options.daily` selects the display mode: 0 = hours of work (default),
     *   1 = days of work, 2 = months of work (30 days of `daily_hours`). `options.language`
     *   ('fa' default, or 'en') controls the output string's language/digits; it does not
     *   affect parsing of the input `priceString`.
     * @returns {string|null} Human readable string, or null when it can't be computed.
     */
    function TrueCostCalculator(priceString, unit, options) {
        var amount = extractAmount(priceString);
        if (isNaN(amount) || amount <= 0) {
            return null;
        }

        var priceInToman = unit === 'Rial' ? amount / 10 : amount;

        var hourlyWage = Number(options && options.hourly_wages);
        if (!hourlyWage || hourlyWage <= 0) {
            return null;
        }

        var isEnglish = options && options.language === 'en';
        var fmt = isEnglish ? function (n) { return String(n); } : global.toPersianDigits;

        var dailyHours = Number(options && options.daily_hours) || 8;

        if (options.daily === 2) {
            var months = Math.round((priceInToman / hourlyWage / dailyHours / 30) * 100) / 100;
            return isEnglish ? fmt(months) + ' months' : fmt(months) + ' ماه';
        }

        if (options.daily === 1) {
            var days = Math.round((priceInToman / hourlyWage / dailyHours) * 100) / 100;
            if (days > 30) {
                var months = Math.floor(days / 30);
                var remainingDays = Math.round(days % 30);
                return isEnglish
                    ? fmt(months) + 'mo ' + fmt(remainingDays) + 'd'
                    : fmt(months) + ' ماه و ' + fmt(remainingDays) + ' روز';
            }
            return isEnglish ? fmt(days) + ' days' : fmt(days) + ' روز';
        }

        var totalHours = priceInToman / hourlyWage;
        var hours = Math.floor(totalHours);
        var minutes = Math.round((totalHours - hours) * 60);
        if (minutes === 60) {
            hours += 1;
            minutes = 0;
        }
        var minutesPadded = minutes < 10 ? '0' + minutes : String(minutes);
        return isEnglish
            ? fmt(hours) + ':' + fmt(minutesPadded) + ' hrs work'
            : fmt(hours) + ':' + fmt(minutesPadded) + ' ساعت کار';
    }

    global.TrueCostCalculator = TrueCostCalculator;
    global.TC_extractAmount = extractAmount;
})(typeof window !== 'undefined' ? window : this);
