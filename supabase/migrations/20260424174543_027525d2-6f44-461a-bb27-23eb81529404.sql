-- 1) Permitir reposts sin contenido propio (texto/imagen)
CREATE OR REPLACE FUNCTION public.validate_post_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Reposts pueden no tener contenido propio (solo referencia + comentario opcional)
  IF NEW.repost_of_post_id IS NOT NULL THEN
    IF length(coalesce(NEW.repost_comment, '')) > 500 THEN
      RAISE EXCEPTION 'Repost comment is too long';
    END IF;
    RETURN NEW;
  END IF;

  -- Posts normales: requieren contenido o imagen
  IF coalesce(length(trim(NEW.content)), 0) = 0 AND coalesce(length(trim(NEW.image_path)), 0) = 0 THEN
    RAISE EXCEPTION 'Post content or image is required';
  END IF;

  IF length(coalesce(NEW.content, '')) > 1000 THEN
    RAISE EXCEPTION 'Post content is too long';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Caption por imagen del carrusel
ALTER TABLE public.post_images
  ADD COLUMN IF NOT EXISTS caption text;