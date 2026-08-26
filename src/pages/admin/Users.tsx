import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { Plus, Trash2, X, Crown, ShieldCheck } from "lucide-react";

interface StaffUser {
  id: string;
  email: string | null;
  roles: string[];
}

export default function Users() {
  const { isOwner, loading, user } = useAuth();
  const [rows, setRows] = useState<StaffUser[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("id,email"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    if (p.error) return toast({ title: "Error", description: p.error.message, variant: "destructive" });
    const roleMap = new Map<string, string[]>();
    (r.data || []).forEach(x => {
      roleMap.set(x.user_id, [...(roleMap.get(x.user_id) || []), x.role as string]);
    });
    setRows((p.data || []).map(x => ({ id: x.id, email: x.email, roles: roleMap.get(x.id) || [] })));
  };

  useEffect(() => { if (isOwner) load(); }, [isOwner]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!isOwner) return <Navigate to="/admin" replace />;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: { email, password },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Admin dibuat", description: email });
      setOpen(false); setEmail(""); setPassword("");
      load();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (u: StaffUser) => {
    if (!confirm(`Cabut akses admin untuk ${u.email}?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    toast({ title: "Akses admin dicabut" });
    load();
  };

  return (
    <div className="p-4 md:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} akun</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm">
          <Plus className="w-4 h-4" /> Daftarkan admin
        </button>
      </div>

      <div className="space-y-3">
        {rows.map(u => {
          const owner = u.roles.includes("owner");
          return (
            <div key={u.id} className="border border-border p-4 flex items-center gap-3">
              {owner ? <Crown className="w-4 h-4 text-accent shrink-0" /> : <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{u.email || u.id}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {owner ? "Owner" : u.roles.includes("admin") ? "Admin" : "No access"}
                </p>
              </div>
              {!owner && u.id !== user?.id && u.roles.includes("admin") && (
                <button onClick={() => revoke(u)} className="p-2 text-destructive hover:bg-muted" aria-label="Revoke">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-10 text-center border border-border">Belum ada akun.</p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-md p-5 md:p-6 relative">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4"><X className="w-4 h-4" /></button>
            <h2 className="text-lg md:text-xl font-light mb-5">Daftarkan admin baru</h2>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-border bg-background" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
                <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-border bg-background" />
                <p className="text-xs text-muted-foreground mt-1">Minimal 8 karakter.</p>
              </div>
              <button type="submit" disabled={busy}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm disabled:opacity-50">
                {busy ? "Menyimpan…" : "Buat akun admin"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
