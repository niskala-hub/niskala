/**
 * useAccounting.ts
 * ──────────────────────────────────────────────────────────────
 * Custom React hook untuk data Accounting & Kas.
 * - Summary KPIs dari view v_accounting_summary
 * - Daftar transaksi dengan filter
 * - Realtime subscription
 * ──────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  addManualTransaction,
  deleteTransaction,
  fetchAccountingSummary,
  fetchMonthlyCashFlow,
  fetchTransactions,
  updateTransaction,
  type AccountingSummary,
  type CashTransactionRow,
  type ManualTransactionInput,
  type MonthlyCashFlow,
  type TransactionFilters,
} from "@/services/accountingService";

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useAccounting(initialFilters: TransactionFilters = {}) {
  const { toast } = useToast();

  // Summary KPIs
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Monthly chart data
  const [monthlyData, setMonthlyData] = useState<MonthlyCashFlow[]>([]);

  // Transaction list
  const [transactions, setTransactions] = useState<CashTransactionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Loaders ───────────────────────────────────────────────

  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const data = await fetchAccountingSummary();
      setSummary(data);
    } catch (err) {
      toast({
        title: "Gagal memuat ringkasan keuangan",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSummaryLoading(false);
    }
  }, [toast]);

  const loadMonthly = useCallback(async () => {
    try {
      const data = await fetchMonthlyCashFlow(12);
      setMonthlyData(data);
    } catch {
      // Non-critical, silently fail
    }
  }, []);

  const loadTransactions = useCallback(
    async (overrideFilters?: TransactionFilters) => {
      setIsLoading(true);
      try {
        const { transactions: data, count } = await fetchTransactions(
          overrideFilters ?? filters
        );
        setTransactions(data);
        setTotalCount(count);
      } catch (err) {
        toast({
          title: "Gagal memuat transaksi",
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
    loadSummary();
    loadMonthly();
    loadTransactions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime ─────────────────────────────────────────────
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("accounting-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cash_transactions" },
        () => {
          // Reload both summary and list on any cash change
          loadSummary();
          loadMonthly();
          loadTransactions();
        }
      )
      // Also watch order payment changes (trigger will update cash, but summary needs refresh)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          loadSummary();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSummary, loadMonthly, loadTransactions]);

  // ── Mutations ─────────────────────────────────────────────

  /**
   * Tambah transaksi kas manual.
   */
  const addTransaction = useCallback(
    async (input: ManualTransactionInput) => {
      try {
        const created = await addManualTransaction(input);
        toast({
          title: "Transaksi ditambahkan ✓",
          description: `${input.type === "inflow" ? "Pemasukan" : "Pengeluaran"} ${input.category} berhasil dicatat.`,
        });
        // Optimistically prepend
        setTransactions((prev) => [created, ...prev]);
        setTotalCount((c) => c + 1);
        // Refresh summary
        loadSummary();
        loadMonthly();
        return created;
      } catch (err) {
        toast({
          title: "Gagal menambah transaksi",
          description: (err as Error).message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast, loadSummary, loadMonthly]
  );

  /**
   * Edit transaksi (owner only via RLS).
   */
  const editTransaction = useCallback(
    async (id: string, patch: Partial<ManualTransactionInput>) => {
      try {
        const updated = await updateTransaction(id, patch);
        setTransactions((prev) =>
          prev.map((tx) => (tx.id === id ? { ...tx, ...updated } : tx))
        );
        loadSummary();
        loadMonthly();
        toast({ title: "Transaksi diperbarui ✓" });
        return updated;
      } catch (err) {
        toast({
          title: "Gagal memperbarui transaksi",
          description: (err as Error).message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast, loadSummary, loadMonthly]
  );

  /**
   * Hard-delete transaksi (owner only via RLS).
   */
  const removeTransaction = useCallback(
    async (id: string) => {
      try {
        await deleteTransaction(id);
        setTransactions((prev) => prev.filter((tx) => tx.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
        loadSummary();
        loadMonthly();
        toast({ title: "Transaksi dihapus" });
      } catch (err) {
        toast({
          title: "Gagal menghapus transaksi",
          description: (err as Error).message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast, loadSummary, loadMonthly]
  );

  // ── Filter helpers ────────────────────────────────────────

  const applyFilters = useCallback(
    (newFilters: TransactionFilters) => {
      const merged = { ...filters, ...newFilters, page: 1 };
      setFilters(merged);
      loadTransactions(merged);
    },
    [filters, loadTransactions]
  );

  const resetFilters = useCallback(() => {
    setFilters({});
    loadTransactions({});
  }, [loadTransactions]);

  const goToPage = useCallback(
    (page: number) => {
      const merged = { ...filters, page };
      setFilters(merged);
      loadTransactions(merged);
    },
    [filters, loadTransactions]
  );

  return {
    // Summary
    summary,
    isSummaryLoading,
    // Chart data
    monthlyData,
    // Transaction list
    transactions,
    totalCount,
    isLoading,
    filters,
    // Mutations
    addTransaction,
    editTransaction,
    removeTransaction,
    // Filter controls
    applyFilters,
    resetFilters,
    goToPage,
    // Manual refresh
    refreshSummary: loadSummary,
    refreshTransactions: loadTransactions,
  };
}
