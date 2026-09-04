import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ShieldCheck, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

function getAuthErrorFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const errorDesc = hashParams.get("error_description") || searchParams.get("error_description");
  const errorCode = hashParams.get("error_code") || searchParams.get("error_code");
  if (!errorDesc && !errorCode) return null;
  return decodeURIComponent((errorDesc || errorCode || "").replace(/\+/g, " "));
}

export default function ConfirmInvite() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [linkExpired, setLinkExpired] = useState(false);
  const verifiedRef = useRef<string | null>(null);

  const { refreshProfile } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const finish = (ok: boolean) => {
      if (!active) return;
      setLinkExpired(!ok);
      setVerifying(false);
    };

    const init = async () => {
      // Error bawaan Supabase di URL (mis. otp_expired)
      const urlErr = getAuthErrorFromUrl();
      if (urlErr) return finish(false);

      const search = new URLSearchParams(window.location.search);
      const tokenHash = search.get("token_hash");
      const type = search.get("type");

      // 1. Link berbasis token_hash (dari edge function kami)
      if (tokenHash && type) {
        if (verifiedRef.current === tokenHash) return;
        verifiedRef.current = tokenHash;
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "invite" | "signup" | "recovery" | "magiclink",
        });
        if (error) return finish(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // 2. Tunggu session aktif (verifyOtp, hash access_token, atau session tersimpan)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
        return finish(true);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
        if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "USER_UPDATED") && sess?.user?.email) {
          setEmail(sess.user.email);
          if (window.location.hash) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          finish(true);
        }
      });

      // Beri waktu client memproses hash URL; jika tetap tidak ada session → expired
      setTimeout(async () => {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s) finish(false);
        subscription.unsubscribe();
      }, 3000);
    };

    init();
    return () => { active = false; };
  }, []);

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const formValid = newPassword.length >= 8 && confirm === newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", user.id);
      }

      await refreshProfile();
      toast({ title: "Akun berhasil diaktifkan!", description: "Anda akan diarahkan ke dashboard." });
      setTimeout(() => nav("/admin", { replace: true }), 1200);
    } catch (err: any) {
      toast({ title: "Gagal mengatur password", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Memverifikasi undangan…
        </div>
      </div>
    );
  }

  if (linkExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4 py-16">
        <div className="w-full max-w-md bg-background border border-border p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-light text-foreground mb-2">Link Kadaluwarsa</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Link undangan ini sudah tidak berlaku. Silakan hubungi admin Anda untuk meminta undangan baru.
          </p>
          <Link
            to="/auth"
            className="block w-full py-3 bg-primary text-primary-foreground text-sm font-medium text-center hover:opacity-90 transition-opacity"
          >
            Ke Halaman Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-background border border-border p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Undangan Admin</p>
              <h1 className="text-xl font-light text-foreground">Lengkapi Akun Anda</h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Atur password untuk mengaktifkan akun dan mengakses dashboard.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">Password Baru</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={`w-full px-4 py-3 border bg-background focus:outline-none transition-colors text-sm pr-11 ${passwordTooShort ? "border-red-400 focus:border-red-500" : "border-border focus:border-foreground"}`}
                  placeholder="Minimal 8 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordTooShort && <p className="text-xs text-red-500 mt-1">Minimal 8 karakter.</p>}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">Konfirmasi Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={`w-full px-4 py-3 border bg-background focus:outline-none transition-colors text-sm pr-11 ${mismatch ? "border-red-400 focus:border-red-500" : "border-border focus:border-foreground"}`}
                  placeholder="Ulangi password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mismatch && <p className="text-xs text-red-500 mt-1">Password tidak cocok.</p>}
              {!mismatch && confirm && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Password cocok.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy || !formValid}
              className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Menyimpan…" : "Atur Password & Masuk Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
