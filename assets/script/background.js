/**
 * True Cost - MV3 background service worker.
 *
 * Responsibility: maintain a locally cached "suggested wage dataset" so the
 * extension can propose a sensible default hourly wage (in Toman) on first
 * run, and keep that suggestion reasonably fresh over time.
 *
 * Design: fetch-from-network-then-fall-back-to-bundled-copy.
 *   - On install/update/weekly alarm we first try to fetch the *live*
 *     dataset from GitHub, so users get up-to-date figures (e.g. an updated
 *     statutory minimum wage) without needing an extension update.
 *   - If that fetch fails for ANY reason - offline, DNS/network error,
 *     non-200 response, timeout, or malformed JSON - we transparently fall
 *     back to the copy bundled inside the extension
 *     (`data/wage-dataset.json`, loaded via `chrome.runtime.getURL`), which
 *     is guaranteed to be present and valid. This keeps the feature fully
 *     functional offline and resilient to network issues, while still
 *     benefiting from live updates when they're reachable.
 *   - Only the cache (`wage_dataset_cache` in chrome.storage.local) is
 *     touched by the refresh logic; the user's own `hourly_wages` /
 *     `wage_source` (chrome.storage.sync) values are only ever *seeded*
 *     once, on first install, and only if genuinely unset.
 *
 * If this repository is ever renamed or moved, update this URL:
 *   https://raw.githubusercontent.com/alirezach/TrueCost/master/data/wage-dataset.json
 * (owner: alirezach, repo: TrueCost, branch: master, path: data/wage-dataset.json)
 *
 * This file ALSO manages the collaborative site-selector database
 * (data/sites.csv - see sites-csv.js and CONTRIBUTING.md):
 *   - On install: fetch data/sites.csv fresh from GitHub and cache it as the
 *     ACTIVE selector set (`site_adapters_cache`), falling back to the
 *     bundled copy on any network failure - same pattern as the wage dataset.
 *   - Weekly (and never more eagerly): fetch only the tiny data/sites-meta.json
 *     file and compare its `updated_at` against the cached copy's. If newer,
 *     set `site_adapters_update_available` so the Settings page can show a
 *     hint - the active cache is NEVER silently overwritten; the user has to
 *     click "Update now" in Settings for that, so a site's live selectors
 *     never change out from under them without consent.
 */

importScripts('sites-csv.js');

const REMOTE_DATASET_URL =
  'https://raw.githubusercontent.com/alirezach/TrueCost/master/data/wage-dataset.json';
const BUNDLED_DATASET_PATH = 'data/wage-dataset.json';
const FETCH_TIMEOUT_MS = 5000;
const REFRESH_ALARM_NAME = 'tc-wage-dataset-refresh';
const REFRESH_PERIOD_MINUTES = 60 * 24 * 7; // roughly weekly

const REMOTE_SITES_CSV_URL =
  'https://raw.githubusercontent.com/alirezach/TrueCost/master/data/sites.csv';
const REMOTE_SITES_META_URL =
  'https://raw.githubusercontent.com/alirezach/TrueCost/master/data/sites-meta.json';
const BUNDLED_SITES_CSV_PATH = 'data/sites.csv';
const BUNDLED_SITES_META_PATH = 'data/sites-meta.json';
const SITES_CHECK_ALARM_NAME = 'tc-site-adapters-check';
const SITES_CHECK_PERIOD_MINUTES = 60 * 24 * 7; // roughly weekly

/**
 * Fetches and validates a wage dataset JSON document from a given URL,
 * aborting if it takes longer than `timeoutMs`.
 * Returns the parsed entries array, or throws on any failure.
 */
async function fetchDatasetEntries(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unexpected HTTP status ' + response.status + ' fetching ' + url);
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.entries)) {
      throw new Error('Malformed wage dataset payload from ' + url);
    }
    return data.entries;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Loads the wage dataset entries bundled inside the extension. This is the
 * offline-safe fallback and should essentially never fail.
 */
async function loadBundledDatasetEntries() {
  const url = chrome.runtime.getURL(BUNDLED_DATASET_PATH);
  return fetchDatasetEntries(url, FETCH_TIMEOUT_MS);
}

/**
 * Tries the remote dataset first, falling back to the bundled copy on any
 * failure. Always resolves with a usable entries array (unless even the
 * bundled copy is broken, which should not happen).
 */
async function fetchDatasetEntriesWithFallback() {
  try {
    return await fetchDatasetEntries(REMOTE_DATASET_URL, FETCH_TIMEOUT_MS);
  } catch (remoteError) {
    return loadBundledDatasetEntries();
  }
}

/**
 * Fetches a URL as raw text, aborting if it takes longer than `timeoutMs`.
 */
async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unexpected HTTP status ' + response.status + ' fetching ' + url);
    }
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJson(url, timeoutMs) {
  return JSON.parse(await fetchText(url, timeoutMs));
}

