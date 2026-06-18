# FanBar Arena

Régie connectée temps réel pour un bar de supporters pendant la **Coupe du Monde 2026**.  
Le site agrège les capteurs de toute la salle via une base de données Supabase partagée et propose : comptes utilisateurs, régie live multi-capteurs, duel de zones, diffusion vidéo intégrée, pronostics, suivi d'alcoolémie par personne et gestion d'événements.

> Notre groupe (G1A) câble le **capteur de son** ; le site exploite aussi en lecture les capteurs des autres groupes (affluence, fumée, alcoolémie, température/humidité).

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | API Routes Next.js |
| Base de données | Supabase (PostgreSQL + Auth + RLS) |
| Graphiques | SVG faits main (éco-conception) + Recharts pour les courbes d'alcoolémie |
| Passerelle hardware | Script Python (`passerelle.py`) ↔ cartes TIVA C via Bluetooth |

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Copier et remplir les variables d'environnement
cp .env.example .env.local

# 3. Lancer le serveur de développement
npm run dev
# → http://localhost:3000
```

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète. Les variables obligatoires :

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique (anon) Supabase |
| `FOOTBALL_API_BASE_URL` | URL de l'API Football (highlightly.net) |
| `FOOTBALL_API_KEY` | Clé d'API Football |
| `FOOTBALL_SEASON` | Saison en cours (`2026`) |

Variables optionnelles : `FANBAR_BRIDGE_URL`, `SENSOR_WRITE_TOKEN`.

## Base de données

Les tables sont créées via des fichiers SQL à exécuter **une seule fois** dans le SQL Editor de Supabase, **dans cet ordre** :

| # | Fichier | Tables créées |
|---|---------|---------------|
| 1 | [`sql/supabase-events-policies.sql`](sql/supabase-events-policies.sql) | `g1a_events` |
| 2 | [`sql/supabase-sound-policies.sql`](sql/supabase-sound-policies.sql) | RLS sur `g1a_sound` |
| 3 | [`sql/supabase-g1a-auth.sql`](sql/supabase-g1a-auth.sql) | `g1a_profiles`, `g1a_predictions`, `g1a_broadcasts` |
| 4 | [`sql/supabase-crossgroup-read.sql`](sql/supabase-crossgroup-read.sql) | RLS lecture `g1d_mq3_measurements`, `G1E_measurements` |
| 5 | [`sql/supabase-alcohol-links.sql`](sql/supabase-alcohol-links.sql) | `g1a_subject_aliases`, `g1a_subject_links` |

Pour remplacer uniquement les diffusions vidéo par les highlights officiels FIFA World Cup 2026, exécuter [`sql/seed-broadcasts-worldcup-2026.sql`](sql/seed-broadcasts-worldcup-2026.sql).

## Le réseau de capteurs

| Groupe | Table Supabase | Donnée exploitée |
|--------|----------------|------------------|
| **G1A** (nous) | `g1a_sound` | Niveau sonore (dB) par carte électronique |
| G1B | `g1b_compteur_personnes` | Affluence (comptage ultrason entrées/sorties) |
| G1C | `g1c_smoke` | Fumée / qualité de l'air (ppm) |
| G1D | `g1d_mq3_measurements` | Alcoolémie par sujet (MQ-3) |
| G1E | `G1E_measurements` | Température + humidité |

Les domaines sans données passent en « en attente » et s'activent dès que le groupe publie des mesures.

## Comptes et rôles

- **Inscription / connexion** via Supabase Auth (mot de passe chiffré, jamais stocké en clair)
- **Confirmation email** : si elle est activée dans Supabase Auth, Supabase envoie le mail et le site affiche l'état de confirmation
- **Deux rôles** : `client` (supporter, par défaut) et `gerant` (administrateur du bar)
- **Promotion** : seul un gérant existant peut promouvoir un autre compte via la page `/account` — fonction `SECURITY DEFINER` anti-escalade de privilège
- **Bootstrap** : le premier gérant est désigné manuellement via `sql/supabase-g1a-auth.sql` (section 2.bis)

## Fonctionnalités

### Pages publiques
| Page | Description |
|------|-------------|
| `/` | Accueil + aperçu live du réseau de capteurs |
| `/regie` | Cockpit multi-capteurs : indices composites (ambiance, fête, confort, sécurité), alertes, occupation, prévention alcoolémie. Mode éco (15 s) |
| `/dashboard` | Duel des deux zones de supporters (son par carte) + données salle |
| `/diffusion` | Résumés Coupe du Monde 2026 intégrés (iframe YouTube, sans redirection) |
| `/alcoolemie` | Suivi d'alcoolémie par personne avec graphiques d'évolution |
| `/predictions` | Pronostics des supporters + classement public |
| `/history` | Événements terminés + palmarès |
| `/about` | Architecture, sécurité, éco-conception, accessibilité |
| `/account` | Profil, équipe favorite, stats d'alcoolémie personnelles |

### Pages gérant uniquement
| Page | Description |
|------|-------------|
| `/events/new` | Création d'événement (sélection du match, assignation des cartes aux zones) |
| `/settings` | Réglage des seuils d'alerte par type de capteur |
| `/alcoolemie` | Renommage de sujets + liaison d'un sujet à un compte utilisateur |

### Alcoolémie : liaison compte ↔ sujet
Un gérant peut **associer un sujet de mesure d'alcoolémie à un compte utilisateur** depuis la page `/alcoolemie`. Le supporter voit ensuite ses propres stats dans la page `/account` (dernier taux, moyenne, max, nombre de tests).

## Structure du projet

```
fanbar-arena/
├── app/                          # Pages et API Routes (Next.js App Router)
│   ├── page.tsx                  # Page d'accueil
│   ├── layout.tsx                # Layout principal
│   ├── globals.css               # Styles globaux + Tailwind
│   ├── api/                      # Endpoints API (REST)
│   └── [pages]/                  # Pages de l'application
├── components/
│   ├── layout/                   # Composants de navigation et mise en page
│   │   ├── AppShell.tsx          # Shell principal (sidebar + header)
│   │   ├── MobileNav.tsx         # Menu burger mobile
│   │   ├── UserMenu.tsx          # Menu utilisateur (login/logout)
│   │   └── navItems.ts           # Configuration de la navigation
│   ├── ui/                       # Composants UI réutilisables
│   │   ├── GaugeRing.tsx         # Jauge circulaire SVG
│   │   └── Sparkline.tsx         # Mini graphe SVG
│   ├── AlcoholClient.tsx         # Suivi alcoolémie (avec graphiques Recharts)
│   ├── DashboardClient.tsx       # Duel de zones
│   ├── RegieClient.tsx           # Cockpit régie live
│   └── ...                       # Autres composants de page
├── lib/
│   ├── constants.ts              # Constantes partagées (capacité, limites...)
│   ├── types.ts                  # Types TypeScript du projet
│   ├── format.ts                 # Formatage dates et valeurs
│   ├── authGuard.ts              # Garde d'authentification serveur
│   ├── alcoholService.ts         # Service alcoolémie (G1D)
│   ├── ecosystemService.ts       # Agrégation multi-capteurs
│   ├── eventService.ts           # Gestion des événements
│   ├── fanbarService.ts          # Dashboard et scores de zones
│   ├── soundService.ts           # Capteur son (G1A)
│   ├── profileService.ts         # Profils et rôles
│   └── ...                       # Autres services
├── sql/                          # Scripts SQL Supabase (à exécuter une fois)
├── utils/supabase/               # Clients Supabase (client, serveur, middleware)
├── middleware.ts                  # Middleware Next.js (refresh de session Supabase)
├── .env.example                  # Template des variables d'environnement
└── package.json
```

## API Routes

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/ecosystem` | Snapshot agrégé de tous les capteurs | Public |
| GET | `/api/dashboard` | Duel de zones + contexte salle | Public |
| GET | `/api/alcohol` | Rapport d'alcoolémie complet | Public |
| GET/POST | `/api/sound` | Mesures sonores (POST protégé par token) | Token |
| GET/POST | `/api/events` | Liste / création d'événements | POST: Gérant |
| GET/PATCH | `/api/events/[id]` | Détail / mise à jour d'un événement | PATCH: Gérant |
| GET | `/api/events/history` | Événements terminés + palmarès | Public |
| GET | `/api/alerts` | Alertes actives | Public |
| GET | `/api/cards` | État des cartes électroniques (via passerelle) | Public |
| GET/POST | `/api/settings` | Seuils d'alerte | POST: Gérant |
| GET | `/api/teams` | Recherche d'équipes (API Football) | Public |
| GET | `/api/matches` | Matchs d'une équipe (API Football) | Public |

