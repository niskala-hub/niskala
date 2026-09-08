import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import {
  Plus, Trash2, X, Crown, ShieldCheck, ShieldHalf, KeyRound, RefreshCw, Send, Eye, EyeOff,
} from "lucide-react";

type RoleType = "owner" | "co_owner" | "admin";

interface StaffUser {
  id: string;
  email: string | null;
  roles: RoleType[];
  mustChangePassword: boolean;
}

const ROLE_LABEL: Record<RoleType, string> = {
  owner: "Owner",
  co_owner: "Co-Owner",
  admin: "Admin",
};

const ROLE_COLOR: Record<RoleType, string> = {
  owner: "text-amber-700 bg-amber-50 border-amber-200",
  co_owner: "text-violet-700 bg-violet-50 border-violet-200",
  admin: "text-sky-700 bg-sky-50 border-sky-200",
};

function RoleBadge({ role }: { role: RoleType }) {
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${ROLE_COLOR[role]}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}

function RoleIcon({ roles }: { roles: RoleType[] }) {
  if (roles.includes("owner")) return <Crown className="w-4 h-4 text-amber-500 shrink-0" />;
  if (roles.includes("co_owner")) return <ShieldHalf className="w-4 h-4 text-violet-500 shrink-0" />;
  return <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0" />;
}

