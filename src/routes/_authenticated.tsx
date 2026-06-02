import { createFileRoute, Outlet, redirect, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Shield, LogOut, MessagesSquare, Settings, UserCircle, MessageCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ensureDirectChat } from "@/lib/directChat";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { chatId?: string };
  const activeChatId = params.chatId;

  const { data: groupChats } = useQuery({
    queryKey: ["chats", "group"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, gost_clause, title, kind, owner_id")
        .eq("kind", "group")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: myDirect } = useQuery({
    queryKey: ["chats", "direct", "me", user?.id],
    enabled: !!user && !isAdmin,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("chats")
        .select("id, title")
        .eq("kind", "direct")
        .eq("owner_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: adminDirects } = useQuery({
    queryKey: ["chats", "direct", "admin"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: chats } = await supabase
        .from("chats")
        .select("id, title, owner_id, updated_at")
        .eq("kind", "direct")
        .order("updated_at", { ascending: false });
      if (!chats?.length) return [];
      const ownerIds = chats.map((c) => c.owner_id!).filter(Boolean);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ownerIds);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return chats.map((c) => ({ ...c, profile: map.get(c.owner_id!) }));
    },
  });

  const openDirect = async () => {
    if (!user) return;
    try {
      const id = await ensureDirectChat(user.id, profile?.display_name ?? null);
      navigate({ to: "/chats/$chatId", params: { chatId: id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initial = (profile?.display_name ?? user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="grid min-h-screen w-full grid-cols-[240px_1fr] sm:grid-cols-[280px_1fr]">
      <aside className="flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold">ГОСТ 17025</div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <Link
              to="/chats"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <MessagesSquare className="h-3.5 w-3.5" /> Чаты
            </Link>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 bg-slate-800">
            {groupChats?.length === 0 && (
              <div className="px-3 py-2 text-xs text-sidebar-foreground/60">Нет чатов</div>
            )}
            {groupChats?.map((c) => {
              const active = c.id === activeChatId;
              return (
                <Link
                  key={c.id}
                  to="/chats/$chatId"
                  params={{ chatId: c.id }}
                  className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                  }`}
                >
                  <span className="shrink-0 rounded bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                    п. {c.gost_clause}
                  </span>
                  <span className="line-clamp-2 break-words font-medium">{c.title}</span>
                </Link>
              );
            })}

            {!isAdmin && (
              <>
                <div className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
                  Личное
                </div>
                {myDirect ? (
                  <Link
                    to="/chats/$chatId"
                    params={{ chatId: myDirect.id }}
                    className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${
                      myDirect.id === activeChatId
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Чат с админом</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={openDirect}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-sidebar-accent/50"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Написать админу</span>
                  </button>
                )}
              </>
            )}

            {isAdmin && adminDirects && adminDirects.length > 0 && (
              <>
                <div className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70 flex items-center gap-1">
                  <Inbox className="h-3 w-3" /> Личные обращения
                </div>
                {adminDirects.map((c) => {
                  const active = c.id === activeChatId;
                  const nm = c.profile?.display_name ?? "Пользователь";
                  return (
                    <Link
                      key={c.id}
                      to="/chats/$chatId"
                      params={{ chatId: c.id }}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                      }`}
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        {c.profile?.avatar_url && <AvatarImage src={c.profile.avatar_url} />}
                        <AvatarFallback className="text-[10px]">{nm.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium">{nm}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {isAdmin && (
            <div className="border-t border-sidebar-border p-2">
              <Link
                to="/admin"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
              >
                <Settings className="h-4 w-4" /> Админ-панель
              </Link>
            </div>
          )}
        </div>

        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/profile"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            className="mb-2 flex items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent"
          >
            <Avatar className="h-8 w-8">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-xs">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium">{profile?.display_name ?? "Профиль"}</div>
              <div className="text-xs text-sidebar-foreground/60 flex items-center gap-1">
                <UserCircle className="h-3 w-3" /> Открыть
              </div>
            </div>
          </Link>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Выйти
          </Button>
        </div>
      </aside>
      <main className="min-h-screen bg-background">
        <Outlet />
      </main>
    </div>
  );
}
