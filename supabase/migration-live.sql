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
alter table lives add column if not exists en_pause boolean not null default false;

alter table lives drop constraint if exists lives_statut_check;
alter table lives add constraint lives_statut_check
  check (statut in ('programme', 'en_direct', 'termine', 'annule'));

-- ---------- 2. Modérateurs choisis par le créateur (avec acceptation) ----------
-- statut : en_attente → la personne doit accepter avant de modérer
create table if not exists moderateurs_live (
  id bigint generated always as identity primary key,
  createur_id uuid not null references profiles(id) on delete cascade,
  utilisateur_id uuid not null references profiles(id) on delete cascade,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'acceptee', 'refusee')),
  created_at timestamptz not null default now(),
  unique (createur_id, utilisateur_id),
  check (createur_id <> utilisateur_id)
);
-- Migration de la table si elle existait déjà sans la colonne statut
alter table moderateurs_live add column if not exists statut text not null default 'en_attente';
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
      where l.id = live_id
        and m.utilisateur_id = auth.uid()
        and m.statut = 'acceptee'
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
          where msg.id = p_message_id
            and m.utilisateur_id = auth.uid()
            and m.statut = 'acceptee'
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

-- ---------- 9b. RPC : proposer une modération (l'invité doit accepter) ----------
-- Le créateur propose → la personne reçoit une notification + une demande
-- en attente ; elle doit accepter avant d'avoir le pouvoir de modération.
create or replace function public.proposer_moderateur(p_pseudo text)
returns text language plpgsql security definer as $$
declare
  v_cible profiles%rowtype;
  v_existant bigint;
begin
  select * into v_cible from profiles where lower(pseudo) = lower(p_pseudo);
  if not found then return 'Pseudo introuvable.'; end if;
  if v_cible.id = auth.uid() then return 'Vous êtes déjà créateur de vos directs.'; end if;
  if v_cible.suspendu then return 'Ce compte est suspendu.'; end if;

  -- Une seule demande active par binôme
  select count(*) into v_existant
    from moderateurs_live
    where createur_id = auth.uid() and utilisateur_id = v_cible.id;
  if v_existant > 0 then return 'Cette personne est déjà modérateur (ou a une demande en cours).'; end if;

  insert into moderateurs_live (createur_id, utilisateur_id, statut)
  values (auth.uid(), v_cible.id, 'en_attente');

  insert into notifications (user_id, titre, corps)
  values (
    v_cible.id,
    'Invitation modérateur',
    'Un créateur te propose de modérer ses directs. Réponds depuis ton Studio ou la page Notifications.'
  );
  return null;
end; $$;
grant execute on function public.proposer_moderateur(text) to authenticated;

-- ---------- 9d. RPC : supprimer un live passé (créateur ou admin) ----------
-- Supprime le live + en cascade : messages, cadeaux, audience, slides,
-- invitations (FK ON DELETE CASCADE). Interdit de supprimer un direct en cours
-- (il faut d'abord l'arrêter) — évite les suppressions accidentelles de contenu.
create or replace function public.supprimer_live(p_live_id bigint)
returns text language plpgsql security definer as $$
declare v_live lives%rowtype;
begin
  select * into v_live from lives where id = p_live_id;
  if not found then return 'Live introuvable.'; end if;
  if v_live.createur_id <> auth.uid() and not public.est_admin() then
    return 'Seul le créateur peut supprimer ce live.';
  end if;
  if v_live.statut = 'en_direct' then
    return 'Arrête d''abord le direct avant de le supprimer.';
  end if;

  delete from lives where id = p_live_id; -- cascade vers les tables liées
  return null;
end; $$;
grant execute on function public.supprimer_live(bigint) to authenticated;

-- Policy DELETE : le créateur (ou l'admin) peut supprimer ses lives
drop policy if exists "supprimer ses lives" on lives;
create policy "supprimer ses lives" on lives for delete
  using (auth.uid() = createur_id or public.est_admin());

-- ---------- 9e. RPC : répondre à une invitation modérateur ----------
create or replace function public.repondre_moderateur(p_moderateur_id bigint, p_accepter boolean)
returns text language plpgsql security definer as $$
declare v_m moderateurs_live%rowtype;
begin
  select * into v_m from moderateurs_live where id = p_moderateur_id;
  if not found then return 'Invitation introuvable.'; end if;
  if v_m.utilisateur_id <> auth.uid() then return 'Seul le destinataire peut répondre.'; end if;
  if v_m.statut <> 'en_attente' then return 'Invitation déjà traitée.'; end if;

  update moderateurs_live
    set statut = case when p_accepter then 'acceptee' else 'refusee' end
    where id = p_moderateur_id;

  insert into notifications (user_id, titre, corps)
  values (
    v_m.createur_id,
    case when p_accepter then 'Modération acceptée' else 'Modération refusée' end,
    case when p_accepter
      then 'Ta proposition de modération a été acceptée. La personne t''aidera sur tes directs.'
      else 'Ta proposition de modération a été refusée.' end
  );
  return null;
end; $$;
grant execute on function public.repondre_moderateur(bigint, boolean) to authenticated;

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

-- ---------- 13. Enregistrements des directs (les rediffusions) ----------
-- L'enregistrement fait pendant le direct EST la rediffusion : pas de
-- publication manuelle. Le créateur ouvre, télécharge ou supprime.
create table if not exists lives_enregistrements (
  id bigint generated always as identity primary key,
  live_id bigint not null references lives(id) on delete cascade,
  createur_id uuid not null references profiles(id) on delete cascade,
  chemin text not null,
  duree_secondes integer not null default 0,
  taille_octets bigint not null default 0,
  created_at timestamptz not null default now()
);
alter table lives_enregistrements enable row level security;
drop policy if exists "lecture enregistrements" on lives_enregistrements;
create policy "lecture enregistrements" on lives_enregistrements for select using (true);
drop policy if exists "createur gere ses enregistrements" on lives_enregistrements;
create policy "createur gere ses enregistrements" on lives_enregistrements for all
  using (auth.uid() = createur_id or public.est_admin())
  with check (auth.uid() = createur_id or public.est_admin());
create index if not exists idx_lives_enregistrements_live on lives_enregistrements (live_id);
create index if not exists idx_messages_live_live on messages_live (live_id);
create index if not exists idx_cadeaux_envoyes_live on cadeaux_envoyes (live_id);
create index if not exists idx_lives_spectateurs_live on lives_spectateurs (live_id);

-- FK cadeaux_envoyes → lives (cascade) : on purge d'abord les éventuels
-- orphelins (lives déjà supprimés) qui empêcheraient la création de la contrainte,
-- puis on la crée. Le bloc est tolérant : si la FK existe déjà, rien ne se passe.
do $$ begin
  delete from cadeaux_envoyes ce
    where ce.live_id is not null
      and not exists (select 1 from lives l where l.id = ce.live_id);
end $$;

do $$ begin
  alter table cadeaux_envoyes
    add constraint fk_cadeaux_envoyes_live
    foreign key (live_id) references lives(id) on delete cascade;
exception when duplicate_object then null;
end $$;