export default function Users() {
  const { canManageUsers, isOwner, loading, user } = useAuth();
  const [rows, setRows] = useState<StaffUser[]>([]);
  const [requests, setRequests] = useState<
    { id: string; email: string; user_id: string | null; status: string; created_at: string }[]
  >([]);

  // Invite form state
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "co_owner">("admin");

  // Reset password form state
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPass, setShowResetPass] = useState(false);

  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [p, r, profiles] = await Promise.all([
      supabase.from("profiles").select("id,email,must_change_password"),
      supabase.from("user_roles").select("user_id,role"),
      Promise.resolve(null),
    ]);
    if (p.error) return toast({ title: "Error", description: p.error.message, variant: "destructive" });

    const roleMap = new Map<string, RoleType[]>();
    (r.data || []).forEach(x => {
      roleMap.set(x.user_id, [...(roleMap.get(x.user_id) || []), x.role as RoleType]);
    });

    const mcpMap = new Map<string, boolean>();
    (p.data || []).forEach(x => {
      mcpMap.set(x.id, x.must_change_password ?? false);
    });

    setRows(
      (p.data || []).map(x => ({
        id: x.id,
        email: x.email,
        roles: roleMap.get(x.id) || [],
        mustChangePassword: mcpMap.get(x.id) ?? false,
      }))
    );
    const rq = await supabase
      .from("password_reset_requests")
      .select("id,email,user_id,status,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRequests(rq.data || []);
  };

  const resolveRequest = async (id: string) => {
    setBusy(true);
    const res = await supabase.functions.invoke("create-admin", {
      body: { action: "resolve_reset_request", request_id: id },
    });
    setBusy(false);
    if ((res.data as any)?.error || res.error) {
      return toast({ title: "Gagal", description: (res.data as any)?.error ?? res.error?.message, variant: "destructive" });
    }
    load();
  };

  useEffect(() => { if (canManageUsers) load(); }, [canManageUsers]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!canManageUsers) return <Navigate to="/admin" replace />;

  // Helper to extract detailed error message from Edge Function response
  const getErrorMessage = async (res: { data: any; error: any }) => {
    if (res.data?.error) return res.data.error;
    if (res.error) {
      try {
        const body = await (res.error as any).context?.json();
        if (body?.error) return body.error;
        if (body?.message) return body.message;
      } catch {}
      return res.error.message || "Terjadi kesalahan server";
    }
    return null;
  };

  // ── Invite ──────────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await supabase.functions.invoke("create-admin", {
        body: {
          action: "invite",
          email: inviteEmail,
          role: inviteRole,
          redirect_to: "https://niskalawear.com/auth/confirm-invite",
        },
      });

      const errMsg = await getErrorMessage(res);
      if (errMsg) throw new Error(errMsg);
      toast({ title: "Pengguna berhasil diundang", description: `${inviteEmail} — ${ROLE_LABEL[inviteRole]}` });
      setOpenInvite(false); setInviteEmail(""); setInviteRole("admin");
      load();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // ── Resend Invitation ──────────────────────────────────────────
  const handleResendInvite = async (u: StaffUser) => {
    setBusy(true);
    try {
      const res = await supabase.functions.invoke("create-admin", {
        body: {
          action: "resend_invite",
          user_id: u.id,
          redirect_to: "https://niskalawear.com/auth/confirm-invite",
        },
      });

      const errMsg = await getErrorMessage(res);
      if (errMsg) throw new Error(errMsg);
      toast({
        title: "Undangan Terkirim Ulang",
        description: `Link undangan baru telah dikirimkan ke email ${u.email}.`,
      });
      load();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // ── Reset Password ──────────────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetPassword.length < 8) {
      toast({ title: "Password terlalu pendek", description: "Minimal 8 karakter.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await supabase.functions.invoke("create-admin", {
        body: { action: "reset_password", user_id: resetTarget.id, new_password: resetPassword },
      });
      const errMsg = await getErrorMessage(res);
      if (errMsg) throw new Error(errMsg);
      toast({ title: "Password direset", description: `${resetTarget.email} harus ganti password saat login berikutnya.` });
      setResetTarget(null); setResetPassword("");
      load();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────
  const handleDelete = async (u: StaffUser) => {
    if (!confirm(`Hapus akun ${u.email}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      const res = await supabase.functions.invoke("create-admin", {
        body: { action: "delete_user", user_id: u.id },
      });
      const errMsg = await getErrorMessage(res);
      if (errMsg) throw new Error(errMsg);
      toast({ title: "Akun dihapus" });
      load();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const canResendInvite = (u: StaffUser) => {
    if (u.id === user?.id) return false;
    if (!u.mustChangePassword) return false;
    if (u.roles.includes("owner")) return false;
    if (u.roles.includes("co_owner") && !isOwner) return false;
    return true;
  };

  const canDelete = (u: StaffUser) => {
    if (u.id === user?.id) return false;
    const hasOwner = u.roles.includes("owner");
    const hasCoOwner = u.roles.includes("co_owner");
    if (hasOwner) return false; // nobody can delete owner
    if (hasCoOwner) return isOwner; // only owner can delete co-owner
    return true; // admin can be deleted by owner or co-owner
  };

  const canReset = (u: StaffUser) => {
    if (u.id === user?.id) return false;
    if (u.roles.includes("owner")) return false;
    if (u.roles.includes("co_owner") && !isOwner) return false;
    return true;
  };

  const primaryRole = (u: StaffUser): RoleType => {
    if (u.roles.includes("owner")) return "owner";
    if (u.roles.includes("co_owner")) return "co_owner";
    return "admin";
  };

  return (
    <div className="p-4 md:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} akun terdaftar</p>
        </div>
        {/* Only owner or co_owner can invite */}
        <button
          onClick={() => setOpenInvite(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm"
        >
          <Plus className="w-4 h-4" /> Undang Pengguna
        </button>
      </div>

      {/* Pending password reset requests */}
      {requests.length > 0 && (
        <div className="mb-6 border border-amber-200 bg-amber-50/60">
          <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-900">
              Permintaan Reset Password ({requests.length})
            </p>
          </div>
          <div className="divide-y divide-amber-200">
            {requests.map(rq => {
              const target = rows.find(r => r.id === rq.user_id || r.email === rq.email);
              return (
                <div key={rq.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{rq.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(rq.created_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {target && canReset(target) && (
                      <button
                        onClick={() => { setResetTarget(target); setResetPassword(""); setShowResetPass(false); }}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs"
                      >
                        Beri Password Baru
                      </button>
                    )}
                    <button
                      onClick={() => resolveRequest(rq.id)}
                      disabled={busy}
                      className="px-3 py-1.5 border border-amber-300 text-xs text-amber-900 disabled:opacity-50"
                    >
                      Tandai Selesai
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* User List */}
      <div className="space-y-2">
        {rows.map(u => {
          const pr = primaryRole(u);
          return (
            <div key={u.id} className="border border-border p-4 flex items-center gap-3 bg-background">
              <RoleIcon roles={u.roles} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{u.email || u.id}</p>
                  {u.mustChangePassword && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border text-orange-700 bg-orange-50 border-orange-200">
                      Harus Ganti Password
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <RoleBadge role={pr} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {canResendInvite(u) && (
                  <button
                    onClick={() => handleResendInvite(u)}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-medium transition-colors disabled:opacity-50"
                    title="Kirim ulang link email undangan"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kirim Ulang Undangan</span>
                  </button>
                )}
                {canReset(u) && (
                  <button
                    onClick={() => { setResetTarget(u); setResetPassword(""); setShowResetPass(false); }}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Reset Password"
                    aria-label="Reset password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                )}
                {canDelete(u) && (
                  <button
                    onClick={() => handleDelete(u)}
                    disabled={busy}
                    className="p-2 text-destructive hover:bg-muted transition-colors disabled:opacity-50"
                    aria-label="Hapus akun"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-10 text-center border border-border">
            Belum ada akun.
          </p>
        )}
      </div>

      {/* ── Invite Modal ─────────────────────────────────────── */}
      {openInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-md p-6 relative border border-border shadow-xl">
            <button onClick={() => setOpenInvite(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-light mb-1">Undang Pengguna Baru</h2>
            <p className="text-xs text-muted-foreground mb-5">
              Pengguna akan diminta mengganti password saat pertama kali login.
            </p>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">Email</label>
                <input
                  type="email" required value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-foreground"
                  placeholder="nama@email.com"
                />
              </div>

              {/* Password tidak diperlukan — user akan set sendiri via email invite */}

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as "admin" | "co_owner")}
                  className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-foreground"
                >
                  <option value="admin">Admin</option>
                  {isOwner && <option value="co_owner">Co-Owner</option>}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {inviteRole === "co_owner"
                    ? "Co-Owner punya akses setara owner, kecuali tidak bisa menghapus owner atau membuat co-owner baru."
                    : "Admin dapat mengelola produk, kategori, bio links, dan accounting."}
                </p>
              </div>

              <button
                type="submit" disabled={busy}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm disabled:opacity-50"
              >
                {busy ? "Memproses…" : "Kirim Undangan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ──────────────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-md p-6 relative border border-border shadow-xl">
            <button onClick={() => setResetTarget(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-1">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-lg font-light">Reset Password</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              Atur password baru untuk <strong>{resetTarget.email}</strong>. Pengguna akan diminta mengganti password saat login berikutnya.
            </p>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">Password Baru</label>
                <div className="relative">
                  <input
                    type={showResetPass ? "text" : "password"}
                    required minLength={8} value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-foreground pr-10"
                    placeholder="Minimal 8 karakter"
                  />
                  <button type="button" onClick={() => setShowResetPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={busy}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm disabled:opacity-50"
              >
                {busy ? "Menyimpan…" : "Atur Password Baru"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
