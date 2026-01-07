# 🏗️ NORD BATI PLANNING v3.0

Application de planning de chantiers pour Nord Bati Construction avec assistant IA vocal/texte et **persistance des données Supabase**.

## 🚀 Stack technique

- **Frontend** : React 18 + Vite
- **Backend API** : Vercel Serverless Functions
- **Base de données** : Supabase (PostgreSQL)
- **IA** : Claude API (Anthropic) avec Tools/Functions
- **Reconnaissance vocale** : Web Speech API

## 📦 Installation

### 1. Cloner et installer les dépendances

```bash
git clone <repo>
cd nord-bati-ia
npm install
```

### 2. Configuration Supabase

#### 2.1. Créer un projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte
2. Crée un nouveau projet (gratuit)
3. Attends que le projet soit initialisé (~2 minutes)

#### 2.2. Créer les tables

1. Dans Supabase, va dans **SQL Editor**
2. Copie-colle le contenu de `supabase-schema.sql`
3. Clique sur **Run** pour exécuter le script

#### 2.3. Récupérer les clés API

1. Va dans **Settings** > **API**
2. Copie :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public key** (ex: `eyJhbGci...`)

#### 2.4. Configurer les variables d'environnement

Crée un fichier `.env.local` à la racine :

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Configuration Vercel (pour le déploiement)

Dans les **Environment Variables** de ton projet Vercel, ajoute :

| Variable | Valeur |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

### 4. Lancer en développement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## 📊 Structure de la base de données

```
chantiers
├── id (BIGSERIAL)
├── nom (TEXT)
├── adresse (TEXT)
├── client (TEXT)
├── telephone (TEXT)
├── type (TEXT: 'TCE' | 'Partiel')
├── notes (TEXT)
├── statut (TEXT: 'planifie' | 'en_cours' | 'termine' | 'annule')
└── timestamps

lots
├── id (BIGSERIAL)
├── chantier_id (FK -> chantiers)
├── corps (TEXT)
├── date_debut (DATE)
├── date_fin (DATE)
├── equipe_id (INTEGER)
├── statut (TEXT)
└── timestamps

documents
├── id (BIGSERIAL)
├── chantier_id (FK -> chantiers)
├── nom (TEXT)
├── type (TEXT)
├── url (TEXT)
└── date_ajout

taches_livreur
├── id (BIGSERIAL)
├── description (TEXT)
├── date (DATE)
├── fait (BOOLEAN)
└── timestamps

instructions_utilisateur
├── id (BIGSERIAL)
├── texte (TEXT)
├── active (BOOLEAN)
└── created_at

rappels_valides
├── id (TEXT PRIMARY KEY)
└── validated_at
```

## 🎙️ Commandes vocales / texte

L'assistant IA comprend des commandes naturelles :

- "Crée un nouveau chantier Dupont à Tourcoing"
- "Ajoute la maçonnerie du 15 au 30 janvier"
- "Montre-moi le planning"
- "Démol 1 commence la démolition lundi"
- "À partir de maintenant, mets toujours 2 semaines par lot"

## 🔧 Architecture des fichiers

```
nord-bati-ia/
├── src/
│   ├── App.jsx              # Application React principale
│   ├── main.jsx             # Point d'entrée
│   ├── supabaseClient.js    # Client + services CRUD Supabase
│   └── useSupabaseData.js   # Hook de synchronisation données
├── api/
│   └── interpret.js         # API serverless Claude
├── supabase-schema.sql      # Schéma SQL complet
├── .env.example             # Template variables d'environnement
├── package.json
├── vite.config.js
└── vercel.json
```

## ⚡ Fonctionnalités

### Implémentées ✅
- Vue "Aujourd'hui" avec lots du jour
- Vue Planning (Gantt 2 semaines)
- Vue par chantier avec documents
- Vue par équipe
- Planning Alex (livreur)
- Assistant IA vocal et texte
- Mémoire conversationnelle (20 messages)
- Instructions utilisateur persistantes
- Rappels automatiques (voirie, Consuel, Qualigaz)
- **Persistance Supabase** avec sync temps réel

### Prochaines évolutions 🔮
- Authentification utilisateurs
- Notifications push / email
- Export PDF des plannings
- Upload réel des documents
- Mode hors-ligne (Service Worker)
- Application mobile (React Native / PWA)

## 📄 License

Propriétaire - Nord Bati Construction
