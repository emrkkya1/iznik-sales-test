import type { ProductRepository } from '@/services/contracts';
import type { BranchProductWithPrice } from '@/types';

import { supabaseClient } from './supabaseClient';

type PriceRow = {
  price: number;
  start_date: string;
  end_date: string | null;
};

type BranchProductRow = {
  id: string;
  branch_id: string;
  product_id: string;
  is_active: boolean;
  products: {
    id: string;
    name: string;
    image_url: string | null;
    is_active: boolean;
  } | null;
  branch_product_prices: PriceRow[];
};

export const supabaseProductRepository: ProductRepository = {
  async listBranchProducts(branchId, date) {
    const { data, error } = await supabaseClient
      .from('branch_products')
      .select(
        `
        id,
        branch_id,
        product_id,
        is_active,
        products (id, name, image_url, is_active),
        branch_product_prices (price, start_date, end_date)
      `,
      )
      .eq('branch_id', branchId)
      .eq('is_active', true);

    if (error) throw error;

    const rows = (data ?? []) as unknown as BranchProductRow[];

    return rows
      .filter((row) => row.products?.is_active)
      .map((row): BranchProductWithPrice | null => {
        const activePrice = row.branch_product_prices.find(
          (p) => p.start_date <= date && (!p.end_date || p.end_date >= date),
        );

        if (!activePrice || !row.products) return null;

        return {
          id: row.id,
          branchId: row.branch_id,
          productId: row.product_id,
          isActive: row.is_active,
          productName: row.products.name,
          productImageUrl: row.products.image_url,
          currentPrice: activePrice.price,
        };
      })
      .filter((item): item is BranchProductWithPrice => item !== null);
  },
};
