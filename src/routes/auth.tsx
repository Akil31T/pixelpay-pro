import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
  const [mode, setMode] = useState<"signin" | "forgot">("signin");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const logActivity = async (event: string) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("login_activity").insert({
        user_id: data.user.id,
        event,
        user_agent: navigator.userAgent,
      });
    }
  };

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    await logActivity("sign_in");
    navigate({ to: "/dashboard" });
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
    if (error) return toast.error(error.message);
    toast.success("Account created! Signing you in…");
    await logActivity("sign_up");
    navigate({ to: "/dashboard" });
  };

  const onGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      setBusy(false);
      return toast.error(result.error.message ?? "Google sign-in failed");
    }
    if (result.redirected) return;
    await logActivity("sign_in_google");
    navigate({ to: "/dashboard" });
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for the reset link.");
    setMode("signin");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
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
            GST-ready invoicing built for Indian businesses. Auto CGST/SGST/IGST, beautiful PDFs, and role-based team access.
          </p>
        </div>
        <div className="text-xs opacity-60">© InvoiceFlow Pro</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold">InvoiceFlow Pro</span>
          </div>

          {mode === "forgot" ? (
            <>
              <h2 className="font-display text-3xl font-semibold mb-1">Reset password</h2>
              <p className="text-muted-foreground mb-6 text-sm">We'll email you a reset link.</p>
              <form onSubmit={onForgot} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="ef">Email</Label><Input id="ef" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary-glow">{busy ? "Sending…" : "Send reset link"}</Button>
                <button type="button" className="text-sm text-muted-foreground hover:text-foreground w-full text-center" onClick={() => setMode("signin")}>Back to sign in</button>
              </form>
            </>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <h2 className="font-display text-3xl font-semibold mb-1">Welcome back</h2>
                <p className="text-muted-foreground mb-6 text-sm">Sign in to manage your invoices.</p>
                <Button type="button" variant="outline" disabled={busy} className="w-full mb-4" onClick={onGoogle}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  Continue with Google
                </Button>
                <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div></div>
                <form onSubmit={onSignIn} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="e1">Email</Label><Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="p1">Password</Label>
                      <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>Forgot password?</button>
                    </div>
                    <Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary-glow">{busy ? "Signing in…" : "Sign in"}</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <h2 className="font-display text-3xl font-semibold mb-1">Get started</h2>
                <p className="text-muted-foreground mb-6 text-sm">First account becomes Super Admin.</p>
                <Button type="button" variant="outline" disabled={busy} className="w-full mb-4" onClick={onGoogle}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  Continue with Google
                </Button>
                <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div></div>
                <form onSubmit={onSignUp} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="c2">Company name</Label><Input id="c2" placeholder="Acme Pvt Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="e2">Email</Label><Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="p2">Password</Label><Input id="p2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary-glow">{busy ? "Creating…" : "Create account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
