export const adminNavigation = [
  { id: 'overview', label: 'Overview', path: '#/admin' },
  { id: 'orders', label: 'Orders & sales', path: '#/admin/orders' },
  { id: 'products', label: 'Products', path: '#/admin/products' },
  { id: 'sellers', label: 'Sellers', path: '#/admin/sellers' },
  { id: 'seller-applications', label: 'Seller applications', path: '#/admin/seller-applications' },
  { id: 'buyers', label: 'Buyers', path: '#/admin/buyers' },
  { id: 'moderation', label: 'Moderation', path: '#/admin/moderation' },
  { id: 'reports', label: 'Reports', path: '#/admin/reports' },
  { id: 'payouts', label: 'Payouts', path: '#/admin/payouts' },
  { id: 'discounts', label: 'Discounts', path: '#/admin/discounts' },
  { id: 'categories', label: 'Categories', path: '#/admin/categories' },
  { id: 'localization', label: 'Languages & currencies', path: '#/admin/localization' },
  { id: 'regions', label: 'Regions', path: '#/admin/regions' },
  { id: 'content', label: 'Site content', path: '#/admin/content' },
  { id: 'settings', label: 'Settings', path: '#/admin/settings' },
  { id: 'activity', label: 'Security & activity', path: '#/admin/activity' },
  { id: 'help', label: 'Help', path: '#/admin/help' }
];

export function findAdminSection(id) {
  return adminNavigation.find((item) => item.id === id) || adminNavigation[0];
}
