/**
 * orderService.ts
 * ──────────────────────────────────────────────────────────────
 * Clean Architecture service layer for all Order operations.
 *
 * Prinsip:
 * - Satu tempat untuk semua query Order (DRY)
 * - Snapshot HPP & harga jual dari produk saat order dibuat
 * - State transitions (paid, cancelled) dilakukan via update,
 *   bukan delete — trigger DB yang otomasi stok & kas
 * - Tidak pernah hard-delete order yang sudah paid
 * ──────────────────────────────────────────────────────────────
 */

import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "done"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid";
export type OrderChannel = "offline" | "online";

export interface OrderItemDraft {
  /** FK ke products.id — null jika produk sudah dihapus */
  product_id: string | null;
  /** Snapshot nama produk saat transaksi */
  product_name: string;
  quantity: number;
  /** Snapshot harga jual saat transaksi */
  unit_price: number;
  /** Snapshot HPP saat transaksi */
  unit_hpp: number;
}

export interface CreateOrderInput {
  customer_name?: string;
  customer_phone?: string;
  channel?: OrderChannel;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  paid_at?: string;
  notes?: string;
  /** Tanggal order (ISO string). Default: sekarang */
  order_date?: string;
  items: OrderItemDraft[];
}

export interface OrderRow {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  channel: OrderChannel;
  notes: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  stock_deducted: boolean;
  total_price: number;
  total_hpp: number;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends OrderRow {
  order_items: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    unit_hpp: number;
  }>;
}

export type OrderListFilters = {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  channel?: OrderChannel;
  search?: string; // customer_name ilike
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

// ─────────────────────────────────────────────
// CREATE ORDER
// ─────────────────────────────────────────────

/**
 * Membuat order baru beserta order_items-nya.
 * HPP dan harga jual di-snapshot dari input (sudah diambil
 * dari produk di frontend saat user memilih).
 *
 * Header selalu diinsert sebagai 'unpaid' terlebih dahulu agar
 * order_items tersimpan sebelum trigger stock & kas dieksekusi.
 * Jika payment_status = 'paid', otomatis dilunasi via markOrderPaid().
 */
export async function createOrder(input: CreateOrderInput) {
  const total_price = input.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const total_hpp = input.items.reduce(
    (sum, item) => sum + item.unit_hpp * item.quantity,
    0
  );

  // 1. Insert order header as unpaid first
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: input.customer_name ?? null,
      customer_phone: input.customer_phone ?? null,
      channel: input.channel ?? "offline",
      notes: input.notes ?? null,
      status: input.status ?? "pending",
      payment_status: "unpaid",
      total_price,
      total_hpp,
      created_at: input.order_date
        ? new Date(input.order_date).toISOString()
        : undefined,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // 2. Insert order items (with HPP snapshot)
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .insert(
      input.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_hpp: item.unit_hpp,
      }))
    )
    .select();

  if (itemsError) throw itemsError;

  // 3. If caller requested paid directly, mark paid now (fires stock deduction & cash trigger with items present)
  if (input.payment_status === "paid") {
    const paidOrder = await markOrderPaid(
      order.id,
      input.paid_at ??
        (input.order_date
          ? new Date(input.order_date).toISOString()
          : new Date().toISOString())
    );
    return { order: paidOrder, items };
  }

  return { order, items };
}

// ─────────────────────────────────────────────
// UPDATE ORDER — Status Transitions
// ─────────────────────────────────────────────

/**
 * Tandai order sebagai LUNAS.
 * Trigger `trg_orders_manage_stock` akan otomatis:
 *   - Mengurangi products.stock untuk setiap item
 * Trigger `trg_orders_sync_cash_v2` akan otomatis:
 *   - Mencatat transaksi Kas Inflow 'Penjualan'
 */
export async function markOrderPaid(
  orderId: string,
  paidAt?: string
): Promise<OrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      paid_at: paidAt ?? new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as OrderRow;
}

/**
 * Batalkan order (Soft Cancel — BUKAN hard delete).
 * Trigger otomatis akan:
 *   - Mengembalikan stok produk jika sebelumnya sudah deducted
 *   - Membuat reversal outflow di kas jika sebelumnya sudah paid
 */
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<OrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancellation_reason: reason ?? null,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as OrderRow;
}

/**
 * Update status pengiriman order (non-financial).
 * Hanya untuk transisi: pending → processing → shipped → done
 */
export async function updateOrderStatus(
  orderId: string,
  status: Exclude<OrderStatus, "cancelled">
): Promise<OrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .neq("status", "cancelled") // Guard: tidak bisa un-cancel via ini
    .select()
    .single();

  if (error) throw error;
  return data as unknown as OrderRow;
}

/**
 * Update detail order (customer info, notes, channel).
 * Hanya boleh dilakukan pada order yang belum paid.
 */
export async function updateOrderDetails(
  orderId: string,
  patch: Pick<
    Partial<CreateOrderInput>,
    "customer_name" | "customer_phone" | "channel" | "notes"
  >
): Promise<OrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .eq("payment_status", "unpaid") // Guard: tidak bisa edit order lunas
    .select()
    .single();

  if (error) throw error;
  return data as unknown as OrderRow;
}

// ─────────────────────────────────────────────
// READ ORDERS
// ─────────────────────────────────────────────

/**
 * Ambil list order dengan filter dan paginasi.
 * Selalu include order_items untuk kalkulasi sisi client.
 */
export async function fetchOrders(filters: OrderListFilters = {}) {
  const {
    status,
    payment_status,
    channel,
    search,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 50,
  } = filters;

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        id,
        product_id,
        product_name,
        quantity,
        unit_price,
        unit_hpp
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq("status", status);
  if (payment_status) query = query.eq("payment_status", payment_status);
  if (channel) query = query.eq("channel", channel);
  if (search) query = query.ilike("customer_name", `%${search}%`);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data, error, count } = await query;

  if (error) throw error;
  return { orders: (data ?? []) as OrderWithItems[], count: count ?? 0 };
}

/**
 * Ambil satu order lengkap dengan items-nya.
 */
export async function fetchOrderById(orderId: string): Promise<OrderWithItems> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        id,
        product_id,
        product_name,
        quantity,
        unit_price,
        unit_hpp
      )
    `
    )
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data as unknown as OrderWithItems;
}

// ─────────────────────────────────────────────
// VALIDATE STOCK (via Supabase RPC)
// ─────────────────────────────────────────────

/**
 * Validasi stok sebelum menandai order sebagai lunas.
 * Memanggil PostgreSQL function `validate_order_stock`.
 * Returns array of items with is_sufficient flag.
 */
export async function validateOrderStock(orderId: string) {
  const { data, error } = await supabase.rpc("validate_order_stock", {
    p_order_id: orderId,
  });

  if (error) throw error;
  return data as Array<{
    product_id: string;
    product_name: string;
    requested: number;
    available: number;
    is_sufficient: boolean;
  }>;
}

// ─────────────────────────────────────────────
// DELETE (restricted — owner only, unpaid only)
// ─────────────────────────────────────────────

/**
 * Hard-delete order. Hanya berhasil jika:
 *   - User adalah owner/co_owner (enforced by RLS)
 *   - Order belum paid (enforced by RLS)
 * Untuk order paid, gunakan cancelOrder() sebagai gantinya.
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw error;
}
