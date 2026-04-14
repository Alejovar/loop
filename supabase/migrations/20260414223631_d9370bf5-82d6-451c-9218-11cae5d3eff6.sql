-- Drop the security definer view
DROP VIEW IF EXISTS public.audit_logs_decrypted;

-- Create a secure RPC function instead
CREATE OR REPLACE FUNCTION public.get_decrypted_audit_logs(p_limit int DEFAULT 500)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_email text,
  action text,
  resource text,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    a.user_email,
    a.action,
    a.resource,
    public.decrypt_audit_details(a.details) as details,
    a.created_at
  FROM public.audit_logs a
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$;