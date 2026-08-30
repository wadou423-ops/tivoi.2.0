-- ============================================================
-- TiVoi — Migrations : demandes créateur + stockage média
-- À exécuter une fois dans le SQL Editor Supabase
-- ============================================================

-- ---------- DEMANDES DE CRÉATEUR ----------
create table if not exists demandes_createur (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  nom text not null,
  prenoms text not null,
  numero_cni text not null,
  type_contenu text not null,
  presentation text,
  statut text not null default 'en_attente' check (statut in ('en_attente','valide','rejete')),
  created_at timestamptz not null default now()
);
alter table demandes_createur enable row level security;

drop policy if exists "lire ses demandes" on demandes_createur;
create policy "lire ses demandes" on demandes_createur for select
  using (auth.uid() = user_id or public.est_admin());

drop policy if exists "creer sa demande" on demandes_createur;
create policy "creer sa demande" on demandes_createur for insert
  with check (auth.uid() = user_id);

drop policy if exists "admin demandes" on demandes_createur;
create policy "admin demandes" on demandes_createur for update
  using (public.est_admin()) with check (public.est_admin());

-- ---------- STOCKAGE MÉDIA (bucket public) ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "lecture publique media" on storage.objects;
create policy "lecture publique media" on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "upload authentifie media" on storage.objects;
create policy "upload authentifie media" on storage.objects for insert
  to authenticated with check (bucket_id = 'media');

drop policy if exists "maj authentifiee media" on storage.objects;
create policy "maj authentifiee media" on storage.objects for update
  to authenticated using (bucket_id = 'media');

drop policy if exists "suppression authentifiee media" on storage.objects;
create policy "suppression authentifiee media" on storage.objects for delete
  to authenticated using (bucket_id = 'media');

-- ---------- CONFIRMATION PAIEMENT PAR WEBHOOK (service_role uniquement) ----------
create or replace function public.confirmer_paiement_webhook(p_reference text)
returns void language plpgsql security definer as $$
declare
  v_paiement paiements%rowtype;
begin
  select * into v_paiement from paiements where reference = p_reference for update;
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

revoke execute on function public.confirmer_paiement_webhook(text) from public, anon, authenticated;
grant execute on function public.confirmer_paiement_webhook(text) to service_role;
