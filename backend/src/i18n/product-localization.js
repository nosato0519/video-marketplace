import { DEFAULT_LOCALE, resolveLocale } from './locale-policy.js';

/**
 * Resolve localized product content without coupling localization to commerce.
 * `translations` is expected to be an object keyed by BCP-47 locale.
 */
export function localizeProductContent({ product, locale }) {
  const requested = resolveLocale(locale);
  const translations = product?.translations && typeof product.translations === 'object'
    ? product.translations
    : {};

  const language = requested.split('-')[0];
  const fallbackLocale = Object.keys(translations).find(
    (candidate) => candidate.split('-')[0] === language
  );

  const selected = translations[requested]
    || (fallbackLocale ? translations[fallbackLocale] : null)
    || translations[DEFAULT_LOCALE]
    || null;

  if (!selected) return product;

  return {
    ...product,
    title: selected.title ?? product.title,
    description: selected.description ?? product.description,
    contentLocale: selected.locale ?? requested,
  };
}
