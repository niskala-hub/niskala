import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

type Mode = "signin" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotMode, setForgotMode] = useState<"email" | "owner">("email");
  const { session, mustChangePassword, loading } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && session) {
      if (mustChangePassword) {
        nav("/auth/change-password", { replace: true });
      } else {
        nav("/admin", { replace: true });
      }
    }
  }, [session, mustChangePassword, loading, nav]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // redirect handled by useEffect above after mustChangePassword is loaded
    } catch (err: any) {
      toast({ title: "Gagal masuk", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-password-reset", {
        body: {
          email,
          mode: forgotMode,
          redirect_to: `${window.location.origin}/auth/change-password`,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setForgotSent(true);
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke toko
        </Link>

        <div className="bg-background border border-border p-8 shadow-sm">
          {/* Header */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">NISKALA Admin</p>
            <h1 className="text-2xl font-light text-foreground">
              {mode === "signin" ? "Masuk" : "Lupa Password"}
            </h1>
          </div>

          {/* Sign In Form */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-border bg-background focus:outline-none focus:border-foreground transition-colors text-sm"
                  placeholder="nama@email.com"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-border bg-background focus:outline-none focus:border-foreground transition-colors text-sm pr-11"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
              >
                {busy ? "Memproses…" : "Masuk"}
              </button>

              <button
                type="button"
                onClick={() => { setMode("forgot"); setForgotSent(false); }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                Lupa password?
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot" && !forgotSent && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Masukkan email akun Anda. Kami akan mengirimkan link untuk mereset password Anda.
              </p>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-border bg-background focus:outline-none focus:border-foreground transition-colors text-sm"
                  placeholder="nama@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {busy ? "Mengirim…" : "Kirim Link Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => setMode("signin")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Kembali ke halaman masuk
              </button>
            </form>
          )}

          {/* Forgot - Success state */}
          {mode === "forgot" && forgotSent && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Email terkirim!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cek inbox <strong>{email}</strong> dan klik link reset password yang kami kirimkan.
                </p>
              </div>
              <button
                onClick={() => { setMode("signin"); setForgotSent(false); setEmail(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Kembali ke halaman masuk
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Belum punya akun? Hubungi owner untuk mendapatkan undangan.
        </p>
      </div>
    </div>
  );
}
