import { supabase } from '../lib/supabase';

export type ProductCode = 'monefyi' | 'planner' | 'stay';

/**
 * Returns true when the signed-in user has registered for the given product.
 */
export async function userHasProduct(product: ProductCode): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_has_product', { p_product: product });
  if (error) {
    console.error('user_has_product', product, error.message);
    return false;
  }
  return data === true;
}

export const PRODUCT_NOT_REGISTERED =
  'Akun ini belum terdaftar di Monefyi Planner. Daftar di planner.monefyi.com terlebih dahulu.';
