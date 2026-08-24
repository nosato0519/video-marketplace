import { fetchCatalog } from './catalog-api.js';

const state = {
  requestId: 0,
  controller: null
};

export function createCatalogController({ render, getFilters, apiBase = '' }) {
  return {
    async load() {
      const requestId = ++state.requestId;
      state.controller?.abort();
      state.controller = new AbortController();

      render({ status: 'loading' });

      try {
        const result = await fetchCatalog({ ...getFilters(), apiBase, signal: state.controller.signal });
        if (requestId !== state.requestId) return;
        render({ status: 'ready', result });
      } catch (error) {
        if (error.name === 'AbortError' || requestId !== state.requestId) return;
        render({ status: 'error', error });
      }
    },
    destroy() {
      state.requestId += 1;
      state.controller?.abort();
      state.controller = null;
    }
  };
}
