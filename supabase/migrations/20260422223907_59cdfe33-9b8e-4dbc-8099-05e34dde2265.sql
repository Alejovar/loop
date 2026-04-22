-- Multiple images per post (Instagram-style carousel)
CREATE TABLE IF NOT EXISTS public.post_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  aspect_ratio TEXT NOT NULL DEFAULT 'original',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_images_post_id_idx ON public.post_images(post_id, position);

ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view post images" ON public.post_images;
CREATE POLICY "Authenticated users can view post images"
ON public.post_images FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert images for own posts" ON public.post_images;
CREATE POLICY "Users can insert images for own posts"
ON public.post_images FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_images.post_id AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete images of own posts" ON public.post_images;
CREATE POLICY "Users can delete images of own posts"
ON public.post_images FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_images.post_id AND p.user_id = auth.uid()
  )
);