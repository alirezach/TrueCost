# True Cost

**True Cost** is a Chrome extension that converts product prices on Iranian online shops into the **hours or days of work** they actually cost you, based on your hourly wage.

افزونه‌ای که قیمت کالاها را بر اساس دستمزد ساعتی شما به «ساعت یا روز کار» تبدیل می‌کند تا **هزینه‌ی واقعی** هر خرید را قبل از خریدن ببینید.

> نسخه 3.x: افزونه برای **Manifest V3** بازنویسی شد (نسخه‌ی قدیمی Manifest V2 توسط کروم غیرفعال شده است). جزئیات کامل تغییرات و نقشه راه توسعه در [PLAN.md](./PLAN.md) موجود است.

## Supported sites / سایت‌های پشتیبانی‌شده

- [digikala.com](https://www.digikala.com)
- [torob.com](https://torob.com)
- [emalls.ir](https://emalls.ir)
- [technolife.com](https://www.technolife.com)
- [okala.com](https://www.okala.com)
- [tapsi.shop](https://tapsi.shop)
- [snappfood.ir](https://snappfood.ir)
- [bama.ir](https://bama.ir)
- [divar.ir](https://divar.ir)

Note: support for dead/closed shops (Bamilo, Reyhoon, Digistyle, Modiseh, Shixon, Banimode) has been removed.

## Collaborative site database / پایگاه داده مشارکتی

CSS selectors for every supported site live in [`data/sites.csv`](https://github.com/alirezach/TrueCost/blob/master/data/sites.csv) — a simple table that anyone can improve:

- When a site redesigns and prices stop converting, anyone can open a Pull Request with the new selectors.
- The extension checks this file weekly (via the tiny [`data/sites-meta.json`](https://github.com/alirezach/TrueCost/blob/master/data/sites-meta.json)) and shows an **"Update available"** hint in Settings — your working selectors are never replaced without your confirmation.
- The suggested **minimum wage dataset** is also community-maintained in [`data/wage-dataset.json`](https://github.com/alirezach/TrueCost/blob/master/data/wage-dataset.json).

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the column reference and workflow.

## Features

- Manifest V3, no jQuery, no external requests except the wage/selector dataset fetch from GitHub
- Automatic price detection via per-site selectors, JSON-LD structured data, and a generic currency-word scan
- **Manual mode**: pick a price element on any site (like browser DevTools) and save it as a personal selector — or send it to the repo as a pre-filled GitHub issue
- Persian / English UI with self-hosted [Vazirmatn](https://github.com/rastikerdar/vazirmatn) font
- Toman / Rial currency switch, hourly wage with smart dataset suggestions

## Development

```bash
git clone https://github.com/alirezach/TrueCost.git
cd TrueCost
npm install
npm test          # unit tests (vitest)
npm run crawl     # re-crawl live sites and diff selectors (dev helper)
```

Load in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the repo folder.

## Idea & History / ایده و تاریخچه

Behind every price tag there is a hidden number: **how many hours of your life you have to trade for it**. True Cost surfaces that number — it converts prices into hours or days of work based on your hourly wage, so the real cost of a purchase is visible before you buy.

پشت هر برچسب قیمتی یک عدد پنهان وجود دارد: اینکه باید **چند ساعت از زندگیت** را برای آن معامله کنی. True Cost همین عدد را آشکار می‌کند؛ قیمت‌ها را بر اساس دستمزد ساعتی شما به «ساعت یا روز کار» تبدیل می‌کند تا هزینه‌ی واقعی هر خرید را قبل از خریدن ببینید.

این پروژه ادامه و بازنویسی یک ایده‌ی قدیمی است:

- **The original idea**: the *"عمر من" (My Lifetime)* concept — an extension that never shipped — shared publicly by [Javid Izadfar](https://twitter.com/JavidIzadfar). His article (in Persian): [«عمر من»: اکستنشنی که هیچوقت منتشر نمیکنم!](https://virgool.io/@JavidIzadfar/%D8%B9%D9%85%D8%B1-%D9%85%D9%86-%D8%A7%DA%A9%D8%B3%D8%AA%D9%86%D8%B4%D9%86%DB%8C-%DA%A9%D9%87-%D9%87%DB%8C%DA%86%D9%88%D9%82%D8%AA-%D9%85%D9%86%D8%AA%D8%B4%D8%B1-%D9%86%D9%85%DB%8C%DA%A9%D9%86%D9%85-ro0ruevctaio)

- **The first implementation**: *Iranian Lifetime Calculator* was created in **2018 by [Mahmoud Eskandari](https://github.com/mahmoud-eskandari)** — the idea's first working implementation and the Chrome Web Store release are all his work. Original repository: [mahmoud-eskandari/IPTT](https://github.com/mahmoud-eskandari/IPTT) · [old Chrome Web Store listing](https://chrome.google.com/webstore/detail/iranian-lifetime-calculat/phoehnanhimojcbebjldknajipijlmhd). Early contributions by [Yahya SayadArbabi](https://github.com/TheYahya) (daily-calculation mode) and Hossein Marzban (UI). Mahmoud's article about the extension (in Persian): [اکستنشن کروم تبدیل قیمت به ساعت دستمزد](https://virgool.io/@mahmoudetc/%D8%A7%DA%A9%D8%B3%D8%AA%D9%86%D8%B4%D9%86-%DA%A9%D8%B1%D9%88%D9%85-%D8%AA%D8%A8%D8%AF%DB%8C%D9%84-%D9%82%DB%8C%D9%85%D8%AA-%D8%A8%D9%87-%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%D8%B3%D8%AA%D9%85%D8%B2%D8%AF-m2saanql80wb)

- **This continuation**: after the original extension stopped working (Manifest V2 deprecation), it was rebuilt from scratch as **True Cost** by [AliRezaCh](https://github.com/alirezach) — previously developed in the [alirezach/IPTT](https://github.com/alirezach/IPTT) repository.

## License

[MIT](./LICENSE)
