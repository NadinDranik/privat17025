
DROP POLICY IF EXISTS "Realtime: notifications own user" ON realtime.messages;
CREATE POLICY "Realtime: scoped channel access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('notifications-' || auth.uid()::text)
  OR (
    realtime.topic() LIKE 'chat-%'
    AND public.can_access_chat(
      NULLIF(substring(realtime.topic() from 6), '')::uuid,
      auth.uid()
    )
  )
);
