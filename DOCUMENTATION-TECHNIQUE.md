# TiVoi — Documentation technique de transmission

> Document à destination du prochain développeur. Il décrit l'état réel du projet au
> 01/09/2026 : ce qui est construit, comment c'est construit, et ce qui reste à faire.
> Le cahier des charges fonctionnel de référence est `tivoi-cahier-des-charges (1).pdf`
> (fourni séparément — les « § » ci-dessous y renvoient).

---

## 1. Le projet en une page

**TiVoi** est une plateforme de streaming premium pour la Côte d'Ivoire et l'Afrique de
l'Ouest, combinant trois sources de revenus (CDC §1) :

1. **VOD** : films, séries, documentaires (gratuit / paiement à la séance / abonnement)
2. **Lives de créateurs** monétisés (jetons, cadeaux virtuels, reversement 70/30)
3. **Publicité** : bannières web, coupures pub dans les chaînes, écrans embarqués VTC (DOOH)

Trois surfaces d'usage : **web** (clients), **Smart TV** (compte client appairé),
**tablette VTC** (kiosque embarqué, passagers).

---

## 2. Stack technique (et écarts assumés vs. le CDC)

| Élément | CDC §2 prévoyait | Choix final retenu | Raison |
|---|---|---|---|
| Backend | Node.js / Express / Prisma | **Supabase** (PostgreSQL + Auth + Realtime + Storage + RLS) | Auth, DB, temps réel, stockage et sécurité intégrés ; l'équivalent des « routes » est réalisé en SQL (vues, policies RLS, fonctions RPC) |
| Frontend | Démonstrateur HTML puis React/Next | **Next.js 16.2.10 (App Router, Turbopack) + React 19 + Tailwind CSS 4** | Conforme au CDC (étape 4 de la feuille de route) |
| Chat temps réel | Socket.io | **Supabase Realtime** (postgres_changes + broadcast + presence) | Même résultat, zéro serveur à gérer |
| Paiements | Couche abstraite multi-fournisseurs | Table `paiements` + RPC `confirmer_paiement` (démo) + Edge Functions `wave-checkout` / `wave-webhook` (réel) | Le CDC demande une abstraction : elle existe, la simulation est active tant que les comptes marchands ne sont pas ouverts |
| Fichiers | — | Supabase Storage (bucket public `media`) | Affiches, bannières, vidéos |

Autres dépendances : `lucide-react` (icônes), `@supabase/supabase-js`. **Aucun test
automatisé** n'a été écrit (reste à faire, voir §9).

⚠️ **Next.js 16** : quelques différences importantes (cf. §10 « Pièges connus ») :
`middleware.ts` s'appelle désormais `proxy.ts` ; certains composants React (définis
pendant le rendu) et appels impurs sont interdits par le lint ; `useSearchParams`
exige une boundary `Suspense`.

---

## 3. Démarrage (prochain dev, workspace neuf)

```bash
git clone https://github.com/wadou423-ops/tivoi.2.0.git   # ou récupérer le dossier
cd tivoi
npm install
```

Créer `.env.local` (à la racine) :

