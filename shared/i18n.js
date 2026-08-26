// Shared UI localization foundation. English is the source language; additional locales can be added without changing routes or product data.
export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = Object.freeze(['en', 'ja', 'de', 'fr', 'es', 'pt-BR', 'it', 'ko', 'zh-CN', 'zh-TW']);

export const messages = Object.freeze({
  en: Object.freeze({
    language: 'Language',
    myLibrary: 'My Library',
    watch: 'Watch',
    download: 'Download',
    buyNow: 'Buy now',
    loading: 'Loading…',
    noPurchases: 'You have no purchased videos yet.',
    loginRequired: 'Please log in to continue.',
    purchasedVideos: 'Your purchased videos.',
  }),
  ja: Object.freeze({
    language: '言語',
    myLibrary: 'マイライブラリ',
    watch: '視聴',
    download: 'ダウンロード',
    buyNow: '購入する',
    loading: '読み込み中…',
    noPurchases: '購入した動画はまだありません。',
    loginRequired: '続行するにはログインしてください。',
    purchasedVideos: '購入した動画',
  }),
});

export function normalizeLocale(value) {
  const raw = String(value || '').trim().replace('_', '-');
  if (SUPPORTED_LOCALES.includes(raw)) return raw;
  const lower = raw.toLowerCase();
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === lower);
  if (exact) return exact;
  const language = lower.split('-')[0];
  return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase().split('-')[0] === language) || DEFAULT_LOCALE;
}

export function getLocale(preferred) {
  return normalizeLocale(preferred || globalThis.localStorage?.getItem('marketplace_locale') || globalThis.navigator?.language || DEFAULT_LOCALE);
}

export function setLocale(locale) {
  const normalized = normalizeLocale(locale);
  globalThis.localStorage?.setItem('marketplace_locale', normalized);
  return normalized;
}

export function t(key, locale = getLocale()) {
  return messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
}
