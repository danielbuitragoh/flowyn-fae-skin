-- ===========================================================================
-- Las funciones de disparador no son API
-- ===========================================================================
--
-- Lo encontró el linter de seguridad de Supabase después de aplicar la
-- 0001, y merece quedar escrito porque es un descuido fácil de repetir:
--
-- Postgres concede `EXECUTE` a `PUBLIC` en toda función nueva, y PostgREST
-- publica el esquema `public` entero. Entre las dos cosas,
-- `crear_perfil_al_registrarse()` quedaba accesible en
-- `/rest/v1/rpc/crear_perfil_al_registrarse` sin haber entrado siquiera.
--
-- Llamarla desde ahí no conseguiría gran cosa —falla sin el contexto del
-- disparador—, pero es una función `security definer`, es decir, corre con
-- los permisos de quien la creó. Una de esas alcanzable desde internet es
-- superficie que no hace falta tener.
--
-- Revocar no rompe el disparador: un disparador ejecuta su función con los
-- permisos del dueño de la tabla, no con los de quien provoca el INSERT.
-- ===========================================================================

revoke all on function public.crear_perfil_al_registrarse() from public, anon, authenticated;
revoke all on function public.marcar_actualizado() from public, anon, authenticated;