```
NEXT_PUBLIC_SUPABASE_URL=https://aslkysswzeejdlexhfbj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Exécuter dans le **SQL Editor Supabase**, dans cet ordre (tous idempotents sauf
indication) :

1. `supabase/schema.sql` — schéma complet (21 tables, RLS, RPC, seed de base)
2. `supabase/migration-2.sql` — `demandes_createur`, bucket Storage `media`,
   `confirmer_paiement_webhook` (réservée `service_role`)
3. `supabase/update-videos.sql` — table `progressions` + RPC + publication realtime
   `cadeaux_envoyes` + vidéos de démonstration
4. Les extraits SQL listés en §8.4 (onboarding par compte, téléphone, permissions,
   appairage TV, `dispo_vtc`) — ou `supabase/schema.sql` complet qui les contient déjà
5. `supabase/seed-demo.sql` — 6 contenus + carrousel « À la une » (démo, optionnel)

Puis :

```bash
npm run dev    # http://localhost:3000
npm run build  # vérifier avant de pousser
```

Projet Supabase actif : `aslkysswzeejdlexhfbj` (URL dans `.env.local`).
⚠️ Il existe un ANCIEN projet Supabase et un ANCIEN dossier projet (`3D Objects\tivoi OX`,
`Documents\tivoi-web`) — ne pas s'y fier. Le projet courant est `Desktop\tivoi`,
lié au repo GitHub `wadou423-ops/tivoi.2.0`.

---

## 4. Arborescence du code

```
src/
├── proxy.js                         # (SUPPRIMÉ — voir §7.3, protection admin = client-side)
├── lib/
│   ├── supabaseClient.js            # client Supabase (env NEXT_PUBLIC_*)
│   ├── useRealtime.js               # hook : realtime + reload au focus/visibilité
│   ├── toast.js                     # toast() → événement global → ToastHost
│   └── cache.js                     # prefetchFiche/getCachedFiche (préchargement fiches)
├── app/
│   ├── layout.js                    # fonts Montserrat + Archivo Narrow, Header, ToastHost
│   ├── globals.css                  # design system complet (tokens @theme Tailwind 4)
│   ├── manifest.js                  # PWA (fullscreen, paysage, icône)
│   ├── page.js                      # ACCUEIL : connecté = étagères Netflix ;
│   │                                # visiteur = vitrine marketing sans films
│   ├── bienvenue/                   # onboarding 3 slides (1 fois par compte)
│   ├── catalogue/page.js            # VOD : connecté = étagères ; visiteur = grille + modale connexion
│   ├── catalogue/[id]/page.js       # fiche : synopsis, distribution, notes 1-5, commentaires
│   ├── lecteur/[id]/page.js         # lecteur : MP4 custom / YouTube API / fallback image
│   ├── abonnements/                 # paliers Basic/Premium/VIP (table abonnements_paliers)
│   ├── paiement/[type]/[id]/        # tunnel : achat | abo | tokens (Wave réel si configuré, sinon démo)
│   ├── confirmation/[ref]/          # statut du paiement (polling)
│   ├── jetons/                      # packs de jetons
│   ├── portefeuille/                # solde, historique paiements, bannière
│   ├── lives/                       # liste des lives (realtime)
│   ├── live/[id]/                   # direct : lecteur, chat temps réel, cadeaux, présence, réactions
│   ├── live/programmer/             # créer un live (clé stream générée)
│   ├── studio/                      # dashboard créateur : stats, graphique 14 j, export CSV, retrait
│   ├── devenir-createur/            # KYC : nom, prénoms, n° CNI, type de contenu, présentation
│   ├── guide-tv/                    # chaînes + lecteur + EPG
│   ├── tv/                          # ÉCRAN TV : code 6 chiffres → appairage → interface Netflix (D-pad,
│   │                                # recherche, filtre, FR/EN, QR pour contenu payant)
│   ├── recherche/ · notifications/ · profil/ · parametres/  # compte (paramètres : appairage TV)
│   ├── mot-de-passe-oublie/ · reinitialiser-mot-de-passe/   # Supabase auth
│   ├── legales/                     # mentions légales (loi ivoirienne 2013-450, RGPD)
│   ├── vtc/                         # KIOSQUE VTC (voir §6)
│   ├── annonceur/                   # espace annonceur : impressions, clics, CTR
│   ├── connexion/ · inscription/ · choisir-pseudo/           # auth (email OU téléphone OTP)
│   └── admin/
│       ├── layout.js                # garde par rôle + ATTRIBUTIONS (permissions par admin) + déconnexion
│       ├── connexion/               # PORTAIL ADMIN dédié (email + mot de passe, refus non-admin)
│       ├── page.js                  # vue d'ensemble : KPIs réels
│       ├── utilisateurs/            # liste, recherche, suspension (rôles gérés dans Administrateurs)
│       ├── createurs/               # validation KYC (lit demandes_createur)
│       ├── catalogue/               # CRUD complet + upload Storage + flag dispo_vtc
│       ├── a-une/                   # carrousel : ajout, ordre, visibilité
│       ├── chaines/                 # chaînes + spots + coupures pub (3 onglets)
│       ├── bannieres/               # 5 emplacements + impressions/clics
│       ├── retraits/                # approbation/rejet (recrédite le créateur si rejet)
│       ├── administrateurs/         # création admin (mdp par défaut), attributions, mon mot de passe
│       ├── appareils/               # tablettes VTC et TV : activation par code, suppression
│       └── vtc/                     # CRUD playlist VTC
└── components/
    ├── Header.js                    # nav glass, recherche, cloche + badge temps réel, drawer mobile
    ├── Banniere.js                  # bannière pub par emplacement (impression/clic RPC)
    ├── CarteFilm.js                 # carte vivante : hover preview YT, blur, progression, modale
    ├── FicheRapide.js               # modale détail rapide (préfetchée)
    ├── CustomVideoPlayer.js         # lecteur MP4 custom : seek or, vitesse, PiP, reprise, progression
    ├── YouTubePlayerProgress.js     # lecteur YouTube avec reprise + progression (API IFrame)
    ├── YoutubeKiosque.js            # YouTube kiosque : plein écran cover, boucle, clics bloqués
    ├── YoutubeVTC.js                # film YouTube VTC avec interruptions pub intégrées
    ├── FiltreCategories.js          # filtre entonnoir partagé (accueil, catalogue, TV ; FR/EN)
    ├── ModaleConnexion.js           # modale « Se connecter / Créer un compte » (visiteur)
    ├── UploadFichier.js             # upload Supabase Storage (admin)
    ├── Spinner.js · LoaderCentered.js · ImgBlur.js · SkeletonGrille.js · ToastHost.js

