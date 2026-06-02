## Что добавим

**1. Аватары пользователей**
- Новый storage bucket `avatars` (публичный, лимит 2 МБ, image/*)
- RLS: каждый пользователь загружает/обновляет/удаляет только файлы в своей папке `{user_id}/...`; чтение публичное
- Страница `/profile` (в `_authenticated`): отображение текущего аватара, загрузка нового файла, изменение `display_name`. Запись в `profiles.avatar_url`
- Кнопка «Профиль» в сайдбаре (`AppSidebar`) с превью аватара
- В чате (`chats.$chatId.tsx`) заменить кружок-инициал на компонент `Avatar` (`AvatarImage` из `profile.avatar_url` + `AvatarFallback` с инициалом). Запрос профилей уже грузит `avatar_url`

**2. Личные сообщения админу**
Используем существующую инфраструктуру чатов, не создаём отдельные таблицы:
- Расширяем таблицу `chats`: добавляем колонки `kind text default 'group'` (значения: `group` | `direct`) и `owner_id uuid null` (для direct-чатов — id обычного пользователя; собеседник всегда админ)
- Меняем RLS на `chats`/`messages`/`message_attachments`:
  - Для `kind='group'` — поведение как сейчас (читают все авторизованные, пишут подписчики)
  - Для `kind='direct'` — читают/пишут только `owner_id` и админы; обычные правила подписки не применяются (личка доступна всем зарегистрированным, чтобы можно было задать вопрос до оплаты)
- Хелпер-функция `can_access_chat(_chat_id, _user_id)` (SECURITY DEFINER) для использования в политиках `messages`/`message_attachments`
- Кнопка «Написать админу» на странице `/subscribe` и в сайдбаре: при клике — найти/создать direct-чат текущего пользователя и перейти на него
- В сайдбаре в списке чатов direct-чаты показываются:
  - обычному пользователю — один пункт «Личный чат с админом»
  - админу — отдельной секцией «Личные обращения» со списком всех direct-чатов (имя владельца) и индикатором непрочитанных можно отложить
- В админ-панели — таб «Личные обращения» (список direct-чатов с переходом в чат)
- Заголовок страницы чата для direct адаптируется (без «п. X»)

**3. Мелочи**
- В `useAuth` уже возвращается `profile.avatar_url` — пробрасываем в сайдбар
- Сидер `handle_new_user` оставляем как есть (avatar_url остаётся null до первой загрузки)

## Технические детали

Миграция:
```sql
alter table public.chats
  add column kind text not null default 'group' check (kind in ('group','direct')),
  add column owner_id uuid null;

create index on public.chats(kind, owner_id);

-- helper
create or replace function public.can_access_chat(_chat_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.chats c
    where c.id = _chat_id
      and (
        c.kind = 'group'
        or (c.kind = 'direct' and (c.owner_id = _user_id or public.has_role(_user_id, 'admin')))
      )
  );
$$;
```
Обновлённые политики на `messages`/`message_attachments` используют `can_access_chat` + `is_subscriber` (для group). Для `chats` SELECT: `kind='group' OR owner_id=auth.uid() OR has_role(auth.uid(),'admin')`. INSERT для direct разрешён авторизованному при `owner_id=auth.uid()`.

Bucket avatars:
```sql
insert into storage.buckets (id,name,public) values ('avatars','avatars',true);
-- policies: public read; insert/update/delete where (storage.foldername(name))[1] = auth.uid()::text
```

## Что вне scope (можно потом)
- Бейджи непрочитанных сообщений
- Удаление/обрезка аватара (crop)
- Уведомления админу о новом обращении

Подтвердите — реализую.
