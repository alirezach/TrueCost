# True Cost (هزینهٔ واقعی)

[![CI](https://github.com/alirezach/TrueCost/actions/workflows/ci.yml/badge.svg)](https://github.com/alirezach/TrueCost/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**قیمت یک عدد اسمی است. هزینهٔ واقعی، زمانی از عمر شماست که برای به‌دست‌آوردنش کار کرده‌اید.**

True Cost کاری ساده اما رادیکال انجام می‌دهد: قیمت هر کالا را — همان‌جا، روی صفحهٔ فروشگاه اینترنتی — بر اساس دستمزد ساعتی شما به «ساعت یا روز کار» تبدیل می‌کند. عددی که روی برچسب قیمت می‌بینید، رابطهٔ شما با پول را پنهان می‌کند؛ اما وقتی همان عدد به «۴ ساعت کار» یا «نصف یک روز کاری» ترجمه شود، رابطهٔ واقعی‌تری بین دستمزد، تورم، و قدرت خریدتان آشکار می‌شود — دقیقاً همان چیزی که در بحث‌های نابرابری اقتصادی و فاصلهٔ روزافزون بین دستمزد اسمی و هزینهٔ زندگی واقعی، معمولاً پنهان می‌ماند. این افزونه ابزار محاسبه نیست؛ ابزار دیدن است.

**Price is a nominal number. True cost is the slice of your life you traded to earn it.**

True Cost does something simple but quietly radical: it converts every price you see on Iranian online shops into the hours or days of work it actually costs you, based on your own hourly wage. A price tag hides your real relationship to money — translate it into "4 hours of your life" and that relationship becomes impossible to ignore. Non-Persian speakers are very welcome here too: the detection engine and codebase are written to be currency-agnostic under the hood, and adding support for USD, EUR, GBP and other currencies in a future release is an explicit, tracked goal (see [Roadmap](#نقشه-راه--roadmap) below) — contributions toward that are especially welcome.

## نصب

فعلاً این افزونه روی Chrome Web Store منتشر نشده است. برای نصب، از صفحهٔ **Releases** استفاده کنید:

1. به صفحهٔ [Releases](https://github.com/alirezach/TrueCost/releases) بروید و آخرین نسخه (فایل `.zip`) را دانلود کنید.
2. فایل زیپ را از حالت فشرده خارج کنید (Extract).
3. در کروم به آدرس `chrome://extensions` بروید.
4. گزینهٔ **Developer mode** (حالت توسعه‌دهنده) را در گوشهٔ بالا-راست فعال کنید.
5. روی **Load unpacked** کلیک کنید و پوشهٔ استخراج‌شده را انتخاب کنید.
6. آیکون افزونه را باز کنید، دستمزد ساعتی خود را وارد کنید و از یکی از سایت‌های پشتیبانی‌شده بازدید کنید.

## سایت‌های پشتیبانی‌شده

وضعیت هر سایت بر اساس آخرین بررسی مستند در [`SITE_SELECTORS.md`](./SITE_SELECTORS.md):

| سایت | وضعیت |
|---|---|
| [digikala.com](https://www.digikala.com) | ✅ تأییدشده (سلکتور اختصاصی) |
| [torob.com](https://torob.com) | ✅ تأییدشده (سلکتور + JSON-LD) |
| [emalls.ir](https://emalls.ir) | ✅ تأییدشده (سلکتور + JSON-LD) |
| [divar.ir](https://divar.ir) | ✅ تأییدشده (سلکتور + JSON-LD) |
| [technolife.com](https://www.technolife.com) | ✅ تأییدشده (سلکتور اختصاصی) |
| [tapsi.shop](https://tapsi.shop) | ✅ تأییدشده (سلکتور اختصاصی) |
| [okala.com](https://www.okala.com) | ⚠️ فقط موتور تشخیص عمومی |
| [bama.ir](https://bama.ir) | ⚠️ تأییدنشده روی صفحات جزئیات آگهی |
| [snappfood.ir](https://snappfood.ir) | ❌ فعلاً مسدود توسط محافظت ضدربات سایت |

حتی روی سایت‌های بدون سلکتور اختصاصی، یک **موتور تشخیص عمومی** (اسکن داده‌های ساختاریافتهٔ JSON-LD + تشخیص متن قیمت) به‌عنوان شبکهٔ ایمنی همیشه فعال است — همین موتور پایه‌ای است که افزودن واحدهای پولی و سایت‌های غیرایرانی در آینده را ممکن می‌کند.

## پایگاه دادهٔ مشارکتی سلکتورها

سلکتورهای CSS هر سایت در فایل [`data/sites.csv`](./data/sites.csv) نگه‌داری می‌شوند — یک جدول ساده که هرکسی می‌تواند بدون دانش جاوااسکریپت آن را ویرایش و Pull Request بفرستد.

- وقتی سایتی بازطراحی می‌شود و تشخیص قیمت از کار می‌افتد، هرکسی می‌تواند سلکتور جدید را در همین فایل اصلاح کند.
- افزونه هفته‌ای یک‌بار فایل کوچک [`data/sites-meta.json`](./data/sites-meta.json) را چک می‌کند و در صورت وجود به‌روزرسانی، در تنظیمات پیام «به‌روزرسانی موجود است» نمایش می‌دهد — سلکتورهای فعال شما هرگز بدون تأیید خودتان جایگزین نمی‌شوند.
- دیتاست پیشنهادی حداقل دستمزد هم به همین شکل در [`data/wage-dataset.json`](./data/wage-dataset.json) مشارکتی نگه‌داری می‌شود.

جزئیات ستون‌ها و روند کار در [CONTRIBUTING.md](./CONTRIBUTING.md).

## امکانات

- بدون jQuery، بدون هیچ درخواست شبکه‌ای به‌جز دریافت دیتاست دستمزد/سلکتور از گیت‌هاب
- تشخیص خودکار قیمت از سه مسیر: سلکتور اختصاصی سایت، داده‌های ساختاریافتهٔ JSON-LD، و اسکن عمومی متن قیمت
- **حالت دستی**: انتخاب هر عنصر قیمتی روی هر سایتی (شبیه DevTools مرورگر) و ذخیرهٔ آن به‌عنوان سلکتور شخصی — یا ارسال آن به مخزن به‌صورت GitHub Issue آماده
- رابط کاربری فارسی/انگلیسی
- سوییچ واحد پول تومان/ریال، دستمزد ساعتی با پیشنهاد هوشمند از دیتاست

## فونت

رابط کاربری این افزونه از فونت زیبا و کاملاً رایگان **[وزیرمتن (Vazirmatn)](https://github.com/rastikerdar/vazirmatn)** استفاده می‌کند؛ اثری از **مرحوم صابر راستی‌کردار** عزیز، که یکی از باکیفیت‌ترین و پرکاربردترین فونت‌های فارسی متن‌باز را برای جامعهٔ فارسی‌زبان به میراث گذاشت. یادش گرامی.

## حریم خصوصی و امنیت

- تمام تنظیمات (دستمزد، زبان، سلکتورهای شخصی) فقط در `chrome.storage.sync` محلی مرورگر شما ذخیره می‌شود.
- تنها درخواست شبکه‌ای خروجی، دریافت فایل‌های دیتاست/سلکتور از گیت‌هاب است؛ هیچ داده‌ای از شما جمع‌آوری یا ارسال نمی‌شود.
- جزئیات کامل در [PRIVACY.md](./PRIVACY.md) و [SECURITY.md](./SECURITY.md).

## توسعه

```bash
git clone https://github.com/alirezach/TrueCost.git
cd TrueCost
npm install
npm test          # تست‌های واحد (vitest)
npm run crawl     # کرال مجدد سایت‌های زنده و مقایسهٔ سلکتورها (ابزار دولوپری)
```

راهنمای کامل مشارکت در [CONTRIBUTING.md](./CONTRIBUTING.md).

## نقشه راه / Roadmap

- افزودن واحدهای پولی غیرایرانی (دلار، یورو، پوند و...) به موتور تشخیص عمومی، برای استفاده روی فروشگاه‌های غیرایرانی — Adding non-Iranian currencies (USD, EUR, GBP, etc.) to the generic detection engine, so the extension becomes usable on non-Iranian shops too.
- بومی‌سازی کامل رابط کاربری به انگلیسی (`chrome.i18n`) به‌جای متن‌های ثابت دوزبانه — Full English localization via `chrome.i18n`.
- پشتیبانی از Firefox و Edge — Firefox/Edge support.

اگر از کشوری غیر از ایران هستید و دوست دارید در توسعهٔ پشتیبانی چندارزی یا بومی‌سازی انگلیسی مشارکت کنید، خوشحال می‌شویم؛ به [CONTRIBUTING.md](./CONTRIBUTING.md) مراجعه کنید.

## ایده و تاریخچه

پشت هر برچسب قیمتی یک عدد پنهان وجود دارد: اینکه باید چند ساعت از زندگی‌تان را برای آن معامله کنید. True Cost همین عدد را آشکار می‌کند.

این پروژه ادامه و بازنویسی یک ایدهٔ قدیمی‌تر است:

- **ایدهٔ اصلی**: مفهوم *«عمر من»* — اکستنشنی که هیچ‌وقت منتشر نشد — که توسط [جاوید ایزدفر](https://twitter.com/JavidIzadfar) به‌صورت عمومی مطرح شد. مقالهٔ ایشان: [«عمر من»: اکستنشنی که هیچ‌وقت منتشر نمی‌کنم!](https://virgool.io/@JavidIzadfar/عمر-من-اکستنشنی-که-هیچوقت-منتشر-نمیکنم-ro0ruevctaio)
- **اولین پیاده‌سازی**: *Iranian Lifetime Calculator*، ساختهٔ **[محمود اسکندری](https://github.com/mahmoud-eskandari)** در سال ۲۰۱۸ — اولین نسخهٔ کارکردی و انتشار آن روی Chrome Web Store کار ایشان بوده. مخزن اصلی: [mahmoud-eskandari/IPTT](https://github.com/mahmoud-eskandari/IPTT). مشارکت‌های اولیه از [یحیی صیادعرب‌آبادی](https://github.com/TheYahya) (حالت محاسبهٔ روزانه) و حسین مرزبان (رابط کاربری).
- **این ادامه**: پس از از کار افتادن نسخهٔ اصلی، افزونه از صفر بازسازی شد و با نام **True Cost** توسط [AliRezaCh](https://github.com/alirezach) ادامه یافت — پیش‌تر در مخزن [alirezach/IPTT](https://github.com/alirezach/IPTT) توسعه داده می‌شد.

## مجوز

[MIT](./LICENSE)
