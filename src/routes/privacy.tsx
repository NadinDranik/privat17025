import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика конфиденциальности · ГОСТ 17025 Чаты" },
      {
        name: "description",
        content:
          "Политика обработки персональных данных сервиса экспертных чатов по ГОСТ ISO/IEC 17025-2019.",
      },
      { property: "og:title", content: "Политика конфиденциальности · ГОСТ 17025 Чаты" },
      {
        property: "og:description",
        content: "Как мы обрабатываем и защищаем персональные данные пользователей сервиса.",
      },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
              <Button variant="ghost" size="sm">Войти</Button>
            </Link>
            <Link to="/subscribe">
              <Button size="sm">Подписаться</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Политика конфиденциальности</h1>
        <p className="mt-3 text-sm text-muted-foreground">Дата вступления в силу: 02.06.2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground">
          <Notice />

          <Section title="1. Общие положения">
            <p>
              Настоящая Политика определяет порядок обработки персональных данных пользователей сервиса
              «ГОСТ 17025 Чаты» (далее — Сервис) и меры по обеспечению их безопасности. Политика разработана
              в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
            </p>
            <p className="mt-3">
              Используя Сервис, Пользователь подтверждает согласие с условиями настоящей Политики.
            </p>
          </Section>

          <Section title="2. Термины">
            <ul className="list-disc space-y-2 pl-6">
              <li><b>Оператор</b> — лицо, оказывающее услуги Сервиса (см. реквизиты ниже).</li>
              <li><b>Пользователь</b> — физическое лицо, использующее Сервис.</li>
              <li><b>Персональные данные</b> — любая информация, относящаяся к Пользователю.</li>
            </ul>
          </Section>

          <Section title="3. Какие данные собираются">
            <ul className="list-disc space-y-2 pl-6">
              <li>адрес электронной почты;</li>
              <li>отображаемое имя (display name) и иные данные профиля, указанные Пользователем;</li>
              <li>содержимое сообщений и вложений, отправленных в чатах;</li>
              <li>служебные данные авторизации (идентификаторы сессий, токены);</li>
              <li>технические метаданные (IP-адрес, тип устройства, браузер, время визитов).</li>
            </ul>
          </Section>

          <Section title="4. Цели обработки">
            <ul className="list-disc space-y-2 pl-6">
              <li>предоставление доступа к чатам и материалам Сервиса;</li>
              <li>аутентификация Пользователя и обеспечение безопасности;</li>
              <li>отправка уведомлений в рамках Сервиса (ответы, упоминания, пересылки);</li>
              <li>обработка обращений в службу поддержки;</li>
              <li>выполнение требований законодательства Российской Федерации.</li>
            </ul>
          </Section>

          <Section title="5. Правовые основания обработки">
            <p>
              Обработка осуществляется на основании согласия Пользователя, договора-оферты, заключаемого
              при подписке, а также требований применимого законодательства.
            </p>
          </Section>

          <Section title="6. Передача третьим лицам">
            <p>Оператор может передавать данные следующим категориям получателей:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>хостинг-провайдеру и провайдеру облачной инфраструктуры;</li>
              <li>платёжному провайдеру — для проведения оплаты подписки;</li>
              <li>государственным органам — в случаях, предусмотренных законом.</li>
            </ul>
            <p className="mt-3">
              Данные не передаются третьим лицам в рекламных целях и не продаются.
            </p>
          </Section>

          <Section title="7. Cookies и аналитика">
            <p>
              Сервис использует cookies и аналогичные технологии для поддержания сессии Пользователя и
              анонимной статистики использования. Пользователь может отключить cookies в настройках браузера —
              при этом часть функций Сервиса может стать недоступна.
            </p>
          </Section>

          <Section title="8. Сроки хранения">
            <p>
              Персональные данные хранятся в течение всего срока использования Сервиса и в течение
              3 лет после прекращения использования или до получения запроса на удаление, в зависимости от
              того, что наступит раньше, за исключением случаев, когда более длительный срок хранения
              требуется законом.
            </p>
          </Section>

          <Section title="9. Права Пользователя">
            <p>Пользователь вправе:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>получать сведения об обработке своих данных;</li>
              <li>требовать уточнения, блокирования или удаления данных;</li>
              <li>отозвать согласие на обработку;</li>
              <li>обжаловать действия Оператора в Роскомнадзор и в судебном порядке.</li>
            </ul>
            <p className="mt-3">
              Обращения направляются на контактный email, указанный в реквизитах.
            </p>
          </Section>

          <Section title="10. Меры защиты">
            <p>
              Оператор принимает правовые, организационные и технические меры для защиты данных от
              неправомерного доступа, изменения, уничтожения и иных неправомерных действий.
            </p>
          </Section>

          <Section title="11. Изменения Политики">
            <p>
              Оператор вправе вносить изменения в настоящую Политику. Актуальная редакция всегда доступна по
              адресу <span className="font-mono">/privacy</span>.
            </p>
          </Section>

          <Section title="12. Реквизиты Оператора">
            <RequisitesBlock />
          </Section>
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← На главную</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 text-muted-foreground">{children}</div>
    </section>
  );
}

function Notice() {
  return (
    <div className="rounded-md border border-dashed border-accent/60 bg-accent/5 p-4 text-sm text-muted-foreground">
      Шаблон документа. Перед публикацией необходимо заполнить реквизиты Оператора реальными данными и
      проверить соответствие фактической работе Сервиса.
    </div>
  );
}

function RequisitesBlock() {
  return (
    <div className="rounded-md bg-secondary/50 p-4 font-mono text-sm">
      <div>Наименование: ИП/ООО ____________________</div>
      <div>ИНН: ____________________</div>
      <div>ОГРН/ОГРНИП: ____________________</div>
      <div>Юридический адрес: ____________________</div>
      <div>Email для обращений: ____________________</div>
    </div>
  );
}
