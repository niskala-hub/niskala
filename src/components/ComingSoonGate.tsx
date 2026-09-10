import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useComingSoonSetting } from "@/hooks/useComingSoonSetting";

/** Paths that remain accessible even when coming soon mode is ON */
const ALLOWED_PATHS = ["/auth", "/admin", "/links", "/coming-soon"];

interface ComingSoonGateProps {
  children: ReactNode;
}

export default function ComingSoonGate({ children }: ComingSoonGateProps) {
  const { comingSoonEnabled, loading: settingLoading } = useComingSoonSetting();
  const { session, user, isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();

  // While auth session or site-setting is still resolving → show nothing
  // (avoids a flash-redirect on first load)
  if (authLoading || settingLoading) {
    return null;
  }

  // If user is authenticated as admin / privileged staff (has credentials & admin role),
  // they completely bypass Coming Soon mode and can access ALL pages without redirect.
  const isBypassed = Boolean((session?.user || user) && isAdmin);
  if (isBypassed) {
    return <>{children}</>;
  }

  const currentPath = location.pathname;
  const isAllowedPath = ALLOWED_PATHS.some(
    (p) => currentPath === p || currentPath.startsWith(p + "/")
  );

  if (comingSoonEnabled) {
    // Non-privileged (anon or regular visitor) on any non-allowed path → coming soon
    if (!isAllowedPath) {
      return <Navigate to="/coming-soon" replace />;
    }
  } else {
    // When coming soon is OFF, redirect regular visitors from /coming-soon to homepage
    if (currentPath === "/coming-soon") {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
