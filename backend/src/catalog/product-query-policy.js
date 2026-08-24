const MAX_QUERY_LENGTH = 120;
const MAX_PAGE_SIZE = 50;

export function normalizeProductQuery({ query = '', category = '', page = 1, pageSize = 20 }) {
  if (typeof query !== 'string' || query.length > MAX_QUERY_LENGTH) throw new Error('invalid_query');
  if (typeof category !== 'string' || category.length > 80) throw new Error('invalid_category');

  const normalizedPage = Number(page);
  const normalizedSize = Number(pageSize);
  if (!Number.isInteger(normalizedPage) || normalizedPage < 1) throw new Error('invalid_page');
  if (!Number.isInteger(normalizedSize) || normalizedSize < 1 || normalizedSize > MAX_PAGE_SIZE) {
    throw new Error('invalid_page_size');
  }

  return {
    query: query.trim(),
    category: category.trim(),
    page: normalizedPage,
    pageSize: normalizedSize,
  };
}

export function publicProductFilter(product) {
  return Boolean(product && product.status === 'published');
}

export function buildPublicProductCard(product) {
  if (!publicProductFilter(product)) return null;
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    priceAmount: product.price_amount,
    priceCurrency: product.price_currency,
    publishedAt: product.published_at,
  };
}
