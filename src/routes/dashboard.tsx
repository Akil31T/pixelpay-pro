import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, IndianRupee, Clock, AlertCircle, Plus, ArrowRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { inr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  component: () => <ProtectedRoute><Dashboard /></ProtectedRoute>,
});

type Invoice = {
  id: string; invoice_number: string; total: number; status: string;
  invoice_date: string; due_date: string | null;
  customer_snapshot: { name?: string } | null;
};

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-elegant transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl md:text-3xl font-display font-semibold mt-2 text-foreground">{value}</div>
        </div>
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: accent || "var(--accent)" }}>
          <Icon className="h-5 w-5" style={{ color: "var(--primary)" }} />
        </div>
      </div>
    </div>
  );
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    paid: "bg-success/15 text-success border-success/30",
    pending: "bg-warning/15 text-warning border-warning/40",
    overdue: "bg-destructive/15 text-destructive border-destructive/30",
    partial: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  };
  return map[s] || "bg-muted text-muted-foreground border-border";
}

function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("invoices").select("*").order("invoice_date", { ascending: false }).then(({ data }) => {
      setInvoices((data as any) || []);
      setLoading(false);
    });
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = invoices.filter((i) => i.status !== "paid" && i.due_date && new Date(i.due_date) < today);
  const paid = invoices.filter((i) => i.status === "paid");
  const pending = invoices.filter((i) => i.status === "pending" || i.status === "partial");
  const revenue = paid.reduce((s, i) => s + Number(i.total), 0);

  // Build last 6 months chart
  const months: { label: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = d.toLocaleDateString("en-IN", { month: "short" });
    const rev = invoices
      .filter((inv) => inv.status === "paid")
      .filter((inv) => {
        const id = new Date(inv.invoice_date);
        return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear();
      })
      .reduce((s, inv) => s + Number(inv.total), 0);
    months.push({ label: key, revenue: rev });
  }

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle="Your invoicing at a glance."
        action={
          <Button onClick={() => navigate({ to: "/invoices/new" })} className="bg-primary hover:bg-primary-glow">
            <Plus className="h-4 w-4" /> Quick invoice
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total invoices" value={String(invoices.length)} icon={FileText} />
        <StatCard label="Paid" value={String(paid.length)} icon={IndianRupee} accent="oklch(0.92 0.06 155)" />
        <StatCard label="Pending" value={String(pending.length)} icon={Clock} accent="oklch(0.95 0.08 90)" />
        <StatCard label="Overdue" value={String(overdue.length)} icon={AlertCircle} accent="oklch(0.94 0.06 30)" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h3 className="font-display text-xl font-semibold">Revenue</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Last 6 months · paid invoices</p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total collected</div>
              <div className="font-display text-2xl font-semibold text-primary">{inr(revenue)}</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={months} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.42 0.10 165)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.42 0.10 165)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}
                  formatter={(v: number) => [inr(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.30 0.08 165)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-xl font-semibold">Recent</h3>
            <Link to="/invoices" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No invoices yet</p>
              <Button size="sm" onClick={() => navigate({ to: "/invoices/new" })}>Create first invoice</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.slice(0, 5).map((inv) => (
                <Link key={inv.id} to="/invoices/$id" params={{ id: inv.id }} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/40 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{inv.invoice_number}</div>
                    <div className="text-xs text-muted-foreground truncate">{inv.customer_snapshot?.name || "—"} · {formatDate(inv.invoice_date)}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-semibold">{inr(Number(inv.total))}</div>
                    <Badge variant="outline" className={`text-[10px] mt-0.5 ${statusBadge(inv.status)}`}>{inv.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
