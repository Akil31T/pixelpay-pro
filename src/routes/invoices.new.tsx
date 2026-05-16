import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { inr, numberToWordsINR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices/new")({
  component: () => <ProtectedRoute><NewInvoice /></ProtectedRoute>,
});

type Item = {
  name: string; description?: string; hsn_code?: string;
  quantity: number; unit: string; unit_price: number;
  discount_pct: number; gst_rate: number;
};

const blankItem = (): Item => ({ name: "", quantity: 1, unit: "pcs", unit_price: 0, discount_pct: 0, gst_rate: 18 });

function NewInvoice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [status, setStatus] = useState("pending");
  const [isInterstate, setIsInterstate] = useState(false);
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [shipping, setShipping] = useState(0);
  const [extraCharge, setExtraCharge] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due within 15 days. Late payments may incur interest @1.5% per month.");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("products").select("*").order("name"),
      supabase.from("profiles").select("*").maybeSingle(),
      supabase.from("invoices").select("invoice_number").order("created_at", { ascending: false }).limit(1),
    ]).then(([c, p, pr, last]) => {
      setCustomers(c.data || []);
      setProducts(p.data || []);
      setProfile(pr.data);
      // auto invoice number
      const lastNum = last.data?.[0]?.invoice_number || "";
      const m = lastNum.match(/(\d+)$/);
      const next = m ? String(Number(m[1]) + 1) : "1";
      setInvoiceNumber(`Invoice-${next}`);

    });
  }, []);

  // auto interstate from customer
  useEffect(() => {
    if (!customerId || !profile?.state) return;
    const c = customers.find((x) => x.id === customerId);
    if (c?.state) setIsInterstate(c.state.trim().toLowerCase() !== profile.state.trim().toLowerCase());
  }, [customerId, customers, profile]);

  // const calc = useMemo(() => {
  //   let subtotal = 0, totalDiscount = 0, totalTax = 0;
  //   const lines = items.map((it) => {
  //     const gross = it.quantity * it.unit_price;
  //     const discountAmt = (gross * it.discount_pct) / 100;
  //     const taxable = gross - discountAmt;
  //     const taxAmt = (taxable * it.gst_rate) / 100;
  //     subtotal += gross;
  //     totalDiscount += discountAmt;
  //     totalTax += taxAmt;
  //     return { taxable, taxAmt, total: taxable + taxAmt ,gross};
  //   });
  //   const cgst = isInterstate ? 0 : totalTax / 2;
  //   const sgst = isInterstate ? 0 : totalTax / 2;
  //   const igst = isInterstate ? totalTax : 0;
  //   const grandTotal = subtotal - totalDiscount + totalTax + Number(shipping || 0) + Number(extraCharge || 0);
  //   return { subtotal, discount: totalDiscount, totalTax, cgst, sgst, igst, lines, grandTotal };
  // }, [items, isInterstate, shipping, extraCharge]);


  const calc = useMemo(() => {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  const lines = items.map((it) => {
    const qty = Number(it.quantity || 0);
    const price = Number(it.unit_price || 0);
    const discountPct = Number(it.discount_pct || 0);
    const gstRate = Number(it.gst_rate || 0);

    const gross = qty * price;
    const discountAmt = (gross * discountPct) / 100;
    const taxable = gross - discountAmt;
    const taxAmt = (taxable * gstRate) / 100;

    subtotal += gross;
    totalDiscount += discountAmt;
    totalTax += taxAmt;

    return {
      gross,
      taxable,
      taxAmt,
      total: taxable + taxAmt,
    };
  });

  const cgst = isInterstate ? 0 : totalTax / 2;
  const sgst = isInterstate ? 0 : totalTax / 2;
  const igst = isInterstate ? totalTax : 0;

  const grandTotal =
    subtotal -
    totalDiscount +
    totalTax +
    Number(shipping || 0) +
    Number(extraCharge || 0);

  return {
    subtotal,
    discount: totalDiscount,
    totalTax,
    cgst,
    sgst,
    igst,
    lines,
    grandTotal: isNaN(grandTotal) ? 0 : grandTotal, // FIX
  };
}, [items, isInterstate, shipping, extraCharge]);

  const updateItem = (i: number, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };

  const pickProduct = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    updateItem(i, { name: p.name, description: p.description, hsn_code: p.hsn_code, unit: p.unit, unit_price: Number(p.unit_price) });
  };

  const save = async () => {
    if (!user) return;
    if (!customerId) return toast.error("Pick a customer");
    if (items.some((i) => !i.name)) return toast.error("All items need a name");
    setSaving(true);
    const customer = customers.find((c) => c.id === customerId);
    const { data: inv, error } = await supabase.from("invoices").insert({
      user_id: user.id,
      invoice_number: invoiceNumber,
      customer_id: customerId,
      customer_snapshot: customer,
      invoice_date: invoiceDate,
      vehicle_no: vehicleNo,
      due_date: dueDate || null,
      status,
      is_interstate: isInterstate,
      subtotal: calc.subtotal,
      discount: calc.discount,
      cgst: calc.cgst, sgst: calc.sgst, igst: calc.igst,
      shipping: Number(shipping || 0),
      additional_charge: Number(extraCharge || 0),
      total: calc.grandTotal,
      notes, terms,
    }).select().single();

    if (error || !inv) { setSaving(false); return toast.error(error?.message || "Failed"); }

    const itemRows = items.map((it, idx) => ({
      invoice_id: inv.id,
      user_id: user.id,
      name: it.name,
      description: it.description,
      hsn_code: it.hsn_code,
      quantity: it.quantity, unit: it.unit,
      unit_price: it.unit_price,
      discount_pct: it.discount_pct,
      // gst_rate: it.gst_rate,
      taxable: calc.lines[idx].taxable,
      tax_amount: calc.lines[idx].taxAmt,
      total: calc.lines[idx].total,
      position: idx,
    }));
    const { error: itemErr } = await supabase.from("invoice_items").insert(itemRows);
    setSaving(false);
    if (itemErr) return toast.error(itemErr.message);
    toast.success("Invoice saved");
    navigate({ to: "/invoices/$id", params: { id: inv.id } });
  };

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
      <button onClick={() => navigate({ to: "/invoices" })} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-semibold">New invoice</h1>
          <p className="text-muted-foreground mt-1.5">Fill in the details to generate a GST tax invoice.</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary-glow"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save invoice"}</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Meta */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-4">Invoice details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Invoice #</Label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? <div className="px-3 py-2 text-sm text-muted-foreground">No customers — add one in Customers</div> :
                      customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Invoice date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2"><Label>Vehicle No</Label><Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} /></div>

              <div className="flex items-center justify-between rounded-md border border-border px-3">
                <div>
                  <Label className="cursor-pointer">Inter-state (IGST)</Label>
                  <p className="text-xs text-muted-foreground">Auto-set from customer state</p>
                </div>
                <Switch checked={isInterstate} onCheckedChange={setIsInterstate} />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Line items</h3>
              <Button size="sm" variant="outline" onClick={() => setItems([...items, blankItem()])}><Plus className="h-4 w-4" /> Add item</Button>
            </div>
            <div className="space-y-3">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg p-4 bg-muted/20"
                >
                  <div className="grid md:grid-cols-12 gap-3">
                    {/* Product */}
                    <div className="md:col-span-3 space-y-1.5">
                      <Label className="text-xs">Product / Service</Label>

                      <Select onValueChange={(v) => pickProduct(i, v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>

                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}

                          {/* <SelectItem value="custom">Custom Item</SelectItem> */}
                        </SelectContent>
                      </Select>

                      {/* Only show manual input when custom */}

                    </div>

                    {/* Qty */}
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min={0}
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(i, { quantity: Number(e.target.value) })
                        }
                      />
                    </div>

                    {/* Price */}
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs">Unit Price (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) =>
                          updateItem(i, {
                            unit_price: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    {/* Discount */}
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs">Disc %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={it.discount_pct}
                        onChange={(e) =>
                          updateItem(i, {
                            discount_pct: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    {/* Total */}
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs">Total</Label>
                      <div className="h-10 flex items-center font-semibold text-sm">
                        {inr(calc.lines[i]?.gross || 0)}
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="md:col-span-1 flex items-end justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setItems(items.filter((_, x) => x !== i))
                        }
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-4">Notes & terms</h3>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the customer" /></div>
              <div className="space-y-2"><Label>Terms & conditions</Label><Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6 shadow-card md:sticky md:top-6">
            <h3 className="font-display text-lg font-semibold mb-4">Summary</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(calc.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>− {inr(calc.discount)}</span></div>
              {isInterstate ? (
                <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span>{inr(calc.igst)}</span></div>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{inr(calc.cgst)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{inr(calc.sgst)}</span></div>
                </>
              )}
              <div className="flex justify-between items-center gap-2"><span className="text-muted-foreground">Shipping</span><Input type="number" min={0} value={shipping} onChange={(e) => setShipping(Number(e.target.value))} className="w-24 h-8 text-right" /></div>
              <div className="flex justify-between items-center gap-2"><span className="text-muted-foreground">Other charge</span><Input type="number" min={0} value={extraCharge} onChange={(e) => setExtraCharge(Number(e.target.value))} className="w-24 h-8 text-right" /></div>
              <div className="border-t border-border pt-3 mt-3 flex justify-between items-baseline">
                <span className="font-display text-base font-semibold">Total</span>
                <span className="font-display text-2xl font-semibold text-primary">{inr(calc.grandTotal)}</span>
              </div>
              <p className="text-xs italic text-muted-foreground pt-2 leading-relaxed">{numberToWordsINR(calc.grandTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
