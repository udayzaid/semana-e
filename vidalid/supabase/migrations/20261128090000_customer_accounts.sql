-- =====================================================================
-- VIDALID · Migración 014 · Cuentas de clientes (minoristas) desde el portal
--
-- Crear cuenta es OPCIONAL: se puede pedir sin cuenta.
-- Al registrarse desde el portal (metadato signup_source = 'portal') se crea
-- automáticamente su ficha de cliente enlazada (customers.user_id).
-- El rol siempre es 'customer' (nunca se toma de los metadatos).
-- =====================================================================

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name   text := left(trim(coalesce(v_meta ->> 'full_name', '')), 120);
  v_phone  text := left(trim(coalesce(v_meta ->> 'phone', '')), 20);
  v_biz    text := left(trim(coalesce(v_meta ->> 'business_name', '')), 120);
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, v_name)
  on conflict (id) do nothing;

  -- Registro desde el portal: crear la ficha de cliente (minorista por defecto).
  if v_meta ->> 'signup_source' = 'portal' then
    begin
      insert into public.customers (name, business_name, customer_type, phone, user_id)
      values (
        case
          when char_length(v_name) >= 2 then v_name
          when char_length(split_part(coalesce(new.email, ''), '@', 1)) between 2 and 120 then split_part(new.email, '@', 1)
          else 'Cliente'
        end,
        nullif(v_biz, ''),
        case when v_meta ->> 'customer_type' = 'final_consumer' then 'final_consumer'::public.customer_type else 'retailer'::public.customer_type end,
        case when v_phone ~ '^[0-9+() -]{6,20}$' then v_phone end,
        new.id
      );
    exception when others then
      -- Nunca impedir el registro por un dato de la ficha; el cliente puede completarla luego.
      raise warning 'No se pudo crear la ficha de cliente para %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- El cliente actualiza SU propia ficha (no puede tocar otras ni el tipo de cliente).
-- Si por algún motivo no tiene ficha, se crea.
-- ---------------------------------------------------------------------
create or replace function public.update_my_customer_profile(
  p_name           text,
  p_business_name  text default null,
  p_phone          text default null,
  p_address        text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_name   text := trim(coalesce(p_name, ''));
  v_phone  text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'El nombre debe tener entre 2 y 120 caracteres.' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^[0-9+() -]{6,20}$' then
    raise exception 'El teléfono no es válido.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_address, '')) > 300 or char_length(coalesce(p_business_name, '')) > 120 then
    raise exception 'Algún dato es demasiado largo.' using errcode = '22023';
  end if;

  update public.customers
  set name = v_name,
      business_name = nullif(trim(coalesce(p_business_name, '')), ''),
      phone = v_phone,
      address = nullif(trim(coalesce(p_address, '')), '')
  where user_id = v_user;

  if not found then
    insert into public.customers (name, business_name, phone, address, user_id)
    values (v_name, nullif(trim(coalesce(p_business_name, '')), ''), v_phone, nullif(trim(coalesce(p_address, '')), ''), v_user);
  end if;

  update public.profiles set full_name = v_name where id = v_user;
end;
$$;

revoke execute on function public.update_my_customer_profile(text, text, text, text) from public, anon;
grant execute on function public.update_my_customer_profile(text, text, text, text) to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
