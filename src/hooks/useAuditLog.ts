import { supabase } from "@/integrations/supabase/client";

export const logAction = async (
  action: string,
  resource?: string,
  details?: Record<string, any>
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs" as any).insert({
      user_id: user.id,
      user_email: user.email,
      action,
      resource,
      details: details ?? {},
    } as any);
  } catch (err) {
    console.error("Audit log error:", err);
  }
};
