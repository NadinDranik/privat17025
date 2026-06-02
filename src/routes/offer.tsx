import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/offer")({
  head: () => ({
    meta: [
      { title: "Публичная оферта · ГОСТ 17025 Чаты" },
      {
        name: "description",
        content:
          "Публичная оферта на оказание услуг доступа к экспертным чатам по ГОСТ ISO/IEC 17025-2019.",
      },
      { property: "og:title", content: "Публичная оферта · ГОСТ 17025 Чаты" },
      {
        property: "og:description",
        content: "Условия предоставления подписки на экспертные чаты по ГОСТ 17025.",
      },
      { property: "og:url", content: "/offer" },
    ],
    links: [{ rel: "canonical", href: "/offer" }],
  }),
  component: OfferPage,
});

function OfferPage() {
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
        <h1 className="text-4xl font-bold tracking-tight">Публичная оферта</h1>
        <p className="mt-3 text-sm text-muted-foreground">Дата публикации: 02.06.2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground">
          <Notice />

          <Section title="1. Термины">
            <ul className="list-disc space-y-2 pl-6">
              <li><b>Исполнитель</b> — лицо, оказывающее услуги Сервиса (см. реквизиты ниже).</li>
              <li><b>Пользователь</b> — дееспособное физическое лицо или юридическое лицо, акцептовавшее настоящую оферту.</li>
              <li><b>Сервис</b> — программно-аппаратный комплекс «ГОСТ 17025 Чаты», доступный по адресу сайта Исполнителя.</li>
              <li><b>Подписка</b> — платный доступ к функциям Сервиса на определённый срок.</li>
            </ul>
          </Section>

          <Section title="2. Предмет договора">
            <p>
              Исполнитель обязуется предоставить Пользователю доступ к экспертным чатам и материалам по
              ГОСТ ISO/IEC 17025-2019 и документам Росаккредитации, а Пользователь — оплатить услуги
              в порядке и на условиях настоящей оферты.
            </p>
          </Section>

          <Section title="3. Порядок заключения договора">
            <p>
              Договор считается заключённым (акцепт оферты) с момента оплаты Пользователем стоимости
              Подписки. Акцепт означает полное и безоговорочное согласие со всеми условиями настоящей оферты.
            </p>
          </Section>

          <Section title="4. Стоимость и порядок оплаты">
            <p>
              Стоимость Подписки составляет <b>1 000 ₽ (одна тысяча рублей) в месяц</b>. НДС не облагается
              (если иное не указано в платёжных документах).
            </p>
            <p className="mt-3">
              Оплата производится банковской картой через подключённого платёжного провайдера. Подписка
              продлевается ежемесячно автоматически до момента её отмены Пользователем в личном кабинете
              или письменным обращением к Исполнителю.
            </p>
            <p className="mt-3">
              Исполнитель вправе изменять стоимость Подписки. Новая стоимость применяется к следующим
              расчётным периодам и не затрагивает уже оплаченные периоды.
            </p>
          </Section>

          <Section title="5. Права и обязанности сторон">
            <p><b>Исполнитель обязуется:</b></p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>предоставить доступ к Сервису в течение срока действия Подписки;</li>
              <li>обеспечивать техническую поддержку Сервиса;</li>
              <li>сохранять конфиденциальность данных Пользователя.</li>
            </ul>
            <p className="mt-4"><b>Пользователь обязуется:</b></p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>своевременно оплачивать Подписку;</li>
              <li>не передавать данные доступа третьим лицам;</li>
              <li>не использовать Сервис в противоправных целях, не нарушать работу Сервиса и не публиковать материалы, нарушающие законодательство РФ.</li>
            </ul>
          </Section>

          <Section title="6. Возврат денежных средств">
            <p>
              Подписка относится к услугам, оказываемым в электронной форме. Возврат денежных средств
              осуществляется пропорционально неиспользованной части оплаченного периода по письменному
              обращению Пользователя на контактный email Исполнителя. Возврат за уже оказанные услуги
              (включая дни, в которые Сервис был доступен Пользователю) не производится.
            </p>
          </Section>

          <Section title="7. Ответственность и ограничения">
            <p>
              Исполнитель не несёт ответственности за временную недоступность Сервиса, вызванную действиями
              третьих лиц (хостинг, платёжные системы, операторы связи), а также за решения Пользователя,
              принятые на основании информации, полученной в чатах. Материалы Сервиса носят
              консультационный характер.
            </p>
            <p className="mt-3">
              Совокупная ответственность Исполнителя ограничивается суммой Подписки, оплаченной
              Пользователем за последний расчётный период.
            </p>
          </Section>

          <Section title="8. Интеллектуальная собственность">
            <p>
              Все материалы Сервиса (тексты, шаблоны, чек-листы) принадлежат Исполнителю либо размещены
              с разрешения правообладателей. Использование материалов вне Сервиса допускается только для
              личного некоммерческого использования Пользователем.
            </p>
          </Section>

          <Section title="9. Персональные данные">
            <p>
              Обработка персональных данных осуществляется в соответствии с{" "}
              <Link to="/privacy" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
                Политикой конфиденциальности
              </Link>.
            </p>
          </Section>

          <Section title="10. Срок действия и расторжение">
            <p>
              Договор действует с момента акцепта и до момента отмены Подписки одной из сторон. Пользователь
              вправе в любой момент отменить Подписку — доступ сохраняется до конца оплаченного периода.
            </p>
          </Section>

          <Section title="11. Разрешение споров и применимое право">
            <p>
              К отношениям сторон применяется законодательство Российской Федерации. Споры разрешаются
              путём переговоров, а при недостижении согласия — в суде по месту нахождения Исполнителя.
            </p>
          </Section>

          <Section title="12. Реквизиты Исполнителя">
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
      Шаблон документа. Перед публикацией необходимо заполнить реквизиты Исполнителя реальными данными.
    </div>
  );
}

function RequisitesBlock() {
  return (
    <div className="rounded-md bg-secondary/50 p-4 font-mono text-sm">
      <div>Наименование: ИП/ООО ____________________</div>
      <div>ИНН: ____________________</div>
      <div>ОГРН/ОГРНИП: ____________________</div>
      <div>Расчётный счёт: ____________________</div>
      <div>Юридический адрес: ____________________</div>
      <div>Email: ____________________</div>
    </div>
  );
}