/**
 * Refreshes chrome.storage.local's wage_dataset_cache using the
 * fetch-then-fallback strategy. Never touches chrome.storage.sync.
 */
async function refreshWageDatasetCache() {
  const entries = await fetchDatasetEntriesWithFallback();
  const cache = {
    fetchedAt: new Date().toISOString(),
    entries,
  };
  await chrome.storage.local.set({ wage_dataset_cache: cache });
  return cache;
}

/**
 * Picks the entry marked `default: true`, or falls back to the first entry.
 */
function pickDefaultEntry(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }
  return entries.find((entry) => entry && entry.default === true) || entries[0];
}

/**
 * On fresh install only: seed hourly_wages/wage_source from the dataset,
 * but only if the user genuinely has no hourly_wages value yet.
 */
async function seedHourlyWageIfUnset(entries) {
  const defaultEntry = pickDefaultEntry(entries);
  if (!defaultEntry || typeof defaultEntry.hourly_wage !== 'number') {
    return;
  }

  const existing = await chrome.storage.sync.get('hourly_wages');
  if (existing.hourly_wages !== undefined) {
    return; // never overwrite an existing user value
  }

  await chrome.storage.sync.set({
    hourly_wages: defaultEntry.hourly_wage,
    wage_source: 'dataset',
  });
}

async function loadBundledSitesCsvAdapters() {
  const url = chrome.runtime.getURL(BUNDLED_SITES_CSV_PATH);
  const text = await fetchText(url, FETCH_TIMEOUT_MS);
  return self.TC_parseSitesCsv(text);
}

async function loadBundledSitesMeta() {
  const url = chrome.runtime.getURL(BUNDLED_SITES_META_PATH);
  return fetchJson(url, FETCH_TIMEOUT_MS);
}

async function fetchRemoteSitesCsvAdapters() {
  const text = await fetchText(REMOTE_SITES_CSV_URL, FETCH_TIMEOUT_MS);
  const adapters = self.TC_parseSitesCsv(text);
  if (!adapters.length) {
    throw new Error('Remote sites.csv parsed to zero adapters');
  }
  return adapters;
}

async function fetchRemoteSitesMeta() {
  return fetchJson(REMOTE_SITES_META_URL, FETCH_TIMEOUT_MS);
}

/**
 * Fetches the LIVE sites.csv from GitHub, parses it, and makes it the active
 * cache. Used on first install and whenever the user clicks "Update now" in
 * Settings. Throws if the remote fetch/parse fails - callers decide the
 * fallback behavior.
 */
async function applySiteAdaptersFromRemote() {
  const adapters = await fetchRemoteSitesCsvAdapters();
  let updatedAt = new Date().toISOString();
  try {
    const meta = await fetchRemoteSitesMeta();
    if (meta && meta.updated_at) {
      updatedAt = meta.updated_at;
    }
  } catch (metaError) {
    // Meta is cosmetic (display-only "last updated" date); never fail the
    // whole update just because this optional companion file is unreachable.
  }

  const cache = { source: 'remote', updatedAt, fetchedAt: new Date().toISOString(), adapters };
  await chrome.storage.local.set({
    site_adapters_cache: cache,
    site_adapters_update_available: false,
    site_adapters_latest_updated_at: null,
  });
  return cache;
}

/**
 * Offline-safe fallback: loads the CSV bundled inside the extension package.
 */
async function applySiteAdaptersFromBundled() {
  const adapters = await loadBundledSitesCsvAdapters();
  let updatedAt = new Date().toISOString();
  try {
    const meta = await loadBundledSitesMeta();
    if (meta && meta.updated_at) {
      updatedAt = meta.updated_at;
    }
  } catch (metaError) {
    // ignore - cosmetic only
  }
  const cache = { source: 'bundled', updatedAt, fetchedAt: new Date().toISOString(), adapters };
  await chrome.storage.local.set({ site_adapters_cache: cache });
  return cache;
}

async function initializeSiteAdaptersCache() {
  try {
    return await applySiteAdaptersFromRemote();
  } catch (remoteError) {
    console.warn('TrueCost: remote sites.csv unavailable on install, using bundled copy', remoteError);
    return applySiteAdaptersFromBundled();
  }
}

/**
 * Lightweight weekly check: fetches ONLY data/sites-meta.json (a few bytes)
 * and compares its `updated_at` against the currently active cache. Never
 * overwrites the active cache itself - only sets a flag so Settings can show
 * an "Update available" hint with a button the user can click when ready.
 */
