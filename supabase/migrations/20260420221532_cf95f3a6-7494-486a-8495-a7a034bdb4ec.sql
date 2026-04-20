DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;
CREATE POLICY "No direct login attempt inserts"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

UPDATE storage.buckets
SET public = false
WHERE id = 'post-images';

DROP POLICY IF EXISTS "Public can view post images" ON storage.objects;
CREATE POLICY "Authenticated users can view post images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'post-images');