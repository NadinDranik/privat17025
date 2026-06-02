
DROP POLICY IF EXISTS "Chat files: author or admin update" ON storage.objects;
CREATE POLICY "Chat files: author or admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Realtime: notifications own user" ON realtime.messages;
CREATE POLICY "Realtime: notifications own user"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('notifications:' || auth.uid()::text)
  OR (
    realtime.topic() LIKE 'chat:%'
    AND public.can_access_chat(
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
      auth.uid()
    )
  )
);
