import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Paperclip, Send, Trash2, FileText, Image as ImgIcon, Video, Search, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatBytes, formatTime } from "@/lib/format";

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

function classifyFile(file: File): "image" | "video" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function ChatPage() {
  const { chatId } = Route.useParams();
  const { user, isAdmin, isSubscriber, profile } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
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
      const profIds = Array.from(new Set((msgs ?? []).map((m) => m.author_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", profIds);
      const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
      return (msgs as MessageRow[]).map((m) => ({
        ...m,
        attachments: atts.filter((x) => x.message_id === m.id),
        author: profMap.get(m.author_id) ?? null,
      }));
    },
  });

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

  const send = async () => {
    if (!user) return;
    if (!body.trim() && pending.length === 0) return;
    setBusy(true);
    try {
      const { data: msg, error } = await supabase
        .from("messages")
        .insert({ chat_id: chatId, author_id: user.id, body: body.trim() })
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
              return (
                <div key={m.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    {m.author?.avatar_url && <AvatarImage src={m.author.avatar_url} alt={authorName} />}
                    <AvatarFallback className="text-xs font-semibold">
                      {authorName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{m.author?.display_name ?? "—"}</span>
                      <span>{formatTime(m.created_at)}</span>
                    </div>
                    <div className={`rounded-lg px-4 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                      {m.body && <div className="whitespace-pre-wrap break-words text-sm">{highlight(m.body, q)}</div>}
                      {m.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {m.attachments.map((a) => (
                            <AttachmentView key={a.id} a={a} query={q} />
                          ))}
                        </div>
                      )}
                    </div>
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
              );
            })}
          </div>
        )}
      </div>

      {isSubscriber && (
        <div className="border-t border-border bg-card px-6 py-3">
          <div className="mx-auto max-w-3xl">
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
    </div>
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
