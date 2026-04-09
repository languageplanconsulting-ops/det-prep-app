-- Admin email bootstrap + trigger (runs on insert/update of profiles.email)

UPDATE public.profiles
SET role = 'admin'
WHERE lower(trim(email)) = lower(trim('languageplanconsulting@gmail.com'));

CREATE OR REPLACE FUNCTION public.handle_admin_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL
     AND lower(trim(NEW.email)) = lower(trim('languageplanconsulting@gmail.com')) THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_admin_signup ON public.profiles;
CREATE TRIGGER on_admin_signup
  BEFORE INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_assignment();
-- If your Postgres version errors on EXECUTE FUNCTION, use:
-- EXECUTE PROCEDURE public.handle_admin_assignment();
