const demoProducts = [
  { id: 'demo-1', title: 'Featured Video', seller: 'Creator Studio', category: 'Featured', price: 12.99, currency: 'USD' },
  { id: 'demo-2', title: 'Premium Collection', seller: 'Independent Creator', category: 'Collections', price: 24.99, currency: 'USD' },
  { id: 'demo-3', title: 'New Release', seller: 'Video Artist', category: 'New', price: 8.99, currency: 'USD' }
];

export function listProducts({ query = '', category = '' } = {}) {
  const q = query.trim().toLowerCase();
  return demoProducts.filter((product) => {
    const matchesQuery = !q || `${product.title} ${product.seller} ${product.category}`.toLowerCase().includes(q);
    const matchesCategory = !category || product.category === category;
    return matchesQuery && matchesCategory;
  });
}

export function getProduct(id) {
  return demoProducts.find((product) => product.id === id) || null;
}

export function getCategories() {
  return [...new Set(demoProducts.map((product) => product.category))];
}
