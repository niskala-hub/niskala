import { useState } from "react";
import { NavLink, Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Package, Tags, LogOut, Store, Link2, Wallet, Users, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout() {
  const { session, isAdmin, isOwner, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

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
  const cls = ({ isActive }: { isActive: boolean }) => cn(link, isActive ? linkActive : linkIdle);
  const close = () => setOpen(false);

  const nav = (
    <>
      <div className="px-6 py-6 border-b border-border">
        <Link to="/" className="text-xl font-light tracking-widest">NISKALA</Link>
        <p className="text-xs text-muted-foreground mt-1">{isOwner ? "Owner" : "Admin"}</p>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto" onClick={close}>
        <NavLink to="/admin" end className={cls}>
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </NavLink>
        <NavLink to="/admin/categories" className={cls}>
          <Tags className="w-4 h-4" /> Categories
        </NavLink>
        <NavLink to="/admin/products" className={cls}>
          <Package className="w-4 h-4" /> Products
        </NavLink>
        <NavLink to="/admin/bio-links" className={cls}>
          <Link2 className="w-4 h-4" /> Bio Links
        </NavLink>
        <NavLink to="/admin/accounting" className={cls}>
          <Wallet className="w-4 h-4" /> Accounting
        </NavLink>
        {isOwner && (
          <NavLink to="/admin/users" className={cls}>
            <Users className="w-4 h-4" /> Users
          </NavLink>
        )}
      </nav>
      <div className="p-4 border-t border-border space-y-2">
        <Link to="/" onClick={close} className={cn(link, linkIdle, "px-2")}>
          <Store className="w-4 h-4" /> View store
        </Link>
        <button onClick={signOut} className={cn(link, linkIdle, "px-2 w-full")}>
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border flex-col">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <aside className="relative w-72 max-w-[85vw] bg-background border-r border-border flex flex-col">
            <button onClick={close} className="absolute top-5 right-4 p-1" aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-base font-light tracking-widest">NISKALA</span>
          <span className="ml-auto text-xs text-muted-foreground truncate">
            {location.pathname.replace("/admin", "").replace("/", "") || "dashboard"}
          </span>
        </header>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
