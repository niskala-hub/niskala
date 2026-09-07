import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

type FlowStep = "INITIAL_CONFIRM" | "SET_PASSWORD" | "SUCCESS" | "EXPIRED";
type OtpType = "invite" | "email" | "recovery";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error && "message" in error) return String(error.message);
    return String(error || "Terjadi kesalahan autentikasi.");
}

function isExpiredError(error: unknown): boolean {
    return /otp_expired|expired|invalid.*(?:token|otp|link|jwt)|(?:token|otp|link|jwt).*invalid/i.test(getErrorMessage(error));
}

function getTokenFromUrl(): { token: string | null; type: OtpType; isPkceCode: boolean } {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const tokenHash = searchParams.get("token_hash") ?? hashParams.get("token_hash");
    const token = tokenHash ?? searchParams.get("token") ?? hashParams.get("token");
    const code = searchParams.get("code") ?? hashParams.get("code");

    // Ambil type secara dinamis (invite | recovery | email)
    const rawType = searchParams.get("type") ?? hashParams.get("type");
    const type: OtpType = (rawType === "email" || rawType === "recovery") ? rawType : "invite";

    return { token: token ?? code, type, isPkceCode: !tokenHash && Boolean(code) };
}

export default function ConfirmInvite() {
    const [flowStep, setFlowStep] = useState<FlowStep>("INITIAL_CONFIRM");
    const [tokenHash, setTokenHash] = useState<string | null>(null);
    const [otpType, setOtpType] = useState<OtpType>("invite");
    const [isPkceCode, setIsPkceCode] = useState(false);
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [inlineError, setInlineError] = useState("");

    const { refreshProfile } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        const { token, type, isPkceCode: hasPkceCode } = getTokenFromUrl();
        setTokenHash(token);
        setOtpType(type);
        setIsPkceCode(hasPkceCode);

        // Supabase email template example: ?token_hash={{ .TokenHash }}&type=invite
    }, []);

    const handleActivate = async () => {
        if (!tokenHash && !isPkceCode) {
            // Cek apakah Supabase SDK sudah sempat menukar session secara otomatis
            const { data: existingSession } = await supabase.auth.getSession();
            if (existingSession.session?.user?.email) {
                setEmail(existingSession.session.user.email);
                setFlowStep("SET_PASSWORD");
                return;
            }
            setFlowStep("EXPIRED");
            return;
        }

        setBusy(true);
        setInlineError("");
        try {
            // 1. Cek dulu apakah session sudah terbentuk otomatis oleh SDK Client
            const { data: currentSession } = await supabase.auth.getSession();
            let userEmail = currentSession.session?.user?.email;

            // 2. Jika belum ada session, baru lakukan verifikasi manual
            if (!userEmail && tokenHash) {
                const { data, error } = isPkceCode
                    ? await supabase.auth.exchangeCodeForSession(tokenHash)
                    : await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });

                if (error) throw error;
                userEmail = data.user?.email ?? data.session?.user?.email;
            }

            if (!userEmail) throw new Error("Sesi akun belum tersedia. Silakan coba lagi.");

            setEmail(userEmail);
            setFlowStep("SET_PASSWORD");
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: unknown) {
            if (isExpiredError(error)) setFlowStep("EXPIRED");
            else {
                const message = getErrorMessage(error);
                setInlineError(message);
                toast({ title: "Gagal mengaktifkan akun", description: message, variant: "destructive" });
            }
        } finally {
            setBusy(false);
        }
    };

    const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;
    const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
    const formValid = newPassword.length >= 8 && confirmPassword === newPassword;

    const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!formValid || busy) return;
        setBusy(true);
        setInlineError("");
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            const { data: currentUser } = await supabase.auth.getUser();
            if (currentUser.user) {
                await supabase.from("profiles").update({ must_change_password: false }).eq("id", currentUser.user.id);
            }
            await refreshProfile();
            setFlowStep("SUCCESS");
        } catch (error: unknown) {
            if (isExpiredError(error)) setFlowStep("EXPIRED");
            else {
                const message = getErrorMessage(error);
                setInlineError(message);
                toast({ title: "Gagal mengatur password", description: message, variant: "destructive" });
            }
        } finally {
            setBusy(false);
        }
    };

    if (flowStep === "EXPIRED") {
        return <PageShell><div className="w-full max-w-md bg-background border border-border p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
            <h1 className="text-xl font-light text-foreground mb-2">Invitation Link Expired or Invalid</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Link undangan ini sudah tidak berlaku. Silakan minta admin mengirimkan undangan baru.</p>
            <Link to="/auth" className="block w-full py-3 bg-primary text-primary-foreground text-sm font-medium text-center hover:opacity-90 transition-opacity">Return to Login</Link>
        </div></PageShell>;
    }

    if (flowStep === "SUCCESS") {
        return <PageShell><div className="w-full max-w-md bg-background border border-border p-8 shadow-sm text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" /><h1 className="text-2xl font-light text-foreground mb-2">Account Activated</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Password Anda berhasil dibuat.</p><Link to="/dashboard"><Button className="w-full">Proceed to Dashboard</Button></Link>
        </div></PageShell>;
    }

    if (flowStep === "INITIAL_CONFIRM") {
        return <PageShell><div className="w-full max-w-md bg-background border border-border p-6 sm:p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-5"><ShieldCheck className="w-6 h-6 text-primary" /></div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Undangan NISKALA</p><h1 className="text-2xl font-light text-foreground mb-3">Aktifkan Akun Anda</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Konfirmasikan aktivasi untuk melanjutkan dan membuat password akun Anda.</p>
            {inlineError && <p role="alert" className="mb-4 border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-sm text-destructive">{inlineError}</p>}
            <Button type="button" className="w-full" onClick={handleActivate} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}Activate Account &amp; Set Password</Button>
            <Link to="/auth" className="inline-block mt-5 text-sm text-muted-foreground hover:text-foreground transition-colors">Return to Login</Link>
        </div></PageShell>;
    }

    return <PageShell><div className="w-full max-w-md bg-background border border-border p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-8"><div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Undangan Admin</p><h1 className="text-xl font-light text-foreground">Lengkapi Akun Anda</h1><p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">Atur password untuk mengaktifkan akun dan mengakses dashboard.</p></div>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4"><div><label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">Email</label><input type="email" value={email} disabled className="w-full px-4 py-3 border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed" /></div>
            <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} visible={showNewPassword} onToggle={() => setShowNewPassword(value => !value)} error={passwordTooShort ? "Minimum 8 characters." : ""} />
            <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(value => !value)} error={passwordsMismatch ? "Passwords do not match." : ""} />
            {inlineError && <p role="alert" className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{inlineError}</p>}
            <Button type="submit" disabled={busy || !formValid} className="w-full mt-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{busy ? "Saving…" : "Set Password & Continue"}</Button>
        </form>
    </div></PageShell>;
}

function PageShell({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--warm-bg))] px-4 py-16">{children}</div>;
}

function PasswordField({ label, value, onChange, visible, onToggle, error }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void; error: string }) {
    return <div><label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">{label}</label><div className="relative">
        <input type={visible ? "text" : "password"} required minLength={8} value={value} onChange={event => onChange(event.target.value)} className={`w-full px-4 py-3 border bg-background focus:outline-none transition-colors text-sm pr-11 ${error ? "border-red-400 focus:border-red-500" : "border-border focus:border-foreground"}`} />
        <button type="button" aria-label={visible ? `Hide ${label}` : `Show ${label}`} onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
    </div>{error && <p className="text-xs text-red-500 mt-1">{error}</p>}{!error && value && label === "Confirm Password" && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match.</p>}</div>;
}
