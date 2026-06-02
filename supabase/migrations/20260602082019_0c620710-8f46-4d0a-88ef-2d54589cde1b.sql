ALTER TABLE public.messages
  ADD COLUMN reply_to_id uuid,
  ADD COLUMN forwarded_from_message_id uuid,
  ADD COLUMN forwarded_from_author_id uuid,
  ADD COLUMN forwarded_from_chat_id uuid;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_forwarded_from ON public.messages(forwarded_from_message_id);