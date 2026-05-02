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

const empty = { name: "", sku: "", description: "", unit: "pcs", unit_price: 0, gst_rate: 18, hsn_code: "", stock: 0 };

function Products() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => supabase.from("products").select("*").order("name").then(({ data }) => setList(data || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    const payload = { ...form, unit_price: Number(form.unit_price), gst_rate: Number(form.gst_rate), stock: Number(form.stock) };
    if (editId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert({ ...payload, user_id: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Product added");
    }
    setOpen(false); setForm(empty); setEditId(null); load();
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
              <div className="flex justify-end gap-2 mt-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-primary hover:bg-primary-glow">Save</Button></div>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">SKU</th>
                  <th className="text-left px-5 py-3 font-medium">HSN</th>
                  <th className="text-right px-5 py-3 font-medium">Price</th>
                  <th className="text-right px-5 py-3 font-medium">GST</th>
                  <th className="text-right px-5 py-3 font-medium">Stock</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3.5 font-medium">{p.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">{p.sku || "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">{p.hsn_code || "—"}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">{inr(Number(p.unit_price))}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">{Number(p.gst_rate)}%</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">{Number(p.stock)} {p.unit}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setForm({ ...empty, ...p }); setEditId(p.id); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
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
