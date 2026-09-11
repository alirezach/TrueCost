/**
 * digits.js
 * Utilities for converting between Persian/Arabic-Indic and Western (English) numerals.
 * Replaces the old copy of these helpers that used to live inside the jQuery bundle.
 */
(function (global) {
    'use strict';

    var PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    var ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

    /**
     * Converts Persian/Arabic-Indic digits found in a string to English digits.
     * Any other characters are left untouched.
     * @param {*} input
     * @returns {string}
     */
    function toEnglishDigits(input) {
        if (input === undefined || input === null) {
            return '';
        }
        return String(input).replace(/[۰-۹٠-٩]/g, function (ch) {
            var persianIndex = PERSIAN_DIGITS.indexOf(ch);
            if (persianIndex > -1) {
                return String(persianIndex);
            }
            var arabicIndex = ARABIC_DIGITS.indexOf(ch);
            if (arabicIndex > -1) {
                return String(arabicIndex);
            }
            return ch;
        });
    }

    /**
     * Converts English digits found in a string to Persian digits.
     * @param {*} input
     * @returns {string}
     */
    function toPersianDigits(input) {
        if (input === undefined || input === null) {
            return '';
        }
        return String(input).replace(/[0-9]/g, function (d) {
            return PERSIAN_DIGITS[Number(d)];
        });
    }

    global.toEnglishDigits = toEnglishDigits;
    global.toPersianDigits = toPersianDigits;
})(typeof window !== 'undefined' ? window : this);
