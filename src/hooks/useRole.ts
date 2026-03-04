import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useRole = () => {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Ensure default role exists
      try {
        await supabase.rpc("assign_default_role");
      } catch {
        // Ignore - role may already exist
      }

      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id);

      return (data as any[])?.map((r) => r.role) ?? [];
    },
    enabled: !!user,
  });

  return {
    roles: roles ?? [],
    isAdmin: roles?.includes("admin") ?? false,
    isLoading,
  };
};
