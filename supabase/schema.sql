-- =====================================================================
-- Atoll Cellar — database setup for Supabase
-- Run this once: Supabase dashboard → SQL Editor → New query → paste
-- everything in this file → Run. It is safe to run again after updates.
-- =====================================================================

create extension if not exists pgcrypto;

-- A portfolio is one account: a resort, or a group of resorts, with its team.
create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My resort',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Who can open a portfolio, and what they may do.
--   owner   — created it; everything, cannot be removed
--   manager — everything, including wines, prices, outlets and the team
--   staff   — daily work: sales, counts, losses, transfers, training
create table if not exists public.members (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  primary key (portfolio_id, user_id)
);

-- Invitations waiting to be used. The invited person signs in with that email address
-- and types the join code from the invitation.
create table if not exists public.invites (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager', 'staff')),
  code text not null default '',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (portfolio_id, email)
);
alter table public.invites add column if not exists code text not null default '';

-- The portfolio's data, split into sections (setup and wines, stock, one month of sales, ...).
-- Every save raises the version, so two devices can never overwrite each other unnoticed.
create table if not exists public.sections (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  section text not null,
  data jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (portfolio_id, section)
);

alter table public.portfolios enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.sections enable row level security;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.my_role(p uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where portfolio_id = p and user_id = auth.uid()
$$;

create or replace function public.my_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- ---------------------------------------------------------------------
-- Read access. Nobody can write to the tables directly: every change goes
-- through the functions below, which check the person's role first.
-- ---------------------------------------------------------------------
drop policy if exists "members read their portfolios" on public.portfolios;
create policy "members read their portfolios" on public.portfolios
  for select to authenticated using (public.my_role(id) is not null);

drop policy if exists "members read the team" on public.members;
create policy "members read the team" on public.members
  for select to authenticated using (public.my_role(portfolio_id) is not null);

drop policy if exists "managers and invitees read invites" on public.invites;
create policy "managers and invitees read invites" on public.invites
  for select to authenticated using (coalesce(public.my_role(portfolio_id), '') in ('owner', 'manager') or lower(email) = public.my_email());

drop policy if exists "members read data" on public.sections;
create policy "members read data" on public.sections
  for select to authenticated using (public.my_role(portfolio_id) is not null);

-- ---------------------------------------------------------------------
-- Portfolios
-- ---------------------------------------------------------------------
create or replace function public.my_portfolios() returns table (id uuid, name text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, m.role
  from public.portfolios p join public.members m on m.portfolio_id = p.id
  where m.user_id = auth.uid()
  order by p.created_at
$$;

create or replace function public.create_portfolio(p_name text, p_sections jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
  k text;
  v jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if (select count(*) from public.members where user_id = auth.uid() and role = 'owner') >= 20 then
    raise exception 'You already own 20 portfolios' using errcode = '54000';
  end if;
  insert into public.portfolios (name, created_by)
    values (coalesce(nullif(left(trim(p_name), 120), ''), 'My resort'), auth.uid())
    returning id into pid;
  insert into public.members (portfolio_id, user_id, email, role) values (pid, auth.uid(), public.my_email(), 'owner');
  for k, v in select * from jsonb_each(coalesce(p_sections, '{}'::jsonb)) loop
    insert into public.sections (portfolio_id, section, data, version, updated_by) values (pid, k, v, 1, auth.uid());
  end loop;
  return pid;
end $$;

create or replace function public.rename_portfolio(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(p_id), '') not in ('owner', 'manager') then raise exception 'Only a manager can rename the portfolio' using errcode = '42501'; end if;
  update public.portfolios set name = coalesce(nullif(left(trim(p_name), 120), ''), name) where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- Data: read the version of every section, read sections, save changes
-- ---------------------------------------------------------------------
create or replace function public.section_versions(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role(p_id) is null then raise exception 'You do not have access to this portfolio' using errcode = '42501'; end if;
  return coalesce((select jsonb_object_agg(section, version) from public.sections where portfolio_id = p_id), '{}'::jsonb);
end $$;

create or replace function public.get_sections(p_id uuid, p_names text[] default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role(p_id) is null then raise exception 'You do not have access to this portfolio' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_object_agg(section, jsonb_build_object('data', data, 'version', version))
    from public.sections
    where portfolio_id = p_id and (p_names is null or section = any (p_names))
  ), '{}'::jsonb);
end $$;

-- p_changes: [{ "section": "stock", "data": {...}, "base": 12 }, ...]
-- "base" is the version this device last saw. If someone else saved since, nothing is written
-- and the current server copies come back as conflicts, so the device can merge and try again.
create or replace function public.save_sections(p_id uuid, p_changes jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r text := public.my_role(p_id);
  c jsonb;
  cur_v integer;
  cur_d jsonb;
  nv integer;
  conflicts jsonb := '[]'::jsonb;
  versions jsonb := '{}'::jsonb;
begin
  if r is null then raise exception 'You do not have access to this portfolio' using errcode = '42501'; end if;
  if jsonb_typeof(p_changes) <> 'array' then raise exception 'p_changes must be a list' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_changes) e
             where coalesce(e ->> 'section', '') !~ '^(core|stock|postings|losses|transfers|counts|pos|quiz|sales:[0-9]{4}-[0-9]{2})$') then
    raise exception 'Unknown data section' using errcode = '22023';
  end if;
  if r = 'staff' and exists (select 1 from jsonb_array_elements(p_changes) e where e ->> 'section' in ('core', 'pos')) then
    raise exception 'Staff cannot change the setup, wines, prices or purchase orders' using errcode = '42501';
  end if;

  -- one save at a time per portfolio
  perform pg_advisory_xact_lock(hashtext('atoll-cellar:' || p_id::text));

  for c in select * from jsonb_array_elements(p_changes) loop
    select version, data into cur_v, cur_d from public.sections where portfolio_id = p_id and section = c ->> 'section';
    if found then
      if cur_v <> coalesce((c ->> 'base')::integer, 0) then
        conflicts := conflicts || jsonb_build_array(jsonb_build_object('section', c ->> 'section', 'version', cur_v, 'data', cur_d));
      end if;
    elsif coalesce((c ->> 'base')::integer, 0) <> 0 then
      conflicts := conflicts || jsonb_build_array(jsonb_build_object('section', c ->> 'section', 'version', 0, 'data', null));
    end if;
  end loop;
  if jsonb_array_length(conflicts) > 0 then
    return jsonb_build_object('ok', false, 'conflicts', conflicts);
  end if;

  for c in select * from jsonb_array_elements(p_changes) loop
    insert into public.sections as s (portfolio_id, section, data, version, updated_at, updated_by)
      values (p_id, c ->> 'section', coalesce(c -> 'data', 'null'::jsonb), 1, now(), auth.uid())
      on conflict (portfolio_id, section) do update
        set data = excluded.data, version = s.version + 1, updated_at = now(), updated_by = auth.uid()
      returning version into nv;
    versions := versions || jsonb_build_object(c ->> 'section', nv);
  end loop;
  return jsonb_build_object('ok', true, 'versions', versions);
end $$;

-- ---------------------------------------------------------------------
-- Team
-- ---------------------------------------------------------------------
create or replace function public.team(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r text := public.my_role(p_id);
begin
  if r is null then raise exception 'You do not have access to this portfolio' using errcode = '42501'; end if;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', user_id, 'email', email, 'role', role, 'since', created_at) order by created_at) from public.members where portfolio_id = p_id), '[]'::jsonb),
    'invites', case when r in ('owner', 'manager') then coalesce((select jsonb_agg(jsonb_build_object('email', email, 'role', role, 'code', code, 'since', created_at) order by created_at) from public.invites where portfolio_id = p_id), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;

-- a 6-character code without look-alike letters (no 0/O, 1/I/L)
create or replace function public.new_join_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text := '';
begin
  for i in 1..6 loop c := c || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1); end loop;
  return c;
end $$;

-- Returns {"status": "invited", "code": "K7Q2MX"} or {"status": "member"} if they already have access.
drop function if exists public.invite_member(uuid, text, text);
create or replace function public.invite_member(p_id uuid, p_email text, p_role text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  em text := lower(trim(coalesce(p_email, '')));
  c text;
begin
  if coalesce(public.my_role(p_id), '') not in ('owner', 'manager') then raise exception 'Only a manager can invite people' using errcode = '42501'; end if;
  if p_role not in ('manager', 'staff') then raise exception 'Choose manager or staff' using errcode = '22023'; end if;
  if em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'That email address does not look right' using errcode = '22023'; end if;
  if exists (select 1 from public.members where portfolio_id = p_id and lower(email) = em) then
    update public.members set role = p_role where portfolio_id = p_id and lower(email) = em and role <> 'owner' and user_id <> auth.uid();
    return jsonb_build_object('status', 'member');
  end if;
  if (select count(*) from public.invites where portfolio_id = p_id) >= 200 then raise exception 'Too many open invitations' using errcode = '54000'; end if;
  insert into public.invites as i (portfolio_id, email, role, code, invited_by) values (p_id, em, p_role, public.new_join_code(), auth.uid())
    on conflict (portfolio_id, email) do update set role = excluded.role, invited_by = excluded.invited_by, created_at = now(),
      code = case when i.code = '' then excluded.code else i.code end
    returning code into c;
  return jsonb_build_object('status', 'invited', 'code', c);
end $$;

-- The invited person, signed in with the invited email address, joins with the code.
create or replace function public.join_with_code(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  em text := public.my_email();
  inv record;
begin
  if auth.uid() is null or em = '' then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into inv from public.invites where lower(email) = em and code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) limit 1;
  if not found then raise exception 'That code does not match an invitation for %. Check the code, and that you signed in with the email address that was invited.', em using errcode = 'P0002'; end if;
  insert into public.members (portfolio_id, user_id, email, role) values (inv.portfolio_id, auth.uid(), em, inv.role)
    on conflict (portfolio_id, user_id) do nothing;
  delete from public.invites where portfolio_id = inv.portfolio_id and lower(email) = em;
  return jsonb_build_object('portfolio_id', inv.portfolio_id, 'name', (select name from public.portfolios where id = inv.portfolio_id), 'role', inv.role);
end $$;
drop function if exists public.accept_invites();

create or replace function public.cancel_invite(p_id uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(p_id), '') not in ('owner', 'manager') then raise exception 'Only a manager can cancel invitations' using errcode = '42501'; end if;
  delete from public.invites where portfolio_id = p_id and lower(email) = lower(trim(p_email));
end $$;

create or replace function public.set_member_role(p_id uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(p_id), '') not in ('owner', 'manager') then raise exception 'Only a manager can change roles' using errcode = '42501'; end if;
  if p_role not in ('manager', 'staff') then raise exception 'Choose manager or staff' using errcode = '22023'; end if;
  if p_user = auth.uid() then raise exception 'You cannot change your own role' using errcode = '42501'; end if;
  update public.members set role = p_role where portfolio_id = p_id and user_id = p_user and role <> 'owner';
end $$;

-- Managers can remove anyone except the owner. Anyone except the owner can remove themselves.
create or replace function public.remove_member(p_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user <> auth.uid() and coalesce(public.my_role(p_id), '') not in ('owner', 'manager') then
    raise exception 'Only a manager can remove people' using errcode = '42501';
  end if;
  if exists (select 1 from public.members where portfolio_id = p_id and user_id = p_user and role = 'owner') then
    raise exception 'The owner cannot be removed' using errcode = '42501';
  end if;
  delete from public.members where portfolio_id = p_id and user_id = p_user;
end $$;

-- ---------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------
revoke all on function public.my_role(uuid) from public, anon;
revoke all on function public.my_portfolios() from public, anon;
revoke all on function public.create_portfolio(text, jsonb) from public, anon;
revoke all on function public.rename_portfolio(uuid, text) from public, anon;
revoke all on function public.section_versions(uuid) from public, anon;
revoke all on function public.get_sections(uuid, text[]) from public, anon;
revoke all on function public.save_sections(uuid, jsonb) from public, anon;
revoke all on function public.team(uuid) from public, anon;
revoke all on function public.new_join_code() from public, anon, authenticated;
revoke all on function public.invite_member(uuid, text, text) from public, anon;
revoke all on function public.join_with_code(text) from public, anon;
revoke all on function public.cancel_invite(uuid, text) from public, anon;
revoke all on function public.set_member_role(uuid, uuid, text) from public, anon;
revoke all on function public.remove_member(uuid, uuid) from public, anon;

grant execute on function public.my_role(uuid) to authenticated;
grant execute on function public.my_portfolios() to authenticated;
grant execute on function public.create_portfolio(text, jsonb) to authenticated;
grant execute on function public.rename_portfolio(uuid, text) to authenticated;
grant execute on function public.section_versions(uuid) to authenticated;
grant execute on function public.get_sections(uuid, text[]) to authenticated;
grant execute on function public.save_sections(uuid, jsonb) to authenticated;
grant execute on function public.team(uuid) to authenticated;
grant execute on function public.invite_member(uuid, text, text) to authenticated;
grant execute on function public.join_with_code(text) to authenticated;
grant execute on function public.cancel_invite(uuid, text) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
