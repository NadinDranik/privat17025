
-- 1. Extend chats with kind/owner_id for direct messaging
alter table public.chats
  add column kind text not null default 'group',
  add column owner_id uuid null;

alter table public.chats
  add constraint chats_kind_check check (kind in ('group','direct'));

alter table public.chats
  add constraint chats_direct_owner_check
  check ((kind = 'group' and owner_id is null) or (kind = 'direct' and owner_id is not null));

create unique index chats_direct_owner_unique on public.chats(owner_id) where kind = 'direct';
create index chats_kind_idx on public.chats(kind);

-- 2. Helper: can current user access this chat
create or replace function public.can_access_chat(_chat_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chats c
    where c.id = _chat_id
      and (
        c.kind = 'group'
        or (c.kind = 'direct' and (c.owner_id = _user_id or public.has_role(_user_id, 'admin')))
      )
  );
$$;

-- 3. Replace chats SELECT policy: direct visible only to owner+admin
drop policy if exists "Chats: authenticated read" on public.chats;
create policy "Chats: read by access"
on public.chats for select
to authenticated
using (
  kind = 'group'
  or (kind = 'direct' and (owner_id = auth.uid() or has_role(auth.uid(), 'admin')))
);

-- Allow regular users to create their own direct chat (one per user via unique index)
create policy "Chats: users create own direct"
on public.chats for insert
to authenticated
with check (
  kind = 'direct'
  and owner_id = auth.uid()
);

-- 4. Replace messages policies
drop policy if exists "Messages: subscribers read" on public.messages;
drop policy if exists "Messages: subscribers insert as self" on public.messages;

create policy "Messages: read by chat access"
on public.messages for select
to authenticated
using (
  public.can_access_chat(chat_id, auth.uid())
  and (
    -- group chats still require subscription to read
    (exists (select 1 from public.chats c where c.id = messages.chat_id and c.kind = 'direct'))
    or public.is_subscriber(auth.uid())
  )
);

create policy "Messages: insert by chat access"
on public.messages for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.can_access_chat(chat_id, auth.uid())
  and (
    (exists (select 1 from public.chats c where c.id = messages.chat_id and c.kind = 'direct'))
    or public.is_subscriber(auth.uid())
  )
);

-- 5. Replace message_attachments policies
drop policy if exists "Attachments: subscribers read" on public.message_attachments;
drop policy if exists "Attachments: subscribers insert" on public.message_attachments;

create policy "Attachments: read by chat access"
on public.message_attachments for select
to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id = message_attachments.message_id
      and public.can_access_chat(m.chat_id, auth.uid())
      and (
        (exists (select 1 from public.chats c where c.id = m.chat_id and c.kind = 'direct'))
        or public.is_subscriber(auth.uid())
      )
  )
);

create policy "Attachments: insert by chat access"
on public.message_attachments for insert
to authenticated
with check (
  exists (
    select 1 from public.messages m
    where m.id = message_attachments.message_id
      and m.author_id = auth.uid()
      and public.can_access_chat(m.chat_id, auth.uid())
      and (
        (exists (select 1 from public.chats c where c.id = m.chat_id and c.kind = 'direct'))
        or public.is_subscriber(auth.uid())
      )
  )
);

-- 6. Avatars bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

create policy "Avatars: public read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "Avatars: users upload own"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Avatars: users update own"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Avatars: users delete own"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
