-- ============================================================
-- MIGRATION 3 — Fonctionnalité LIVE complète (Phase 1 du plan)
-- À exécuter dans le SQL Editor Supabase (idempotent).
-- Contenu :
--   1. Colonnes lives (mode, commence_a, termine_a, rediffusion_url,
--      visibilite, slide_courante) + statut "annule"
--   2. Table moderateurs_live (choisis par le créateur)
--   3. Table lives_spectateurs (audience réelle)
--   4. Table slides_live (Phase 6) + invitations_live (Phase 5)
--   5. Policies corrigées : création de lives réservée aux créateurs
--      validés, chat réservé aux directs en cours, modération des messages
--   6. RPC : supprimer_message_live, notifier_live_en_direct
--   7. envoyer_cadeau : réservé aux directs en cours
--   8. Publication realtime complète (messages_live, lives,
--      notifications, slides_live)
--   9. Index manquants + FK cadeaux_envoyes.live_id
-- ============================================================

-- ---------- 1. Colonnes lives ----------
alter table lives add column if not exists mode text not null default 'youtube';
alter table lives add column if not exists commence_a timestamptz;
alter table lives add column if not exists termine_a timestamptz;
alter table lives add column if not exists rediffusion_url text;
alter table lives add column if not exists visibilite text not null default 'public';
alter table lives add column if not exists slide_courante integer not null default 0;

alter table lives drop constraint if exists lives_statut_check;
alter table lives add constraint lives_statut_check
  check (statut in ('programme', 'en_direct', 'termine', 'annule'));

-- ---------- 2. Modérateurs choisis par le créateur ----------
create table if not exists moderateurs_live (
  id bigint generated always as identity primary key,
  createur_id uuid not null references profiles(id) on delete cascade,
  utilisateur_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (createur_id, utilisateur_id),
  check (createur_id <> utilisateur_id)
);
alter table moderateurs_live enable row level security;
drop policy if exists "lecture moderateurs" on moderateurs_live;
create policy "lecture moderateurs" on moderateurs_live for select using (true);
drop policy if exists "createur gere moderateurs" on moderateurs_live;
create policy "createur gere moderateurs" on moderateurs_live for all
  using (auth.uid() = createur_id or public.est_admin())
  with check (auth.uid() = createur_id or public.est_admin());

