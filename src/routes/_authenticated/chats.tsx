import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { MessageSquare, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({ meta: [{ title: "Чаты по ГОСТ 17025" }] }),
  component: ChatsList,
});

function ChatsList() {
  const { isSubscriber, isAdmin } = useAuth();
  const { data: chats, isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Чаты</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Тематические чаты по пунктам ГОСТ ISO/IEC 17025-2019
          </p>
        </div>
        {!isSubscriber && (
          <Link to="/subscribe"><Button size="sm">Оформить подписку</Button></Link>
        )}
      </div>

      {!isSubscriber && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            Чтение и&nbsp;отправка сообщений доступны подписчикам. Оформите подписку или дождитесь активации администратором.
          </div>
        </div>
      )}

      <div className="mt-8 space-y-2">
        {isLoading && <div className="text-sm text-muted-foreground">Загрузка...</div>}
        {chats?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Пока нет ни одного чата.{" "}
            {isAdmin && <Link to="/admin" className="underline">Создать первый</Link>}
          </div>
        )}
        {chats?.map((c) => (
          <Link
            key={c.id}
            to="/chats/$chatId"
            params={{ chatId: c.id }}
            className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                  п. {c.gost_clause}
                </span>
                <h3 className="truncate font-semibold">{c.title}</h3>
              </div>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
