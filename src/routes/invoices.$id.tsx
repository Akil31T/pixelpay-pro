import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Download, Sparkles } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { inr, formatDate, numberToWordsINR, formatPercent } from "@/lib/format";
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

  const totalAmount = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );
  const totalQty = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const cgst = totalAmount * 0.09;
  const sgst = totalAmount * 0.09;
  const grandTotal = totalAmount + cgst + sgst;
  
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
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-600-glow"><Download className="h-4 w-4" /> Save as PDF</Button>
        </div>
      </div>
      {/* Invoice Paper */}
      <div className="bg-white text-black border-1 border-black  rounded-none p-6 print:p-4 print: text-[13px] leading-tight">

        {/* Heading */}
        {/* <div className="text-center pb-2 mb-2">
          <h1 className="text-2xl font-bold">Tax Invoice</h1>
          <p className="text-xs">(ORIGINAL FOR RECIPIENT)</p>
        </div> */}

        {/* Top section */}
        <div className="grid grid-cols-2 border-black border-1 ">
          {/* Seller */}
          <div className="border-r-1 border-black p-2">
            <h2 className="font-bold text-lg uppercase">
              {profile?.company_name || "Your Company"}
            </h2>

            <p>{profile?.address}</p>
            <p>
              {[profile?.city, profile?.state, profile?.pincode]
                .filter(Boolean)
                .join(", ")}
            </p>

            {profile?.gstin && (
              <p>
                <b>GST:</b> {profile.gstin}
              </p>
            )}
            {/* <p><b>Bank:</b> {profile.bank_name}</p>
            <p><b>A/C No:</b> {profile.bank_account}</p>
            <p><b>IFSC:</b> {profile.bank_ifsc}</p> */}
            <p><b>PAN No:</b> {profile.pan_no}</p>
          </div>

          {/* Invoice info */}
          <div>
            {/* Row 1 */}
            <div className="grid grid-cols-2 border-black border-b">
              <div className="p-1 border-black border-r">
                <b>Invoice No.</b>
                <p>{inv.invoice_number}</p>
                <p>2026-2027</p>
              </div>

              <div className="p-2">
                <b>Dated</b>
                <p>{formatDate(inv.invoice_date)}</p>
              </div>
            </div>

            {/* Row 2 (FIX HERE) */}
            <div className="grid grid-cols-2 border-black border-b items-stretch">
              <div className="p-2 border-black border-r capitalize flex flex-col justify-between">
                <b>Status</b>
                <p>{inv.status}</p>
              </div>

              <div className="p-2 flex flex-col justify-between">
                <b>Delivery Note</b>
                {/* <p>{inv.is_interstate ? "IGST" : "CGST + SGST"}</p> */}
              </div>
            </div>

            <div className="grid grid-cols-2 border-black items-stretch">
              <div className="p-2 border-black border-r flex flex-col justify-between">
                <b>Due Date</b>
                {/* <p className="p-2">{inv.due_date}</p> */}
              </div>

              <div className="p-2 flex flex-col justify-between">
                <b>Vehicle No.</b>
                <p>{inv.vehicle_no}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buyer */}
        <div className="grid grid-cols-2 border-x border-b border-black">
          {/* Buyer */}
          <div className="border-r border-black p-2">
            <h3 className="font-bold mb-1">Buyer (Bill to)</h3>

            <p className="font-semibold text-base">{cust.name}</p>

            {cust.billing_address && <p>{cust.billing_address}</p>}

            {/* <p>
              {[cust.city, cust.state, cust.pincode]
                .filter(Boolean)
                .join(", ")}
            </p> */}

            {cust.gstin && (
              <p>
                <b>GSTIN:</b> {cust.gstin}
              </p>
            )}
          </div>

          {/* Vehicle */}  
          <div className="p-2">
           <b>Terms of Delivery</b>
                <p>{inv.terms_of_delivery}</p>
          </div>
        </div>

        {/* Items */}
        <table className="mt-2 w-full border border-gray-400 border-collapse h-[400px] text-[12px]">

          {/* HEADER */}
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-gray-400 p-2 w-[5%]">Sl No.</th>
              <th className="border border-gray-400 p-2 text-left w-[35%]">
                Description of Goods
              </th>
              <th className="border border-gray-400 p-2 w-[10%]">HSN/SAC</th>
              <th className="border border-gray-400 p-2 w-[10%]">Qty</th>
              <th className="border border-gray-400 p-2 w-[10%]">Unit</th>
              <th className="border border-gray-400 p-2 w-[15%]">Rate</th>
              <th className="border border-gray-400 p-2 w-[15%]">Amount</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>

            {/* ITEMS */}
            {items.map((it, i) => (
              <tr key={i}>
                <td className="border-r border-gray-400 p-2">{i + 1}</td>
                <td className="border-r border-gray-400 p-2">{it.name}</td>
                <td className="border-r border-gray-400 p-2">{it.hsn_code}</td>
                <td className="border-r border-gray-400 p-2 text-center">{it.quantity}</td>
                <td className="border-r border-gray-400 p-2 text-center uppercase">{it.unit}</td>
                <td className="border-r border-gray-400 p-2 text-right">₹{it.unit_price}</td>
                <td className="border-r border-gray-400 p-2 text-right">₹{it.taxable}</td>
              </tr>
            ))}

            {/* EMPTY SPACE */}
            <tr className="h-[120px]">
              {Array(7).fill("").map((_, i) => (
                <td key={i} className="border-r border-gray-400"></td>
              ))}
            </tr>

            {/* TOTAL */}
            <tr>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>

              <td className="border-r border-gray-400 p-2 text-right font-bold">
                {inr(totalAmount)}
              </td>
            </tr>

            {/* CGST */}
            <tr>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>

              <td className="border-r border-gray-400 p-2 text-right italic">
                CGST @9%
              </td>
              <td className="border-r border-gray-400 p-2 text-right">
                {inr(cgst)}
              </td>
            </tr>

            {/* SGST */}
            <tr>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400 p-2 text-right italic">
                SGST @9%
              </td>
              <td className="border-r border-gray-400 p-2 text-right">
                {inr(sgst)}
              </td>
            </tr>

            {/* GRAND TOTAL */}
            <tr>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>
              <td className="border-r border-gray-400"></td>

              {/* <td className="border-r border-gray-400 p-2 text-right font-bold">
                GRAND TOTAL
              </td>
              <td className="border-r border-gray-400 p-2 text-right font-bold">
                {inr(grandTotal)}
              </td> */}
            </tr>

          </tbody>
        </table>


        {/* Taxable value in words */}
        <div className="grid grid-cols-2 border-x-1 border-b border-black  p-3">
          <div>
            <b>Total Amount (in words):</b>
            <p className="mt-1 font-semibold">
              {numberToWordsINR(Number(grandTotal))}
            </p>
          </div>
          <div>

            <p className="font-bold flex justify-end gap-12">
              <span>Total:</span>
              <span>{inr(grandTotal)}</span>
            </p>
          </div>

        </div>
        {/* Footer */}
        <div className="grid grid-cols-2 border-x-1 border-black  border-b-1 ">
          <div className="border-r border-black  p-3">
            <h3 className="font-bold mb-2">Declaration</h3>
            <p className="text-xs">
              We declare that this invoice shows the actual price of the goods
              described and that all particulars are true and correct.
            </p>

            {profile?.bank_name && (
              <>
                <h3 className="font-bold mt-4 mb-2">Bank Details</h3>
                <p>A/C Name: {profile.company_name}</p>
                <p>Bank: {profile.bank_name}</p>
                <p>A/C No: {profile.bank_account}</p>
                <p>IFSC: {profile.bank_ifsc}</p>
                <p>PAN No: {profile.pan_no}</p>
              </>
            )}
          </div>

          <div className="p-3 flex flex-col justify-end items-end min-h-[180px]">
            <p className="font-semibold mb-20">
              for {profile?.company_name}
            </p>

            <div className="border-t  border-black pt-2 text-sm text-center w-52">
              Authorised Signatory
            </div>
          </div>
        </div>
        {/* 
        <div className="text-center mt-3 text-xs">
          This is a Computer Generated Invoice
        </div> */}
      </div>

    </div>
  );
}
