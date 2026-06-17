# FanBar Arena — Régie connectée Coupe du Monde 2026

Application Next.js fullstack pour le **projet commun** (groupe **G1A**, capteur de
**son**). Le scénario : un bar de supporters diffuse la Coupe du Monde 2026. Le site
agrège **les capteurs de toute la salle** via une base de données Supabase partagée,
et propose comptes utilisateurs, régie temps réel, duel de zones, diffusion vidéo
intégrée et pronostics.

> Notre groupe câble le capteur de son, mais le site exploite aussi en lecture les
> capteurs des autres groupes (affluence, fumée, alcoolémie, température/humidité).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (PostgreSQL + Auth + RLS) via `@supabase/ssr`
- API routes Next.js, graphiques SVG faits maison (éco-conception)
- Passerelle Python (cartes TIVA C ↔ Supabase)

## Installation

```powershell
npm install
npm run dev
# http://127.0.0.1:3000
```

## Variables d'environnement (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL="https://fdlwkvsovkewlfwnrpvm.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
FOOTBALL_API_BASE_URL="https://soccer.highlightly.net"
FOOTBALL_API_KEY="..."
FOOTBALL_SEASON="2026"
```

## Base de données — à exécuter une fois dans Supabase SQL Editor

Dans l'ordre :

1. `supabase-sound-policies.sql` — table `g1a_sound` (déjà en place).
2. `supabase-events-policies.sql` — table `g1a_events`.
3. **`supabase-g1a-auth.sql`** — **nouveau** : comptes, pronostics, diffusions.
   Crée `g1a_profiles`, `g1a_predictions`, `g1a_broadcasts` (avec RLS),
   la fonction de promotion gérant et un seed de résumés Coupe du Monde 2026
   (chaîne L'Équipe, disponibles en France).
4. **`supabase-crossgroup-read.sql`** — **nouveau** : ajoute une policy de
   LECTURE seule pour `anon`/`authenticated` sur les capteurs de G1D
   (`g1d_mq3_measurements`) et G1E (`g1e_measurements`), qui ne les exposaient
   pas encore. Indispensable pour afficher alcoolémie + température/humidité.

Tant que `supabase-g1a-auth.sql` n'est pas exécuté, le site reste fonctionnel
(la page Diffusion affiche une sélection par défaut, les comptes utilisent un
profil minimal), mais les pronostics et la gestion des diffusions nécessitent ces
tables.

## Comptes et rôles

- Inscription / connexion via **Supabase Auth** (mot de passe chiffré, jamais stocké
  en clair). Pages `/register` et `/login`.
- Deux rôles : `client` (par défaut) et `gerant`.
- Pour devenir gérant : page `/account` → « Devenir gérant » → code d'accès.
  Code par défaut : **`FANBAR-GERANT-2026`** (modifiable dans `supabase-g1a-auth.sql`,
  fonction `g1a_claim_gerant`). La promotion passe par une fonction `SECURITY DEFINER`
  pour empêcher toute auto-promotion (anti-escalade de privilège).
- Le gérant débloque : création d'événements, réglage des seuils, gestion des
  diffusions vidéo.

## Le réseau de capteurs (BDD partagée)

Le site lit **un capteur par groupe** (lecture seule pour les tables des autres
groupes) :

| Groupe | Table                     | Donnée exploitée                              |
| ------ | ------------------------- | --------------------------------------------- |
| G1A    | `g1a_sound`               | Niveau sonore (dB) par carte — **notre capteur** |
| G1B    | `g1b_compteur_personnes`  | Affluence (comptage ultrason entrées/sorties) |
| G1C    | `g1c_smoke`               | Fumée / qualité de l'air (ppm, dernière valeur) |
| G1D    | `g1d_mq3_measurements`    | Alcoolémie par sujet (MQ-3)                   |
| G1E    | `g1e_measurements`        | Température + humidité (`type`/`value`)        |

Les domaines sans données passent automatiquement en « en attente » et s'activent
dès que le groupe concerné publie des mesures (rafraîchissement temps réel).

> Note : l'unité de `g1d_mq3_measurements.alcohol_level` est affichée en `g/L` avec
> une limite légale indicative de `0.5`. Ajuster `ALCOHOL_LIMIT` dans
> `lib/ecosystemService.ts` si l'échelle réelle diffère.

## Pages

- `/` — accueil + aperçu live du réseau de capteurs
- `/regie` — **régie live** : cockpit multi-capteurs, indices composites (ambiance,
  fête, confort, sécurité), alertes, occupation, prévention alcoolémie. Mode éco.
- `/dashboard` — duel des deux zones de supporters (son par carte) enrichi des
  données salle (affluence G1B, air G1C)
- `/diffusion` — résumés Coupe du Monde 2026 **intégrés** (iframe, sans redirection,
  vidéos disponibles en France), gestion par le gérant
- `/predictions` — pronostics des supporters (table `g1a_predictions`)
- `/history` — événements terminés
- `/events/new`, `/settings` — réservés au gérant
- `/account` — profil, équipe favorite, accès gérant
- `/about` — architecture, données partagées, sécurité / éco-conception / accessibilité

## API routes principales

- `GET /api/ecosystem` — snapshot agrégé de tous les capteurs de la salle
- `GET /api/dashboard` — duel de zones + contexte salle
- `GET/POST /api/sound`, `GET /api/events`, etc. (voir `app/api/`)

## Bonus (critères du projet)

- **Sécurité** : Supabase Auth, RLS sur toutes les tables `g1a_`, rôles
  client/gérant, promotion par fonction `SECURITY DEFINER`, lecture seule des tables
  des autres groupes, en-têtes de sécurité.
- **Éco-conception** : polling mis en pause quand l'onglet est masqué, mode éco
  (15 s), `SELECT` minimaux, graphiques SVG sans librairie, vidéos en `lazy-load`.
- **Accessibilité** : navigation clavier, focus visibles, lien d'évitement, rôles
  ARIA, labels de formulaires, `prefers-reduced-motion`, contrastes élevés.

## Passerelle cartes électroniques

`C:\Users\marou\Desktop\proj\passerelle.py` fait le pont entre les cartes TIVA C
(Bluetooth HC-06) et Supabase :

```powershell
$env:FANBAR_CARD_PORTS="1=COM6,2=COM7"
python C:\Users\marou\Desktop\proj\passerelle.py
```

Quand une carte est active, la passerelle calcule la moyenne dB sur 2 s et insère
dans `g1a_sound` avec `electronic_card = id_card`. Le firmware (`proj.ino`) émet des
trames `DATA;id;db` et accepte `WAKE`, `SLEEP`, `PING`.
