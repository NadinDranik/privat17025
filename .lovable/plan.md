## Проблема

После миграции по безопасности у роли `authenticated` отозвано право `EXECUTE` на функциях `has_role`, `is_subscriber`, `can_access_chat`. Эти функции используются во ВСЕХ RLS-политиках (чаты, сообщения, профили, роли, вложения). При любом запросе Postgres возвращает `permission denied for function has_role`, и UI ломается — нельзя зайти в админку, не загружаются чаты/подписки.

SECURITY DEFINER защищает только тело функции (оно выполняется от владельца), но право на сам вызов функции должно быть у вызывающей роли.

## План исправления

Одна миграция, восстанавливающая права:

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscriber(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_chat(uuid, uuid)    TO authenticated;
```

`anon` и `PUBLIC` оставляем без прав — внешний доступ к этим функциям не нужен, безопасность сохраняется: вызывать их сможет только аутентифицированный пользователь, а сами политики продолжают ограничивать данные.

После применения миграции — проверить, что админка открывается, список чатов и пользователей грузится, переключение подписки работает.

Можно применять?