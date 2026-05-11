import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) { setNotifications([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data || []) as AppNotification[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => fetchAll()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchAll]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ read: true }).eq("id", id);
  };
  const markAllRead = async () => {
    if (!userId) return;
    await (supabase as any).from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  };
  const remove = async (id: string) => {
    await (supabase as any).from("notifications").delete().eq("id", id);
  };

  return { notifications, unreadCount, loading, markRead, markAllRead, remove, refetch: fetchAll };
};
