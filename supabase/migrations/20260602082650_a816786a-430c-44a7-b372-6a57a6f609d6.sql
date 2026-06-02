-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('reply', 'forward')),
  chat_id uuid NOT NULL,
  message_id uuid NOT NULL,
  source_message_id uuid,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_all ON public.notifications(user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications: read own"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Notifications: update own"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Notifications: delete own"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Trigger: create notifications on new message
CREATE OR REPLACE FUNCTION public.create_message_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
BEGIN
  -- Reply notification
  IF NEW.reply_to_id IS NOT NULL THEN
    SELECT author_id INTO target_user FROM public.messages WHERE id = NEW.reply_to_id;
    IF target_user IS NOT NULL AND target_user <> NEW.author_id THEN
      INSERT INTO public.notifications (user_id, type, chat_id, message_id, source_message_id, actor_id)
      VALUES (target_user, 'reply', NEW.chat_id, NEW.id, NEW.reply_to_id, NEW.author_id);
    END IF;
  END IF;

  -- Forward notification (notify original author)
  IF NEW.forwarded_from_author_id IS NOT NULL
     AND NEW.forwarded_from_author_id <> NEW.author_id THEN
    INSERT INTO public.notifications (user_id, type, chat_id, message_id, source_message_id, actor_id)
    VALUES (NEW.forwarded_from_author_id, 'forward', NEW.chat_id, NEW.id, NEW.forwarded_from_message_id, NEW.author_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_notifications
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.create_message_notifications();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;