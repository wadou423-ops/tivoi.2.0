# TiVoi — Plateforme de streaming premium

Plateforme de streaming pour la Côte d'Ivoire et l'Afrique de l'Ouest : VOD (films, séries), lives de créateurs monétisés (tokens, cadeaux virtuels), chaînes TV en direct et écrans embarqués VTC / Smart TV.

## Stack

- **Frontend** : Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend** : Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Design** : système TiVoi « Premium West African Cinema » — or `#D4AF37` / obsidienne `#131313`, Montserrat + Archivo Narrow

## Installation

```bash
npm install
```

Configurer `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

Puis exécuter dans le **SQL Editor Supabase** :

1. `supabase/schema.sql` — 21 tables, politiques RLS, fonctions métier (RPC), seed de base
2. `supabase/seed-demo.sql` — catalogue de démonstration + carrousel « à la une » (optionnel)

Lancer le serveur :

```bash
npm run dev
```

## Pages

| Route | Description |
|---|---|
| `/bienvenue` | Onboarding 3 slides (une fois par compte) |
| `/` | Accueil premium : carrousel à la une, bento, tendances, bannières |
| `/catalogue` | Catalogue VOD avec filtres par genre |
| `/catalogue/[id]` | Fiche contenu : synopsis, notation, commentaires, achat |
| `/lecteur/[id]` | Lecteur plein écran |
| `/abonnements` | Formules Basic / Premium / VIP |
| `/paiement/[type]/[id]` | Tunnel de paiement multi-fournisseurs (Mobile Money, carte) |
| `/confirmation/[ref]` | Confirmation d'achat |
| `/jetons` · `/portefeuille` | Packs de jetons, solde, historique |
| `/lives` · `/live/[id]` | Lives avec chat temps réel + cadeaux virtuels |
| `/live/programmer` | Programmer un live |
| `/studio` | Dashboard créateur : revenus, graphique, export CSV, retrait |
| `/devenir-createur` | Demande KYC créateur + statut |
| `/guide-tv` | Chaînes en direct + guide des programmes (EPG) |
| `/tv` | Écran Smart TV (code d'appairage 6 chiffres) |
| `/recherche` · `/notifications` · `/profil` · `/parametres` | Compte |
| `/admin/*` | Back-office : KPIs, catalogue, à la une, chaînes, bannières, créateurs, retraits, utilisateurs, VTC |
| `/annonceur` | Espace annonceur (impressions, clics, CTR) |
| `/vtc` | Mode kiosque embarqué VTC |

## Rôles

- **utilisateur** : visionnage, achats, jetons
- **créateur** (après validation KYC) : lives, studio, retraits
- **admin** : back-office complet

## Paiements

Le tunnel est branché sur une couche d'abstraction (`paiements` + RPC `confirmer_paiement`). Mode démo : confirmation automatique simulée après 3 s. Pour la production : brancher les webhooks réels des fournisseurs (Wave, Orange Money, MTN MoMo, Moov, Stripe, PayPal) sur `confirmer_paiement` via une Edge Function avec la service key.
