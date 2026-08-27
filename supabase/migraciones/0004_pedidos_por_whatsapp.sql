-- ============================================================================
-- 0004 · Pedidos por WhatsApp
--
-- Se retiró Wompi del proyecto: activar la cuenta de comercio exigía el
-- mismo nivel de KYC que un negocio real cobrando de verdad —dirección real,
-- redes sociales activas, cuenta bancaria personal vinculada— para una
-- tienda de portafolio que nunca va a facturar. En vez de dejar el código
-- de una pasarela sin activar, se reemplazó por lo que de verdad va a pasar
-- con estos pedidos: se cierran por chat.
--
-- Los estados de una transacción de Wompi ('aprobado', 'rechazado',
-- 'anulado') ya no describen nada real: no hay pasarela que los reporte.
-- El pedido nace 'recibido' —se guardó y se mandó el enlace de WhatsApp— y
-- pasa a 'confirmado' o 'cancelado' a mano, desde el panel de Supabase,
-- cuando Dan cierra la conversación con la clienta. No hay panel propio
-- para esto todavía; es una actualización manual de una fila, y con el
-- volumen de un proyecto de portafolio no hace falta más.
-- ============================================================================

alter table public.pedidos
  drop constraint if exists pedidos_estado_check;

update public.pedidos set estado = 'recibido'  where estado = 'pendiente';
update public.pedidos set estado = 'confirmado' where estado = 'aprobado';
update public.pedidos set estado = 'cancelado'  where estado in ('rechazado', 'anulado');

alter table public.pedidos
  alter column estado set default 'recibido';

alter table public.pedidos
  add constraint pedidos_estado_check
  check (estado in ('recibido', 'confirmado', 'cancelado'));
