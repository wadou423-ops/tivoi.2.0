-- ============================================================
-- TiVoi 2.0 — Schéma complet Supabase
-- À exécuter dans le SQL Editor de Supabase (idempotent)
-- ============================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text unique,
  nom text,
  prenom text,
  role text not null default 'utilisateur' check (role in ('utilisateur','createur','admin')),
  statut_createur text not null default 'aucun' check (statut_createur in ('aucun','en_attente','valide','rejete')),
  solde_tokens integer not null default 0 check (solde_tokens >= 0),
  solde_revenus integer not null default 0 check (solde_revenus >= 0),
  suspendu boolean not null default false,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- profil créé automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nom, prenom)
  values (new.id, new.raw_user_meta_data->>'nom', new.raw_user_meta_data->>'prenom')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- CATALOGUE ----------
create table if not exists catalogue (
  id bigint generated always as identity primary key,
  titre text not null,
  description text,
  categorie text,
  acteurs text,
  duree_minutes integer,
  annee integer,
  image_url text,
  bande_annonce_url text,
  type_acces text not null default 'gratuit' check (type_acces in ('gratuit','seance','abonnement')),
  prix_fcfa integer not null default 0,
  note numeric(2,1),
  badge text,
  actif boolean not null default true,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);
alter table catalogue enable row level security;

-- ---------- MISE EN AVANT (carrousel) ----------
create table if not exists a_une (
  id bigint generated always as identity primary key,
  contenu_id bigint references catalogue(id) on delete cascade,
  titre text,
  accroche text,
  image_url text,
  ordre integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table a_une enable row level security;

-- ---------- ABONNEMENTS ----------
create table if not exists abonnements_paliers (
  code text primary key,
  nom text not null,
  prix_fcfa integer not null,
  avantages text,
  ordre integer not null default 0
);
alter table abonnements_paliers enable row level security;

create table if not exists abonnements_utilisateurs (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  palier text not null references abonnements_paliers(code),
  debut timestamptz not null default now(),
  fin timestamptz not null,
  statut text not null default 'actif' check (statut in ('actif','expire')),
  created_at timestamptz not null default now()
);
alter table abonnements_utilisateurs enable row level security;

-- ---------- ACCÈS AUX CONTENUS ----------
create table if not exists acces_contenus (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  contenu_id bigint not null references catalogue(id) on delete cascade,
  source text not null default 'achat' check (source in ('achat','abonnement','gratuit')),
  expire_le timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, contenu_id)
);
alter table acces_contenus enable row level security;

-- ---------- PAIEMENTS ----------
create table if not exists paiements (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  fournisseur text not null,
  montant_fcfa integer not null,
  reference text not null unique,
  statut text not null default 'en_attente' check (statut in ('en_attente','confirme','echoue')),
  objet_type text not null check (objet_type in ('achat','abonnement','tokens')),
  objet_id text,
  created_at timestamptz not null default now()
);
alter table paiements enable row level security;

-- ---------- TOKENS & CADEAUX ----------
create table if not exists packs_tokens (
  id bigint generated always as identity primary key,
  nom text not null,
  tokens integer not null,
  prix_fcfa integer not null,
  actif boolean not null default true
);
alter table packs_tokens enable row level security;

create table if not exists cadeaux (
  id bigint generated always as identity primary key,
  nom text not null,
  emoji text not null,
  cout_tokens integer not null,
  actif boolean not null default true
);
alter table cadeaux enable row level security;

create table if not exists cadeaux_envoyes (
  id bigint generated always as identity primary key,
  live_id bigint,
  expediteur_id uuid not null references profiles(id) on delete cascade,
  createur_id uuid not null references profiles(id) on delete cascade,
  cadeau_id bigint not null references cadeaux(id),
  created_at timestamptz not null default now()
);
alter table cadeaux_envoyes enable row level security;

-- ---------- LIVES ----------
create table if not exists lives (
  id bigint generated always as identity primary key,
  createur_id uuid not null references profiles(id) on delete cascade,
  titre text not null,
  description text,
  statut text not null default 'programme' check (statut in ('programme','en_direct','termine')),
  cle_stream text not null unique default encode(gen_random_bytes(12), 'hex'),
  url_lecture text,
  programme_a timestamptz,
  created_at timestamptz not null default now()
);
alter table lives enable row level security;

