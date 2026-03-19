import { supabase } from "@/integrations/supabase/client";

export const logActivity = async (
  userId: string,
  action: string,
  metadata: Record<string, any> = {}
) => {
  await (supabase as any).from("activity_logs").insert({
    user_id: userId,
    action,
    metadata,
  });
};
