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
     *   1 = days of work (+ leftover real hours), 2 = months of work (30 work-days of
     *   `daily_hours` each) + leftover days + leftover real hours. `options.language`
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
        var totalWorkHours = priceInToman / hourlyWage;

        // Splits a fractional count of `dailyHours`-based work-days into whole days plus a
        // leftover expressed in real (0-23) clock hours, so the leftover never silently rolls
        // up into an even bigger unit (e.g. months) the way the old buggy formula used to.
        function splitDaysAndHours(totalWorkDaysFloat) {
            var days = Math.floor(totalWorkDaysFloat);
            var remHours = Math.round((totalWorkDaysFloat - days) * 24);
            if (remHours >= 24) {
                days += 1;
                remHours = 0;
            }
            return { days: days, hours: remHours };
        }

        if (options.daily === 2) {
            var totalWorkDays = totalWorkHours / dailyHours;
            var months = Math.floor(totalWorkDays / 30);
            var split = splitDaysAndHours(totalWorkDays - months * 30);
            if (split.days >= 30) {
                months += 1;
                split.days -= 30;
            }
            return isEnglish
                ? fmt(months) + 'mo ' + fmt(split.days) + 'd ' + fmt(split.hours) + 'h'
                : fmt(months) + ' ماه و ' + fmt(split.days) + ' روز و ' + fmt(split.hours) + ' ساعت';
        }

        if (options.daily === 1) {
            var split = splitDaysAndHours(totalWorkHours / dailyHours);
            return isEnglish
                ? fmt(split.days) + 'd ' + fmt(split.hours) + 'h'
                : fmt(split.days) + ' روز و ' + fmt(split.hours) + ' ساعت';
        }

        var hours = Math.floor(totalWorkHours);
        var minutes = Math.round((totalWorkHours - hours) * 60);
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
