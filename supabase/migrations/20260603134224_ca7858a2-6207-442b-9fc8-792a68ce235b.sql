-- Fix 1: Remove redundant realtime SELECT policy that bypasses subscription gate
DROP POLICY IF EXISTS "Realtime: scoped channel access" ON public.messages;

-- Fix 2: Harden SECURITY DEFINER helpers so authenticated callers can only
-- query their own identity. RLS policies always pass auth.uid(), so this is
-- transparent to the app but prevents probing other users' roles/subscription/access.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR _user_id <> auth.uid() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_subscriber(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR _user_id <> auth.uid() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND (is_subscribed = true AND (subscription_until IS NULL OR subscription_until > now()))
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_chat(_chat_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR _user_id <> auth.uid() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = _chat_id
      AND (
        c.kind = 'group'
        OR (c.kind = 'direct' AND (
          c.owner_id = _user_id
          OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
        ))
      )
  );
END;
$$;