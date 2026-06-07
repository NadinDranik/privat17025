
DROP POLICY IF EXISTS "Realtime: scoped channel access" ON realtime.messages;

CREATE POLICY "Realtime: scoped channel access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = ('notifications-' || (auth.uid())::text))
  OR (
    realtime.topic() LIKE 'chat-%'
    AND can_access_chat(
      (NULLIF(SUBSTRING(realtime.topic() FROM 6), ''))::uuid,
      auth.uid()
    )
    AND (
      is_subscriber(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = (NULLIF(SUBSTRING(realtime.topic() FROM 6), ''))::uuid
          AND c.kind = 'direct'
      )
    )
  )
);
