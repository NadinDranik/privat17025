import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Reply, Forward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/format";

type Notification = {
  id: string;
  user_id: string;
  type: "reply" | "forward";
  chat_id: string;
  message_id: string;
  source_message_id: string | null;
  actor_id: string;
  created_at: string;
  read_at: string | null;
};

export function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  const actorIds = useMemo(
    () => Array.from(new Set(notifications.map((n) => n.actor_id))),
    [notifications],
  );
  const chatIds = useMemo(
    () => Array.from(new Set(notifications.map((n) => n.chat_id))),
    [notifications],
  );

  const { data: actors = {} } = useQuery({
    queryKey: ["notif-actors", actorIds],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds);
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name ?? "—"]));
    },
  });

  const { data: chats = {} } = useQuery({
    queryKey: ["notif-chats", chatIds],
    enabled: chatIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("chats").select("id, title, kind").in("id", chatIds);
      return Object.fromEntries(
        (data ?? []).map((c) => [c.id, c.kind === "direct" ? "Чат с админом" : c.title]),
      );
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const unread = notifications.filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label="Уведомления"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-sm font-semibold">Уведомления</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              Отметить все
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Пока пусто</div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const actor = actors[n.actor_id] ?? "Пользователь";
                const chatTitle = chats[n.chat_id] ?? "чат";
                const Icon = n.type === "reply" ? Reply : Forward;
                const text =
                  n.type === "reply"
                    ? `${actor} ответил(а) на ваше сообщение`
                    : `${actor} переслал(а) ваше сообщение`;
                return (
                  <Link
                    key={n.id}
                    to="/chats/$chatId"
                    params={{ chatId: n.chat_id }}
                    hash={`msg-${n.message_id}`}
                    onClick={() => !n.read_at && markRead(n.id)}
                    className={`flex gap-2 px-3 py-2.5 text-sm hover:bg-muted ${
                      n.read_at ? "" : "bg-primary/5"
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        <span className="font-medium">{text}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        в «{chatTitle}» · {formatTime(n.created_at)}
                      </div>
                    </div>
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
