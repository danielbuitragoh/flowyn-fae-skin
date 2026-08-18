-- ===========================================================================
-- flowyn · FAE SKIN — Esquema de cuentas, carritos y pedidos
-- ===========================================================================
--
-- Tres decisiones que conviene leer antes que el SQL:
--
-- 1. EL DINERO ES `integer` DE PESOS ENTEROS.
--    El peso colombiano no se fracciona en la práctica y el precio del
--    producto es 89900. Guardarlo como `numeric` invitaría a redondeos
--    distintos en sitios distintos; guardarlo como `integer` hace que la
--    cifra que se cobra y la que se muestra sean literalmente la misma.
--
-- 2. LA CLIENTA NO PUEDE CREAR PEDIDOS.
--    Hay política de lectura sobre `pedidos`, pero no de inserción. Eso es
--    a propósito: un pedido nace en la Fase 4 dentro de una función de
--    servidor, que recalcula el total desde el catálogo y firma el pago.
--    Si el navegador pudiera insertar filas en `pedidos`, cualquiera con la
--    consola abierta podría escribir un pedido de 100 ml por mil pesos. El
--    `service_role` de la función salta RLS; nadie más escribe aquí.
--
-- 3. EL CARRITO SÍ ES DE LA CLIENTA.
--    `carritos` es una fila por usuario que sólo su dueño lee y escribe. No
--    importa que pueda manipularla: es una intención de compra, no un
--    cobro. El precio nunca sale de esta tabla — sale del catálogo.
--
-- Toda tabla lleva RLS activo. En Supabase una tabla sin RLS en el esquema
-- `public` queda expuesta a la llave publicable, que viaja en el navegador.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------
-- Extiende `auth.users`, que es de Supabase y no se toca. Aquí va lo que es
-- de la tienda: cómo quiere que la llamemos y a qué ciudad envía.

create table if not exists public.perfiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  nombre        text,
  avatar_url    text,
  ciudad_envio  text,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;

create policy "perfil propio: leer"
  on public.perfiles for select
  using ((select auth.uid()) = id);

create policy "perfil propio: actualizar"
  on public.perfiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);


-- El perfil se crea solo al registrarse, no desde el navegador.
--
-- Si dependiera de una llamada del cliente, un fallo de red justo después
-- de entrar con Google dejaría una cuenta sin perfil y la tienda tendría
-- que defenderse de ese caso para siempre. El disparador lo hace parte de
-- la creación del usuario: o existen los dos, o no existe ninguno.
--
-- `security definer` con `search_path` fijado: la función escribe en una
-- tabla que el usuario recién creado todavía no puede tocar, y el
-- `search_path` explícito evita que alguien la desvíe con un esquema propio.

create or replace function public.crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();


-- ---------------------------------------------------------------------------
-- Carritos
-- ---------------------------------------------------------------------------
-- Una fila por persona. Las líneas van en `jsonb` porque el catálogo tiene
-- un solo producto y una tabla de líneas de carrito sería una junta de más
-- para guardar {id, cantidad}. Si el catálogo crece, esto se normaliza.

create table if not exists public.carritos (
  usuario_id     uuid primary key references auth.users (id) on delete cascade,
  lineas         jsonb not null default '[]'::jsonb,
  ciudad         text,
  actualizado_en timestamptz not null default now()
);

alter table public.carritos enable row level security;

create policy "carrito propio: leer"
  on public.carritos for select
  using ((select auth.uid()) = usuario_id);

create policy "carrito propio: crear"
  on public.carritos for insert
  with check ((select auth.uid()) = usuario_id);

create policy "carrito propio: actualizar"
  on public.carritos for update
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "carrito propio: borrar"
  on public.carritos for delete
  using ((select auth.uid()) = usuario_id);


-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
-- `referencia` es la que viaja a la pasarela y la que la clienta ve. Es
-- única para que un reintento de pago no genere dos pedidos.
--
-- El precio unitario se copia dentro de la línea en lugar de apuntar al
-- catálogo: un pedido es un documento histórico, y si mañana FAE SKIN sube
-- de precio, lo que se cobró en agosto tiene que seguir diciendo lo que se
-- cobró en agosto.

create table if not exists public.pedidos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  referencia  text not null unique,
  estado      text not null default 'pendiente'
              check (estado in ('pendiente', 'aprobado', 'rechazado', 'anulado')),
  subtotal    integer not null check (subtotal >= 0),
  envio       integer not null check (envio >= 0),
  total       integer not null check (total >= 0),
  ciudad      text not null,
  creado_en   timestamptz not null default now()
);

create index if not exists pedidos_por_usuario
  on public.pedidos (usuario_id, creado_en desc);

alter table public.pedidos enable row level security;

-- Sólo lectura, y sólo de lo propio. La escritura la hace la función de
-- servidor de la Fase 4 con la llave de servicio. Ver la nota 2 de arriba.
create policy "pedidos propios: leer"
  on public.pedidos for select
  using ((select auth.uid()) = usuario_id);


create table if not exists public.lineas_pedido (
  id               bigint generated always as identity primary key,
  pedido_id        uuid not null references public.pedidos (id) on delete cascade,
  producto_id      text not null,
  nombre           text not null,
  formato          text,
  precio_unitario  integer not null check (precio_unitario >= 0),
  cantidad         integer not null check (cantidad > 0)
);

create index if not exists lineas_por_pedido on public.lineas_pedido (pedido_id);

alter table public.lineas_pedido enable row level security;

-- Una línea se ve si se ve su pedido. La condición se escribe una vez, aquí,
-- en lugar de confiar en que la consulta del cliente filtre bien.
create policy "lineas de pedidos propios: leer"
  on public.lineas_pedido for select
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = lineas_pedido.pedido_id
        and p.usuario_id = (select auth.uid())
    )
  );


-- ---------------------------------------------------------------------------
-- Marcas de tiempo
-- ---------------------------------------------------------------------------

create or replace function public.marcar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists al_actualizar_perfil on public.perfiles;
create trigger al_actualizar_perfil
  before update on public.perfiles
  for each row execute function public.marcar_actualizado();

drop trigger if exists al_actualizar_carrito on public.carritos;
create trigger al_actualizar_carrito
  before update on public.carritos
  for each row execute function public.marcar_actualizado();
