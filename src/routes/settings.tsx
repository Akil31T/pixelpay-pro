import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: () => <ProtectedRoute><Settings /></ProtectedRoute>,
});

function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  // useEffect(() => {
  //   supabase.from("profiles").select("*").maybeSingle().then(({ data }) => setForm(data || {}));
  // }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setForm(data || {});
    };

    fetchProfile();
  }, [user]);

  const save = async () => {
    if (!user) return;

    setBusy(true);

    const { error } = await supabase.from("profiles").upsert({
      ...form,
      id: user.id,
      updated_at: new Date().toISOString(),
    });

    setBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Company details saved");
    }
  };

  // const save = async () => {
  //   if (!user) return;
  //   setBusy(true);
  //   const { error } = await supabase.from("profiles").upsert({ ...form, id: user.id, updated_at: new Date().toISOString() });
  //   setBusy(false);
  //   if (error) toast.error(error.message);
  //   else toast.success("Company details saved");
  // };

  const Field = ({ k, label, type = "text", full = false }: any) => (
    <div className={`space-y-2 ${full ? "md:col-span-2" : ""}`}>
      <Label>{label}</Label>
      <Input type={type} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <PageHeader title="Company details" subtitle="This information appears on every invoice you create." action={<Button onClick={save} disabled={busy} className="bg-primary hover:bg-primary-glow"><Save className="h-4 w-4" /> {busy ? "Saving…" : "Save"}</Button>} />

      <div className="space-y-6">
        <section className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold mb-4">Business</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Field k="company_name" label="Company name" />
            <Field k="gstin" label="GSTIN" />
            <Field k="phone" label="Phone" />
            <Field k="email" label="Email" type="email" />
            <Field k="website" label="Website" />
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold mb-4">Address</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2"><Label>Street address</Label><Textarea rows={2} value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <Field k="city" label="City" />
            <Field k="state" label="State" />
            <Field k="pincode" label="Pincode" />
            <Field k="country" label="Country" />
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold mb-4">Bank details</h3>
          <p className="text-sm text-muted-foreground mb-4">Shown at the bottom of invoices.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <Field k="bank_name" label="Bank name" />
            <Field k="bank_account" label="Account number" />
            <Field k="bank_ifsc" label="IFSC code" />
            <Field k="pan_no" label="PAN Number" />

          </div>
        </section>
      </div>
    </div>
  );
}
