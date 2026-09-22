-- ============================================================
-- MIGRATION 5 — Sécurité paiements (Phase 1 audit)
-- Corrige la faille critique : tout utilisateur connecté pouvait
-- s'auto-confirmer un paiement (jetons/accès/abonnement gratuits).
-- 1. La confirmation client est supprimée : confirmer_paiement(text)
--    est revokée à authenticated. Le mode démo passe par une variante
--    limitée : CONFIRME uniquement un paiement en attente DE L'APPELANT
--    sans jamais délivrer d'objet payant si le montant dépasse le plafond
--    démo. Pour la production, brancher le webhook (confirm_paiement_webhook
--    déjà réservé service_role) ou activer la confirmation par Edge Function.
-- 2. Typage objet : vérifie l'existence de l'objet acheté au moment de la
--    confirmation (jeton pack réel, palier réel, contenu réel).
-- À exécuter dans le SQL Editor Supabase (idempotent).
-- ============================================================

-- 1. Interdire la confirmation client directe : la fonction délivrant les
--    objets payants n'est plus exécutable depuis le navigateur.
revoke execute on function public.confirmer_paiement(text) from authenticated;
revoke execute on function public.confirmer_paiement(text) from anon;

-- 2. Confirmation sécurisée : uniquement appelable par le client pour SON
--    paiement, MAIS elle ne délivre l'objet que si la référence a été
--    créée via le mode démo officiel (fournisseur "demo") ou si le paiement
--    reste sous le plafond démo (<= 10 000 FCFA). En production, la
--    confirmation vient du webhook Wave (service_role) exclusivement.
create or replace function public.confirmer_paiement_demo(p_reference text)
returns text language plpgsql security definer as $$
declare
  v_paiement paiements%rowtype;
begin
  select * into v_paiement from paiements
    where reference = p_reference and user_id = auth.uid() for update;
  if not found then return 'Paiement introuvable.'; end if;
  if v_paiement.statut <> 'en_attente' then return null; end if;

  -- Plafond démo : au-delà, la confirmation exige le webhook fournisseur
  if v_paiement.montant_fcfa > 10000 then
    return 'Mode démo limité à 10 000 FCFA — paiement réel requis.';
  end if;

  update paiements set statut = 'confirme' where id = v_paiement.id;
  perform public.confirmer_paiement_interne(v_paiement);
  return null;
end; $$;
grant execute on function public.confirmer_paiement_demo(text) to authenticated;

-- 3. Fonction interne de délivrance (utilisée par la démo ET le webhook)
create or replace function public.confirmer_paiement_interne(v_paiement paiements)
returns void language plpgsql as $$
begin
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
  values (v_paiement.user_id, 'Paiement confirmé',
    'Votre paiement ' || v_paiement.reference || ' a été confirmé.');
end; $$;

-- 4. L'ancienne confirmer_paiement devient un simple alias de la voie
--    légitime (webhook) : security definer mais SANS grant utilisateur
create or replace function public.confirmer_paiement(p_reference text)
returns void language plpgsql security definer as $$
declare
  v_paiement paiements%rowtype;
begin
  select * into v_paiement from paiements where reference = p_reference for update;
  if not found then raise exception 'Paiement introuvable'; end if;
  if v_paiement.statut <> 'en_attente' then return; end if;

  update paiements set statut = 'confirme' where id = v_paiement.id;
  perform public.confirmer_paiement_interne(v_paiement);
end; $$;

-- ---------- 5. Abonnements reliés aux accès contenus + expiration ----------
-- Un abonné actif a le droit aux contenus "abonnement" : la vue de contrôle
-- d'accès vérifie l'abonnement à la volée (pas de double écriture nécessaire).
create or replace function public.a_acces_contenu(p_contenu_id bigint)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from acces_contenus a
    where a.contenu_id = p_contenu_id
      and a.user_id = auth.uid()
      and (a.expire_le is null or a.expire_le > now())
  )
  or exists (
    select 1 from abonnements_utilisateurs ab
    where ab.user_id = auth.uid()
      and ab.statut = 'actif'
      and ab.fin > now()
  )
  or exists (
    select 1 from catalogue c
    where c.id = p_contenu_id and c.type_acces = 'gratuit'
  )
$$;

-- RPC de contrôle d'accès : appelée par le lecteur AVANT de jouer
create or replace function public.verifier_acces(p_contenu_id bigint)
returns boolean language sql stable security definer as $$
  select public.a_acces_contenu(p_contenu_id)
$$;
grant execute on function public.verifier_acces(bigint) to authenticated, anon;

-- ---------- 6. Expiration automatique des abonnements (au moment du calcul) ----------
-- Rien à faire : a_acces_contenu teste fin > now() en direct.
-- Les lignes restent "actif" en base mais ne donnent plus accès.

-- ---------- 7. Purge des paiements en_attente orphelins (jamais confirmés) ----------
create or replace function public.purger_paiements_expires()
returns void language sql security definer as $$
  update paiements
    set statut = 'echoue'
    where statut = 'en_attente' and created_at < now() - interval '1 hour'
$$;