-- =====================================================================
-- VIDALID · Migración 002 · Autenticación y roles
-- - Crea el perfil automáticamente al registrarse un usuario (rol customer).
-- - Funciones auxiliares de permisos.
-- - Impide quedarse sin ningún administrador activo.
-- =====================================================================

-- ¿El usuario actual es un administrador activo?
-- SECURITY DEFINER para que las políticas RLS puedan consultarla sin recursión.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active
  );
$$;

-- Lanza un error si el usuario actual no es administrador.
create or replace function private.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No tienes permisos para realizar esta operación.'
      using errcode = '42501';
  end if;
end;
$$;

-- Crea el perfil al registrarse. El rol NUNCA se toma de los metadatos
-- que envía el cliente: siempre empieza como customer.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Perfiles para los usuarios que ya existían antes de esta migración.
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(left(trim(u.raw_user_meta_data ->> 'full_name'), 120), '')
from auth.users u
on conflict (id) do nothing;

-- Siempre debe quedar al menos un administrador activo.
create or replace function private.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or not new.is_active) then
    if not exists (
      select 1 from public.profiles p
      where p.role = 'admin' and p.is_active and p.id <> old.id
    ) then
      raise exception 'Debe existir al menos un administrador activo.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_last_admin
  before update of role, is_active on public.profiles
  for each row execute function private.protect_last_admin();
