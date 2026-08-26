const DEFAULT_LOCALE = 'en';

// This registry is intentionally data-driven. Adding a locale should not require
// changing commerce, entitlement, media, or payment business logic.
const SUPPORTED_LOCALES = Object.freeze([
  'en',
  'ja',
  'zh-CN',
  'zh-TW',
  'ko',
  'es',
  'fr',
  'de',
  'it',
  'pt-BR'
]);

function normalizeLocale(value) {
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LOCALE;
  return trimmed.replace('_', '-');
}

function resolveLocale(requested, supported = SUPPORTED_LOCALES) {
  const locale = normalizeLocale(requested);
  if (supported.includes(locale)) return locale;

  const language = locale.split('-')[0];
  const languageMatch = supported.find((candidate) => candidate.split('-')[0] === language);
  return languageMatch || DEFAULT_LOCALE;
}

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  normalizeLocale,
  resolveLocale,
};
