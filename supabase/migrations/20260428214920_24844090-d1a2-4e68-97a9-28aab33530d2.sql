-- Enable pgcrypto in the extensions schema (required for pgp_sym_encrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Update the trigger function to use the fully-qualified function name and
-- fall back to plaintext storage if encryption fails, so audit events are
-- never silently dropped.
CREATE OR REPLACE FUNCTION public.encrypt_audit_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  encryption_key text;
  encrypted_text text;
BEGIN
  encryption_key := current_setting('app.settings.audit_encryption_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := 'loop-audit-key-2024-secure';
  END IF;

  IF NEW.details IS NOT NULL AND NEW.details::text != '{}'::text THEN
    BEGIN
      encrypted_text := encode(
        extensions.pgp_sym_encrypt(NEW.details::text, encryption_key),
        'base64'
      );
      NEW.details := jsonb_build_object('_encrypted', encrypted_text);
    EXCEPTION WHEN OTHERS THEN
      -- If encryption fails for any reason, keep the plaintext details
      -- so the audit event is still recorded.
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Same hardening for the decrypt helper used by the admin bitácora view.
CREATE OR REPLACE FUNCTION public.decrypt_audit_details(encrypted_details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
    decrypted := extensions.pgp_sym_decrypt(
      decode(encrypted_details->>'_encrypted', 'base64'),
      encryption_key
    );
    RETURN decrypted::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('_error', 'No se pudo descifrar');
  END;
END;
$function$;

-- Make sure the trigger is attached to audit_logs
DROP TRIGGER IF EXISTS audit_logs_encrypt_details ON public.audit_logs;
CREATE TRIGGER audit_logs_encrypt_details
BEFORE INSERT ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_audit_details();

-- Allow recording failed-login audit events even when there is no
-- authenticated user (RLS currently blocks anon inserts).
DROP POLICY IF EXISTS "Anyone can insert auth audit logs" ON public.audit_logs;
CREATE POLICY "Anyone can insert auth audit logs"
ON public.audit_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (action IN ('login', 'login_failed', 'mfa_verified', 'mfa_failed', 'register', 'logout', 'password_reset_requested'));