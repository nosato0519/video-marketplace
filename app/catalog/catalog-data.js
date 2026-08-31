import { fetchCatalog, fetchProduct } from './catalog-api.js';
import { listProducts as listDemoProducts, getCategories as getDemoCategories } from './catalog.js';

const fallback = (query = '', category = '') => ({
  data: listDemoProducts({ query, category }),
  pagination: { page: 1, limit: 24, returned: listDemoProducts({ query, category }).length, hasMore: false },
  source: 'demo'
});

export async function loadCatalog(options = {}) {
  try {
    const result = await fetchCatalog(options);
    return { ...result, source: 'api' };
  } catch (error) {
    if (options.allowFallback === false) throw error;
    return fallback(options.search, options.category);
  }
}

export async function loadProduct(id, options = {}) {
  try {
    const result = await fetchProduct(id, options);
    return { ...result, source: 'api' };
  } catch (error) {
    if (options.allowFallback === false) throw error;
    const product = listDemoProducts({}).find((item) => item.id === id) || null;
    return { data: product, source: 'demo' };
  }
}

export function demoCategories() {
  return getDemoCategories();
}
