import { Bell, Check, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface Props {
  variant?: "light" | "dark";
}

const NotificationBell = ({ variant = "dark" }: Props) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications(user?.id);
  if (!user) return null;

  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      // Mark all as read shortly after opening so the count clears in real time
      setTimeout(() => { markAllRead(); }, 600);
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
          className={`relative p-2 rounded-lg transition-colors ${
            variant === "dark" ? "hover:bg-muted text-foreground" : "hover:bg-white/10 text-white"
          }`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-semibold text-sm">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs">
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">You're all caught up</p>
          ) : (
            <ul className="divide-y">
              {notifications.map(n => (
                <li key={n.id} className={`px-4 py-3 group ${!n.read ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={n.link || "/dashboard"}
                        onClick={() => !n.read && markRead(n.id)}
                        className="block"
                      >
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </Link>
                    </div>
                    <button
                      onClick={() => remove(n.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
