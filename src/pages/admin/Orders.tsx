import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/currency";
import { ShoppingBag } from "lucide-react";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  total_price: number;
  created_at: string;
  order_items: OrderItem[];
}

const STATUSES = ["pending", "paid", "shipped", "done", "cancelled"];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, status, total_price, created_at, order_items(id, product_name, quantity, unit_price)")
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status } : o)));
    await supabase.from("orders").update({ status }).eq("id", id);
  };

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-light mb-1">Pesanan</h1>
      <p className="text-sm text-muted-foreground mb-8">Daftar pesanan yang masuk.</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : orders.length === 0 ? (
        <div className="border border-border p-10 text-center">
          <ShoppingBag className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="border border-border p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {o.customer_name || "Tanpa nama"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.customer_phone || "—"} ·{" "}
                    {new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatIDR(Number(o.total_price))}</span>
                  <select
                    value={o.status}
                    onChange={e => updateStatus(o.id, e.target.value)}
                    className="border border-border bg-background text-xs px-2 py-1.5 focus:outline-none focus:border-foreground"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {o.order_items?.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-border space-y-1">
                  {o.order_items.map(it => (
                    <li key={it.id} className="flex justify-between gap-4 text-xs text-muted-foreground">
                      <span className="truncate">{it.product_name} × {it.quantity}</span>
                      <span className="shrink-0">{formatIDR(Number(it.unit_price) * it.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
