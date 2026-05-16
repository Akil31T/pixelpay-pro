import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, FileText } from "lucide-react";
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
  // const del = async (id: string) => {
  //   if (!confirm("Delete Invoice?")) return;
  //   await supabase.from("invoices").delete().eq("id", id);
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
          <>
            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-border overflow-y-auto max-h-[calc(100dvh-310px)]">
              {filtered.map((i) => (
                <div
                  key={i.id}
                  className="p-4 hover:bg-muted/30 active:bg-muted/50 cursor-pointer"
                  onClick={() => navigate({ to: "/invoices/$id", params: { id: i.id } })}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">{i.invoice_number}</span>
                    <Badge variant="outline" className={`${badgeCls(i.status)} shrink-0`}>{i.status}</Badge>
                  </div>
                  <div className="text-sm font-medium mb-1.5 truncate">{i.customer_snapshot?.name || "—"}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(i.invoice_date)}
                      {i.due_date ? ` · Due ${formatDate(i.due_date)}` : ""}
                    </span>
                    <span className="font-semibold text-sm text-primary shrink-0">{inr(Number(i.total))}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm [table-layout:fixed]">
                <thead className="[display:table] w-full [table-layout:fixed] bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium w-[18%]">Invoice #</th>
                    <th className="text-left px-5 py-3 font-medium w-[24%]">Customer</th>
                    <th className="text-left px-5 py-3 font-medium w-[14%]">Date</th>
                    <th className="text-left px-5 py-3 font-medium w-[14%]">Due</th>
                    <th className="text-right px-5 py-3 font-medium w-[15%]">Amount</th>
                    <th className="text-center px-5 py-3 font-medium w-[15%]">Status</th>
                  </tr>
                </thead>
                <tbody className="block overflow-y-auto max-h-[calc(100dvh-310px)]">
                  {filtered.map((i) => (
                    <tr key={i.id} className="[display:table] w-full [table-layout:fixed] border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate({ to: "/invoices/$id", params: { id: i.id } })}>
                      <td className="px-5 py-3.5 font-medium w-[18%] truncate">{i.invoice_number}</td>
                      <td className="px-5 py-3.5 w-[24%] truncate">{i.customer_snapshot?.name || "—"}</td>
                      <td className="px-5 py-3.5 text-muted-foreground w-[14%]">{formatDate(i.invoice_date)}</td>
                      <td className="px-5 py-3.5 text-muted-foreground w-[14%]">{i.due_date ? formatDate(i.due_date) : "—"}</td>
                      <td className="px-5 py-3.5 text-right font-semibold w-[15%]">{inr(Number(i.total))}</td>
                      <td className="px-5 py-3.5 text-center w-[15%]"><Badge variant="outline" className={badgeCls(i.status)}>{i.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