create table if not exists messages_live (
  id bigint generated always as identity primary key,
  live_id bigint not null references lives(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  pseudo text,
  texte text not null,
  supprime boolean not null default false,
  created_at timestamptz not null default now()
);
alter table messages_live enable row level security;

-- ---------- RETRAITS ----------
create table if not exists retraits (
  id bigint generated always as identity primary key,
  createur_id uuid not null references profiles(id) on delete cascade,
  montant_fcfa integer not null check (montant_fcfa > 0),
  statut text not null default 'en_attente' check (statut in ('en_attente','approuve','rejete')),
  created_at timestamptz not null default now()
);
alter table retraits enable row level security;

-- ---------- CHAÎNES TV ----------
create table if not exists chaines (
  id bigint generated always as identity primary key,
  nom text not null,
  type text not null default 'youtube' check (type in ('youtube','hls')),
  url text not null,
  logo_url text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table chaines enable row level security;

create table if not exists epg (
  id bigint generated always as identity primary key,
  chaine_id bigint not null references chaines(id) on delete cascade,
  titre text not null,
  description text,
  debut timestamptz not null,
  fin timestamptz not null
);
alter table epg enable row level security;

create table if not exists spots (
  id bigint generated always as identity primary key,
  titre text not null,
  annonceur text,
  video_url text not null,
  duree_secondes integer not null default 15,
  actif boolean not null default true
);
alter table spots enable row level security;

create table if not exists coupures (
  id bigint generated always as identity primary key,
  chaine_id bigint not null references chaines(id) on delete cascade,
  spot_id bigint references spots(id) on delete set null,
  heure time not null,
  recurrence_minutes integer,
  actif boolean not null default true
);
alter table coupures enable row level security;

-- ---------- BANNIÈRES ----------
create table if not exists bannieres (
  id bigint generated always as identity primary key,
  emplacement text not null check (emplacement in ('accueil_h1','accueil_h2','portefeuille_h','live_v','chaines_v')),
  titre text,
  annonceur text,
  image_url text not null,
  lien text,
  actif boolean not null default true,
  impressions integer not null default 0,
  clics integer not null default 0,
  created_at timestamptz not null default now()
);
alter table bannieres enable row level security;

-- ---------- NOTIFICATIONS ----------
create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  titre text not null,
  corps text,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;

-- ---------- COMMENTAIRES & NOTES ----------
create table if not exists commentaires (
  id bigint generated always as identity primary key,
  contenu_id bigint not null references catalogue(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  pseudo text,
  texte text not null,
  created_at timestamptz not null default now()
);
alter table commentaires enable row level security;

create table if not exists notes (
  id bigint generated always as identity primary key,
  contenu_id bigint not null references catalogue(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  note integer not null check (note between 1 and 5),
  unique (contenu_id, user_id)
);
alter table notes enable row level security;

-- ---------- APPAREILS (Smart TV / VTC) ----------
create table if not exists appareils (
  id bigint generated always as identity primary key,
  code_activation text not null unique,
  type text not null default 'tv' check (type in ('tv','vtc')),
  nom text,
  profil_qualite text not null default 'hd' check (profil_qualite in ('sd','hd','fullhd','ultrahd')),
  appaire boolean not null default false,
  proprietaire_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table appareils enable row level security;

-- ---------- PLAYLIST VTC (kiosque) ----------
create table if not exists playlist_vtc (
  id bigint generated always as identity primary key,
  titre text not null,
  type text not null default 'contenu' check (type in ('contenu','publicite')),
  media_url text not null,
  duree_secondes integer not null default 8,
  ordre integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table playlist_vtc enable row level security;

drop policy if exists "lecture playlist vtc" on playlist_vtc;
create policy "lecture playlist vtc" on playlist_vtc for select using (true);

drop policy if exists "admin playlist vtc" on playlist_vtc;
create policy "admin playlist vtc" on playlist_vtc for all
  using (public.est_admin()) with check (public.est_admin());

-- ============================================================
-- RLS : POLITIQUES
-- ============================================================

-- Helper : est admin ?
create or replace function public.est_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and not suspendu);
$$;

-- Helper : utilisateur non suspendu ?
create or replace function public.suspendu_check()
returns boolean language sql stable security definer as $$
  select coalesce((select suspendu from public.profiles where id = auth.uid()), false);
$$;

-- profiles
drop policy if exists "lecture publique profiles" on profiles;
create policy "lecture publique profiles" on profiles for select using (true);
drop policy if exists "maj son profil" on profiles;
create policy "maj son profil" on profiles for update using (auth.uid() = id);

-- catalogue / a_une / paliers / packs / cadeaux : lecture publique, admin écrit
drop policy if exists "lecture publique catalogue" on catalogue;
create policy "lecture publique catalogue" on catalogue for select using (true);
drop policy if exists "admin catalogue" on catalogue;
create policy "admin catalogue" on catalogue for all using (public.est_admin()) with check (public.est_admin());

drop policy if exists "lecture publique a_une" on a_une;
create policy "lecture publique a_une" on a_une for select using (true);
drop policy if exists "admin a_une" on a_une;
create policy "admin a_une" on a_une for all using (public.est_admin()) with check (public.est_admin());

drop policy if exists "lecture publique paliers" on abonnements_paliers;
create policy "lecture publique paliers" on abonnements_paliers for select using (true);
drop policy if exists "admin paliers" on abonnements_paliers;
create policy "admin paliers" on abonnements_paliers for all using (public.est_admin()) with check (public.est_admin());

drop policy if exists "lecture publique packs" on packs_tokens;
create policy "lecture publique packs" on packs_tokens for select using (true);
drop policy if exists "admin packs" on packs_tokens;
create policy "admin packs" on packs_tokens for all using (public.est_admin()) with check (public.est_admin());

drop policy if exists "lecture publique cadeaux" on cadeaux;
create policy "lecture publique cadeaux" on cadeaux for select using (true);
drop policy if exists "admin cadeaux" on cadeaux;
create policy "admin cadeaux" on cadeaux for all using (public.est_admin()) with check (public.est_admin());

-- abonnements utilisateur
drop policy if exists "lire ses abonnements" on abonnements_utilisateurs;
create policy "lire ses abonnements" on abonnements_utilisateurs for select using (auth.uid() = user_id or public.est_admin());

-- accès contenus
drop policy if exists "lire ses accès" on acces_contenus;
create policy "lire ses accès" on acces_contenus for select using (auth.uid() = user_id or public.est_admin());

-- paiements
drop policy if exists "lire ses paiements" on paiements;
create policy "lire ses paiements" on paiements for select using (auth.uid() = user_id or public.est_admin());
drop policy if exists "créer son paiement" on paiements;
create policy "créer son paiement" on paiements for insert with check (auth.uid() = user_id);

-- cadeaux envoyés : lecture publique (compteurs), création via RPC
drop policy if exists "lecture cadeaux_envoyes" on cadeaux_envoyes;
create policy "lecture cadeaux_envoyes" on cadeaux_envoyes for select using (true);

-- lives
drop policy if exists "lecture publique lives" on lives;
create policy "lecture publique lives" on lives for select using (true);
drop policy if exists "créer ses lives" on lives;
create policy "créer ses lives" on lives for insert with check (auth.uid() = createur_id);
drop policy if exists "maj ses lives" on lives;
create policy "maj ses lives" on lives for update using (auth.uid() = createur_id or public.est_admin());

-- messages live
drop policy if exists "lecture messages" on messages_live;
create policy "lecture messages" on messages_live for select using (true);
drop policy if exists "envoyer message" on messages_live;
create policy "envoyer message" on messages_live for insert with check (auth.uid() = user_id and not suspendu_check());

-- retraits
drop policy if exists "lire retraits admin" on retraits;
create policy "lire retraits admin" on retraits for select using (auth.uid() = createur_id or public.est_admin());

-- chaînes / epg / spots / coupures
drop policy if exists "lecture chaines" on chaines;
create policy "lecture chaines" on chaines for select using (true);
drop policy if exists "admin chaines" on chaines;
create policy "admin chaines" on chaines for all using (public.est_admin()) with check (public.est_admin());

drop policy if exists "lecture epg" on epg;
create policy "lecture epg" on epg for select using (true);
drop policy if exists "admin epg" on epg;
create policy "admin epg" on epg for all using (public.est_admin()) with check (public.est_admin());

drop policy if exists "lecture spots" on spots;
create policy "lecture spots" on spots for select using (true);
drop policy if exists "admin spots" on spots;
create policy "admin spots" on spots for all using (public.est_admin()) with check (public.est_admin());

drop policy if exists "lecture coupures" on coupures;
create policy "lecture coupures" on coupures for select using (true);
drop policy if exists "admin coupures" on coupures;
create policy "admin coupures" on coupures for all using (public.est_admin()) with check (public.est_admin());

-- bannières : lecture publique + incréments via RPC, admin écrit
drop policy if exists "lecture bannieres" on bannieres;
create policy "lecture bannieres" on bannieres for select using (true);
drop policy if exists "admin bannieres" on bannieres;
create policy "admin bannieres" on bannieres for all using (public.est_admin()) with check (public.est_admin());

-- notifications
drop policy if exists "lire ses notifs" on notifications;
create policy "lire ses notifs" on notifications for select using (auth.uid() = user_id);
drop policy if exists "maj ses notifs" on notifications;
create policy "maj ses notifs" on notifications for update using (auth.uid() = user_id);

-- commentaires
drop policy if exists "lecture commentaires" on commentaires;
create policy "lecture commentaires" on commentaires for select using (true);
drop policy if exists "écrire commentaire" on commentaires;
create policy "écrire commentaire" on commentaires for insert with check (auth.uid() = user_id);

-- notes
drop policy if exists "lecture notes" on notes;
create policy "lecture notes" on notes for select using (true);
drop policy if exists "noter contenu" on notes;
create policy "noter contenu" on notes for insert with check (auth.uid() = user_id);
drop policy if exists "changer note" on notes;
create policy "changer note" on notes for update using (auth.uid() = user_id);

-- appareils : lecture par code (public), admin complet
drop policy if exists "lecture appareils" on appareils;
create policy "lecture appareils" on appareils for select using (true);
drop policy if exists "admin appareils" on appareils;
create policy "admin appareils" on appareils for all using (public.est_admin()) with check (public.est_admin());
drop policy if exists "creer appareil" on appareils;
create policy "creer appareil" on appareils for insert with check (true);

-- ============================================================
-- FONCTIONS MÉTIER (RPC, SECURITY DEFINER)
-- ============================================================

-- Confirme un paiement (simulation webhook) et délivre l'objet
create or replace function public.confirmer_paiement(p_reference text)
returns void language plpgsql security definer as $$
declare
  v_paiement paiements%rowtype;
begin
  select * into v_paiement from paiements where reference = p_reference and user_id = auth.uid()
    for update;
  if not found then raise exception 'Paiement introuvable'; end if;
  if v_paiement.statut <> 'en_attente' then return; end if;

  update paiements set statut = 'confirme' where id = v_paiement.id;

  if v_paiement.objet_type = 'achat' then
    insert into acces_contenus (user_id, contenu_id, source)
    values (v_paiement.user_id, v_paiement.objet_id::bigint, 'achat')
    on conflict (user_id, contenu_id) do nothing;
  elsif v_paiement.objet_type = 'tokens' then
    update profiles
      set solde_tokens = solde_tokens + v_paiement.montant_fcfa / 5
      where id = v_paiement.user_id;
  elsif v_paiement.objet_type = 'abonnement' then
    insert into abonnements_utilisateurs (user_id, palier, fin, statut)
    values (v_paiement.user_id, v_paiement.objet_id, now() + interval '30 days', 'actif');
  end if;

  insert into notifications (user_id, titre, corps)
  values (v_paiement.user_id, 'Paiement confirmé', 'Votre paiement ' || p_reference || ' a été confirmé.');
end;
$$;

-- Envoyer un cadeau pendant un live (débit + crédit 70%)
create or replace function public.envoyer_cadeau(p_live_id bigint, p_cadeau_id bigint)
returns void language plpgsql security definer as $$
declare
  v_cadeau cadeaux%rowtype;
  v_createur uuid;
begin
  select * into v_cadeau from cadeaux where id = p_cadeau_id and actif;
  if not found then raise exception 'Cadeau indisponible'; end if;

  select createur_id into v_createur from lives where id = p_live_id;
  if not found then raise exception 'Live introuvable'; end if;

  update profiles
    set solde_tokens = solde_tokens - v_cadeau.cout_tokens
    where id = auth.uid() and solde_tokens >= v_cadeau.cout_tokens;
  if not found then raise exception 'Solde de tokens insuffisant'; end if;

  insert into cadeaux_envoyes (live_id, expediteur_id, createur_id, cadeau_id)
  values (p_live_id, auth.uid(), v_createur, p_cadeau_id);

  update profiles
    set solde_revenus = solde_revenus + floor(v_cadeau.cout_tokens * 5 * 0.7)
    where id = v_createur;
end;
$$;

-- Compteurs bannières
create or replace function public.banniere_impression(p_id bigint)
returns void language sql security definer as $$
  update bannieres set impressions = impressions + 1 where id = p_id;
$$;

create or replace function public.banniere_clic(p_id bigint)
returns void language sql security definer as $$
  update bannieres set clics = clics + 1 where id = p_id;
$$;

-- Demande de retrait créateur
create or replace function public.demander_retrait(p_montant integer)
returns void language plpgsql security definer as $$
declare v_solde integer;
begin
  select solde_revenus into v_solde from profiles where id = auth.uid();
  if v_solde < p_montant then raise exception 'Montant supérieur au solde'; end if;
  insert into retraits (createur_id, montant_fcfa) values (auth.uid(), p_montant);
  update profiles set solde_revenus = solde_revenus - p_montant where id = auth.uid();
end;
$$;

-- ============================================================
-- SEED
-- ============================================================
insert into abonnements_paliers (code, nom, prix_fcfa, avantages, ordre) values
  ('basic', 'Basic', 2000, 'Catalogue de base, qualité HD, 1 appareil', 1),
  ('premium', 'Premium', 5000, 'Tout le catalogue, Full HD, 2 appareils, lives', 2),
  ('vip', 'VIP', 10000, 'Tout le catalogue, Ultra HD, 4 appareils, avant-premières', 3)
on conflict (code) do nothing;

insert into packs_tokens (nom, tokens, prix_fcfa, actif) values
  ('Petit pack', 100, 500, true),
  ('Pack populaire', 500, 2500, true),
  ('Gros pack', 2000, 10000, true)
on conflict do nothing;

insert into cadeaux (nom, emoji, cout_tokens, actif) values
  ('Rose', '🌹', 10, true),
  ('Cœur', '💖', 50, true),
  ('Lion', '🦁', 100, true),
  ('Diamant', '💎', 500, true),
  ('Ferrari', '🏎️', 1000, true),
  ('Château', '🏰', 2000, true)
on conflict do nothing;

insert into chaines (nom, type, url, actif) values
  ('France 24', 'youtube', 'https://www.youtube.com/live/Y9LY8GJm8f0', true),
  ('Al Jazeera English', 'youtube', 'https://www.youtube.com/live/Nou0G8z_Rsk', true)
on conflict do nothing;

insert into bannieres (emplacement, titre, annonceur, image_url, lien, actif) values
  ('accueil_h1', 'Espace disponible', null, '', null, false),
  ('accueil_h2', 'Espace disponible', null, '', null, false),
  ('portefeuille_h', 'Espace disponible', null, '', null, false),
  ('live_v', 'Espace disponible', null, '', null, false),
  ('chaines_v', 'Espace disponible', null, '', null, false)
on conflict do nothing;

-- ============================================================
-- GRANTS RPC
-- ============================================================
grant execute on function public.confirmer_paiement(text) to authenticated;
grant execute on function public.envoyer_cadeau(bigint, bigint) to authenticated;
grant execute on function public.banniere_impression(bigint) to anon, authenticated;
grant execute on function public.banniere_clic(bigint) to anon, authenticated;
grant execute on function public.demander_retrait(integer) to authenticated;

-- Onboarding vu une fois par compte
alter table profiles add column if not exists onboarding_vu boolean not null default false;

-- ---------- PERMISSIONS ADMIN ----------
alter table profiles add column if not exists permissions text[] not null
  default '{utilisateurs,createurs,catalogue,a_une,chaines,bannieres,retraits,vtc,administrateurs}';

create or replace function public.definir_permissions(p_user_id uuid, p_permissions text[])
returns void language plpgsql security definer as $$
begin
  if not public.est_admin() then raise exception 'Acces refuse'; end if;
  update profiles set permissions = p_permissions where id = p_user_id and role = 'admin';
end;
$$;

-- ---------- TELEPHONE (inscription + connexion OTP) ----------
alter table profiles add column if not exists telephone text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nom, prenom, telephone)
  values (
    new.id,
    new.raw_user_meta_data->>'nom',
    new.raw_user_meta_data->>'prenom',
    new.raw_user_meta_data->>'telephone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
