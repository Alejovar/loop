-- Table for rate limiting login attempts
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert login attempts"
  ON public.login_attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count int;
  last_attempt timestamptz;
  lockout_until timestamptz;
BEGIN
  SELECT count(*), max(attempted_at)
  INTO attempt_count, last_attempt
  FROM public.login_attempts
  WHERE email = lower(p_email)
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  IF attempt_count >= 5 THEN
    lockout_until := last_attempt + interval '15 minutes';
    RETURN json_build_object(
      'allowed', false,
      'attempts', attempt_count,
      'lockout_until', lockout_until
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'attempts', attempt_count,
    'lockout_until', null
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success)
  VALUES (lower(p_email), p_success);

  IF p_success THEN
    DELETE FROM public.login_attempts
    WHERE email = lower(p_email) AND success = false;
  END IF;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.encrypt_audit_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  encryption_key := current_setting('app.settings.audit_encryption_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := 'loop-audit-key-2024-secure';
  END IF;

  IF NEW.details IS NOT NULL AND NEW.details::text != '{}'::text THEN
    NEW.details := jsonb_build_object(
      '_encrypted', encode(
        pgp_sym_encrypt(NEW.details::text, encryption_key),
        'base64'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER encrypt_audit_log_details
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_audit_details();

CREATE OR REPLACE FUNCTION public.decrypt_audit_details(encrypted_details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
  decrypted text;
BEGIN
  IF encrypted_details IS NULL OR NOT encrypted_details ? '_encrypted' THEN
    RETURN encrypted_details;
  END IF;

  encryption_key := current_setting('app.settings.audit_encryption_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := 'loop-audit-key-2024-secure';
  END IF;

  BEGIN
    decrypted := pgp_sym_decrypt(
      decode(encrypted_details->>'_encrypted', 'base64'),
      encryption_key
    );
    RETURN decrypted::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('_error', 'No se pudo descifrar');
  END;
END;
$$;

CREATE OR REPLACE VIEW public.audit_logs_decrypted AS
SELECT
  id,
  user_id,
  user_email,
  action,
  resource,
  public.decrypt_audit_details(details) as details,
  created_at
FROM public.audit_logs;