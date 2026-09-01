import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";

function getAuthErrorFromUrl(): { title: string; description: string } | null {
  if (typeof window === "undefined") return null;
  const hashStr = window.location.hash.replace(/^#/, "");
  const searchStr = window.location.search.replace(/^\?/, "");

  const hashParams = new URLSearchParams(hashStr);
  const searchParams = new URLSearchParams(searchStr);

  const error = hashParams.get("error") || searchParams.get("error");
  const errorCode = hashParams.get("error_code") || searchParams.get("error_code");
  const errorDesc = hashParams.get("error_description") || searchParams.get("error_description");

  if (!error && !errorCode && !errorDesc) return null;

  let title = "Link Tidak Valid atau Kadaluwarsa";
  let description = "Link dari email yang Anda buka tidak valid atau sudah kadaluwarsa.";

  if (errorCode === "otp_expired" || errorDesc?.toLowerCase().includes("expired")) {
    title = "Link Email Kadaluwarsa";
    description = "Link dari email yang Anda buka telah kadaluwarsa (expired) dan tidak dapat digunakan lagi.";
  } else if (errorDesc) {
    description = decodeURIComponent(errorDesc.replace(/\+/g, " "));
  }

  return { title, description };
}

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifyingLink, setVerifyingLink] = useState(false);
  const [urlError, setUrlError] = useState<{ title: string; description: string } | null>(null);

  const { session, mustChangePassword, loading, refreshProfile } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();

  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const tokenHash = search?.get("token_hash") ?? null;
  const emailType = search?.get("type");
  const isTokenHashLink = !!tokenHash && (emailType === "recovery" || emailType === "invite" || emailType === "signup");
  const isRecoveryLink = isTokenHashLink || hash.includes("type=recovery") || hash.includes("access_token") || hash.includes("type=invite") || hash.includes("type=signup");
  useEffect(() => {
    const err = getAuthErrorFromUrl();
    if (err) {
      setUrlError(err);
    }
  }, []);

  // 1. Verifikasi Token Hash jika URL mengandung query parameter token_hash (fallback PKCE/Custom)
  useEffect(() => {
    if (!isTokenHashLink || !tokenHash) return;

    let active = true;
    setVerifyingLink(true);

    const verifyToken = async () => {
      let otpType: "signup" | "recovery" | "invite" = "recovery";
      if (emailType === "invite" || emailType === "signup") {
        otpType = "signup";
      } else if (emailType === "recovery") {
        otpType = "recovery";
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType as any,
      });

      if (!active) return;

      if (error) {
        setUrlError({
          title: "Link Tidak Valid atau Kadaluwarsa",
          description: error.message,
        });
      } else {
        // Clean query params dari URL setelah token berhasil diverifikasi
        window.history.replaceState({}, document.title, window.location.pathname);
        await refreshProfile();
      }
      setVerifyingLink(false);
    };

    verifyToken();

    return () => { active = false; };
  }, [emailType, isTokenHashLink, tokenHash, refreshProfile]);

  // 2. Tangani Listener Auth State dari Hash URL (#access_token=...)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (window.location.hash && !window.location.hash.includes("error")) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Redirect ke /auth HANYA jika memang tidak ada session & tidak ada link recovery yang sedang diproses
  useEffect(() => {
    if (loading || verifyingLink || session || urlError) return;

    // Jika URL memiliki fragment hash/query recovery tapi session belum siap, tunggu hingga SDK siap
    if (isRecoveryLink) return;

    nav("/auth", { replace: true });
  }, [session, loading, verifyingLink, nav, isRecoveryLink, urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast({ title: "Password tidak cocok", description: "Pastikan kedua password sama.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password terlalu pendek", description: "Minimal 8 karakter.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      // Update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Clear must_change_password flag in profile
      if (session?.user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", session.user.id);
      }

      await refreshProfile();

      toast({ title: "Password berhasil diubah!", description: "Anda akan diarahkan ke dashboard." });
      setTimeout(() => nav("/admin", { replace: true }), 1200);
    } catch (err: any) {
      toast({ title: "Gagal mengubah password", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading || verifyingLink) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (urlError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-background border border-border p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-xl font-light text-foreground mb-2">{urlError.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {urlError.description}
            </p>

            <div className="bg-amber-50 border border-amber-200 p-4 text-left rounded mb-6 text-xs text-amber-900 leading-relaxed space-y-2">
              <p className="font-semibold">Solusi yang dapat Anda lakukan:</p>
              <p>• <strong>Jika Anda diundang oleh Owner/Co-Owner:</strong> Minta pengundang Anda untuk menekan tombol <strong>"Resend Invitation" (Kirim Ulang Undangan)</strong> di daftar pengguna.</p>
              <p>• <strong>Jika Anda mencoba Reset Password:</strong> Silakan minta link reset password baru melalui halaman masuk.</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => nav("/auth")}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Ke Halaman Masuk
              </button>
              <button
                onClick={() => nav("/auth?mode=forgot")}
                className="w-full py-2.5 border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Minta Reset Password Baru
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-background border border-border p-8 shadow-sm">
          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Keamanan Akun</p>
              <h1 className="text-xl font-light text-foreground">Buat Password Baru</h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {mustChangePassword
                  ? "Untuk keamanan akun Anda, silakan buat password baru sebelum melanjutkan."
                  : "Masukkan password baru Anda."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">
                Password Baru
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-border bg-background focus:outline-none focus:border-foreground transition-colors text-sm pr-11"
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
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">
                Konfirmasi Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={`w-full px-4 py-3 border bg-background focus:outline-none transition-colors text-sm pr-11 ${confirm && confirm !== newPassword
                    ? "border-red-400 focus:border-red-500"
                    : "border-border focus:border-foreground"
                    }`}
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
              {confirm && confirm !== newPassword && (
                <p className="text-xs text-red-500 mt-1">Password tidak cocok.</p>
              )}
            </div>

            {/* Strength hint */}
            {newPassword.length > 0 && (
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${newPassword.length >= i * 3
                      ? newPassword.length >= 12 ? "bg-green-500" : newPassword.length >= 8 ? "bg-amber-400" : "bg-red-400"
                      : "bg-muted"
                      }`}
                  />
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || (!!confirm && confirm !== newPassword)}
              className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
            >
              {busy ? "Menyimpan…" : "Simpan Password Baru"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