## Passerelle cartes électroniques

Le script `passerelle.py` fait le pont entre les cartes TIVA C (Bluetooth HC-06) et Supabase :

```powershell
$env:FANBAR_CARD_PORTS="1=COM6,2=COM7"
python passerelle.py
```

La passerelle détecte automatiquement les appareils Bluetooth nommés `G1A-*`, calcule le max dB sur 2 secondes et insère dans `g1a_sound`. Elle expose une API HTTP locale (`http://127.0.0.1:8765`) pour le contrôle des événements.

## Critères du projet

### Sécurité
- Supabase Auth + RLS sur toutes les tables `g1a_*`
- Rôles client/gérant avec promotion par fonction `SECURITY DEFINER`
- Lecture seule des tables des autres groupes
- En-têtes de sécurité (X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Token de protection pour l'écriture capteur

### Éco-conception
- Polling mis en pause quand l'onglet est masqué (`visibilitychange`)
- Mode éco (rafraîchissement 15 s au lieu de 2 s)
- Requêtes `SELECT` minimales et ciblées
- Graphiques SVG faits main (pas de librairie lourde sur le tableau de bord)
- Vidéos YouTube en `lazy-load` avec `youtube-nocookie.com`

### Accessibilité
- Navigation clavier complète avec focus visible
- Lien d'évitement « Aller au contenu »
- Attributs ARIA sur les menus et boutons
- Labels sur tous les champs de formulaire
- Respect de `prefers-reduced-motion`
- Contrastes élevés (thème sombre)