supabase/
├── schema.sql        # schéma complet + RLS + RPC + seed
├── migration-2.sql   # demandes_createur + storage + webhook
├── update-videos.sql # progressions + RPC + publication realtime + vidéos démo
├── seed-demo.sql     # contenus démo + à la une
└── functions/        # Edge Functions (Deno) :
    ├── admin-create-user/   # crée un compte admin (vérifie l'appelant admin)
    ├── wave-checkout/       # session de paiement Wave (WAVE_API_KEY)
    └── wave-webhook/        # confirmation paiement → confirmer_paiement_webhook
```

---

## 5. Base de données Supabase

### 5.1 Tables principales

| Table | Rôle |
|---|---|
| `profiles` | 1:1 avec `auth.users` (trigger `handle_new_user`). `role` (utilisateur/createur/admin), `statut_createur`, `solde_tokens`, `solde_revenus`, `suspendu`, `onboarding_vu`, `telephone`, `permissions text[]` |
| `catalogue` | contenus : `type_acces` (gratuit/seance/abonnement), `prix_fcfa`, `dispo_vtc`, `bande_annonce_url` (sert aussi de média de lecture), `note`, `badge`, `actif`, `ordre` |
| `a_une` | carrousel accueil (contenu_id, ordre, actif) |
| `abonnements_paliers` / `abonnements_utilisateurs` | formules + souscriptions 30 j |
| `acces_contenus` | achats à la séance (unique user+contenu) |
| `paiements` | tous les paiements (`reference`, `statut`, `objet_type`, `fournisseur`) |
| `packs_tokens` · `cadeaux` · `cadeaux_envoyes` | économie jetons/cadeaux |
| `lives` · `messages_live` | lives + chat (`supprime` pour modération) |
| `retraits` | demandes de retrait créateurs |
| `chaines` · `epg` · `spots` · `coupures` | TV linéaire + régie |
| `bannieres` | 5 emplacements + `impressions`/`clics` |
| `notifications` | notifications par utilisateur |
| `commentaires` · `notes` | interactions catalogue |
| `appareils` | TV/VTC : `code_activation` 6 chiffres, `appaire`, `proprietaire_id`, `type` |
| `playlist_vtc` | playlist kiosque (`type` publicite/contenu, `duree_secondes`, `ordre`, `actif`) |
| `demandes_createur` | KYC créateur (nom, prénoms, `numero_cni`, `type_contenu`, statut) |
| `progressions` | visionnage : position/durée/`termine`, unique(user, contenu) |

### 5.2 Fonctions RPC (SECURITY DEFINER)

| Fonction | Rôle |
|---|---|
| `confirmer_paiement(reference)` | simule le webhook : confirme + délivre (accès/abonnement/jetons) + notification |
| `confirmer_paiement_webhook(reference)` | idem SANS auth — réservée `service_role` (webhook Wave) |
| `envoyer_cadeau(live_id, cadeau_id)` | débit expéditeur + crédit 70 % créateur |
| `demander_retrait(montant)` | retrait créateur (vérifie solde) |
| `appairer_appareil(code)` / `dissocier_appareil(id)` | TV ↔ compte client |
| `definir_permissions(user_id, text[])` | attributions d'un admin (par un admin) |
| `banniere_impression(id)` / `banniere_clic(id)` | compteurs pubs |
| `enregistrer_progression(contenu, position, duree)` | upsert visionnage + `termine` auto |
| `est_admin()` / `suspendu_check()` | helpers RLS |
| `handle_new_user()` | trigger auth.users → crée `profiles` (nom, prénom, téléphone) |

### 5.3 Realtime (publication `supabase_realtime`)

Tables ajoutées : `catalogue`, `a_une`, `messages_live`, `lives`, `notifications`,
`chaines`, `playlist_vtc`, `profiles`, `cadeaux_envoyes`. **Sans cette publication,
aucun temps réel ne fonctionne** (c'était un bug passé).

### 5.4 Storage

Bucket public `media` (policies : lecture publique, écriture authentifiés).
Utilisé par `UploadFichier` (admin catalogue + bannières).

---

## 6. Ce qui est FAIT (mappé sur le CDC)

### §3 Catalogue & visionnage — ✅ FAIT
- Carrousel « À la une » géré par l'admin (ordre, visibilité), auto 6 s, flèches, points
- Fiches : bande-annonce, description, acteurs, durée, catégories, notation 1-5, commentaires
- 3 modèles d'accès : gratuit / paiement à la séance / abonnement (3 paliers)
- Étagères accueil & VOD : Reprendre le visionnage, À la une, Top 10, catégories
- Fiche rapide en modale, aperçu bande-annonce au survol, préchargement fiches
- Recommandations : **v1 simplifiée** (Tendances par note) — le moteur avancé reste à faire
- Adaptation multi-appareils : colonne `profil_qualite` sur `appareils` existe,
  **non branchée** au lecteur (à faire)

### §4 Paiements & monétisation — ✅ structure + démo
- Parcours d'achat complet : choix → paiement (Mobile Money/carte/PayPal) →
  confirmation → accès automatique
- Fournisseurs : Wave, Orange Money, MTN MoMo, Moov, carte, PayPal (sélection)
- **Mode démo actif** : confirmation simulée 3 s après validation
- **Wave réel prêt** : Edge Functions écrites, activation = clé API + déploiement
- Jetons : packs (100 = 500 FCFA), portefeuille, historique, dépense en cadeaux
- Reversement créateurs : 70/30 automatique (RPC), demandes de retrait, validation admin
- ⚠️ Le paiement réel exige les comptes marchands (démarche commerciale, hors code)

### §5 Lives, tokens & cadeaux — ✅ FAIT
- Programmer un live (clé stream générée automatiquement) / démarrage manuel
- Chat temps réel (Supabase Realtime) + affichage optimiste + déduplication
- Compteur de spectateurs (presence) + filtre anti-spam : **partiel** (limite de
  fréquence non implémentée)
- Cadeaux virtuels : débit immédiat, crédit 70 % créateur, **animation emoji traversant
  l'écran visible par tous** (realtime)
- Réactions flottantes (broadcast) + badge EN DIRECT pulsé
- Studio créateur : lives, cadeaux reçus, revenus, graphique 14 jours, classement,
  **export CSV**, demande de retrait
- KYC créateur : demande (nom, prénoms, CNI, type de contenu) → validation admin →
  notification

### §6 Chaînes TV & régie — ✅ FAIT (hors HLS propriétaire)
- Chaînes relayées YouTube (France 24, Al Jazeera ; **RTI 1 à confirmer** — lien à
  maintenir ou intégrer RTI Play)
- Lecteur + guide des programmes (EPG) côté client
- Coupures pub : programmation par heure et/ou récurrence N minutes + bibliothèque de spots
- Bannières : 5 emplacements, impressions/clics/CTR, espace annonceur
- **HLS propriétaire : restant** (encodeur + CDN à connecter — le lecteur `<video>` HLS
  natif existe déjà sur la page)

### §7 Tableaux de bord — ✅ FAIT
- Admin : KPIs réels (utilisateurs, créateurs, lives en direct, revenus, retraits en
  attente, contenus), utilisateurs (recherche, suspension), validation créateurs,
  catalogue CRUD + upload, à la une, chaînes/spots/coupures, bannières, retraits,
  appareils, administrateurs avec **attributions granulaires**
- **Attributions** : chaque admin a des `permissions text[]` ; la sidebar se filtre et
  chaque page est gardée (accès refusé si attribution manquante)
- Créateur : voir §5
- Notifications : temps réel, badge dans le Header

### §8 Smart TV & VTC — ✅ FAIT (hors hors-ligne + ML)
- **Smart TV (modèle Netflix)** : `/tv` affiche un code 6 chiffres → le client saisit
  le code dans Paramètres → appairage **lié à son compte** (RPC `appairer_appareil`)
  → interface TV : étagères, navigation D-pad (flèches), recherche, filtre, FR/EN,
  badge propriétaire, **QR code** pour débloquer un contenu payant sur le téléphone,
  « Mes TV » + dissociation dans Paramètres
- **Kiosque VTC** : `/vtc` — enrôlement par code (l'admin active depuis Appareils),
  playlist en boucle, YouTube plein écran cover avec détection de fin,
  **catalogue passager tactile** (films `dispo_vtc`) et **interruptions
  publicitaires toutes les 10 min** (pause film → pub → reprise à la position exacte,
  MP4 et YouTube), wake lock (écran jamais en veille), PWA (manifest, paysage)
- **Poursuite à domicile** : partiel — le paiement via QR crédite le compte client ;
  la session passager complète (liaison course ↔ compte, historique de course) reste à faire
- **Hors-ligne** : à faire (pack pré-téléchargé)
- **DOOH géociblé + revenus flottes** : à faire (voir §9)
- **Ciblage démographique on-device** : à faire (app native)

### §9 Sécurité & conformité — ✅ FAIT
- Auth Supabase (bcrypt), RLS sur toutes les tables, RPC SECURITY DEFINER
- Rôles : utilisateur / créateur / admin (+ `permissions` granulaires par admin)
- Portail admin séparé (`/admin/connexion`), refus des comptes non-admin,
  comptes admin **refusés sur la connexion cliente**, admin invisible côté site
- Connexion email **ou téléphone (OTP SMS)** — l'OTP exige l'activation du provider
  Phone côté Supabase (Twilio), sinon message propre
- Données bancaires jamais stockées (fournisseurs externes)
- Mentions légales : loi ivoirienne 2013-450, RGPD, transparence caméras embarquées
- ⚠️ 2FA admin : **à faire** (Supabase MFA)
- ⚠️ Revue juridique formelle recommandée avant lancement commercial (CDC §9.3)

---

## 7. Points d'architecture importants (à ne pas casser)

### 7.1 Séparation des sessions admin / client
Un navigateur = **une session Supabase** (localStorage partagé par origine). Règles
codées pour éviter la « guerre des sessions » :
- **Aucune déconnexion forcée** entre portails
- Le Header **ignore** les sessions admin (bouton « Connexion » affiché)
- L'accueil et le catalogue traitent un admin comme un **visiteur**
- La connexion cliente **refuse** les comptes admin, le portail refuse les non-admins
- **Astuce dev/prod** : deux origines = deux sessions. En local :
  `localhost:3000` (client) vs `127.0.0.1:3000` (admin). En prod : `tivoi.com` vs
  `admin.tivoi.com` (sous-domaine à configurer sur Vercel).

### 7.2 Comptes et mots de passe
- Premier admin : `update profiles set role='admin' where pseudo='...';`
- Reset mot de passe (SQL) :
  `update auth.users set encrypted_password = crypt('NOUVEAU', gen_salt('bf')), email_confirmed_at = now() where email='...';`
  (nécessite `create extension if not exists pgcrypto;`)
- Mot de passe par défaut d'un nouvel admin : `TiVoi@2026!` (modifiable dans
  Administrateurs → « Mon mot de passe »)
- Les mots de passe sont **irrécupérables** (hash bcrypt) — on les remplace seulement

### 7.3 Pièges connus (retours d'expérience de cette phase)
- **Variables d'environnement** : lues uniquement au démarrage du serveur → toujours
  redémarrer `npm run dev` après modification de `.env.local` (sinon « Failed to fetch »)
- **Cache de compilation** : si le code semble ne pas se mettre à jour, fermer le
  serveur, **supprimer `.next`**, relancer (le FS de ce poste est lent, le watcher
  peut rater des changements)
- **Realtime** : sans l'ajout des tables à la publication `supabase_realtime`, aucun
  événement (script fourni en §3)
- **`id` GENERATED ALWAYS** : jamais inclure `id` dans un INSERT/UPDATE PostgREST
  (erreur « can only be updated to DEFAULT ») — le CRUD catalogue exclut déjà `id`
- **Deux serveurs** : si le port 3000 est pris, Next bascule sur 3001 → on teste
  alors une vieille version. Vérifier l'URL affichée dans le terminal
- **Edge Function non déployée** : `admin-create-user` et Wave tombent en mode
  dégradé documenté (SQL manuel / démo de paiement)

---

## 8. Procédures d'exploitation

### 8.1 Créer un admin
- **Via le dashboard** (après déploiement de l'Edge Function) :
  Administrateurs → Inviter → email + mot de passe par défaut + attributions
- **Via SQL** : créer le compte (inscription site) puis
  `update profiles set role='admin', permissions='{...}' where pseudo='...';`

### 8.2 Ajouter un contenu
Admin → Catalogue → Ajouter : titre, catégorie, acteurs, image (upload ou URL),
vidéo (URL MP4 ou YouTube → champ « Vidéo »), type d'accès, prix, badge, ordre,
cases « Actif » et « Disponible sur les écrans VTC ». Pour l'afficher en carrousel :
Contenus à la une → Ajouter.

### 8.3 Activer une tablette VTC / une Smart TV
Tablette : `/vtc` → code 6 chiffres → Admin → Écrans & appareils → Activer.
TV : `/tv` → code → le client saisit le code dans Paramètres → Appairer.

### 8.4 Modifier les attributions d'un admin
Administrateurs → « Attributions » sur la ligne de l'admin → cocher → Enregistrer
(la sidebar et les gardes s'appliquent immédiatement).

### 8.5 Pubs dans le kiosque VTC
Playlist VTC → éléments type « Publicité » → ils s'insèrent automatiquement toutes
les 10 min pendant les films choisis par les passagers (constante `INTERVAL_PUB`
dans `vtc/page.js`, en secondes).

---

## 9. Ce qui RESTE À FAIRE (priorisé)

| # | Élément | CDC | Effort | Notes |
|---|---|---|---|---|
| 1 | **Déployer les Edge Functions** | §4 | 1 h | `supabase functions deploy admin-create-user wave-checkout wave-webhook` + `supabase secrets set WAVE_API_KEY=...` |
| 2 | **Paiement Wave réel** | §4 | — | Clé API Wave Business ; le code est prêt (basculer de la démo au réel est automatique dès que la clé existe) |
| 3 | **Autres paiements** (Orange, MTN, Moov, Stripe, PayPal) | §4 | 2-3 j/fournisseur | Même pattern que Wave (Edge Function + webhook) |
| 4 | **CDN vidéo** | §3/§10 | 2 j | Choisir Cloudflare Stream / Bunny / AWS ; remplacer `bande_annonce_url` par le flux adaptatif HLS/DASH ; le lecteur MP4 existe déjà |
| 5 | **DOOH v1** | §8.4 | 3-4 j | GPS du kiosque (`/vtc`), table `flottes` + véhicules, ciblage par rayon, revenus flottes par impressions. Base prête : `appareils` |
| 6 | **Hors-ligne VTC** | §8.3 | 2-3 j | Pack pré-téléchargé (Service Worker + Cache API) |
| 7 | **Poursuite à domicile complète** | §8.3 | 2 j | Session passager : QR de course → lien compte ↔ session VTC |
| 8 | **DRM** (Widevine/FairPlay) | §10 | 1-2 sem | Contenu premium sur TV — dépend du CDN (choix 4) |
| 9 | **2FA admin** | §9 | 1 j | Supabase MFA (TOTP) — à brancher sur le portail |
| 10 | **Modération chat** | §5 | 0,5 j | Bouton suppression message (colonne `supprime` déjà en base) + limite de fréquence anti-spam |
| 11 | **Ciblage démographique on-device** | §8.5 | hors web | Modèle ML embarqué — nécessite l'app tablette native |
| 12 | **Applications natives TV** (Android TV, Tizen, webOS) | §10 | long | La PWA TV fonctionne déjà sur navigateur TV |
| 13 | **RTI 1** | §6.2 | — | Flux YouTube non garanti — intégrer RTI Play ou maintenir le lien |
| 14 | **i18n complet FR/EN** | — | 2-3 j | La TV a la bascule ; l'étendre au site (dictionnaire global) |
| 15 | **Tests automatisés + audit sécurité/charge** | §11.7 | 3-5 j | Aucun test écrit à ce jour |
| 16 | **Notifications push** | §7.3 | 1-2 j | Web Push (badge temps réel déjà fait) |

---

## 10. Déploiement

### 10.1 Site (Vercel)
1. vercel.com → connexion GitHub → **Import** `tivoi.2.0`
2. Environment Variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy → chaque `git push` redéploie automatiquement

URLs en prod (domaine Vercel) :
- Clients : `https://<projet>.vercel.app`
- **Portail admin** : `https://<projet>.vercel.app/admin/connexion` (favori, jamais lié)
- Kiosque VTC : `…/vtc` · Smart TV : `…/tv` · TV-code côté client : Paramètres

