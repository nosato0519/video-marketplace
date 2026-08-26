import { listProductTranslations, upsertProductTranslation, deleteProductTranslation } from './product-translation-service.js';

export async function canEditProductTranslations({ user, product }) {
  if (!user || !product) return false;
  return user.role === 'admin' || product.seller_id === user.id;
}

export async function getEditableProductTranslations({ user, productId, product }) {
  if (!(await canEditProductTranslations({ user, product }))) {
    throw new Error('forbidden');
  }
  return listProductTranslations({ productId });
}

export async function saveEditableProductTranslation({ user, product, productId, locale, title, description }) {
  if (!(await canEditProductTranslations({ user, product }))) {
    throw new Error('forbidden');
  }
  return upsertProductTranslation({ productId, locale, title, description });
}

export async function removeEditableProductTranslation({ user, product, productId, locale }) {
  if (!(await canEditProductTranslations({ user, product }))) {
    throw new Error('forbidden');
  }
  return deleteProductTranslation({ productId, locale });
}
