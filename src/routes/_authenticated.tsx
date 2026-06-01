import { createFileRoute, Outlet, redirect, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Shield, LogOut, MessagesSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { chatId?: string };
  const activeChatId = params.chatId;

  const { data: chats } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, gost_clause, title")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

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
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {chats?.length === 0 && (
              <div className="px-3 py-2 text-xs text-sidebar-foreground/60">Нет чатов</div>
            )}
            {chats?.map((c) => {
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
          </nav>

          {isAdmin && (
            <div className="border-t border-sidebar-border p-2">
              <Link
                to="/admin"
                activeProps={{ className: "bg-sidebar-accent" }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
              >
                <Settings className="h-4 w-4" /> Админ-панель
              </Link>
            </div>
          )}
        </div>

        <div className="border-t border-sidebar-border p-3">
          <div className="px-2 pb-2 text-xs text-sidebar-foreground/70">
            {profile?.display_name ?? "Пользователь"}
          </div>
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
