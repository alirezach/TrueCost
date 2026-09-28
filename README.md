# True Cost (هزینهٔ واقعی)

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install_True_Cost-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/true-cost/icophkfcgelocckeklfbopgjikialcnc)
[![CI](https://github.com/alirezach/TrueCost/actions/workflows/ci.yml/badge.svg)](https://github.com/alirezach/TrueCost/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**نسخهٔ فعلی / Current version: 2.0.0**

**[نصب از Chrome Web Store / Install from the Chrome Web Store](https://chromewebstore.google.com/detail/true-cost/icophkfcgelocckeklfbopgjikialcnc)**

**قیمت یک عدد اسمی است. هزینهٔ واقعی، زمانی از عمر شماست که برای به‌دست‌آوردنش کار کرده‌اید.**

True Cost کاری ساده اما رادیکال انجام می‌دهد: قیمت‌های تشخیص‌داده‌شده را همان‌جا، روی صفحهٔ فروشگاه اینترنتی، بر اساس دستمزد ساعتی شما به «ساعت یا روز کار» تبدیل می‌کند. عددی که روی برچسب قیمت می‌بینید، رابطهٔ شما با پول را پنهان می‌کند؛ اما وقتی همان عدد به «۴ ساعت کار» یا «نصف یک روز کاری» ترجمه شود، رابطهٔ واقعی‌تری بین دستمزد، تورم، و قدرت خریدتان آشکار می‌شود؛ دقیقاً همان چیزی که در بحث‌های نابرابری اقتصادی و فاصلهٔ روزافزون بین دستمزد اسمی و هزینهٔ زندگی واقعی، معمولاً پنهان می‌ماند. این افزونه ابزار محاسبه نیست؛ ابزار دیدن است.

**Price is a nominal number. True cost is the slice of your life you traded to earn it.**

True Cost converts detected prices on supported Iranian shopping websites into the hours, days, or months of work needed to earn that amount, based on your own hourly wage. See the time behind every price before you buy. For example, at an hourly wage of 200,000 Toman, an item priced at 800,000 Toman costs four hours of work.

True Cost is now available on the **[Chrome Web Store](https://chromewebstore.google.com/detail/true-cost/icophkfcgelocckeklfbopgjikialcnc)**. Install it directly in Chrome, enter your wage, and choose whether to replace detected prices with working time or show the time cost on hover. No True Cost account is required.

The interface is Persian-first. English is available for settings and calculation results, while the popup and manual picker currently contain Persian text. Automatic recognition currently focuses on Toman and Rial; support for currencies such as USD, EUR, and GBP is a [roadmap goal](#نقشه-راه--roadmap), not a current feature. Contributions toward broader currency and language support are welcome.

## تصاویر و نمونهٔ عملکرد / Preview & usage example

برای دیدن تصاویر، عنوان هر بخش را باز کنید. / Expand each section to view the images.

<details>
<summary><strong>معرفی افزونه / Meet True Cost</strong></summary>

![True Cost: معرفی افزونه، تنظیم دستمزد ساعتی و پشتیبانی از تومان و ریال](https://u260616004.p.clickup-attachments.com/u260616004/1c8912c4-1bcc-4ee2-9394-1e9704d2f890/generated-image-5db8d1dd-1ada-413f-acd5-9ab2c3f0762e.png?view=open)

پوستر معرفی True Cost و نمای رابط افزونه: دستمزد ساعتی، ساعات کار روزانه و انتخاب شیوهٔ نمایش زمان. پشتیبانی فعلی تشخیص قیمت برای تومان و ریال است.

True Cost product poster and interface preview: hourly wage, working hours per day, and time-display controls. Current price recognition supports Toman and Rial.

</details>

<details>
<summary><strong>نمونهٔ عملکرد در فروشگاه / Price-to-time example</strong></summary>

![نمونهٔ نمایشی True Cost در صفحه‌ای شبیه دیجی‌کالا: تبدیل قیمت به ۶۵۲ ساعت و ۳۰ دقیقه کار](https://t90152039610.p.clickup-attachments.com/t90152039610/39bd9b08-b56a-45f7-aac6-ac172abb2f7f/1000780062.jpg)

نمونهٔ نمایشی در موکاپ صفحهٔ دیجی‌کالا: با دستمزد ساعتی ۲۰۰٬۰۰۰ تومان، قیمت ۱۳۰٬۵۰۰٬۰۰۰ تومان معادل **۶۵۲ ساعت و ۳۰ دقیقه کار** نمایش داده می‌شود. تصویر برای نمایش عملکرد افزونه ساخته شده و ثبت قیمت زندهٔ فروشگاه نیست.

Illustrative Digikala-style mockup: at an hourly wage of 200,000 Toman, a price of 130,500,000 Toman becomes **652 hours and 30 minutes of work**. This image demonstrates the extension's behavior; it is not a live store price capture.

</details>

## نصب / Installation

### نصب از کروم استور (پیشنهادی)

True Cost اکنون در Chrome Web Store منتشر شده است؛ برای نصب معمولی نیازی به دانلود فایل ZIP یا فعال‌کردن Developer mode ندارید.

1. صفحهٔ **[True Cost در Chrome Web Store](https://chromewebstore.google.com/detail/true-cost/icophkfcgelocckeklfbopgjikialcnc)** را باز کنید.
2. روی **Add to Chrome** و سپس **Add extension** کلیک کنید.
3. از منوی افزونه‌های کروم، True Cost را باز کنید؛ برای دسترسی سریع‌تر می‌توانید آیکون آن را پین کنید.
4. دستمزد ساعتی خود را به تومان وارد کنید و ساعات کاری روزانه و شیوهٔ نمایش زمان را تنظیم کنید.
5. یکی از فروشگاه‌های پشتیبانی‌شده را باز کنید تا هزینهٔ زمانی قیمت‌های تشخیص‌داده‌شده را ببینید.

### Install from the Chrome Web Store (recommended)

1. Open **[True Cost on the Chrome Web Store](https://chromewebstore.google.com/detail/true-cost/icophkfcgelocckeklfbopgjikialcnc)**.
2. Click **Add to Chrome**, then **Add extension**.
3. Open True Cost from Chrome's extensions menu and enter your hourly wage in Toman.
4. Set your working hours per day and preferred time view, then visit a supported shopping website.

You do not need Developer mode for the store version. You can pin the extension to Chrome's toolbar for quick access.

### نصب دستی برای توسعه و آزمایش / Manual installation

اگر می‌خواهید نسخهٔ دانلودی را آزمایش کنید یا در توسعه مشارکت کنید، نصب دستی همچنان در دسترس است:

1. به صفحهٔ [Releases](https://github.com/alirezach/TrueCost/releases) بروید و آخرین نسخه (فایل `.zip`) را دانلود کنید.
2. فایل زیپ را از حالت فشرده خارج کنید (Extract).
3. در کروم به آدرس `chrome://extensions` بروید.
4. گزینهٔ **Developer mode** (حالت توسعه‌دهنده) را فعال کنید.
5. روی **Load unpacked** کلیک کنید و پوشهٔ استخراج‌شدهٔ حاوی `manifest.json` را انتخاب کنید.
6. افزونه را باز کنید و دستمزد ساعتی خود را وارد کنید.

For development or testing, download and extract a ZIP from [Releases](https://github.com/alirezach/TrueCost/releases), enable **Developer mode** at `chrome://extensions`, and use **Load unpacked** to select the folder containing `manifest.json`.

## سایت‌های پشتیبانی‌شده

| سایت | وضعیت |
|---|---|
| [digikala.com](https://www.digikala.com) | ✅ |
| [torob.com](https://torob.com) | ✅ |
| [emalls.ir](https://emalls.ir) | ✅ |
| [divar.ir](https://divar.ir) | ✅ |
| [technolife.com](https://www.technolife.com) | ✅ |
| [tapsi.shop](https://tapsi.shop) | ✅ |
| [okala.com](https://www.okala.com) | ✅ |
| [bama.ir](https://bama.ir) | ✅ |
| [snappfood.ir](https://snappfood.ir) | ✅ |
| [snappshop.ir](https://snappshop.ir) | ✅ |
| [khodro45.com](https://khodro45.com) | ✅ |
| [shopino.app](https://shopino.app) | ✅ |

جزئیات سلکتور‌ها در [`data/sites.csv`](./data/sites.csv).

تشخیص قیمت به ساختار هر سایت وابسته است و ممکن است همهٔ قیمت‌ها شناسایی نشوند. فعال‌سازی روی سایت‌های دیگر آزمایشی است و سازگاری با همهٔ وب‌سایت‌ها را تضمین نمی‌کند.

Price detection depends on each website's layout and may not recognize every price. Enabling the extension on an additional website is experimental and does not guarantee compatibility.

## پایگاه دادهٔ مشارکتی سلکتورها

سلکتورهای CSS هر سایت در فایل [`data/sites.csv`](./data/sites.csv) نگه‌داری می‌شوند؛ یک جدول ساده که هرکسی می‌تواند بدون دانش جاوااسکریپت آن را ویرایش و Pull Request بفرستد.

- وقتی سایتی بازطراحی می‌شود و تشخیص قیمت از کار می‌افتد، هرکسی می‌تواند سلکتور جدید را در همین فایل اصلاح کند.
- افزونه هفته‌ای یک‌بار فایل کوچک [`data/sites-meta.json`](./data/sites-meta.json) را چک می‌کند و در صورت وجود به‌روزرسانی، در تنظیمات پیام «به‌روزرسانی موجود است» نمایش می‌دهد؛ سلکتورهای فعال شما هرگز بدون تأیید خودتان جایگزین نمی‌شوند.
- دیتاست پیشنهادی حداقل دستمزد هم به همین شکل در [`data/wage-dataset.json`](./data/wage-dataset.json) مشارکتی نگه‌داری می‌شود.

جزئیات ستون‌ها و روند کار در [CONTRIBUTING.md](./CONTRIBUTING.md).

## امکانات / Features

- **محاسبهٔ شخصی‌سازی‌شده**: تنظیم دستمزد ساعتی و ساعات کار روزانه برای نمایش هزینه به ساعت، روز یا ماه کار.
- **دو حالت نمایش**: جایگزینی قیمت‌های تشخیص‌داده‌شده با زمان کار، یا حفظ قیمت اصلی و نمایش هزینهٔ زمانی هنگام نگه‌داشتن نشانگر روی آن.
- **تشخیص قیمت ایرانی**: پشتیبانی از تومان و ریال و ارقام فارسی و انگلیسی؛ تشخیص از سه مسیر سلکتور اختصاصی سایت، داده‌های ساختاریافتهٔ JSON-LD، و اسکن عمومی متن قیمت.
- **حالت دستی**: انتخاب عنصر قیمت روی صفحه و ذخیرهٔ آن به‌عنوان سلکتور شخصی، یا پیشنهاد آن به مخزن از طریق فرم آمادهٔ GitHub Issue.
- **فعال‌سازی سایت جدید**: روی سایت‌های خارج از فهرست رسمی هم می‌توانید افزونه را فعال کنید؛ دکمهٔ «فعال‌سازی روی این سایت» پس از تأیید دسترسی توسط شما، ابزار را برای همان دامنه فعال می‌کند.
- **زبان فارسی و انگلیسی**: تنظیمات و نتایج محاسبات به هر دو زبان در دسترس‌اند؛ پاپ‌آپ و ابزار انتخاب دستی فعلاً متن‌های فارسی دارند.
- **کنترل سریع**: توقف و فعال‌سازی دوبارهٔ افزونه از پاپ‌آپ.
- **متن‌باز و بدون حساب کاربری**: بدون تبلیغات یا ردیابی تحلیلی؛ محاسبهٔ قیمت‌ها در مرورگر انجام می‌شود.

**In short:** personalized wage-based calculations, hours/days/months views, inline or hover display, Toman/Rial recognition, manual price selection, optional per-site access, Persian/English settings and results, and quick pause/resume controls.

برآوردها به دستمزد واردشده و قیمت‌های تشخیص‌داده‌شده وابسته‌اند؛ هدف، درک بهتر هزینهٔ خرید است، نه ارائهٔ توصیهٔ مالی.

## فونت

رابط کاربری این افزونه از فونت زیبا و کاملاً رایگان **[وزیرمتن (Vazirmatn)](https://github.com/rastikerdar/vazirmatn)** استفاده می‌کند؛ اثری از **مرحوم صابر راستی‌کردار** عزیز، که یکی از باکیفیت‌ترین و پرکاربردترین فونت‌های فارسی متن‌باز را برای جامعهٔ فارسی‌زبان به میراث گذاشت. یادش گرامی.

## حریم خصوصی و امنیت / Privacy and security

- محاسبهٔ هزینهٔ زمانی در مرورگر شما انجام می‌شود. افزونه تبلیغات یا ردیابی تحلیلی ندارد و به حساب کاربری True Cost نیاز ندارد.
- تنظیمات و سلکتورهای شخصی با استفاده از فضای ذخیره‌سازی کروم نگه‌داری می‌شوند. داده‌های `chrome.storage.sync` در صورت فعال‌بودن Chrome Sync ممکن است بین مرورگرهای شما همگام شوند؛ کش‌ها در `chrome.storage.local` ذخیره می‌شوند.
- افزونه دیتاست‌های عمومی دستمزد و تشخیص سایت را از گیت‌هاب دریافت می‌کند و داده‌های جایگزین همراه افزونه نیز دارد.
- اگر خودتان از ابزار انتخاب دستی، پیشنهاد یک سایت را انتخاب کنید، نشانی صفحه، متن نمونهٔ انتخاب‌شده، واحد پول و سلکتور برای آماده‌کردن فرم Issue به گیت‌هاب ارسال می‌شوند. انتشار Issue به اقدام جداگانهٔ شما در گیت‌هاب نیاز دارد.
- دسترسی به سایت‌های خارج از فهرست رسمی فقط پس از تأیید خود شما (دکمهٔ «فعال‌سازی روی این سایت») و فقط برای همان دامنه داده می‌شود و هر زمان از تنظیمات مرورگر قابل لغو است.
- جزئیات بیشتر در [PRIVACY.md](./PRIVACY.md) و [SECURITY.md](./SECURITY.md).

Calculations run in your browser, with no advertising, analytics tracking, or True Cost account. Preferences use Chrome storage and may sync when Chrome Sync is enabled. The extension fetches public datasets from GitHub. If you explicitly choose to suggest a site, the selected URL, sample text, currency, and detection rule are sent to GitHub to prefill an issue form; publishing it is a separate action.

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

- افزودن واحدهای پولی غیرایرانی (دلار، یورو، پوند و...) به موتور تشخیص عمومی، برای استفاده روی فروشگاه‌های غیرایرانی. Adding non-Iranian currencies (USD, EUR, GBP, etc.) to the generic detection engine, so the extension becomes usable on non-Iranian shops too.
- بومی‌سازی کامل رابط کاربری به انگلیسی (`chrome.i18n`) به‌جای متن‌های ثابت دوزبانه. Full English localization via `chrome.i18n`.
- پشتیبانی از Firefox و Edge. Firefox/Edge support.

اگر از کشوری غیر از ایران هستید و دوست دارید در توسعهٔ پشتیبانی چندارزی یا بومی‌سازی انگلیسی مشارکت کنید، خوشحال می‌شویم؛ به [CONTRIBUTING.md](./CONTRIBUTING.md) مراجعه کنید.

## ایده و تاریخچه

پشت هر برچسب قیمتی یک عدد پنهان وجود دارد: اینکه باید چند ساعت از زندگی‌تان را برای آن معامله کنید. True Cost همین عدد را آشکار می‌کند.

این پروژه ادامه و بازنویسی یک ایدهٔ قدیمی‌تر است:

- **ایدهٔ اصلی**: مفهوم *«عمر من»*، اکستنشنی که هیچ‌وقت منتشر نشد، که توسط [جاوید ایزدفر](https://twitter.com/JavidIzadfar) به‌صورت عمومی مطرح شد. مقالهٔ ایشان: [«عمر من»: اکستنشنی که هیچ‌وقت منتشر نمی‌کنم!](https://virgool.io/@JavidIzadfar/عمر-من-اکستنشنی-که-هیچوقت-منتشر-نمیکنم-ro0ruevctaio)
- **اولین پیاده‌سازی**: *Iranian Lifetime Calculator*، ساختهٔ **[محمود اسکندری](https://github.com/mahmoud-eskandari)** در سال ۲۰۱۸. اولین نسخهٔ کارکردی و انتشار آن روی Chrome Web Store کار ایشان بوده. مخزن اصلی: [mahmoud-eskandari/IPTT](https://github.com/mahmoud-eskandari/IPTT). مشارکت‌های اولیه از [یحیی صیادعرب‌آبادی](https://github.com/TheYahya) (حالت محاسبهٔ روزانه) و حسین مرزبان (رابط کاربری).
- **این ادامه**: پس از از کار افتادن نسخهٔ اصلی، افزونه از صفر بازسازی شد و با نام **True Cost** توسط [AliRezaCh](https://github.com/alirezach) ادامه یافت.
## مجوز

[MIT](./LICENSE)
