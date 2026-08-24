import { NavLink, Navigate, Outlet, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Package, Tags, LogOut, Store, Link2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout() {
  const { session, isAdmin, loading, signOut } = useAuth();

  if (loading) return <div className="p-12 text-sm text-muted-foreground">Loading…</div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-light mb-4">Access denied</h1>
        <p className="text-sm text-muted-foreground mb-6">Your account is not an admin.</p>
        <button onClick={signOut} className="text-sm underline">Sign out</button>
      </div>
    );
  }

  const link = "flex items-center gap-3 px-4 py-3 text-sm transition-colors";
  const linkActive = "bg-primary text-primary-foreground";
  const linkIdle = "text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border flex flex-col">
        <div className="px-6 py-6 border-b border-border">
          <Link to="/" className="text-xl font-light tracking-widest">NISKALA</Link>
          <p className="text-xs text-muted-foreground mt-1">Admin</p>
        </div>
        <nav className="flex-1 py-4">
          <NavLink to="/admin" end className={({ isActive }) => cn(link, isActive ? linkActive : linkIdle)}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </NavLink>
          <NavLink to="/admin/categories" className={({ isActive }) => cn(link, isActive ? linkActive : linkIdle)}>
            <Tags className="w-4 h-4" /> Categories
          </NavLink>
          <NavLink to="/admin/products" className={({ isActive }) => cn(link, isActive ? linkActive : linkIdle)}>
            <Package className="w-4 h-4" /> Products
          </NavLink>
          <NavLink to="/admin/bio-links" className={({ isActive }) => cn(link, isActive ? linkActive : linkIdle)}>
            <Link2 className="w-4 h-4" /> Bio Links
          </NavLink>
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <Link to="/" className={cn(link, linkIdle, "px-2")}>
            <Store className="w-4 h-4" /> View store
          </Link>
          <button onClick={signOut} className={cn(link, linkIdle, "px-2 w-full")}>
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
