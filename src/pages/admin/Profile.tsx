import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, User, KeyRound, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useComingSoonSetting } from "@/hooks/useComingSoonSetting";

export default function Profile() {
  const { user, isOwner, isCoOwner, isAdmin } = useAuth();
  const { toast } = useToast();
  const { comingSoonEnabled, toggle: toggleComingSoon } = useComingSoonSetting();

  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      setUsername(data?.username ?? "");
      setInitialUsername(data?.username ?? "");
      setLoading(false);
    })();
  }, [user]);

  const saveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const value = username.trim();
    if (value.length < 3) {
      toast({ title: "Username terlalu pendek", description: "Minimal 3 karakter.", variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
      toast({ title: "Format username tidak valid", description: "Gunakan huruf, angka, titik, garis bawah, atau tanda hubung.", variant: "destructive" });
      return;
    }

    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ username: value }).eq("id", user.id);
    setSavingName(false);

    if (error) {
      const taken = error.code === "23505" || error.message.toLowerCase().includes("duplicate");
      toast({
        title: taken ? "Username sudah dipakai" : "Gagal menyimpan username",
        description: taken ? "Silakan pilih username lain." : error.message,
        variant: "destructive",
      });
      return;
    }
    setInitialUsername(value);
    setUsername(value);
    toast({ title: "Username tersimpan" });
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Password terlalu pendek", description: "Minimal 8 karakter.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirm) {
      toast({ title: "Password tidak cocok", description: "Pastikan kedua password sama.", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) {
      toast({ title: "Gagal mengubah password", description: error.message, variant: "destructive" });
      return;
    }
    setNewPassword("");
    setConfirm("");
    toast({ title: "Password berhasil diubah" });
  };

  const inputCls = "w-full px-4 py-3 border border-border bg-background focus:outline-none focus:border-foreground transition-colors text-sm";

  return (
    <div className="px-4 py-8 sm:px-8 max-w-2xl">
      <h1 className="text-2xl font-light mb-1">Profil Saya</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {user?.email} · {isOwner ? "Owner" : isCoOwner ? "Co-Owner" : "Admin"}
      </p>

      <section className="border border-border p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Username</h2>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : (
          <form onSubmit={saveUsername} className="space-y-3">
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Belum diisi — buat username Anda"
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground">
              Username harus unik dan minimal 3 karakter.
            </p>
            <button
              type="submit"
              disabled={savingName || username.trim() === initialUsername}
              className="px-5 py-2.5 bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
            >
              {savingName ? "Menyimpan…" : "Simpan Username"}
            </button>
          </form>
        )}
      </section>

      <section className="border border-border p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Ubah Password</h2>
        </div>
        <form onSubmit={savePassword} className="space-y-3">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Password baru (min. 8 karakter)"
              className={inputCls + " pr-11"}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Ulangi password baru"
            className={inputCls}
          />
          {confirm && confirm !== newPassword && (
            <p className="text-xs text-red-500">Password tidak cocok.</p>
          )}
          <button
            type="submit"
            disabled={savingPw || !newPassword || newPassword !== confirm}
            className="px-5 py-2.5 bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
          >
            {savingPw ? "Menyimpan…" : "Simpan Password"}
          </button>
        </form>
      </section>
      {/* ── Site Settings (owner / admin / co-owner only) ── */}
      {isAdmin && (
        <section className="border border-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Pengaturan Situs</h2>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Mode Coming Soon</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs leading-relaxed">
                Saat aktif, semua pengunjung di-redirect ke halaman coming soon.
                Kamu dan tim tetap bisa mengakses seluruh area admin secara normal.
              </p>
            </div>
            <Switch
              id="coming-soon-toggle"
              checked={comingSoonEnabled}
              onCheckedChange={async (val) => {
                await toggleComingSoon(val);
                toast({
                  title: val ? "Mode Coming Soon diaktifkan" : "Mode Coming Soon dinonaktifkan",
                  description: val
                    ? "Pengunjung umum sekarang di-redirect ke halaman coming soon."
                    : "Website kembali dapat diakses publik secara normal.",
                });
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
