GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscriber(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_chat(uuid, uuid) TO authenticated;