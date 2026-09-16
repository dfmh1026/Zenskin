-- ============================================================
-- ZEN SKIN STUDIO — esquema de base de datos (Supabase / Postgres)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. STAFF (personal autorizado a usar el panel admin)
--    Vinculado 1:1 con auth.users. Se crea el usuario en
--    Authentication → Users, y luego se inserta aquí su id.
-- ------------------------------------------------------------
create table public.staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null,
  rol        text not null default 'staff' check (rol in ('admin','staff')),
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. PACIENTES
-- ------------------------------------------------------------
create table public.pacientes (
  id                            uuid primary key default gen_random_uuid(),
  cedula                        text not null unique,
  nombre_completo               text not null,
  fecha_nacimiento              date,
  genero                        text,
  telefono                      text,
  email                         text,
  direccion                     text,
  contacto_emergencia_nombre    text,
  contacto_emergencia_telefono  text,
  alergias                      text,
  antecedentes_medicos          text,
  medicamentos_actuales         text,
  notas_generales               text,
  activo                        boolean not null default true,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  created_by                    uuid references public.staff(id)
);

create index idx_pacientes_nombre on public.pacientes using gin (to_tsvector('spanish', nombre_completo));
create index idx_pacientes_cedula on public.pacientes (cedula);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_pacientes_updated_at
before update on public.pacientes
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. HISTORIA CLÍNICA (una fila por visita / procedimiento)
-- ------------------------------------------------------------
create table public.historia_entradas (
  id                     uuid primary key default gen_random_uuid(),
  paciente_id            uuid not null references public.pacientes(id) on delete cascade,
  fecha                  date not null default current_date,
  tipo                   text not null default 'consulta' check (tipo in ('consulta','procedimiento','seguimiento')),
  motivo                 text,
  diagnostico            text,
  tratamiento_realizado  text,
  productos_usados       text,
  observaciones          text,
  proxima_cita           date,
  profesional            text,
  created_at             timestamptz not null default now(),
  created_by             uuid references public.staff(id)
);

create index idx_historia_paciente on public.historia_entradas (paciente_id, fecha desc);

-- ------------------------------------------------------------
-- 4. FOTOS asociadas a una entrada de historia clínica
--    (archivos reales viven en Storage, bucket 'fotos-pacientes')
-- ------------------------------------------------------------
create table public.entrada_fotos (
  id            uuid primary key default gen_random_uuid(),
  entrada_id    uuid not null references public.historia_entradas(id) on delete cascade,
  paciente_id   uuid not null references public.pacientes(id) on delete cascade,
  storage_path  text not null,
  etiqueta      text not null default 'otro' check (etiqueta in ('antes','despues','otro')),
  descripcion   text,
  created_at    timestamptz not null default now(),
  created_by    uuid references public.staff(id)
);

create index idx_fotos_paciente on public.entrada_fotos (paciente_id);
create index idx_fotos_entrada on public.entrada_fotos (entrada_id);

-- ------------------------------------------------------------
-- 5. PAGOS / PRECIOS (trazabilidad de cobros por paciente)
-- ------------------------------------------------------------
create table public.pagos (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  entrada_id  uuid references public.historia_entradas(id) on delete set null,
  fecha       date not null default current_date,
  servicio    text not null,
  precio      numeric(10,2) not null default 0 check (precio >= 0),
  abono       numeric(10,2) not null default 0 check (abono >= 0),
  metodo_pago text,
  estado      text not null default 'pendiente' check (estado in ('pendiente','parcial','pagado')),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.staff(id)
);

create index idx_pagos_paciente on public.pagos (paciente_id, fecha desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- El panel se sirve desde GitHub Pages (estático, público), así
-- que la anon key queda visible en el navegador. RLS es la única
-- barrera real: solo usuarios autenticados que además existan en
-- public.staff pueden leer o escribir cualquier dato clínico.
-- ============================================================

alter table public.staff            enable row level security;
alter table public.pacientes        enable row level security;
alter table public.historia_entradas enable row level security;
alter table public.entrada_fotos    enable row level security;
alter table public.pagos            enable row level security;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff s where s.id = auth.uid() and s.activo);
$$;

create policy "staff lee su propio perfil" on public.staff
  for select using (auth.uid() = id);

create policy "staff acceso total pacientes" on public.pacientes
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff acceso total historia" on public.historia_entradas
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff acceso total fotos" on public.entrada_fotos
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff acceso total pagos" on public.pagos
  for all using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- STORAGE: bucket privado para fotos clínicas
-- ============================================================

insert into storage.buckets (id, name, public)
values ('fotos-pacientes', 'fotos-pacientes', false)
on conflict (id) do nothing;

create policy "staff lee fotos-pacientes" on storage.objects
  for select using (bucket_id = 'fotos-pacientes' and public.is_staff());

create policy "staff sube fotos-pacientes" on storage.objects
  for insert with check (bucket_id = 'fotos-pacientes' and public.is_staff());

create policy "staff borra fotos-pacientes" on storage.objects
  for delete using (bucket_id = 'fotos-pacientes' and public.is_staff());

-- ============================================================
-- Después de ejecutar este script:
-- 1. Authentication → Users → crea un usuario (email + password)
--    por cada persona del staff.
-- 2. Copia su "User UID" y ejecuta, por cada una:
--
--    insert into public.staff (id, nombre, rol)
--    values ('PEGA-AQUI-EL-UID', 'Nombre Apellido', 'admin');
--
-- ============================================================
