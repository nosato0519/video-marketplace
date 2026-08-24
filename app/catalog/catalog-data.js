import { fetchCatalog } from './catalog-api.js';
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

export function demoCategories() {
  return getDemoCategories();
}
