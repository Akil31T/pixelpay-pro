import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/dashboard" });
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { company_name: companyName || "My Company" },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Account created! Signing you in…");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-sidebar-foreground" style={{ background: "var(--gradient-emerald)" }}>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
            <Sparkles className="h-4 w-4 text-sidebar" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">InvoiceFlow</div>
            <div className="text-[10px] tracking-[0.25em] uppercase opacity-80">Pro</div>
          </div>
        </div>
        <div className="space-y-6">
          <h1 className="font-display text-5xl leading-[1.05] font-semibold">
            Tax invoices,<br />
            <span className="italic" style={{ color: "var(--gold)" }}>perfected.</span>
          </h1>
          <p className="text-base opacity-80 max-w-md leading-relaxed">
            GST-ready invoicing built for Indian businesses. Auto CGST/SGST/IGST, beautiful PDFs, and a dashboard that actually helps you get paid.
          </p>
          <div className="flex gap-8 pt-4 text-sm">
            <div><div className="text-2xl font-display font-semibold" style={{ color: "var(--gold)" }}>GST</div><div className="opacity-70 mt-1">Auto-calculated</div></div>
            <div><div className="text-2xl font-display font-semibold" style={{ color: "var(--gold)" }}>A4</div><div className="opacity-70 mt-1">Print-ready PDFs</div></div>
            <div><div className="text-2xl font-display font-semibold" style={{ color: "var(--gold)" }}>∞</div><div className="opacity-70 mt-1">Cloud autosave</div></div>
          </div>
        </div>
        <div className="text-xs opacity-60">© InvoiceFlow Pro</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold">InvoiceFlow Pro</span>
          </div>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <h2 className="font-display text-3xl font-semibold mb-1">Welcome back</h2>
              <p className="text-muted-foreground mb-6 text-sm">Sign in to manage your invoices.</p>
              <form onSubmit={onSignIn} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="e1">Email</Label><Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="p1">Password</Label><Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary-glow">{busy ? "Signing in…" : "Sign in"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <h2 className="font-display text-3xl font-semibold mb-1">Get started</h2>
              <p className="text-muted-foreground mb-6 text-sm">Create your invoicing workspace in seconds.</p>
              <form onSubmit={onSignUp} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="c2">Company name</Label><Input id="c2" placeholder="Acme Pvt Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="e2">Email</Label><Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="p2">Password</Label><Input id="p2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary-glow">{busy ? "Creating…" : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
