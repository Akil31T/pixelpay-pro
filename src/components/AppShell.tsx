import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FileText, Users, Package, Settings, LogOut, Plus, Sparkles, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const baseItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/products", label: "Products", icon: Package },
  { to: "/settings", label: "Company", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const items = role === "super_admin"
    ? [...baseItems, { to: "/users", label: "Users", icon: ShieldCheck }]
    : baseItems;
  const roleLabel = role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role === "staff" ? "Staff" : "";

  return (
    <div className="min-h-screen w-full flex bg-background">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border no-print">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
              <Sparkles className="h-4 w-4 text-sidebar" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold leading-none">InvoiceFlow</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-sidebar-primary mt-1">Pro</div>
            </div>
          </Link>
        </div>

        <div className="px-3 py-4">
          <Button
            onClick={() => navigate({ to: "/invoices/new" })}
            className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 font-medium"
          >
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {items.map((it) => {
            const active = path === it.to || path.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate flex items-center justify-between gap-2">
            <span className="truncate">{user?.email}</span>
            {roleLabel && <Badge variant="outline" className="border-sidebar-border text-[10px] uppercase tracking-wider">{roleLabel}</Badge>}
          </div>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
