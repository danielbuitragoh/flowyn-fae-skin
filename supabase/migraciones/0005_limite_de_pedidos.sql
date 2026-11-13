-- ============================================================================
-- 0005 · Límite de pedidos por cuenta
--
-- Cada pedido guarda una fila, manda un correo a la clienta y otro a la
-- tienda, y redacta un mensaje de WhatsApp. Sin tope, una cuenta con un
-- bucle en la consola podía llenar la tabla y la bandeja de correo en un
-- minuto: la función comprobaba quién pedía y qué pedía, pero no cuántas
-- veces.
--
-- El tope vive en la base y no en la función porque así vale para cualquier
-- camino que inserte en `pedidos`, también uno que se escriba mañana. La
-- función traduce el error a un 429 con el mismo texto.
--
-- Un pedido por minuto y cinco por hora, por cuenta. Una persona que compra
-- de verdad no se acerca a ninguno de los dos.
-- ============================================================================

create or replace function public.limitar_pedidos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ultimo  timestamptz;
  en_hora integer;
begin
  -- Dos pedidos simultáneos de la misma cuenta se ponen en fila: si no,
  -- los dos leerían "cero en la última hora" y entrarían a la vez.
  perform pg_advisory_xact_lock(hashtext('flowyn-pedidos:' || new.usuario_id::text));

  select max(creado_en), count(*)
    into ultimo, en_hora
    from pedidos
   where usuario_id = new.usuario_id
     and creado_en > now() - interval '1 hour';

  if ultimo is not null and ultimo > now() - interval '60 seconds' then
    raise exception 'Acabas de hacer un pedido. Espera un minuto antes de hacer otro.'
      using errcode = 'P0001', hint = 'limite_pedidos';
  end if;

  if en_hora >= 5 then
    raise exception 'Llegaste al límite de cinco pedidos por hora. Si necesitas más, escríbenos por WhatsApp.'
      using errcode = 'P0001', hint = 'limite_pedidos';
  end if;

  return new;
end;
$$;

-- Es un disparador: nadie tiene por qué poder llamarlo por /rpc.
revoke execute on function public.limitar_pedidos() from public, anon, authenticated;

drop trigger if exists antes_de_crear_pedido on public.pedidos;
create trigger antes_de_crear_pedido
  before insert on public.pedidos
  for each row execute function public.limitar_pedidos();
