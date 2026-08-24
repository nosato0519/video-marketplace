const LIMITS = Object.freeze({
  title: 200,
  description: 5000,
  category: 80,
  search: 120,
});

export function validateText(value, field) {
  if (typeof value !== 'string') throw new Error(`invalid_${field}`);
  if (value.length > LIMITS[field]) throw new Error(`too_long_${field}`);
  return value.trim();
}

export function sanitizePublicText(value, field) {
  const text = validateText(value, field);
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function assertSafeSort(sort) {
  const allowed = new Set(['newest', 'price_asc', 'price_desc', 'popular']);
  if (!allowed.has(sort)) throw new Error('invalid_sort');
  return sort;
}
