import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Download, Sparkles } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { inr, formatDate, numberToWordsINR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices/$id")({
  component: () => <ProtectedRoute><InvoiceDetail /></ProtectedRoute>,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("invoices").select("*").eq("id", id).single(),
      supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position"),
      supabase.from("profiles").select("*").maybeSingle(),
    ]).then(([i, it, p]) => {
      setInv(i.data); setItems(it.data || []); setProfile(p.data);
    });
  }, [id]);

  const updateStatus = async (s: string) => {
    const { error } = await supabase.from("invoices").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    setInv({ ...inv, status: s });
    toast.success("Status updated");
  };

  if (!inv) return <div className="p-10 text-muted-foreground text-sm">Loading…</div>;
  const cust = inv.customer_snapshot || {};

  const badgeCls = ({
    paid: "bg-success/15 text-success border-success/30",
    pending: "bg-warning/15 text-warning border-warning/40",
    partial: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  } as Record<string, string>)[inv.status] || "bg-muted text-muted-foreground border-border";

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Toolbar - hidden in print */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate({ to: "/invoices" })} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </button>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={inv.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button onClick={() => window.print()} className="bg-primary hover:bg-primary-glow"><Download className="h-4 w-4" /> Save as PDF</Button>
        </div>
      </div>

      {/* Invoice paper */}
      <div className="bg-white border border-border rounded-xl shadow-card p-8 md:p-12 print:shadow-none print:border-0 print:rounded-none print:p-0" style={{ color: "oklch(0.18 0.04 165)" }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-10 pb-6 border-b-2" style={{ borderColor: "oklch(0.30 0.08 165)" }}>
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-emerald)" }}>
                <Sparkles className="h-4 w-4" style={{ color: "var(--gold)" }} />
              </div>
              <div>
                <div className="font-display text-xl font-semibold">{profile?.company_name || "Your Company"}</div>
                {profile?.gstin && <div className="text-xs text-muted-foreground">GSTIN: {profile.gstin}</div>}
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 max-w-xs">
              {profile?.address && <div>{profile.address}</div>}
              {(profile?.city || profile?.state) && <div>{[profile.city, profile.state, profile.pincode].filter(Boolean).join(", ")}</div>}
              {profile?.phone && <div>{profile.phone}</div>}
              {profile?.email && <div>{profile.email}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-semibold mb-1" style={{ color: "oklch(0.30 0.08 165)" }}>TAX INVOICE</div>
            <div className="text-sm font-mono mt-2">{inv.invoice_number}</div>
            <Badge variant="outline" className={`mt-2 ${badgeCls}`}>{inv.status.toUpperCase()}</Badge>
          </div>
        </div>

        {/* Bill to + dates */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Bill to</div>
            <div className="font-display text-lg font-semibold">{cust.name || "—"}</div>
            {cust.gstin && <div className="text-xs text-muted-foreground mt-1">GSTIN: {cust.gstin}</div>}
            {cust.billing_address && <div className="text-sm mt-2 leading-relaxed">{cust.billing_address}</div>}
            {(cust.city || cust.state) && <div className="text-sm">{[cust.city, cust.state, cust.pincode].filter(Boolean).join(", ")}</div>}
            {cust.phone && <div className="text-sm mt-1">{cust.phone}</div>}
          </div>
          <div className="md:text-right space-y-2 text-sm">
            <div><span className="text-muted-foreground text-xs uppercase tracking-wider mr-2">Invoice date</span><span className="font-medium">{formatDate(inv.invoice_date)}</span></div>
            {inv.due_date && <div><span className="text-muted-foreground text-xs uppercase tracking-wider mr-2">Due date</span><span className="font-medium">{formatDate(inv.due_date)}</span></div>}
            <div><span className="text-muted-foreground text-xs uppercase tracking-wider mr-2">Tax type</span><span className="font-medium">{inv.is_interstate ? "IGST (Inter-state)" : "CGST + SGST"}</span></div>
          </div>
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider" style={{ background: "oklch(0.30 0.08 165)", color: "oklch(0.98 0 0)" }}>
              <th className="text-left px-3 py-2.5 font-semibold">#</th>
              <th className="text-left px-3 py-2.5 font-semibold">Description</th>
              <th className="text-center px-3 py-2.5 font-semibold">HSN</th>
              <th className="text-right px-3 py-2.5 font-semibold">Qty</th>
              <th className="text-right px-3 py-2.5 font-semibold">Rate</th>
              <th className="text-right px-3 py-2.5 font-semibold">Disc%</th>
              <th className="text-right px-3 py-2.5 font-semibold">Taxable</th>
              <th className="text-right px-3 py-2.5 font-semibold">GST%</th>
              <th className="text-right px-3 py-2.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className="border-b" style={{ borderColor: "oklch(0.92 0.015 130)" }}>
                <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-3"><div className="font-medium">{it.name}</div>{it.description && <div className="text-xs text-muted-foreground">{it.description}</div>}</td>
                <td className="px-3 py-3 text-center text-xs text-muted-foreground">{it.hsn_code || "—"}</td>
                <td className="px-3 py-3 text-right">{it.quantity} {it.unit}</td>
                <td className="px-3 py-3 text-right">{inr(Number(it.unit_price))}</td>
                <td className="px-3 py-3 text-right text-muted-foreground">{Number(it.discount_pct)}%</td>
                <td className="px-3 py-3 text-right">{inr(Number(it.taxable))}</td>
                <td className="px-3 py-3 text-right text-muted-foreground">{Number(it.gst_rate)}%</td>
                <td className="px-3 py-3 text-right font-semibold">{inr(Number(it.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div className="flex-1 max-w-sm">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Amount in words</div>
            <p className="text-sm italic font-display">{numberToWordsINR(Number(inv.total))}</p>
          </div>
          <div className="md:w-80 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(Number(inv.subtotal))}</span></div>
            {Number(inv.discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>− {inr(Number(inv.discount))}</span></div>}
            {inv.is_interstate ? (
              <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span>{inr(Number(inv.igst))}</span></div>
            ) : (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{inr(Number(inv.cgst))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{inr(Number(inv.sgst))}</span></div>
              </>
            )}
            {Number(inv.shipping) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{inr(Number(inv.shipping))}</span></div>}
            {Number(inv.additional_charge) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Other</span><span>{inr(Number(inv.additional_charge))}</span></div>}
            <div className="flex justify-between items-baseline border-t-2 pt-3 mt-3" style={{ borderColor: "oklch(0.30 0.08 165)" }}>
              <span className="font-display text-base font-semibold">Grand total</span>
              <span className="font-display text-2xl font-semibold" style={{ color: "oklch(0.30 0.08 165)" }}>{inr(Number(inv.total))}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-border">
          <div className="space-y-4">
            {inv.notes && <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Notes</div><p className="text-sm">{inv.notes}</p></div>}
            {inv.terms && <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Terms</div><p className="text-xs text-muted-foreground leading-relaxed">{inv.terms}</p></div>}
            {profile?.bank_name && (
              <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Bank details</div>
                <p className="text-xs">{profile.bank_name}{profile.bank_account ? ` · A/C ${profile.bank_account}` : ""}{profile.bank_ifsc ? ` · IFSC ${profile.bank_ifsc}` : ""}</p></div>
            )}
          </div>
          <div className="text-right flex flex-col justify-end">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-12 font-semibold">For {profile?.company_name || "your company"}</div>
            <div className="border-t pt-2 inline-block ml-auto" style={{ borderColor: "oklch(0.30 0.08 165)", minWidth: 180 }}>
              <div className="text-xs">Authorised signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
