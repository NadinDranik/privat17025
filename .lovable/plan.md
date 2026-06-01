# Платная подписка → полный доступ ко всем чатам

## Что уже есть
- Таблица `profiles` с полями `is_subscribed`, `subscription_until`.
- Функция `is_subscriber(uid)` и RLS на `messages` / `message_attachments`, которые **уже** открывают все чаты любому, у кого `is_subscribed = true` и срок не истёк.
- Страница `/subscribe` с тарифом 2 900 ₽/мес и заглушкой «Оплата скоро будет доступна».

Значит, как только пользователь после оплаты получает `is_subscribed = true`, он автоматически видит и пишет во все чаты. Делать ничего в RLS не нужно — нужно подключить оплату и обновлять профиль.

## План

### 1. Подключить Stripe (рекомендовано системой)
Включить встроенную интеграцию Lovable + Stripe (`enable_stripe_payments`). Это даст готовый Checkout и вебхуки без BYOK-ключей.

### 2. Создать продукт «Подписка ГОСТ 17025»
- Цена: 2 900 ₽ / месяц, recurring.
- Один тариф, ежемесячное продление.

### 3. Серверная логика (TanStack server functions, без edge-функций)
- `src/lib/billing.functions.ts`
  - `createCheckoutSession` (защищена `requireSupabaseAuth`) — создаёт Stripe Checkout Session для текущего пользователя, `success_url=/chats`, `cancel_url=/subscribe`, в `metadata.user_id` кладём `auth.uid()`.
  - `createBillingPortalSession` — открывает Stripe Customer Portal для отмены/смены карты.
- `src/routes/api/public/stripe-webhook.ts` — приём вебхуков Stripe:
  - проверка подписи `STRIPE_WEBHOOK_SECRET`;
  - на `checkout.session.completed` и `customer.subscription.updated`: через `supabaseAdmin` обновляем `profiles`:
    - `is_subscribed = true`,
    - `subscription_until = current_period_end`;
  - на `customer.subscription.deleted` / `invoice.payment_failed` после grace-периода: `is_subscribed = false`.

### 4. Хранение связи пользователь ↔ Stripe
Миграция: добавить в `profiles` колонки `stripe_customer_id text`, `stripe_subscription_id text` (nullable). RLS уже корректна (юзер видит свой профиль).

### 5. UI
- `/subscribe`: заменить disabled-кнопку на «Оформить подписку» → вызывает `createCheckoutSession` и редиректит на Stripe Checkout. Для уже подписанных — кнопка «Управлять подпиской» (Customer Portal) и подпись со сроком действия.
- В `_authenticated.tsx` (сайдбар): под именем пользователя показывать бейдж «Подписка до …» либо ссылку «Оформить подписку», если не подписан.
- На странице `/chats/$chatId`, если `!isSubscriber`, вместо инпута показывать баннер «Оформите подписку, чтобы писать и видеть сообщения» со ссылкой на `/subscribe` (читать всё равно блокирует RLS).

### 6. Проверка
- Тестовая оплата в Stripe test mode → профиль становится `is_subscribed`, чаты и вложения открываются.
- Отмена в Customer Portal → после `current_period_end` доступ закрывается автоматически (`is_subscriber()` проверяет `subscription_until`).

## Технические детали
- Никаких изменений в существующих RLS — `is_subscriber()` уже всё решает.
- Секреты (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`) приходят из интеграции Stripe и читаются только в `process.env` внутри server functions / server route.
- Вебхук под `/api/public/stripe-webhook` — публичный маршрут с проверкой подписи.
