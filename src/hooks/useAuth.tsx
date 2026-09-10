import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  roles: string[];
  isAdmin: boolean;
  isOwner: boolean;
  isCoOwner: boolean;
  canManageUsers: boolean;
  mustChangePassword: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data || []).map(r => r.role as string));
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", userId)
      .maybeSingle();
    setMustChangePassword(data?.must_change_password ?? false);
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  useEffect(() => {
    let mounted = true;

    const loadUserData = async (userId: string) => {
      await Promise.all([fetchRoles(userId), fetchProfile(userId)]);
    };

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        await loadUserData(s.user.id);
      } else {
        setRoles([]);
        setMustChangePassword(false);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadUserData(data.session.user.id);
      }
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isOwner = roles.includes("owner");
  const isCoOwner = roles.includes("co_owner");
  const isAdmin = isOwner || isCoOwner || roles.includes("admin");
  const canManageUsers = isOwner || isCoOwner;

  return (
    <Ctx.Provider value={{
      session,
      user: session?.user ?? null,
      roles,
      isAdmin,
      isOwner,
      isCoOwner,
      canManageUsers,
      mustChangePassword,
      loading,
      signOut,
      refreshProfile,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
