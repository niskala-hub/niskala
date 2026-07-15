import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (session) nav("/admin", { replace: true });
  }, [session, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast({ title: "Account created", description: "You can sign in now." });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav("/admin", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to store</Link>
      <h1 className="text-3xl font-light mt-6 mb-2">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <p className="text-sm text-muted-foreground mb-8">NISKALA admin dashboard</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full mt-1 px-4 py-3 border border-border bg-background focus:outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
          <input
            type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
            className="w-full mt-1 px-4 py-3 border border-border bg-background focus:outline-none focus:border-foreground"
          />
        </div>
        <button type="submit" disabled={busy}
          className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {busy ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
      <p className="mt-4 text-xs text-muted-foreground">The first registered user automatically becomes admin.</p>
    </div>
  );
}