Plus tard : `tivoi.com` (clients) + `admin.tivoi.com` (back-office) — deux
sous-domaines = deux sessions indépendantes (même mécanique que localhost/127.0.0.1).

### 10.2 Edge Functions (une fois)
```bash
npm install -g supabase
supabase login
supabase link --project-ref aslkysswzeejdlexhfbj
supabase functions deploy admin-create-user
supabase functions deploy wave-checkout
supabase functions deploy wave-webhook
supabase secrets set WAVE_API_KEY=ta_cle   # quand le compte marchand existe
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sont injectées
automatiquement par Supabase.

---

## 11. Design system (rappel)

Fidèle aux maquettes Stitch (dossier `tivoi doc`) :
- Palette : obsidienne `#131313`, or `#f2ca50` / `#d4af37`, ivoire `#e5e2e1`,
  contour `#4d4635` — tokens complets dans `globals.css` (`@theme` Tailwind 4)
- Typo : **Montserrat** (titres/labels) + **Archivo Narrow** (corps), via `next/font`
- Composants signature : `glass-panel` (verre dépoli), `glow-focus` (halo or),
  `card-hover`, `movie-card`, `hide-scrollbar`, skeletons `.skeleton`
- Rayons 4-8 px, boutons or « label-md uppercase », cartes 2:3, étagères horizontales

---

*Document rédigé le 01/09/2026 — TiVoi v2.2 (repo `tivoi.2.0`, branche `main`).*
