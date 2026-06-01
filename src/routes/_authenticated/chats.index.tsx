import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Lock, MessagesSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chats/")({
  head: () => ({ meta: [{ title: "Чаты по ГОСТ 17025" }] }),
  component: ChatsIndex,
});

function ChatsIndex() {
  const { isSubscriber } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (isSubscriber && chats && chats.length > 0) {
      navigate({ to: "/chats/$chatId", params: { chatId: chats[0].id }, replace: true });
    }
  }, [isSubscriber, chats, navigate]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <MessagesSquare className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Выберите чат</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Тематические чаты по пунктам ГОСТ ISO/IEC 17025-2019 — список слева.
      </p>

      {!isSubscriber && (
        <div className="mt-8 flex w-full items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4 text-left text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div className="flex-1">
            Чтение и&nbsp;отправка сообщений доступны подписчикам.
          </div>
          <Link to="/subscribe"><Button size="sm">Подписка</Button></Link>
        </div>
      )}

      {chats?.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
          Пока нет ни одного чата.
        </div>
      )}
    </div>
  );
}
