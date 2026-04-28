CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND attempted_at > now() - interval '3 minutes';

  IF attempt_count >= 5 THEN
    lockout_until := last_attempt + interval '3 minutes';
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
$function$;