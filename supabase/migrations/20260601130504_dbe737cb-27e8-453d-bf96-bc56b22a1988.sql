
-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'subscriber');
create type public.attachment_kind as enum ('image', 'video', 'file');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_subscribed boolean not null default false,
  subscription_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_subscriber(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id
      and (
        is_subscribed = true
        and (subscription_until is null or subscription_until > now())
      )
  ) or public.has_role(_user_id, 'admin');
$$;

-- Profiles policies
create policy "Profiles: users read own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);
create policy "Profiles: admins read all"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Profiles: users update own"
  on public.profiles for update to authenticated
  using (auth.uid() = id);
create policy "Profiles: admins update all"
  on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Profiles: insert own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- user_roles policies
create policy "Roles: read own"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);
create policy "Roles: admins read all"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Roles: admins manage"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ CHATS ============
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  gost_clause text not null,
  title text not null,
  description text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.chats to authenticated;
grant all on public.chats to service_role;

alter table public.chats enable row level security;

create policy "Chats: authenticated read"
  on public.chats for select to authenticated
  using (true);
create policy "Chats: admins manage"
  on public.chats for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ MESSAGES ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index messages_chat_id_created_at_idx on public.messages(chat_id, created_at);

grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;

alter table public.messages enable row level security;

create policy "Messages: subscribers read"
  on public.messages for select to authenticated
  using (public.is_subscriber(auth.uid()));
create policy "Messages: subscribers insert as self"
  on public.messages for insert to authenticated
  with check (public.is_subscriber(auth.uid()) and author_id = auth.uid());
create policy "Messages: author or admin update"
  on public.messages for update to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Messages: author or admin delete"
  on public.messages for delete to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============ ATTACHMENTS ============
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  kind public.attachment_kind not null,
  name text,
  created_at timestamptz not null default now()
);

create index attachments_message_id_idx on public.message_attachments(message_id);

grant select, insert, delete on public.message_attachments to authenticated;
grant all on public.message_attachments to service_role;

alter table public.message_attachments enable row level security;

create policy "Attachments: subscribers read"
  on public.message_attachments for select to authenticated
  using (public.is_subscriber(auth.uid()));
create policy "Attachments: subscribers insert"
  on public.message_attachments for insert to authenticated
  with check (
    public.is_subscriber(auth.uid())
    and exists (
      select 1 from public.messages m
      where m.id = message_id and m.author_id = auth.uid()
    )
  );
create policy "Attachments: author or admin delete"
  on public.message_attachments for delete to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and (m.author_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

-- ============ TRIGGERS ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger chats_touch before update on public.chats
  for each row execute function public.touch_updated_at();

-- ============ STORAGE BUCKET ============
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

create policy "Chat files: subscribers read"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-attachments' and public.is_subscriber(auth.uid()));
create policy "Chat files: subscribers upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-attachments' and public.is_subscriber(auth.uid()));
create policy "Chat files: author or admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (owner = auth.uid() or public.has_role(auth.uid(), 'admin'))
  );

-- ============ REALTIME ============
alter table public.messages replica identity full;
alter table public.message_attachments replica identity full;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_attachments;
