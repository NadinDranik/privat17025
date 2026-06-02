import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Paperclip, Send, Trash2, FileText, Image as ImgIcon, Video, Search, X, Reply, Forward, CornerUpRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatBytes, formatTime } from "@/lib/format";
import { ensureDirectChat } from "@/lib/directChat";

export const Route = createFileRoute("/_authenticated/chats/$chatId")({
  component: ChatPage,
});

type MessageRow = {
  id: string;
  chat_id: string;
  author_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  reply_to_id: string | null;
  forwarded_from_message_id: string | null;
  forwarded_from_author_id: string | null;
  forwarded_from_chat_id: string | null;
};

type AttachmentRow = {
  id: string;
  message_id: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  kind: "image" | "video" | "file";
  name: string | null;
};

type RefMsg = {
  id: string;
  body: string;
  author_id: string;
  chat_id: string;
  author_name: string | null;
  chat_title: string | null;
};

function classifyFile(file: File): "image" | "video" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function ChatPage() {
  const { chatId } = Route.useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isSubscriber, profile } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; body: string; authorName: string } | null>(null);
  const [forwardMsg, setForwardMsg] = useState<MessageWithExtras | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: chat } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chats").select("*").eq("id", chatId).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const isDirect = chat?.kind === "direct";
  const canAccess = isDirect ? !!user : isSubscriber;

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", chatId],
    enabled: canAccess,
    queryFn: async () => {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      const ids = (msgs ?? []).map((m) => m.id);
      let atts: AttachmentRow[] = [];
      if (ids.length) {
        const { data: a } = await supabase
          .from("message_attachments")
          .select("*")
          .in("message_id", ids);
        atts = (a ?? []) as AttachmentRow[];
      }

      // Reference messages (reply targets + forwarded originals)
      const refIds = Array.from(
        new Set(
          (msgs ?? [])
            .flatMap((m) => [m.reply_to_id, m.forwarded_from_message_id])
            .filter((x): x is string => !!x),
        ),
      );
      let refMap = new Map<string, RefMsg>();
      const extraAuthorIds: string[] = [];
      const extraChatIds: string[] = [];
      if (refIds.length) {
        const { data: refs } = await supabase
          .from("messages")
          .select("id, body, author_id, chat_id")
          .in("id", refIds);
        const refChatIds = Array.from(new Set((refs ?? []).map((r) => r.chat_id)));
        const refAuthorIds = Array.from(new Set((refs ?? []).map((r) => r.author_id)));
        extraAuthorIds.push(...refAuthorIds);
        extraChatIds.push(...refChatIds);
        const [{ data: refChats }, { data: refAuthors }] = await Promise.all([
          refChatIds.length
            ? supabase.from("chats").select("id, title").in("id", refChatIds)
            : Promise.resolve({ data: [] as { id: string; title: string }[] }),
          refAuthorIds.length
            ? supabase.from("profiles").select("id, display_name").in("id", refAuthorIds)
            : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
        ]);
        const chatTitle = new Map((refChats ?? []).map((c) => [c.id, c.title]));
        const authorName = new Map((refAuthors ?? []).map((a) => [a.id, a.display_name]));
        refMap = new Map(
          (refs ?? []).map((r) => [
            r.id,
            {
              id: r.id,
              body: r.body,
              author_id: r.author_id,
              chat_id: r.chat_id,
              author_name: authorName.get(r.author_id) ?? null,
              chat_title: chatTitle.get(r.chat_id) ?? null,
            },
          ]),
        );
      }

      const profIds = Array.from(
        new Set([
          ...(msgs ?? []).map((m) => m.author_id),
          ...(msgs ?? []).map((m) => m.forwarded_from_author_id).filter((x): x is string => !!x),
          ...extraAuthorIds,
        ]),
      );
      const { data: profs } = profIds.length
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", profIds)
        : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] };
      const profMap = new Map((profs ?? []).map((p) => [p.id, p]));

      return (msgs as MessageRow[]).map((m) => ({
        ...m,
        attachments: atts.filter((x) => x.message_id === m.id),
        author: profMap.get(m.author_id) ?? null,
        forwardedAuthor: m.forwarded_from_author_id ? profMap.get(m.forwarded_from_author_id) ?? null : null,
        replyTo: m.reply_to_id ? refMap.get(m.reply_to_id) ?? null : null,
        forwardedOriginal: m.forwarded_from_message_id ? refMap.get(m.forwarded_from_message_id) ?? null : null,
      }));
    },
  });

  type MessageWithExtras = (typeof messages)[number];

  useEffect(() => {
    if (!canAccess) return;
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => qc.invalidateQueries({ queryKey: ["messages", chatId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_attachments" },
        () => qc.invalidateQueries({ queryKey: ["messages", chatId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, canAccess, qc]);

  useEffect(() => {
    if (search.trim()) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, search]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? messages.filter(
        (m) =>
          m.body.toLowerCase().includes(q) ||
          m.attachments.some((a) => (a.name ?? "").toLowerCase().includes(q)),
      )
    : messages;

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) {
      toast.info("Сообщение не найдено в текущем чате");
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1600);
  };

  const send = async () => {
    if (!user) return;
    if (!body.trim() && pending.length === 0) return;
    setBusy(true);
    try {
      const { data: msg, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          author_id: user.id,
          body: body.trim(),
          reply_to_id: replyTo?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      for (const file of pending) {
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
        const path = `${chatId}/${msg.id}/${crypto.randomUUID()}${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat-attachments")
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (upErr) throw upErr;
        const { error: attErr } = await supabase.from("message_attachments").insert({
          message_id: msg.id,
          storage_path: path,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          kind: classifyFile(file),
          name: file.name,
        });
        if (attErr) throw attErr;
      }

      setBody("");
      setPending([]);
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["messages", chatId] });
    } catch (e: unknown) {
      toast.error("Не удалось отправить", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const removeMessage = async (id: string) => {
    const { error } = await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Не удалось удалить", { description: error.message });
    else qc.invalidateQueries({ queryKey: ["messages", chatId] });
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-card px-6 py-3">
        <div className="min-w-0 flex-1">
          {chat && (
            <div className="flex items-baseline gap-2">
              {!isDirect && (
                <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                  п. {chat.gost_clause}
                </span>
              )}
              <h1 className="truncate font-semibold">{isDirect ? "Чат с админом" : chat.title}</h1>
            </div>
          )}
          {chat?.description && !isDirect && (
            <p className="truncate text-xs text-muted-foreground">{chat.description}</p>
          )}
        </div>
        {canAccess && (
          searchOpen ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearch("");
                    setSearchOpen(false);
                  }
                }}
                placeholder="Поиск по тексту и файлам..."
                className="h-9 w-64"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearch("");
                  setSearchOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(true)} title="Поиск">
              <Search className="h-4 w-4" />
            </Button>
          )
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {!canAccess ? (
          <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center">
            <h2 className="font-semibold">Доступ только подписчикам</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Оформите подписку, чтобы читать и&nbsp;писать в&nbsp;этом чате.
            </p>
            <Link to="/subscribe" className="mt-4 inline-block">
              <Button>Оформить</Button>
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {q && (
              <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                <span>Найдено: {filtered.length}</span>
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSearchOpen(false); }}
                  className="text-primary hover:underline"
                >
                  Очистить
                </button>
              </div>
            )}
            {messages.length === 0 && !q && (
              <div className="text-center text-sm text-muted-foreground">
                {isDirect ? "Напишите ваш вопрос — админ ответит здесь." : "Сообщений пока нет. Начните обсуждение."}
              </div>
            )}
            {q && filtered.length === 0 && (
              <div className="text-center text-sm text-muted-foreground">Ничего не найдено</div>
            )}
            {filtered.map((m) => {
              const isMe = m.author_id === user?.id;
              const canDelete = isMe || isAdmin;
              const authorName = m.author?.display_name ?? "—";
              const isHighlighted = highlightId === m.id;
              const forwardedFromName = m.forwardedAuthor?.display_name ?? "—";
              return (
                <div
                  id={`msg-${m.id}`}
                  key={m.id}
                  className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""} transition-colors ${isHighlighted ? "rounded-lg bg-yellow-100/60 ring-2 ring-yellow-300" : ""}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {m.author?.avatar_url && <AvatarImage src={m.author.avatar_url} alt={authorName} />}
                    <AvatarFallback className="text-xs font-semibold">
                      {authorName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{authorName}</span>
                      <span>{formatTime(m.created_at)}</span>
                    </div>
                    <div className={`rounded-lg px-4 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                      {m.forwarded_from_message_id && (
                        <button
                          type="button"
                          onClick={() => m.forwardedOriginal && scrollToMessage(m.forwardedOriginal.id)}
                          className={`mb-2 flex w-full items-center gap-1.5 rounded border-l-2 px-2 py-1 text-left text-xs ${isMe ? "border-primary-foreground/60 bg-primary-foreground/10" : "border-primary bg-muted"}`}
                        >
                          <CornerUpRight className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            Переслано от <span className="font-semibold">{forwardedFromName}</span>
                            {m.forwardedOriginal?.chat_title && m.forwarded_from_chat_id !== chatId && (
                              <> · из «{m.forwardedOriginal.chat_title}»</>
                            )}
                          </span>
                        </button>
                      )}
                      {m.replyTo && (
                        <button
                          type="button"
                          onClick={() => scrollToMessage(m.replyTo!.id)}
                          className={`mb-2 flex w-full flex-col items-start gap-0.5 rounded border-l-2 px-2 py-1 text-left text-xs ${isMe ? "border-primary-foreground/60 bg-primary-foreground/10" : "border-primary bg-muted"}`}
                        >
                          <span className="font-semibold">{m.replyTo.author_name ?? "—"}</span>
                          <span className="line-clamp-1 opacity-80">{m.replyTo.body || "вложение"}</span>
                        </button>
                      )}
                      {m.body && <div className="whitespace-pre-wrap break-words font-medium text-base">{highlight(m.body, q)}</div>}
                      {m.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {m.attachments.map((a) => (
                            <AttachmentView key={a.id} a={a} query={q} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setReplyTo({ id: m.id, body: m.body, authorName })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Reply className="h-3 w-3" /> Ответить
                      </button>
                      <button
                        type="button"
                        onClick={() => setForwardMsg(m)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <Forward className="h-3 w-3" /> Переслать
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => removeMessage(m.id)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canAccess && (
        <div className="border-t border-border bg-card px-6 py-3">
          <div className="mx-auto max-w-3xl">
            {replyTo && (
              <div className="mb-2 flex items-start gap-2 rounded-md border-l-2 border-primary bg-muted px-3 py-2">
                <Reply className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-semibold">Ответ — {replyTo.authorName}</div>
                  <div className="truncate text-muted-foreground">{replyTo.body || "вложение"}</div>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {pending.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pending.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs">
                    <FileText className="h-3.5 w-3.5 text-foreground" />
                    <span className="max-w-[180px] truncate font-medium text-foreground">{f.name}</span>
                    <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                    <button onClick={() => setPending(pending.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []).filter((f) => f.size <= 20 * 1024 * 1024);
                  if (files.length < (e.target.files?.length ?? 0)) toast.error("Файлы крупнее 20 МБ пропущены");
                  setPending((p) => [...p, ...files]);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => fileInput.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Сообщение от ${profile?.display_name ?? "вас"}...`}
                rows={2}
                className="min-h-[44px] resize-none"
              />
              <Button onClick={send} disabled={busy} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-1 text-right text-xs text-muted-foreground">Ctrl/⌘ + Enter — отправить</div>
          </div>
        </div>
      )}

      <ForwardDialog
        open={!!forwardMsg}
        onOpenChange={(o) => !o && setForwardMsg(null)}
        message={forwardMsg}
        currentChatId={chatId}
        onDone={(targetChatId) => {
          setForwardMsg(null);
          if (targetChatId !== chatId) {
            toast.success("Сообщение переслано", {
              action: {
                label: "Перейти",
                onClick: () => navigate({ to: "/chats/$chatId", params: { chatId: targetChatId } }),
              },
            });
          } else {
            toast.success("Сообщение переслано");
          }
        }}
      />
    </div>
  );
}

function ForwardDialog({
  open,
  onOpenChange,
  message,
  currentChatId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  message: any;
  currentChatId: string;
  onDone: (targetChatId: string) => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const { data: chats = [] } = useQuery({
    queryKey: ["forward-chats", user?.id],
    enabled: open && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("chats")
        .select("id, title, kind, gost_clause, owner_id")
        .or(`kind.eq.group,and(kind.eq.direct,owner_id.eq.${user!.id})`)
        .order("order_index", { ascending: true });
      return data ?? [];
    },
  });

  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return chats.filter((c) => !f || (c.title ?? "").toLowerCase().includes(f));
  }, [chats, filter]);

  const forwardTo = async (targetChatId: string) => {
    if (!user || !message) return;
    setBusy(true);
    try {
      const { data: newMsg, error } = await supabase
        .from("messages")
        .insert({
          chat_id: targetChatId,
          author_id: user.id,
          body: message.body ?? "",
          forwarded_from_message_id: message.forwarded_from_message_id ?? message.id,
          forwarded_from_author_id: message.forwarded_from_author_id ?? message.author_id,
          forwarded_from_chat_id: message.forwarded_from_chat_id ?? message.chat_id,
        })
        .select()
        .single();
      if (error) throw error;

      if (message.attachments?.length) {
        const rows = message.attachments.map((a: AttachmentRow) => ({
          message_id: newMsg.id,
          storage_path: a.storage_path,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes,
          kind: a.kind,
          name: a.name,
        }));
        const { error: attErr } = await supabase.from("message_attachments").insert(rows);
        if (attErr) throw attErr;
      }

      onDone(targetChatId);
    } catch (e: unknown) {
      toast.error("Не удалось переслать", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const forwardToAdmin = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const id = await ensureDirectChat(user.id, null);
      await forwardTo(id);
    } catch (e: unknown) {
      toast.error("Не удалось открыть чат с админом", { description: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Переслать сообщение</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Поиск чата..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-2"
        />
        <ScrollArea className="h-80 pr-2">
          <div className="space-y-1">
            <button
              type="button"
              disabled={busy}
              onClick={forwardToAdmin}
              className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-secondary"
            >
              <span className="font-medium">💬 Личный чат с админом</span>
            </button>
            {list.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={busy || c.id === currentChatId}
                onClick={() => forwardTo(c.id)}
                className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50"
              >
                <span className="flex items-center gap-2 truncate">
                  {c.kind === "group" && c.gost_clause && (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      п. {c.gost_clause}
                    </span>
                  )}
                  <span className="truncate">{c.title}</span>
                </span>
                {c.id === currentChatId && <span className="text-xs text-muted-foreground">текущий</span>}
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;
  const parts: React.ReactNode[] = [];
  let i = 0;
  let cursor = 0;
  let pos = idx;
  while (pos !== -1) {
    if (pos > cursor) parts.push(text.slice(cursor, pos));
    parts.push(
      <mark key={i++} className="rounded bg-yellow-300 px-0.5 font-semibold text-black">
        {text.slice(pos, pos + query.length)}
      </mark>,
    );
    cursor = pos + query.length;
    pos = text.toLowerCase().indexOf(query, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function AttachmentView({ a, query = "" }: { a: AttachmentRow; query?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    supabase.storage
      .from("chat-attachments")
      .createSignedUrl(a.storage_path, 3600)
      .then(({ data }) => {
        if (active && data) setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [a.storage_path]);

  if (!url) return <div className="text-xs text-muted-foreground">Загрузка вложения...</div>;
  if (a.kind === "image") return <img src={url} alt={a.name ?? ""} className="max-h-80 rounded-md" />;
  if (a.kind === "video") return <video src={url} controls className="max-h-80 rounded-md" />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary text-foreground">
      {a.mime_type.startsWith("image") ? <ImgIcon className="h-4 w-4 text-primary" /> : a.mime_type.startsWith("video") ? <Video className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
      <span className="truncate font-medium">{highlight(a.name ?? "Файл", query)}</span>
      <span className="ml-auto text-xs text-muted-foreground">{formatBytes(a.size_bytes)}</span>
    </a>
  );
}
