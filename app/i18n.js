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

load(currentLocale).catch(() => {});

export function getLocale() {
  return currentLocale;
}

export async function setLocale(locale) {
  if (!supportedLocales.includes(locale)) return false;

  try {
    await load(locale);
  } catch {
    return false;
  }

  currentLocale = locale;
  localStorage.setItem('vm_locale', locale);
  return true;
}

export function t(key) {
  const parts = key.split('.');
  let value = messages[currentLocale];
  for (const part of parts) value = value?.[part];
  return typeof value === 'string' ? value : fallback[key] || key;
}

export { supportedLocales };
