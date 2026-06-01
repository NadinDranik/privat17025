import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Shield } from "lucide-react";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "Подписка · ГОСТ 17025 Чаты" },
      { name: "description", content: "Подписка на экспертные чаты по ГОСТ ISO/IEC 17025-2019." },
    ],
  }),
  component: Subscribe,
});

function Subscribe() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="font-semibold">ГОСТ 17025 Чаты</div>
          </Link>
          <Link to="/auth"><Button variant="ghost" size="sm">Войти</Button></Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold tracking-tight">Подписка</h1>
        <p className="mt-3 text-muted-foreground">
          Полный доступ ко всем чатам по&nbsp;пунктам ГОСТ&nbsp;ISO/IEC&nbsp;17025-2019,
          материалам и&nbsp;экспертным консультациям.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-card p-8">
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-bold">2&nbsp;900&nbsp;₽</div>
            <div className="text-muted-foreground">/ месяц</div>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Доступ ко всем тематическим чатам",
              "Возможность задавать вопросы эксперту",
              "Все материалы, шаблоны и чек-листы",
              "История обсуждений и поиск",
              "Уведомления о новых консультациях",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="h-5 w-5 shrink-0 text-accent" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-8 w-full" size="lg" disabled>
            Оплата скоро будет доступна
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Подключение платёжного провайдера в&nbsp;ближайшее время. До&nbsp;этого доступ выдаётся администратором вручную.
          </p>
        </div>
      </section>
    </div>
  );
}
