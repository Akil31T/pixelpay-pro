import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { inr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/invoices/")({
  component: () => <ProtectedRoute><InvoicesList /></ProtectedRoute>,
});

function InvoicesList() {
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("invoices").select("*").order("invoice_date", { ascending: false }).then(({ data }) => {
      setList(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = list.filter((i) => {
    if (status !== "all" && i.status !== status) return false;
    if (q && !i.invoice_number.toLowerCase().includes(q.toLowerCase()) && !(i.customer_snapshot?.name || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const badgeCls = (s: string) => ({
    paid: "bg-success/15 text-success border-success/30",
    pending: "bg-warning/15 text-warning border-warning/40",
    partial: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  } as Record<string, string>)[s] || "bg-muted text-muted-foreground border-border";
  const load = () => supabase.from("products").select("*").order("name").then(({ data }) => setList(data || []));

  // const del = async (id: string) => {
  //   if (!confirm("Delete Invoice?")) return;
  //   await supabase.from("invoices").delete().eq("id", id);
  //   load();
  // };
  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
      <PageHeader
        title="Invoices"
        subtitle="All your tax invoices in one place."
        action={<Button onClick={() => navigate({ to: "/invoices/new" })} className="bg-primary hover:bg-primary-glow"><Plus className="h-4 w-4" /> New invoice</Button>}
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoice # or customer…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-1">No invoices yet</h3>
            <p className="text-sm text-muted-foreground mb-5">Create your first tax invoice to get started.</p>
            <Button onClick={() => navigate({ to: "/invoices/new" })}>Create invoice</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Invoice #</th>
                  <th className="text-left px-5 py-3 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Due</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                  <th className="text-center px-5 py-3 font-medium">Status</th>
                  {/* <th className="text-center px-5 py-3 font-medium"></th> */}

                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate({ to: "/invoices/$id", params: { id: i.id } })}>
                    <td className="px-5 py-3.5 font-medium">{i.invoice_number}</td>
                    <td className="px-5 py-3.5">{i.customer_snapshot?.name || "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(i.invoice_date)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{i.due_date ? formatDate(i.due_date) : "—"}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">{inr(Number(i.total))}</td>
                    <td className="px-5 py-3.5 text-center"><Badge variant="outline" className={badgeCls(i.status)}>{i.status}</Badge></td>
                    {/* <Button size="icon" variant="ghost" onClick={() => del(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> */}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
