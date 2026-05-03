import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-card border border-border rounded-xl p-8 shadow-card">
        <div>
          <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a strong password you don't use elsewhere.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="p">New password</Label>
          <Input id="p" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary-glow">{busy ? "Saving…" : "Update password"}</Button>
      </form>
    </div>
  );
}
