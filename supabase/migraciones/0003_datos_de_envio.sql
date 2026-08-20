-- ============================================================================
-- 0003 · Los datos de envío
--
-- La tabla `pedidos` guardaba la ciudad y nada más. Con eso se puede cobrar,
-- pero no se puede despachar: una transportadora colombiana necesita, como
-- mínimo, nombre del destinatario, dirección completa, ciudad y un celular
-- para llamar cuando el mensajero esté abajo. Sin esos campos, cada pedido
-- pagado obligaba a escribirle a la clienta para pedirle a dónde se lo
-- mandamos, que es exactamente lo que una tienda no debería hacer.
--
-- Lo que NO se pide, y es deliberado:
--
--   · Código postal. En Colombia es opcional y casi nadie se lo sabe. Pedirlo
--     es fricción pura a cambio de un campo que la transportadora ignora.
--
--   · Cédula del destinatario. La exigen del remitente —nosotros—, no de quien
--     recibe, y sólo hace falta para pagar por PSE. En ese caso la pide el
--     propio checkout de Wompi, así que no tiene por qué vivir aquí.
--
-- La dirección va en un solo campo de texto libre y no troceada en
-- "Calle/Carrera" + números. La nomenclatura colombiana parece regular pero no
-- lo es: hay Diagonales, Transversales, Avenidas, sufijos Bis/Sur/Este, y cada
-- municipio la acomodó a la trama que ya tenía. Un formulario estructurado se
-- rompe con la primera dirección de Medellín o con la primera vereda.
-- ============================================================================

alter table public.pedidos
  add column if not exists destinatario text,
  add column if not exists telefono     text,
  add column if not exists departamento text,
  add column if not exists direccion    text,
  add column if not exists complemento  text,
  add column if not exists barrio       text,
  add column if not exists indicaciones text;

-- Se validan aquí y no sólo en la función: la base es la última línea, y una
-- restricción que vive con el dato sobrevive a cualquier refactor del
-- servidor. Se permite nulo para no invalidar los pedidos de prueba anteriores
-- a esta migración; lo que no se permite es un dato presente pero inservible.
alter table public.pedidos
  drop constraint if exists pedidos_telefono_valido;
alter table public.pedidos
  add constraint pedidos_telefono_valido
  check (telefono is null or telefono ~ '^3[0-9]{9}$');

alter table public.pedidos
  drop constraint if exists pedidos_direccion_valida;
alter table public.pedidos
  add constraint pedidos_direccion_valida
  check (direccion is null or char_length(btrim(direccion)) between 6 and 160);

alter table public.pedidos
  drop constraint if exists pedidos_destinatario_valido;
alter table public.pedidos
  add constraint pedidos_destinatario_valido
  check (destinatario is null or char_length(btrim(destinatario)) between 3 and 90);

comment on column public.pedidos.destinatario is 'Nombre de quien recibe. Puede no ser el titular de la cuenta.';
comment on column public.pedidos.telefono     is 'Celular colombiano de 10 dígitos que empieza por 3. Lo usa el mensajero.';
comment on column public.pedidos.direccion    is 'Dirección en texto libre: la nomenclatura colombiana no se deja trocear.';
comment on column public.pedidos.complemento  is 'Apto, torre, interior, conjunto. Opcional.';
comment on column public.pedidos.barrio       is 'Opcional para la transportadora, pero es lo que usa el mensajero de verdad.';
comment on column public.pedidos.indicaciones is 'Referencias para encontrar la puerta. Reduce entregas fallidas.';
