# 🏨 Les Résidences d'Émeraude — Guide de Déploiement Netlify

## Architecture de la conversion

```
AVANT (Flask/Render)          →    APRÈS (Netlify)
─────────────────────────────      ─────────────────────────────
Flask (Python)                →    Netlify Functions (Node.js)
SQLite (fichier local)        →    Supabase (PostgreSQL cloud)
Session cookie Flask          →    JWT Bearer Token (localStorage)
Stockage local uploads/       →    Cloudinary (cloud d'images)
Serveur Render.com            →    Netlify CDN mondial
```

---

## ÉTAPE 1 — Créer un compte Supabase (Base de données)

1. Aller sur **https://supabase.com** → "Start for free"
2. Créer un projet :
   - **Name** : `residences-emeraude`
   - **Database Password** : choisir un mot de passe fort (le noter !)
   - **Region** : `West EU (Ireland)` ou `US East` (le plus proche)
3. Attendre ~2 minutes que le projet s'initialise
4. Aller dans **SQL Editor** → "New Query"
5. Copier-coller **tout le contenu** du fichier `supabase-schema.sql`
6. Cliquer **"Run"** → Vous verrez "Success. No rows returned"
7. Récupérer vos clés :
   - **Project Settings** → **API**
   - Copier `Project URL` → ce sera `SUPABASE_URL`
   - Copier `service_role` (secret) → ce sera `SUPABASE_SERVICE_KEY`
   - ⚠️ **NE PAS utiliser la clé `anon`** — utiliser `service_role`

---

## ÉTAPE 2 — Créer un compte Cloudinary (Images)

1. Aller sur **https://cloudinary.com** → "Sign Up for Free"
2. Dans le **Dashboard** (page d'accueil après connexion), noter :
   - `Cloud name` → `CLOUDINARY_CLOUD_NAME`
   - `API Key` → `CLOUDINARY_API_KEY`
   - `API Secret` → `CLOUDINARY_API_SECRET`
3. Aller dans **Settings** → **Upload** → Section "Upload presets"
   - Créer un preset `unsigned` nommé `emeraude` (pour uploads directs si besoin)

---

## ÉTAPE 3 — Déployer sur Netlify

### Option A — Via GitHub (Recommandé)

1. Créer un repo GitHub `residences-emeraude` (privé ou public)
2. Uploader ce dossier complet dans le repo
3. Aller sur **https://netlify.com** → "Add new site" → "Import from Git"
4. Connecter GitHub, sélectionner le repo
5. Configuration build :
   - **Build command** : *(laisser vide)*
   - **Publish directory** : `public`
   - **Functions directory** : `netlify/functions`
6. Cliquer **"Deploy site"**

### Option B — Drag & Drop (Rapide)

1. Aller sur **https://netlify.com** → "Add new site" → "Deploy manually"
2. Glisser-déposer le dossier **`public/`** dans la zone de drop
3. ⚠️ Cette option ne déploie **pas** les Functions — utiliser GitHub

---

## ÉTAPE 4 — Configurer les Variables d'Environnement

Dans Netlify → **Site configuration** → **Environment variables** → **Add variable** :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | URL de votre projet Supabase |
| `SUPABASE_SERVICE_KEY` | `eyJhbGc...` | Clé service_role Supabase |
| `CLOUDINARY_CLOUD_NAME` | `moncloud` | Votre cloud name Cloudinary |
| `CLOUDINARY_API_KEY` | `123456789` | API Key Cloudinary |
| `CLOUDINARY_API_SECRET` | `abcdefgh...` | API Secret Cloudinary |
| `ADMIN_USERNAME` | `admin` | Identifiant admin (changer!) |
| `ADMIN_PASSWORD` | `VotreMotDePasse2026!` | Mot de passe admin (fort!) |
| `JWT_SECRET` | `une-chaine-aleatoire-longue-32-chars` | Secret pour signer les tokens JWT |
| `ALLOWED_ORIGIN` | `https://votre-site.netlify.app` | Domaine de votre site |

**Générer un JWT_SECRET fort** : aller sur https://www.uuidgenerator.net/version4 et concaténer 2 UUID.

Après avoir ajouté toutes les variables → **Trigger deploy** → **Deploy site**.

---

## ÉTAPE 5 — Vérifier le déploiement

1. Attendre que le build soit "Published" (vert)
2. Ouvrir votre URL Netlify : `https://xxxxx.netlify.app`
3. La page d'accueil doit charger avec les chambres et settings
4. Tester `/admin` → Se connecter avec vos identifiants
5. Tester l'upload d'une image dans l'admin → doit apparaître sur Cloudinary

---

## ÉTAPE 6 — Domaine personnalisé (Optionnel)

1. Dans Netlify → **Domain management** → **Add custom domain**
2. Entrer : `residences-emeraude.ci` (ou votre domaine)
3. Configurer les DNS chez votre registrar pour pointer vers Netlify
4. Netlify génère automatiquement un certificat SSL (HTTPS) gratuit

---

## Structure des fichiers

```
residences-emeraude-netlify/
├── netlify.toml                    ← Config Netlify (redirects, functions)
├── package.json                    ← Dépendances Node.js des Functions
├── supabase-schema.sql             ← Schéma BDD à exécuter sur Supabase
│
├── public/                         ← Site statique (Netlify CDN)
│   ├── index.html                  ← Page publique
│   ├── admin.html                  ← Panneau d'administration
│   ├── css/style.css               ← Styles
│   └── js/
│       ├── main.js                 ← Logique page publique
│       └── admin.js                ← Logique admin (JWT adapté)
│
└── netlify/functions/              ← API Serverless (remplace Flask)
    ├── api.js                      ← Dispatcher principal → /api/*
    ├── _shared/
    │   └── db.js                   ← Supabase client + JWT helpers
    └── handlers/
        ├── auth.js                 ← Login/logout/check-auth
        ├── settings.js             ← Paramètres du site
        ├── rooms.js                ← Chambres (CRUD)
        ├── reservations.js         ← Réservations
        ├── amenities.js            ← Commodités
        ├── testimonials.js         ← Témoignages
        ├── contacts.js             ← Formulaire contact
        ├── gallery.js              ← Galerie photos
        ├── services.js             ← Services additionnels
        ├── newsletter.js           ← Abonnements newsletter
        ├── upload.js               ← Upload images → Cloudinary
        └── stats.js                ← Statistiques dashboard admin
```

---

## Limites gratuites (Free tier)

| Service | Limite gratuite | Suffisant ? |
|---------|----------------|-------------|
| **Netlify** | 100GB bande passante/mois, 125k Functions/mois | ✅ Largement |
| **Supabase** | 500MB BDD, 5GB transfert/mois | ✅ Oui |
| **Cloudinary** | 25GB stockage, 25GB bande passante/mois | ✅ Oui |

---

## Dépannage

**"Function not found"** → Vérifier que `netlify/functions/` est bien dans le repo (pas seulement `public/`)

**"Supabase connection error"** → Vérifier `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` dans les variables d'env

**"401 Non authentifié"** → Le token JWT a expiré (8h). Se reconnecter dans l'admin.

**Images non affichées** → Vérifier les 3 variables Cloudinary. Les anciens uploads locaux ne sont pas migrés — re-uploader via l'admin.

---

## Migration des données existantes

Si vous avez des données dans l'ancienne BDD SQLite :

```bash
# Sur votre machine locale avec Python + supabase-py
pip install supabase
python3 migrate_sqlite_to_supabase.py
```

Contactez KING SERVICE pour assistance sur la migration des données.

---

*Développé par **KING SERVICE** — Solutions Logicielles, Côte d'Ivoire*
