-- ============================================================
-- MIGRATION 4 — RPC d'administration (Phase 1 sécurité)
-- Corrige le blocage RLS : l'admin ne pouvait PAS modifier les profils
-- des autres utilisateurs (policy "maj son profil" = soi-même uniquement).
-- Toutes ces fonctions sont security definer + garde est_admin() interne.
-- À exécuter dans le SQL Editor Supabase (idempotent).
-- ============================================================

-- 1. Valider / refuser une demande créateur (met à jour demande + profil + notification, atomique)
create or replace function public.admin_valider_createur(p_demande_id bigint, p_accepter boolean)
returns text language plpgsql security definer as $$
declare
  v_demande demandes_createur%rowtype;
begin
  if not public.est_admin() then
    return 'Accès refusé : réservé aux administrateurs.';
  end if;

  select * into v_demande from demandes_createur where id = p_demande_id;
  if not found then return 'Demande introuvable.'; end if;
  if v_demande.statut <> 'en_attente' then return 'Cette demande a déjà été traitée.'; end if;

  update demandes_createur set statut = case when p_accepter then 'valide' else 'rejete' end
    where id = p_demande_id;

  update profiles
    set role = case when p_accepter then 'createur' else 'utilisateur' end,
        statut_createur = case when p_accepter then 'valide' else 'rejete' end
    where id = v_demande.user_id;

  insert into notifications (user_id, titre, corps)
  values (
    v_demande.user_id,
    case when p_accepter then 'Compte créateur validé' else 'Demande créateur refusée' end,
    case when p_accepter
      then 'Félicitations ! Votre compte créateur est actif. Ouvrez le Studio pour lancer vos lives.'
      else 'Votre demande n''a pas été retenue. Vous pouvez la soumettre à nouveau.' end
  );

  return null; -- null = succès
end; $$;
grant execute on function public.admin_valider_createur(bigint, boolean) to authenticated;

-- 2. Suspendre / réactiver un utilisateur
create or replace function public.admin_basculer_suspension(p_user_id uuid)
returns text language plpgsql security definer as $$
declare v_suspendu boolean;
begin
  if not public.est_admin() then
    return 'Accès refusé : réservé aux administrateurs.';
  end if;
  if p_user_id = auth.uid() then
    return 'Vous ne pouvez pas suspendre votre propre compte.';
  end if;

  select suspendu into v_suspendu from profiles where id = p_user_id;
  if not found then return 'Utilisateur introuvable.'; end if;

  update profiles set suspendu = not v_suspendu where id = p_user_id;
  return null;
end; $$;
grant execute on function public.admin_basculer_suspension(uuid) to authenticated;

-- 3. Approuver un retrait
create or replace function public.admin_approuver_retrait(p_retrait_id bigint)
returns text language plpgsql security definer as $$
declare v_retrait retraits%rowtype;
begin
  if not public.est_admin() then
    return 'Accès refusé : réservé aux administrateurs.';
  end if;

  select * into v_retrait from retraits where id = p_retrait_id;
  if not found then return 'Retrait introuvable.'; end if;
  if v_retrait.statut <> 'en_attente' then return 'Ce retrait a déjà été traité.'; end if;

  update retraits set statut = 'approuve' where id = p_retrait_id;

  insert into notifications (user_id, titre, corps)
  values (
    v_retrait.createur_id,
    'Retrait approuvé',
    'Votre demande de retrait de ' || v_retrait.montant_fcfa::text || ' FCFA a été approuvée.'
  );
  return null;
end; $$;
grant execute on function public.admin_approuver_retrait(bigint) to authenticated;

-- 4. Rejeter un retrait : recrédit atomique du solde créateur (corrige
--    l'ancienne méthode client : demander_retrait(0) + read-modify-write)
create or replace function public.admin_rejeter_retrait(p_retrait_id bigint)
returns text language plpgsql security definer as $$
declare v_retrait retraits%rowtype;
begin
  if not public.est_admin() then
    return 'Accès refusé : réservé aux administrateurs.';
  end if;

  select * into v_retrait from retraits where id = p_retrait_id;
  if not found then return 'Retrait introuvable.'; end if;
  if v_retrait.statut <> 'en_attente' then return 'Ce retrait a déjà été traité.'; end if;

  update retraits set statut = 'rejete' where id = p_retrait_id;

  update profiles
    set solde_revenus = solde_revenus + v_retrait.montant_fcfa
    where id = v_retrait.createur_id;

  insert into notifications (user_id, titre, corps)
  values (
    v_retrait.createur_id,
    'Retrait refusé',
    'Votre demande de retrait de ' || v_retrait.montant_fcfa::text || ' FCFA a été refusée. Le montant a été recrédité.'
  );
  return null;
end; $$;
grant execute on function public.admin_rejeter_retrait(bigint) to authenticated;