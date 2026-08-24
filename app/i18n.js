const supportedLocales = ['en', 'ja', 'es', 'pt-BR', 'fr', 'de', 'it', 'ko', 'zh-CN', 'zh-TW'];
const messages = {};

const stored = localStorage.getItem('vm_locale');
const browserLocale = navigator.language;
let currentLocale = supportedLocales.includes(stored)
  ? stored
  : supportedLocales.find((locale) => browserLocale === locale || browserLocale.startsWith(`${locale}-`)) || 'en';

async function load(locale) {
  if (messages[locale]) return messages[locale];
  const response = await fetch(`/locales/${locale}.json`);
  if (!response.ok) throw new Error(`Unable to load locale: ${locale}`);
  messages[locale] = await response.json();
  return messages[locale];
}

// Synchronous access is intentionally limited to strings loaded during bootstrap.
// The application will replace this with a production i18n loader as the build system is introduced.
const fallback = {
  'nav.discover': 'Discover',
  'nav.categories': 'Categories',
  'nav.popular': 'Popular',
  'nav.creators': 'Creators',
  'nav.login': 'Log in',
  'nav.signup': 'Sign up',
  'hero.eyebrow': 'Global video marketplace',
  'hero.title': 'Discover videos worth watching.',
  'hero.description': 'A premium, creator-friendly marketplace for digital video content.',
  'hero.explore': 'Explore videos',
  'hero.creator': 'Become a creator'
};

// The shell currently uses fallback strings for first paint and loads the full locale in the background.
load(currentLocale).catch(() => {});

export function getLocale() { return currentLocale; }

export function setLocale(locale) {
  if (!supportedLocales.includes(locale)) return;
  currentLocale = locale;
  localStorage.setItem('vm_locale', locale);
}

export function t(key) {
  const parts = key.split('.');
  let value = messages[currentLocale];
  for (const part of parts) value = value?.[part];
  return typeof value === 'string' ? value : fallback[key] || key;
}

export { supportedLocales };
