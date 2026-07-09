# Fusion Leap CRM

CRM moderne pour équipes commerciales — Dashboard, Leads, Tâches.  
Modern CRM for sales teams — Dashboard, Leads, Tasks.

## Stack

- Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui
- Supabase (Auth, PostgreSQL, Storage, Realtime)
- i18n **Français / English** (langue par défaut : FR)

## Configuration Supabase

Vos identifiants sont configurés dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://abxgsuuyqplvcqescwbb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  (serveur uniquement, ne jamais exposer côté client)
```

> **Important :** La clé `service_role` ne doit jamais être commitée ni partagée publiquement. Si elle a été exposée, régénérez-la dans le [dashboard Supabase](https://supabase.com/dashboard/project/abxgsuuyqplvcqescwbb/settings/api).

## Migrations automatiques

Les migrations s'exécutent **automatiquement** :
- avant `npm run dev` (`predev`)
- avant `npm run build` (`prebuild`)
- au démarrage du serveur Next.js (`instrumentation.ts`)

### Configuration requise

Ajoutez le **mot de passe PostgreSQL** dans `.env.local` :

```
SUPABASE_DB_PASSWORD=votre_mot_de_passe
```

Trouvez-le dans Supabase → **Settings → Database → Database password**  
[https://supabase.com/dashboard/project/abxgsuuyqplvcqescwbb/database/settings](https://supabase.com/dashboard/project/abxgsuuyqplvcqescwbb/database/settings)

Les migrations sont suivies dans la table `_schema_migrations` (pas de double exécution).

### Commandes manuelles

```bash
npm run db:migrate          # Appliquer les migrations
SKIP_DB_MIGRATE=true npm run dev   # Démarrer sans migration
```

## Étape obligatoire — Migration base de données

~~Les tables n'existent pas encore~~ — **Automatique** avec `SUPABASE_DB_PASSWORD` configuré.

Si vous préférez le SQL manuel :

1. Ouvrez l'éditeur SQL :  
   [https://supabase.com/dashboard/project/abxgsuuyqplvcqescwbb/sql/new](https://supabase.com/dashboard/project/abxgsuuyqplvcqescwbb/sql/new)

2. Copiez-collez le contenu de [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)

3. Cliquez **Run**

**Alternative CLI** (si vous avez le mot de passe PostgreSQL) :

```bash
# Ajoutez dans .env.local :
# DATABASE_URL=postgresql://postgres:[MOT_DE_PASSE]@db.abxgsuuyqplvcqescwbb.supabase.co:5432/postgres

npm run db:migrate
```

## Démarrage

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) → **Inscription** pour créer votre organisation (premier utilisateur = admin).

## Langues

- Sélecteur **FR / EN** dans l'en-tête (dashboard) et pages auth
- Langue par défaut : **Français**
- Préférence sauvegardée dans un cookie

## Fonctionnalités (Phase 1)

| Module | FR | EN |
|--------|----|----|
| Auth | Connexion / Inscription | Login / Signup |
| Dashboard | KPIs, graphiques, activité | KPIs, charts, activity |
| Leads | Kanban + tableau, CRUD, Realtime | Kanban + table, CRUD, Realtime |
| Tâches | Liste + calendrier, CRUD | List + calendar, CRUD |

## Données de test (optionnel)

Après inscription, exécutez [`supabase/seed.sql`](supabase/seed.sql) en remplaçant `YOUR_ORG_ID` et `YOUR_USER_ID`.
