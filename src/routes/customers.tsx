import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({
  component: () => <ProtectedRoute><Customers /></ProtectedRoute>,
});

const empty = { name: "", gstin: "", email: "", phone: "", billing_address: "", shipping_address: "", city: "", state: "", state_code: "", pincode: "" };

function Customers() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => supabase.from("customers").select("*").order("name").then(({ data }) => setList(data || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    if (editId) {
      const { error } = await supabase.from("customers").update(form).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Customer updated");
    } else {
      const { error } = await supabase.from("customers").insert({ ...form, user_id: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Customer added");
    }
    setOpen(false); setForm(empty); setEditId(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete customer?")) return;
    await supabase.from("customers").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
      <PageHeader title="Customers" subtitle="Your customer directory."
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty); setEditId(null); } }}>
            <DialogTrigger asChild><Button className="bg-primary hover:bg-primary-glow"><Plus className="h-4 w-4" /> Add customer</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle className="font-display text-2xl">{editId ? "Edit" : "New"} customer</DialogTitle></DialogHeader>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Billing address</Label><Textarea rows={2} value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Shipping address</Label><Textarea rows={2} value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} /></div>
                <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div className="space-y-2"><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
                <div className="space-y-2"><Label>State code</Label><Input value={form.state_code} onChange={(e) => setForm({ ...form, state_code: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-primary hover:bg-primary-glow">Save</Button></div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {list.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-1">No customers yet</h3>
            <p className="text-sm text-muted-foreground mb-5">Add your first customer to start invoicing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">GSTIN</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Phone</th>
                  <th className="text-left px-5 py-3 font-medium">State</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3.5 font-medium">{c.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">{c.gstin || "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{c.email || "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{c.phone || "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{c.state || "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setForm({ ...empty, ...c }); setEditId(c.id); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
