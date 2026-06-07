import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, MessageSquare, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Аккредитация лабораторий · Чаты по ГОСТ 17025-2019" },
      {
        name: "description",
        content:
          "Экспертные консультации по ГОСТ ISO/IEC 17025-2019: отдельные чаты по каждому пункту стандарта. Материалы, разъяснения, опыт прохождения Росаккредитации.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">ГОСТ&nbsp;17025</div>
              <div className="text-xs text-muted-foreground">Экспертные чаты</div>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Войти
              </Button>
            </Link>
            <Link to="/subscribe">
              <Button size="sm" className="bg-orange-500">Подписаться</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Сообщество практикующих экспертов
          </div>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Экспертная помощь специалистам аккредитованных лабораторий
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Сборник чатов по каждому пункту ГОСТ&nbsp;ISO/IEC&nbsp;17025-2019 и документам Росакредитации.
            Разбираем требования, обмениваемся документами, отвечаем на вопросы из практики
            испытательных лабораторий. Помогаем устранять несоответствия после ПК оперативно.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Начать <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/subscribe">
              <Button size="lg" variant="outline">
                Что входит в подписку
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-3">
          {[
            {
              icon: MessageSquare,
              title: "Что внутри чата",
              text: (
                <span className="block whitespace-pre-line">
                  — отдельные тематические разделы по пунктам ГОСТ ISO/IEC 17025-2019{"\n"}
                  — разбор требований стандарта и критериев аккредитации{"\n"}
                  — обсуждение документов Росаккредитации и нормативных требований{"\n"}
                  — реальные кейсы лабораторий и практика прохождения проверок{"\n"}
                  — несоответствия экспертов и варианты их устранения{"\n"}
                  — корректирующие действия, внутренние аудиты, анализ рисков{"\n"}
                  — ВЛК, МСИ, ПК и работа в ФГИС Росаккредитация{"\n"}
                  — ответы на вопросы участников сообщества
                </span>
              ),
            },
            {
              icon: BookOpen,
              title: "Материалы и шаблоны, которые вам будут доступны",
              text: (
                <span className="block whitespace-pre-line text-left">
                  — разборы требований ГОСТ ISO/IEC 17025-2019{"\n"}
                  — пояснения по критериям аккредитации и документам Росаккредитации{"\n"}
                  — шаблоны процедур, форм, журналов, приказов и чек-листов{"\n"}
                  — примеры корректирующих действий и ответов на несоответствия{"\n"}
                  — материалы по ВЛК, МСИ, ПК, персоналу, оборудованию и протоколам{"\n"}
                  — практические кейсы лабораторий и ответы на вопросы участников
                </span>
              ),
            },
            {
              icon: Shield,
              title: "Эксперт всегда рядом",
              text: (
                <span className="block whitespace-pre-line text-left">
                  Возник вопрос по требованиям ГОСТ ISO/IEC 17025-2019, критериям аккредитации или замечанию эксперта?{"\n\n"}
                  В чате можно задать вопрос, получить профессиональное мнение, обсудить сложную ситуацию и найти решение на основе требований стандарта, нормативных документов и практики аккредитованных лабораторий.
                </span>
              ),
            },
          ].map((f) => (
            <div key={typeof f.title === 'string' ? f.title : 'feature'} className="rounded-lg border border-border bg-card p-6 border-neutral-100">
              <f.icon className="mx-auto h-6 w-6 text-accent" />
              <h3 className="mt-4 text-lg font-semibold text-center">{f.title}</h3>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground text-slate-800">{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div>© ГОСТ 17025 Чаты. Экспертные консультации.</div>
          <div className="flex flex-wrap gap-4">
            <Link to="/auth" className="hover:text-foreground">Войти</Link>
            <Link to="/subscribe" className="hover:text-foreground">Подписка</Link>
            <Link to="/privacy" className="hover:text-foreground">Политика конфиденциальности</Link>
            <Link to="/offer" className="hover:text-foreground">Оферта</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
