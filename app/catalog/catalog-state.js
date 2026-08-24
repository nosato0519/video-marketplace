export function createCatalogState() {
  return {
    filters: { locale: 'en', category: '', search: '', page: 1, limit: 24 },
    status: 'idle',
    result: { data: [], pagination: { page: 1, limit: 24, returned: 0, hasMore: false } },
    error: null
  };
}

export function setCatalogState(state, patch) {
  Object.assign(state, patch);
  return state;
}
