import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Package } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { inr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  component: () => <ProtectedRoute><Products /></ProtectedRoute>,
});

const empty = { name: "", sku: "", description: "", unit: "pcs", unit_price: 0, hsn_code: "", stock: 0 };

function Products() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => supabase.from("products").select("*").order("name").then(({ data }) => setList(data || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...form, unit_price: Number(form.unit_price), stock: Number(form.stock) };
      if (editId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editId);
        if (error) { toast.error(error.message); return; }
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("products").insert({ ...payload, user_id: user!.id });
        if (error) { toast.error(error.message); return; }
        toast.success("Product added");
      }
      setOpen(false); setForm(empty); setEditId(null); load();
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete product?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
      <PageHeader title="Products & services" subtitle="Your sellable catalog."
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty); setEditId(null); } }}>
            <DialogTrigger asChild><Button className="bg-primary hover:bg-primary-glow"><Plus className="h-4 w-4" /> Add product</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle className="font-display text-2xl">{editId ? "Edit" : "New"} product</DialogTitle></DialogHeader>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                <div className="space-y-2"><Label>HSN code</Label><Input value={form.hsn_code} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div className="space-y-2"><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                <div className="space-y-2"><Label>Unit price (₹)</Label><Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>GST rate</Label>
                  <Select value={String(form.gst_rate)} onValueChange={(v) => setForm({ ...form, gst_rate: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[0, 5,9, 12, 18, 28].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2"><Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary-glow">{saving ? "Saving…" : "Save"}</Button></div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {list.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-1">No products yet</h3>
            <p className="text-sm text-muted-foreground">Add products to speed up invoice creation.</p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-border overflow-y-auto max-h-[calc(100dvh-260px)]">
              {list.map((p) => (
                <div key={p.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate mb-0.5">{p.name}</div>
                    <div className="text-xs text-muted-foreground space-x-2">
                      {p.sku && <span>SKU: {p.sku}</span>}
                      {p.hsn_code && <span>HSN: {p.hsn_code}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-semibold text-sm text-primary">{inr(Number(p.unit_price))}</span>
                      <span className="text-xs text-muted-foreground">{Number(p.stock)} {p.unit} in stock</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setForm({ ...empty, ...p }); setEditId(p.id); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => del(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm [table-layout:fixed]">
                <thead className="[display:table] w-full [table-layout:fixed] bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium w-[30%]">Name</th>
                    <th className="text-left px-5 py-3 font-medium w-[15%]">SKU</th>
                    <th className="text-left px-5 py-3 font-medium w-[15%]">HSN</th>
                    <th className="text-right px-5 py-3 font-medium w-[15%]">Price</th>
                    <th className="text-right px-5 py-3 font-medium w-[15%]">Stock</th>
                    <th className="text-right px-5 py-3 font-medium w-[10%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="block overflow-y-auto max-h-[calc(100dvh-260px)]">
                  {list.map((p) => (
                    <tr key={p.id} className="[display:table] w-full [table-layout:fixed] border-t border-border hover:bg-muted/30">
                      <td className="px-5 py-3.5 font-medium w-[30%] truncate">{p.name}</td>
                      <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs w-[15%] truncate">{p.sku || "—"}</td>
                      <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs w-[15%] truncate">{p.hsn_code || "—"}</td>
                      <td className="px-5 py-3.5 text-right font-semibold w-[15%]">{inr(Number(p.unit_price))}</td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground w-[15%]">{Number(p.stock)} {p.unit}</td>
                      <td className="px-5 py-3.5 text-right w-[10%]">
                        <Button size="icon" variant="ghost" onClick={() => { setForm({ ...empty, ...p }); setEditId(p.id); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </td>
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
