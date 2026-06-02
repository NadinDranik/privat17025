import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, MailCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход · ГОСТ 17025 Чаты" },
      { name: "description", content: "Войдите или зарегистрируйтесь, чтобы получить доступ к экспертным чатам по ГОСТ 17025." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/chats" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/chats",
    });
    if (result.error) {
      toast.error("Не удалось войти через Google", { description: result.error.message });
      setBusy(false);
      return;
    }
    if (!result.redirected) navigate({ to: "/chats" });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
        setPendingEmail(email);
        setNeedsConfirm(true);
        return toast.error("E-mail не подтверждён", {
          description: "Проверьте почту или отправьте письмо повторно",
        });
      }
      return toast.error("Не удалось войти", { description: error.message });
    }
    navigate({ to: "/chats" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/chats",
        data: { display_name: name || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) return toast.error("Регистрация не выполнена", { description: error.message });

    // Если auto-confirm выключен — сессии не будет, нужно подтверждение
    if (!data.session) {
      setPendingEmail(email);
      setNeedsConfirm(true);
      toast.success("Письмо отправлено", {
        description: "Откройте письмо на " + email + " и подтвердите адрес",
      });
    } else {
      toast.success("Аккаунт создан");
      navigate({ to: "/chats" });
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: window.location.origin + "/chats" },
    });
    setBusy(false);
    if (error) return toast.error("Не удалось отправить", { description: error.message });
    toast.success("Письмо отправлено повторно");
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div className="font-semibold">ГОСТ 17025 Чаты</div>
        </Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Экспертные консультации по&nbsp;аккредитации лабораторий
          </h2>
          <p className="mt-4 text-sidebar-foreground/70">
            Войдите, чтобы получить доступ к&nbsp;чатам по&nbsp;пунктам ГОСТ&nbsp;ISO/IEC&nbsp;17025-2019.
          </p>
        </div>
        <div className="text-sm text-sidebar-foreground/60">© ГОСТ 17025 Чаты</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {needsConfirm && pendingEmail ? (
            <div className="space-y-5">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <MailCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Подтвердите e-mail</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Мы отправили письмо на <span className="font-medium text-foreground">{pendingEmail}</span>.
                  Откройте его и нажмите на ссылку, чтобы активировать аккаунт.
                </p>
              </div>
              <Button onClick={handleResend} variant="outline" className="w-full" disabled={busy}>
                Отправить письмо ещё раз
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setNeedsConfirm(false);
                  setPendingEmail(null);
                }}
              >
                Назад
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Добро пожаловать</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Войдите или создайте аккаунт
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full"
                onClick={handleGoogle}
                disabled={busy}
              >
                Продолжить с Google
              </Button>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                или e-mail
                <div className="h-px flex-1 bg-border" />
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Вход</TabsTrigger>
                  <TabsTrigger value="signup">Регистрация</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-3 pt-4">
                    <div>
                      <Label htmlFor="si-email">E-mail</Label>
                      <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="si-pass">Пароль</Label>
                      <PasswordInput id="si-pass" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>Войти</Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-3 pt-4">
                    <div>
                      <Label htmlFor="su-name">Имя</Label>
                      <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" />
                    </div>
                    <div>
                      <Label htmlFor="su-email">E-mail</Label>
                      <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="su-pass">Пароль</Label>
                      <PasswordInput id="su-pass" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>Создать аккаунт</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