-- ---------- 3. Audience réelle (arrivée/départ des spectateurs) ----------
create table if not exists lives_spectateurs (
  id bigint generated always as identity primary key,
  live_id bigint not null references lives(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  arrive_a timestamptz not null default now(),
  depart_a timestamptz,
  unique (live_id, user_id),
  created_at timestamptz not null default now()
);
alter table lives_spectateurs enable row level security;
drop policy if exists "marquer sa presence" on lives_spectateurs;
create policy "marquer sa presence" on lives_spectateurs
  for insert with check (auth.uid() = user_id);
drop policy if exists "quitter le live" on lives_spectateurs;
create policy "quitter le live" on lives_spectateurs
  for update using (auth.uid() = user_id);
drop policy if exists "lire audience live" on lives_spectateurs;
create policy "lire audience live" on lives_spectateurs for select
  using (public.est_admin() or user_id = auth.uid() or exists (
    select 1 from lives l where l.id = live_id and l.createur_id = auth.uid()));

-- ---------- 4. Slides (photos de présentation, Phase 6) ----------
create table if not exists slides_live (
  id bigint generated always as identity primary key,
  live_id bigint not null references lives(id) on delete cascade,
  titre text,
  image_url text not null,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);
alter table slides_live enable row level security;
drop policy if exists "lire slides" on slides_live;
create policy "lire slides" on slides_live for select using (true);
drop policy if exists "gerer slides" on slides_live;
create policy "gerer slides" on slides_live for all
  using (public.est_admin() or exists (
    select 1 from lives l where l.id = live_id and l.createur_id = auth.uid()))
  with check (public.est_admin() or exists (
    select 1 from lives l where l.id = live_id and l.createur_id = auth.uid()));

-- ---------- 5. Invitations (rejoindre l'antenne) ----------
create table if not exists invitations_live (
  id bigint generated always as identity primary key,
  live_id bigint not null references lives(id) on delete cascade,
  invite_id uuid not null references profiles(id) on delete cascade,
  statut text not null default 'envoyee'
    check (statut in ('envoyee', 'acceptee', 'refusee', 'annulee')),
  created_at timestamptz not null default now(),
  unique (live_id, invite_id)
);
alter table invitations_live enable row level security;
drop policy if exists "voir invitations" on invitations_live;
create policy "voir invitations" on invitations_live for select
  using (public.est_admin() or invite_id = auth.uid() or exists (
    select 1 from lives l where l.id = live_id and l.createur_id = auth.uid()));
drop policy if exists "inviter" on invitations_live;
create policy "inviter" on invitations_live for insert
  with check (exists (
    select 1 from lives l
    where l.id = live_id
      and l.createur_id = auth.uid()
      and l.statut = 'en_direct'));
drop policy if exists "repondre invitation" on invitations_live;
create policy "repondre invitation" on invitations_live for update
  using (invite_id = auth.uid() or public.est_admin() or exists (
    select 1 from lives l where l.id = live_id and l.createur_id = auth.uid()));

-- ---------- 6. Policies lives corrigées ----------
-- Création réservée aux créateurs validés (ou admins) : on retire
-- l'ancienne policy INSERT ouverte à tout utilisateur connecté.
do $$ declare r record; begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'lives' and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on lives', r.policyname);
  end loop;
end $$;
create policy "creer un live" on lives for insert with check (
  auth.uid() = createur_id
  and exists (
    select 1 from profiles
    where id = auth.uid() and role in ('createur', 'admin')
  )
);

-- ---------- 7. Chat : réservé aux directs en cours, modération ----------
drop policy if exists "envoyer message" on messages_live;
create policy "envoyer message" on messages_live for insert
  with check (
    auth.uid() = user_id
    and not suspendu_check()
    and exists (select 1 from lives where id = live_id and statut = 'en_direct')
  );
drop policy if exists "moderer messages" on messages_live;
create policy "moderer messages" on messages_live for update
  using (
    public.est_admin()
    or exists (
      select 1 from lives l
      join moderateurs_live m on m.createur_id = l.createur_id
      where l.id = live_id and m.utilisateur_id = auth.uid()
    )
  );

-- ---------- 8. RPC : suppression de message (créateur / modérateur / admin) ----------
create or replace function public.supprimer_message_live(p_message_id bigint)
returns void language plpgsql security definer as $$
begin
  update messages_live
    set supprime = true
    where id = p_message_id
      and (
        user_id = auth.uid()
        or public.est_admin()
        or exists (
          select 1
          from messages_live msg
          join lives l on l.id = msg.live_id
          join moderateurs_live m on m.createur_id = l.createur_id
          where msg.id = p_message_id and m.utilisateur_id = auth.uid()
        )
      );
end;
$$;
grant execute on function public.supprimer_message_live(bigint) to authenticated;

-- ---------- 9. RPC : notifier le démarrage du direct ----------
create or replace function public.notifier_live_en_direct(p_live_id bigint)
returns void language plpgsql security definer as $$
declare
  v_createur uuid;
  v_titre text;
begin
  select l.createur_id, l.titre into v_createur, v_titre
    from lives l where id = p_live_id;
  if not found or v_createur <> auth.uid() then return; end if;

  -- Notifie les invités qui ont accepté + les modérateurs du créateur
  insert into notifications (user_id, titre, corps)
  select i.invite_id, 'Un direct démarre',
         v_titre || ' — le créateur t''a invité sur l''antenne.'
  from invitations_live i
  where i.live_id = p_live_id and i.statut = 'acceptee';

  insert into notifications (user_id, titre, corps)
  select m.utilisateur_id, 'Un direct démarre',
         v_titre || ' — tu es modérateur de ce direct.'
  from moderateurs_live m
  where m.createur_id = v_createur;
end; $$;
grant execute on function public.notifier_live_en_direct(bigint) to authenticated;

-- ---------- 10. Cadeaux : uniquement sur un direct en cours ----------
create or replace function public.envoyer_cadeau(p_live_id bigint, p_cadeau_id bigint)
returns void language plpgsql security definer as $$
declare
  v_cadeau cadeaux%rowtype;
  v_createur uuid;
  v_statut  text;
begin
  select * into v_cadeau from cadeaux where id = p_cadeau_id and actif;
  if not found then raise exception 'Cadeau indisponible'; end if;

  select createur_id, statut into v_createur, v_statut
    from lives where id = p_live_id;
  if not found then raise exception 'Live introuvable'; end if;
  if v_statut <> 'en_direct' then
    raise exception 'Ce direct n''est pas en cours';
  end if;

  update profiles
    set solde_tokens = solde_tokens - v_cadeau.cout_tokens
    where id = auth.uid() and solde_tokens >= v_cadeau.cout_tokens;
  if not found then raise exception 'Solde de tokens insuffisant'; end if;

  insert into cadeaux_envoyes (live_id, expediteur_id, createur_id, cadeau_id)
  values (p_live_id, auth.uid(), v_createur, p_cadeau_id);

  update profiles
    set solde_revenus = solde_revenus + floor(v_cadeau.cout_tokens * 5 * 0.7)
    where id = v_createur;
end; $$;

-- ---------- 11. Publication realtime (le chat et les statuts doivent recevoir les événements) ----------
do $$ begin
  alter publication supabase_realtime add table messages_live;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table lives;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table slides_live;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table invitations_live;
exception when duplicate_object then null; end $$;

-- ---------- 12. Index manquants + intégrité ----------
create index if not exists idx_messages_live_live on messages_live (live_id);
create index if not exists idx_cadeaux_envoyes_live on cadeaux_envoyes (live_id);
create index if not exists idx_lives_spectateurs_live on lives_spectateurs (live_id);

do $$ begin
  alter table cadeaux_envoyes
    add constraint fk_cadeaux_envoyes_live
    foreign key (live_id) references lives(id) on delete cascade;
exception when duplicate_object then null;
       when others then
         -- orphelins éventuels : à nettoyer manuellement si ce bloc échoue
         null;
end $$;