import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Админ-панель" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw redirect({ to: "/chats" });
  },
  component: Admin,
});

function Admin() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [clause, setClause] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [order, setOrder] = useState(0);

  const { data: chats } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const { data } = await supabase.from("chats").select("*").eq("kind", "group").order("order_index");
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const createChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("chats")
      .insert({ gost_clause: clause, title, description: desc || null, order_index: order });
    if (error) return toast.error(error.message);
    toast.success("Чат создан");
    setClause(""); setTitle(""); setDesc(""); setOrder(0);
    qc.invalidateQueries({ queryKey: ["chats"] });
  };

  const deleteChat = async (id: string) => {
    if (!confirm("Удалить чат и все сообщения?")) return;
    const { error } = await supabase.from("chats").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["chats"] });
  };

  const toggleSubscription = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_subscribed: !current,
        subscription_until: !current ? new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString() : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Админ-панель</h1>
      <p className="mt-1 text-sm text-muted-foreground">Управление чатами и подписчиками</p>

      <section className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Новый чат</h2>
        <form onSubmit={createChat} className="mt-4 grid gap-3 md:grid-cols-[120px_1fr_120px]">
          <div>
            <Label>Пункт</Label>
            <Input value={clause} onChange={(e) => setClause(e.target.value)} placeholder="7.2" required />
          </div>
          <div>
            <Label>Название</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Методы..." required />
          </div>
          <div>
            <Label>Порядок</Label>
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          </div>
          <div className="md:col-span-3">
            <Label>Описание</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          </div>
          <Button type="submit" className="md:col-span-3 md:justify-self-start">Создать</Button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Чаты ({chats?.length ?? 0})</h2>
        <div className="mt-3 space-y-2">
          {chats?.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
              <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">п. {c.gost_clause}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.title}</div>
                {c.description && <div className="truncate text-xs text-muted-foreground">{c.description}</div>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteChat(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Пользователи ({profiles?.length ?? 0})</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Имя</th>
                <th className="px-3 py-2 text-left">Подписка до</th>
                <th className="px-3 py-2 text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2">{p.display_name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {p.is_subscribed ? (p.subscription_until ? new Date(p.subscription_until).toLocaleDateString("ru-RU") : "бессрочно") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant={p.is_subscribed ? "outline" : "default"} onClick={() => toggleSubscription(p.id, p.is_subscribed)}>
                      {p.is_subscribed ? "Отключить" : "Выдать на 31 день"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
