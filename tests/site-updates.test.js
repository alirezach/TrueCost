/**
* Integration tests for the site-selector update flow in background.js.
* Run with: npx vitest run tests/site-updates.test.js
*
* background.js runs in a service worker against chrome.* and fetch(); here both are
* replaced with in-memory fakes so the FULL lifecycle can be driven end to end:
* install -> weekly check -> "update available" flag -> Settings click -> applied update.
*/

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const sitesCsvSrc = readFileSync(resolve(__dirname, '../assets/script/sites-csv.js'), 'utf8');
const bgSrc = readFileSync(resolve(__dirname, '../assets/script/background.js'), 'utf8');

const CSV_HEADER =
'id,hostname,url_pattern,price_selectors,currency_label_selectors,default_currency,enabled,last_verified,contributor,notes_en,notes_fa\n';
const CSV_ONE_SITE = CSV_HEADER + 'alpha,alpha.example,https://alpha.example/*,.price,,Toman,true,2026-09-01,test,,\n';
const CSV_TWO_SITES = CSV_ONE_SITE + 'beta,beta.example,https://beta.example/*,.beta-price,,Toman,true,2026-09-28,test,,\n';

const META_OLD = { schema_version: 1, updated_at: '2026-09-01T00:00:00Z' };
const META_NEW = { schema_version: 1, updated_at: '2026-09-28T00:00:00Z' };
const WAGE_STUB = { schema_version: 1, updated_at: '2026-09-11', entries: [] };

function okText(text) {
return { ok: true, status: 200, text: () => Promise.resolve(text), json: () => Promise.resolve(JSON.parse(text)) };
}

function pickKeys(obj, keys) {
if (keys === undefined) return Object.assign({}, obj);
const list = Array.isArray(keys) ? keys : [keys];
const out = {};
list.forEach((k) => { if (obj[k] !== undefined) out[k] = obj[k]; });
return out;
}

/**
* Builds a fresh service-worker environment. `remote` is read live on every fetch,
* so a test can flip remote.csv / remote.meta / remote.offline mid-scenario to
* simulate the repo changing (or the network dropping) after install.
*/
function makeEnv(remote) {
const local = {};
const sync = {};
const listeners = { installed: [], startup: [], alarm: [], message: [] };

global.self = globalThis;
global.importScripts = function () { eval(sitesCsvSrc); };
global.fetch = function (url) {
const u = String(url);
if (u.indexOf('chrome-extension://') === 0) {
if (u.endsWith('data/sites.csv')) return Promise.resolve(okText(remote.bundledCsv));
if (u.endsWith('data/sites-meta.json')) return Promise.resolve(okText(JSON.stringify(remote.bundledMeta)));
if (u.endsWith('data/wage-dataset.json')) return Promise.resolve(okText(JSON.stringify(WAGE_STUB)));
return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
}
if (remote.offline) return Promise.reject(new TypeError('fetch failed'));
if (u.endsWith('data/sites.csv')) return Promise.resolve(okText(remote.csv));
if (u.endsWith('data/sites-meta.json')) return Promise.resolve(okText(JSON.stringify(remote.meta)));
if (u.endsWith('data/wage-dataset.json')) return Promise.resolve(okText(JSON.stringify(WAGE_STUB)));
return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
};

const chromeStub = {
storage: {
local: {
get: (keys) => Promise.resolve(pickKeys(local, keys)),
set: (obj) => { Object.assign(local, obj); return Promise.resolve(); }
},
sync: {
get: (keys) => Promise.resolve(pickKeys(sync, keys)),
set: (obj) => { Object.assign(sync, obj); return Promise.resolve(); }
}
},
runtime: {
getURL: (p) => 'chrome-extension://tc-test/' + p,
onInstalled: { addListener: (fn) => listeners.installed.push(fn) },
onStartup: { addListener: (fn) => listeners.startup.push(fn) },
onMessage: { addListener: (fn) => listeners.message.push(fn) }
},
alarms: {
create: () => {},
onAlarm: { addListener: (fn) => listeners.alarm.push(fn) }
}
};
global.chrome = chromeStub;

eval(bgSrc);

function tick() {
// All fakes resolve within a few microtask rounds; a short macrotask wait is enough
// for the service worker's promise chains (fetch -> parse -> storage) to settle.
return new Promise((r) => setTimeout(r, 25));
}

async function fireInstalled(reason) {
listeners.installed.forEach((fn) => fn({ reason: reason || 'install' }));
await tick();
}
async function fireStartup() {
listeners.startup.forEach((fn) => fn());
await tick();
}
async function fireAlarm(name) {
for (const fn of listeners.alarm) { await fn({ name }); }
await tick();
}
function sendMessage(message) {
return new Promise((resolveMsg) => {
listeners.message[0](message, {}, resolveMsg);
});
}

return { local, sync, listeners, tick, fireInstalled, fireStartup, fireAlarm, sendMessage };
}

