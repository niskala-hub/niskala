import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

type Step = "activate" | "resolving" | "set_password" | "success" | "expired";
type OtpType = "invite" | "signup" | "recovery" | "magiclink";

const OTP_TYPES: OtpType[] = ["invite", "signup", "recovery", "magiclink"];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  return String(error || "Terjadi kesalahan autentikasi.");
}

function isInvalidOrExpiredToken(error: unknown): boolean {
  const value = typeof error === "object" && error
    ? `${"code" in error ? String(error.code) : ""} ${getErrorMessage(error)}`
    : getErrorMessage(error);

  return /otp_expired|expired|invalid.*(?:token|otp|link|jwt)|(?:token|otp|link|jwt).*invalid/i.test(value);
}

function getUrlAuthError(): { code: string; message: string } | null {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const code = hashParams.get("error_code") || searchParams.get("error_code") || "";
  const description = hashParams.get("error_description") || searchParams.get("error_description") || "";
  if (!code && !description) return null;

  return {
    code,
    message: decodeURIComponent((description || code).replace(/\+/g, " ")),
  };
}

function clearAuthUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export default function ConfirmInvite() {
  const [step, setStep] = useState<Step>("activate");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const activationStartedRef = useRef(false);

  const { refreshProfile } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    console.info("[ConfirmInvite] URL auth params", {
      searchKeys: Array.from(searchParams.keys()),
      hashKeys: Array.from(hashParams.keys()),
      hasTokenHash: searchParams.has("token_hash"),
      hasCode: searchParams.has("code"),
      hasHashSession: hashParams.has("access_token"),
    });

    const acceptSession = (sessionEmail?: string) => {
      if (!active || !activationStartedRef.current || !sessionEmail) return;
      setEmail(sessionEmail);
      setInlineError("");
      setStep("set_password");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.info("[ConfirmInvite] Auth state changed", {
        event,
        hasSession: Boolean(session),
        hasUser: Boolean(session?.user),
      });
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION") {
        acceptSession(session?.user?.email);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleActivate = async () => {
    if (activationStartedRef.current) return;
    activationStartedRef.current = true;
    setBusy(true);
    setInlineError("");
    setStep("resolving");

    try {
      const urlError = getUrlAuthError();
      if (urlError) {
        console.error("[ConfirmInvite] Supabase URL auth error", urlError);
        if (isInvalidOrExpiredToken(urlError)) {
          setStep("expired");
          return;
        }
        throw new Error(urlError.message);
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (sessionData.session?.user?.email) {
        setEmail(sessionData.session.user.email);
        setStep("set_password");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const rawType = params.get("type");
      const type = OTP_TYPES.find(value => value === rawType);

      if (tokenHash && type) {
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) throw error;
        if (!data.session?.user?.email) {
          throw new Error("Sesi akun belum tersedia. Silakan coba aktivasi sekali lagi.");
        }
        setEmail(data.session.user.email);
        setStep("set_password");
        return;
      }

      throw new Error("Sesi belum tersedia. Pastikan Anda membuka link lengkap dari email, lalu coba lagi.");
    } catch (error: unknown) {
      console.error("[ConfirmInvite] Account activation error", error);
      if (isInvalidOrExpiredToken(error)) {
        setStep("expired");
      } else {
        setInlineError(getErrorMessage(error));
        setStep("activate");
        activationStartedRef.current = false;
      }
    } finally {
      setBusy(false);
    }
  };

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const formValid = newPassword.length >= 8 && confirm === newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    setBusy(true);
    setInlineError("");
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
      clearAuthUrl();
      toast({ title: "Akun berhasil diaktifkan!", description: "Anda akan diarahkan ke dashboard." });
      setStep("success");
      setTimeout(() => nav("/dashboard", { replace: true }), 1200);
    } catch (error: unknown) {
      console.error("[ConfirmInvite] Password update error", error);
      if (isInvalidOrExpiredToken(error)) {
        setStep("expired");
      } else {
        const message = getErrorMessage(error);
        setInlineError(message);
        toast({ title: "Gagal mengatur password", description: message, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === "resolving") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Memverifikasi undangan…
        </div>
      </div>
    );
  }

  if (step === "expired") {
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
            Request New Invite / Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  if (step === "activate") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4 py-16">
        <div className="w-full max-w-md bg-background border border-border p-6 sm:p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Undangan NISKALA</p>
          <h1 className="text-2xl font-light text-foreground mb-3">Aktifkan Akun Anda</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Konfirmasikan aktivasi untuk melanjutkan dan membuat password akun Anda.
          </p>
          {inlineError && (
            <p role="alert" className="mb-4 border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-sm text-destructive">
              {inlineError}
            </p>
          )}
          <Button type="button" className="w-full" onClick={handleActivate} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Activate Account &amp; Set Password
          </Button>
          <Link to="/auth" className="inline-block mt-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-600" /> Akun berhasil diaktifkan. Mengarahkan ke dashboard…
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

            {inlineError && (
              <p role="alert" className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {inlineError}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy || !formValid}
              className="w-full mt-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Menyimpan…" : "Atur Password & Masuk Dashboard"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
