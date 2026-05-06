import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Activity, UserCog, Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useRole, type AppRole } from "@/hooks/useRole";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({
  component: () => <ProtectedRoute><UsersPage /></ProtectedRoute>,
});

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  is_active: boolean;
  created_at: string;
  role: AppRole;
};

function UsersPage() {
  const { role, loading: roleLoading } = useRole();
  const [rows, setRows] = useState<Row[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

const load = async () => {
  try {
    setLoading(true);

    const [profilesRes, rolesRes, logRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("user_roles")
        .select("user_id,role"),

      supabase
        .from("login_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    console.log("profiles:", profilesRes);
    console.log("roles:", rolesRes);
    console.log("activity:", logRes);

    if (profilesRes.error) throw profilesRes.error;
    if (rolesRes.error) throw rolesRes.error;
    if (logRes.error) throw logRes.error;

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const log = logRes.data ?? [];

    const roleMap = new Map<string, AppRole>();

    roles.forEach((r: any) => {
      const existing = roleMap.get(r.user_id);

      const priority = (x: AppRole) =>
        x === "super_admin" ? 3 :
        x === "admin" ? 2 : 1;

      if (!existing || priority(r.role) > priority(existing)) {
        roleMap.set(r.user_id, r.role);
      }
    });

    const merged = profiles.map((p: any) => ({
      ...p,
      role: roleMap.get(p.id) ?? "staff",
    }));

    setRows(merged);
    setActivity(log);
  } catch (err: any) {
    console.error(err);
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (!roleLoading && role === "super_admin") load();
    else if (!roleLoading) setLoading(false);
  }, [role, roleLoading]);

  const setUserRole = async (userId: string, newRole: AppRole) => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: !isActive }).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success(isActive ? "User deactivated" : "User activated");
    load();
  };

  

  if (roleLoading || loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (role !== "super_admin") {
    return (
      <div className="p-10 max-w-xl">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <ShieldOff className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-display text-xl font-semibold">Super Admin only</h2>
          <p className="text-sm text-muted-foreground mt-2">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
      <PageHeader title="User management" subtitle="Roles, access, and login activity." />

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users"><UserCog className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="h-4 w-4" /> Login activity</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">User</th>
                    <th className="text-left px-5 py-3 font-medium">Company</th>
                    <th className="text-left px-5 py-3 font-medium">Role</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Joined</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-5 py-3.5">
                        <div className="font-medium">{r.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{r.company_name || "—"}</td>
                      <td className="px-5 py-3.5">
                        <Select value={r.role} onValueChange={(v) => setUserRole(r.id, v as AppRole)}>
                          <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-3.5">
                        {r.is_active ? (
                          <Badge variant="outline" className="bg-success/15 text-success border-success/30"><ShieldCheck className="h-3 w-3" /> Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground"><ShieldOff className="h-3 w-3" /> Inactive</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{formatDate(r.created_at)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Button size="sm" variant="outline" onClick={() => toggleActive(r.id, r.is_active)}>
                          {r.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No users yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            New users sign up via the auth page. The first account is automatically Super Admin; later accounts default to Staff and you can promote them here.
          </p>
        </TabsContent>

        <TabsContent value="activity">
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">When</th>
                    <th className="text-left px-5 py-3 font-medium">Event</th>
                    <th className="text-left px-5 py-3 font-medium">User</th>
                    <th className="text-left px-5 py-3 font-medium">User agent</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((a) => {
                    const u = rows.find((r) => r.id === a.user_id);
                    return (
                      <tr key={a.id} className="border-t border-border">
                        <td className="px-5 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                        <td className="px-5 py-3"><Badge variant="outline">{a.event}</Badge></td>
                        <td className="px-5 py-3">{u?.email ?? a.user_id.slice(0, 8)}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground truncate max-w-[400px]">{a.user_agent || "—"}</td>
                      </tr>
                    );
                  })}
                  {activity.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">No activity recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
