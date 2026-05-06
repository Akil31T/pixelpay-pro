import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "super_admin" | "admin" | "staff";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRole = async () => {
      if (authLoading) return;

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        setRole("staff");
        setLoading(false);
        return;
      }

      const roles = (data ?? []).map((r: any) => r.role as AppRole);

      const selected =
        roles.find((x) => x === "super_admin") ??
        roles.find((x) => x === "admin") ??
        roles.find((x) => x === "staff") ??
        "staff";

      setRole(selected);
      setLoading(false); // important
    };

    getRole();
  }, [user, authLoading]);

  const can = {
    manageUsers: role === "super_admin",
    deleteRecords: role === "super_admin" || role === "admin",
    editSettings: role === "super_admin" || role === "admin",
  };

  return { role, loading, can };
}