describe('site selector update flow', () => {

it('fresh install caches the remote database and shows NO update banner when versions match', async () => {
const remote = { csv: CSV_ONE_SITE, meta: META_OLD, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: false };
const env = makeEnv(remote);
await env.fireInstalled('install');

expect(env.local.site_adapters_cache.source).toBe('remote');
expect(env.local.site_adapters_cache.updatedAt).toBe(META_OLD.updated_at);
expect(env.local.site_adapters_cache.adapters.length).toBe(1);

const status = await env.sendMessage({ type: 'TC_GET_SITE_ADAPTERS_STATUS' });
expect(status.updateAvailable).toBe(false);
expect(status.count).toBe(1);
});

it('offline install falls back to the bundled database and still shows no banner', async () => {
const remote = { csv: CSV_ONE_SITE, meta: META_OLD, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: true };
const env = makeEnv(remote);
await env.fireInstalled('install');

expect(env.local.site_adapters_cache.source).toBe('bundled');
const status = await env.sendMessage({ type: 'TC_GET_SITE_ADAPTERS_STATUS' });
expect(status.updateAvailable).toBe(false);
expect(status.source).toBe('bundled');
});

it('weekly check stays quiet while the repo version matches the cache', async () => {
const remote = { csv: CSV_ONE_SITE, meta: META_OLD, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: false };
const env = makeEnv(remote);
await env.fireInstalled('install');
await env.fireAlarm('tc-site-adapters-check');

const status = await env.sendMessage({ type: 'TC_GET_SITE_ADAPTERS_STATUS' });
expect(status.updateAvailable).toBe(false);
});

it('flags an update only after the repo meta is genuinely bumped', async () => {
const remote = { csv: CSV_ONE_SITE, meta: META_OLD, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: false };
const env = makeEnv(remote);
await env.fireInstalled('install');

// The repo changes AFTER install: a new site lands in sites.csv and updated_at is bumped.
remote.csv = CSV_TWO_SITES;
remote.meta = META_NEW;

await env.fireAlarm('tc-site-adapters-check');
const status = await env.sendMessage({ type: 'TC_GET_SITE_ADAPTERS_STATUS' });
expect(status.updateAvailable).toBe(true);
expect(status.latestUpdatedAt).toBe(META_NEW.updated_at);
// The active cache must NOT have been silently swapped yet:
expect(status.count).toBe(1);
});

it('browser startup also notices a genuinely newer repo version', async () => {
const remote = { csv: CSV_TWO_SITES, meta: META_NEW, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: false };
const env = makeEnv(remote);
await env.fireInstalled('install'); // installs the newer remote (2 sites)
// Roll the cache back by hand to simulate an install from before the bump:
env.local.site_adapters_cache = { source: 'remote', updatedAt: META_OLD.updated_at, fetchedAt: META_OLD.updated_at, adapters: env.local.site_adapters_cache.adapters.slice(0, 1) };
env.local.site_adapters_update_available = false;

await env.fireStartup();
const status = await env.sendMessage({ type: 'TC_GET_SITE_ADAPTERS_STATUS' });
expect(status.updateAvailable).toBe(true);
});

it('"Update now" really downloads the new selectors from the repo and clears the flag', async () => {
const remote = { csv: CSV_ONE_SITE, meta: META_OLD, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: false };
const env = makeEnv(remote);
await env.fireInstalled('install');

remote.csv = CSV_TWO_SITES;
remote.meta = META_NEW;
await env.fireAlarm('tc-site-adapters-check');
expect(env.local.site_adapters_update_available).toBe(true);

const result = await env.sendMessage({ type: 'TC_APPLY_SITE_ADAPTERS_UPDATE' });
expect(result.error).toBe(undefined);
expect(result.updateAvailable).toBe(false);
expect(result.count).toBe(2); // the second row REALLY arrived
expect(result.updatedAt).toBe(META_NEW.updated_at);

const newAdapter = env.local.site_adapters_cache.adapters.find((a) => a.id === 'beta');
expect(newAdapter).toBeTruthy();
expect(newAdapter.priceSelectors[0]).toBe('.beta-price');
});

it('does not re-flag an update at the next check after a successful update', async () => {
const remote = { csv: CSV_ONE_SITE, meta: META_OLD, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: false };
const env = makeEnv(remote);
await env.fireInstalled('install');

remote.csv = CSV_TWO_SITES;
remote.meta = META_NEW;
await env.fireAlarm('tc-site-adapters-check');
await env.sendMessage({ type: 'TC_APPLY_SITE_ADAPTERS_UPDATE' });

await env.fireAlarm('tc-site-adapters-check');
const status = await env.sendMessage({ type: 'TC_GET_SITE_ADAPTERS_STATUS' });
expect(status.updateAvailable).toBe(false);
});

it('clears a stale flag when the repo is no longer newer', async () => {
const remote = { csv: CSV_ONE_SITE, meta: META_OLD, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: false };
const env = makeEnv(remote);
await env.fireInstalled('install');

// A flag left behind by anything (older builds, reverted repo state) must clean itself up:
env.local.site_adapters_update_available = true;
await env.fireAlarm('tc-site-adapters-check');
const status = await env.sendMessage({ type: 'TC_GET_SITE_ADAPTERS_STATUS' });
expect(status.updateAvailable).toBe(false);
});

it('reports a real error when the update download fails (no fake success)', async () => {
const remote = { csv: CSV_ONE_SITE, meta: META_OLD, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: false };
const env = makeEnv(remote);
await env.fireInstalled('install');
const before = env.local.site_adapters_cache;

remote.offline = true;
const result = await env.sendMessage({ type: 'TC_APPLY_SITE_ADAPTERS_UPDATE' });
expect(result.error).toBeTruthy();
// The working cache must be left exactly as it was:
expect(env.local.site_adapters_cache).toBe(before);
});

it('ignores a malformed remote meta without crashing or flagging', async () => {
const remote = { csv: CSV_ONE_SITE, meta: { schema_version: 1, updated_at: 'not-a-date' }, bundledCsv: CSV_ONE_SITE, bundledMeta: META_OLD, offline: false };
const env = makeEnv(remote);
await env.fireInstalled('install');
env.local.site_adapters_update_available = true; // stale flag
await env.fireAlarm('tc-site-adapters-check');
const status = await env.sendMessage({ type: 'TC_GET_SITE_ADAPTERS_STATUS' });
expect(status.updateAvailable).toBe(false);
});
});
