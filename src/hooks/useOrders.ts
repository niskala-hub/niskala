/**
 * useOrders.ts
 * ──────────────────────────────────────────────────────────────
 * Custom React hook untuk manajemen Orders.
 * - Fetch + state management
 * - Realtime subscription via Supabase Realtime
 * - Optimistic updates untuk UX yang responsif
 * ──────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelOrder,
  createOrder,
  deleteOrder,
  fetchOrderById,
  fetchOrders,
  markOrderPaid,
  updateOrderStatus,
  validateOrderStock,
  type CreateOrderInput,
  type OrderListFilters,
  type OrderStatus,
  type OrderWithItems,
} from "@/services/orderService";

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useOrders(initialFilters: OrderListFilters = {}) {
  const { toast } = useToast();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<OrderListFilters>(initialFilters);

  // Track active Supabase channel to prevent duplicates
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch ─────────────────────────────────────────────────
  const load = useCallback(
    async (overrideFilters?: OrderListFilters) => {
      setIsLoading(true);
      try {
        const { orders: data, count } = await fetchOrders(
          overrideFilters ?? filters
        );
        setOrders(data);
        setTotalCount(count);
      } catch (err) {
        toast({
          title: "Gagal memuat pesanan",
          description: (err as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [filters, toast]
  );

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // ── Realtime Subscription ─────────────────────────────────
  useEffect(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            // Remove from list
            setOrders((prev) =>
              prev.filter((o) => o.id !== (payload.old as { id: string }).id)
            );
            setTotalCount((c) => Math.max(0, c - 1));
            return;
          }

          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            // Fetch full order with items to update state
            try {
              const updated = await fetchOrderById(
                (payload.new as { id: string }).id
              );

              setOrders((prev) => {
                const idx = prev.findIndex((o) => o.id === updated.id);
                if (idx === -1) {
                  // New order — prepend
                  setTotalCount((c) => c + 1);
                  return [updated, ...prev];
                }
                // Update in place
                const next = [...prev];
                next[idx] = updated;
                return next;
              });
            } catch {
              // If we can't fetch (RLS issue etc.), just reload
              load();
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // ── Mutations ─────────────────────────────────────────────

  /**
   * Buat order baru.
   * Stock TIDAK langsung berkurang — baru berkurang saat markPaid.
   */
  const create = useCallback(
    async (input: CreateOrderInput) => {
      try {
        const result = await createOrder(input);
        toast({
          title: "Pesanan dibuat",
          description: `Order untuk ${input.customer_name || "tanpa nama"} berhasil disimpan.`,
        });
        return result;
      } catch (err) {
        toast({
          title: "Gagal membuat pesanan",
          description: (err as Error).message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  /**
   * Tandai order sebagai LUNAS.
   * DB trigger otomatis: kurangi stok + catat kas inflow.
   */
  const markPaid = useCallback(
    async (orderId: string, paidAt?: string) => {
      // Optional: validate stock first
      try {
        const stockCheck = await validateOrderStock(orderId);
        const insufficient = stockCheck.filter((s) => !s.is_sufficient);
        if (insufficient.length > 0) {
          const names = insufficient.map((s) => s.product_name).join(", ");
          toast({
            title: "Stok tidak mencukupi",
            description: `Produk berikut kekurangan stok: ${names}`,
            variant: "destructive",
          });
          return null;
        }
      } catch {
        // If RPC fails, proceed anyway (DB trigger will clamp to 0)
      }

      try {
        const updated = await markOrderPaid(orderId, paidAt);
        toast({
          title: "Pesanan dilunasi ✓",
          description: "Stok berkurang & transaksi kas tercatat otomatis.",
        });
        return updated;
      } catch (err) {
        toast({
          title: "Gagal melunasi pesanan",
          description: (err as Error).message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  /**
   * Batalkan order.
   * DB trigger otomatis: kembalikan stok + buat reversal kas.
   */
  const cancel = useCallback(
    async (orderId: string, reason?: string) => {
      try {
        const updated = await cancelOrder(orderId, reason);
        toast({
          title: "Pesanan dibatalkan",
          description:
            "Stok dikembalikan & transaksi reversal tercatat di kas.",
        });
        return updated;
      } catch (err) {
        toast({
          title: "Gagal membatalkan pesanan",
          description: (err as Error).message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  /**
   * Update status pengiriman.
   */
  const changeStatus = useCallback(
    async (
      orderId: string,
      status: Exclude<OrderStatus, "cancelled">
    ) => {
      try {
        const updated = await updateOrderStatus(orderId, status);
        return updated;
      } catch (err) {
        toast({
          title: "Gagal update status",
          description: (err as Error).message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  /**
   * Hard-delete order (owner only, unpaid only).
   */
  const remove = useCallback(
    async (orderId: string) => {
      try {
        await deleteOrder(orderId);
        toast({ title: "Pesanan dihapus" });
      } catch (err) {
        toast({
          title: "Gagal menghapus",
          description: (err as Error).message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  // ── Filter helpers ────────────────────────────────────────

  const applyFilters = useCallback(
    (newFilters: OrderListFilters) => {
      const merged = { ...filters, ...newFilters, page: 1 };
      setFilters(merged);
      load(merged);
    },
    [filters, load]
  );

  const resetFilters = useCallback(() => {
    setFilters({});
    load({});
  }, [load]);

  const goToPage = useCallback(
    (page: number) => {
      const merged = { ...filters, page };
      setFilters(merged);
      load(merged);
    },
    [filters, load]
  );

  return {
    // State
    orders,
    totalCount,
    isLoading,
    filters,
    // Mutations
    create,
    markPaid,
    cancel,
    changeStatus,
    remove,
    // Filter controls
    applyFilters,
    resetFilters,
    goToPage,
    // Manual refresh
    refresh: load,
  };
}
