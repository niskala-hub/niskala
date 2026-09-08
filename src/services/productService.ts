/**
 * productService.ts
 * ──────────────────────────────────────────────────────────────
 * Service layer untuk operasi Product (master data).
 * Focus: Stok management & HPP snapshot untuk order creation.
 * ──────────────────────────────────────────────────────────────
 */

import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  hpp_price: number;
  stock: number;
  image_url: string | null;
  image_urls: string[];
  category_id: string | null;
  original_price: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductForOrder {
  id: string;
  name: string;
  price: number;
  hpp_price: number;
  stock: number;
}

export type ProductFilters = {
  search?: string;
  category_id?: string;
  inStockOnly?: boolean;
  status?: string;
  page?: number;
  pageSize?: number;
};

// ─────────────────────────────────────────────
// READ PRODUCTS
// ─────────────────────────────────────────────

/**
 * Ambil list produk (admin view — include HPP & stok).
 */
export async function fetchProducts(filters: ProductFilters = {}) {
  const {
    search,
    category_id,
    inStockOnly = false,
    status,
    page = 1,
    pageSize = 50,
  } = filters;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) query = query.ilike("name", `%${search}%`);
  if (category_id) query = query.eq("category_id", category_id);
  if (inStockOnly) query = query.gt("stock", 0);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) throw error;
  return { products: (data ?? []) as ProductRow[], count: count ?? 0 };
}

/**
 * Ambil produk ringkas untuk dropdown Order Form.
 * Hanya field yang dibutuhkan: id, name, price, hpp_price, stock.
 */
export async function fetchProductsForOrder(): Promise<ProductForOrder[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, hpp_price, stock")
    .gt("stock", 0) // Hanya tampilkan yang ada stok
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ProductForOrder[];
}

/**
 * Ambil satu produk by ID.
 */
export async function fetchProductById(id: string): Promise<ProductRow> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ProductRow;
}

// ─────────────────────────────────────────────
// STOCK MANAGEMENT (direct admin operations)
// ─────────────────────────────────────────────

/**
 * Koreksi stok secara manual (admin action).
 * Berbeda dari deduction otomatis via trigger — ini untuk
 * penyesuaian fisik: stok opname, retur supplier, dsb.
 *
 * @param id - Product ID
 * @param newStock - Nilai stok baru (absolut, bukan delta)
 */
export async function updateProductStock(
  id: string,
  newStock: number
): Promise<ProductRow> {
  if (newStock < 0) {
    throw new Error("Stok tidak boleh negatif");
  }

  const { data, error } = await supabase
    .from("products")
    .update({ stock: newStock })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ProductRow;
}

/**
 * Update HPP produk.
 * Catatan: Ini HANYA mengubah HPP untuk transaksi BARU.
 * Order yang sudah ada menyimpan snapshot HPP di order_items.unit_hpp,
 * sehingga laporan lama tidak terpengaruh.
 */
export async function updateProductHpp(
  id: string,
  newHpp: number
): Promise<ProductRow> {
  if (newHpp < 0) {
    throw new Error("HPP tidak boleh negatif");
  }

  const { data, error } = await supabase
    .from("products")
    .update({ hpp_price: newHpp })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ProductRow;
}

/**
 * Ambil snapshot HPP & harga jual saat ini untuk order creation.
 * Digunakan di frontend untuk auto-fill form item order.
 */
export async function getProductSnapshot(
  productId: string
): Promise<{ unit_price: number; unit_hpp: number; stock: number; name: string }> {
  const { data, error } = await supabase
    .from("products")
    .select("name, price, hpp_price, stock")
    .eq("id", productId)
    .single();

  if (error) throw error;
  return {
    name: data.name,
    unit_price: data.price,
    unit_hpp: data.hpp_price,
    stock: data.stock,
  };
}

// ─────────────────────────────────────────────
// CREATE / UPDATE / DELETE
// ─────────────────────────────────────────────

export interface UpsertProductInput {
  name: string;
  slug: string;
  description?: string;
  price: number;
  hpp_price: number;
  stock: number;
  image_url?: string;
  image_urls?: string[];
  category_id?: string | null;
  original_price?: number | null;
  status?: string;
}

export async function createProduct(
  input: UpsertProductInput
): Promise<ProductRow> {
  const { data, error } = await supabase
    .from("products")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as ProductRow;
}

export async function updateProduct(
  id: string,
  patch: Partial<UpsertProductInput>
): Promise<ProductRow> {
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ProductRow;
}

/**
 * Hard-delete produk.
 * RLS membatasi ini hanya untuk owner/co_owner.
 * Pastikan produk tidak memiliki order aktif sebelum menghapus.
 */
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