async function checkForSiteAdaptersUpdate() {
  try {
    const stored = await chrome.storage.local.get('site_adapters_cache');
    const currentUpdatedAt = stored.site_adapters_cache ? stored.site_adapters_cache.updatedAt : null;

    const meta = await fetchRemoteSitesMeta();
    const remoteUpdatedAt = meta && meta.updated_at;
    if (remoteUpdatedAt && (!currentUpdatedAt || new Date(remoteUpdatedAt) > new Date(currentUpdatedAt))) {
      await chrome.storage.local.set({
        site_adapters_update_available: true,
        site_adapters_latest_updated_at: remoteUpdatedAt,
      });
    }
  } catch (error) {
    console.warn('TrueCost: failed to check for site adapter updates', error);
  }
}

async function handleInstalled(details) {
  try {
    const cache = await refreshWageDatasetCache();
    if (details.reason === 'install') {
      await seedHourlyWageIfUnset(cache.entries);
    }
  } catch (error) {
    console.error('TrueCost: failed to initialize wage dataset cache', error);
  }

  try {
    await initializeSiteAdaptersCache();
  } catch (error) {
    console.error('TrueCost: failed to initialize site adapters cache', error);
  }

  try {
    chrome.alarms.create(REFRESH_ALARM_NAME, {
      periodInMinutes: REFRESH_PERIOD_MINUTES,
    });
    chrome.alarms.create(SITES_CHECK_ALARM_NAME, {
      periodInMinutes: SITES_CHECK_PERIOD_MINUTES,
    });
  } catch (error) {
    console.error('TrueCost: failed to schedule refresh alarms', error);
  }
}

async function handleAlarm(alarm) {
  if (alarm.name === REFRESH_ALARM_NAME) {
    try {
      await refreshWageDatasetCache();
    } catch (error) {
      console.error('TrueCost: failed to refresh wage dataset cache', error);
    }
    return;
  }
  if (alarm.name === SITES_CHECK_ALARM_NAME) {
    await checkForSiteAdaptersUpdate();
  }
}

/**
 * Returns the current wage_dataset_cache from chrome.storage.local, or - if
 * it's missing for some reason (e.g. cleared storage, race on first run) -
 * loads the bundled dataset directly so callers always get something usable.
 */
async function getWageDatasetForMessage() {
  const stored = await chrome.storage.local.get('wage_dataset_cache');
  if (stored.wage_dataset_cache) {
    return stored.wage_dataset_cache;
  }

  const entries = await loadBundledDatasetEntries();
  return {
    fetchedAt: new Date().toISOString(),
    entries,
  };
}

/**
 * Returns a compact status object describing the site adapter database for
 * the Settings page: which source is active (remote/bundled), when it was
 * last updated, how many sites it covers, and whether a newer version is
 * known to be available on GitHub (see checkForSiteAdaptersUpdate above).
 */
async function getSiteAdaptersStatusForMessage() {
  const stored = await chrome.storage.local.get([
    'site_adapters_cache',
    'site_adapters_update_available',
    'site_adapters_latest_updated_at',
  ]);
  let cache = stored.site_adapters_cache;
  if (!cache) {
    cache = await applySiteAdaptersFromBundled();
  }
  return {
    source: cache.source,
    updatedAt: cache.updatedAt,
    fetchedAt: cache.fetchedAt,
    count: Array.isArray(cache.adapters) ? cache.adapters.length : 0,
    updateAvailable: !!stored.site_adapters_update_available,
    latestUpdatedAt: stored.site_adapters_latest_updated_at || null,
  };
}

/** Triggered by the "Update now" button in Settings. */
async function applySiteAdaptersUpdateForMessage() {
  const cache = await applySiteAdaptersFromRemote();
  return {
    source: cache.source,
    updatedAt: cache.updatedAt,
    fetchedAt: cache.fetchedAt,
    count: cache.adapters.length,
    updateAvailable: false,
    latestUpdatedAt: null,
  };
}

chrome.runtime.onInstalled.addListener((details) => {
  handleInstalled(details);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') {
    return false;
  }

  if (message.type === 'TC_GET_WAGE_DATASET') {
    getWageDatasetForMessage()
      .then((dataset) => sendResponse(dataset))
      .catch((error) => {
        console.error('TrueCost: failed to answer TC_GET_WAGE_DATASET', error);
        sendResponse(null);
      });
    return true; // keep the message channel open for the async response
  }

  if (message.type === 'TC_GET_SITE_ADAPTERS_STATUS') {
    getSiteAdaptersStatusForMessage()
      .then((status) => sendResponse(status))
      .catch((error) => {
        console.error('TrueCost: failed to answer TC_GET_SITE_ADAPTERS_STATUS', error);
        sendResponse(null);
      });
    return true;
  }

  if (message.type === 'TC_APPLY_SITE_ADAPTERS_UPDATE') {
    applySiteAdaptersUpdateForMessage()
      .then((status) => sendResponse(status))
      .catch((error) => {
        console.error('TrueCost: failed to answer TC_APPLY_SITE_ADAPTERS_UPDATE', error);
        sendResponse({ error: String((error && error.message) || error) });
      });
    return true;
  }

  return false;
});
