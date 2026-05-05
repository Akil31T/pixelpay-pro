
REVOKE EXECUTE ON FUNCTION public.is_admin_or_super(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
