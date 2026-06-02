import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Профиль" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [busy, setBusy] = useState(false);

  const initial = (name || profile?.display_name || user?.email || "?").slice(0, 1).toUpperCase();

  const saveName = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() || null }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Имя обновлено");
    window.location.reload();
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Файл больше 2 МБ");
    setBusy(true);
    try {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : ".png";
      const path = `${user.id}/avatar-${Date.now()}${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
      if (updErr) throw updErr;
      toast.success("Аватар обновлён");
      qc.invalidateQueries();
      window.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Профиль</h1>
      <p className="mt-1 text-sm text-muted-foreground">Аватар и отображаемое имя</p>

      <section className="mt-8 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
            <AvatarFallback className="text-2xl font-semibold">{initial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.target.value = "";
              }}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={busy} variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Загрузить аватар
            </Button>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP до 2 МБ</p>
          </div>
        </div>

        <div className="mt-8">
          <Label>Отображаемое имя</Label>
          <div className="mt-2 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" />
            <Button onClick={saveName} disabled={busy}>Сохранить</Button>
          </div>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          Email: {user?.email}
        </div>
      </section>
    </div>
  );
}
