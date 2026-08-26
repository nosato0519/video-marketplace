const BCP47 = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;

export function validateLocaleInput({ locale, languageName, nativeName }) {
  if (!locale || !BCP47.test(locale)) throw new Error('invalid_locale');
  if (!languageName?.trim() || !nativeName?.trim()) throw new Error('locale_names_required');
  if (locale.length > 35 || languageName.length > 100 || nativeName.length > 100) {
    throw new Error('locale_field_too_long');
  }
  return {
    locale,
    languageName: languageName.trim(),
    nativeName: nativeName.trim(),
  };
}
