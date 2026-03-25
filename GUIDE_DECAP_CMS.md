# GUIDE DE DÉPLOIEMENT — Decap CMS + Cloudflare Pages
## Delices Medias Group · Blog Dynamique

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│  Kouimi (Admin)  →  /admin/  →  Decap CMS Interface     │
│                          ↓                              │
│              GitHub OAuth (via CF Functions)            │
│                          ↓                              │
│         Écrit fichiers JSON dans GitHub Repo            │
│                          ↓                              │
│  Visiteurs  →  blog.html  →  GitHub API (lecture)       │
│                          ↓                              │
│              Articles affichés dynamiquement            │
└─────────────────────────────────────────────────────────┘
```

**Pas de build step.** Tout est statique + fetch client-side.

---

## ÉTAPE 1 — Créer un repo GitHub

1. Aller sur **github.com** → "New repository"
2. Nom : `delicesmedias-site` (ou autre)
3. Visibilité : **Public** (requis pour l'API gratuite GitHub)
4. Cocher "Add README"
5. Copier le contenu du ZIP dans ce repo

```bash
# En ligne de commande (optionnel)
git clone https://github.com/VOTRE_USERNAME/delicesmedias-site
cp -r /chemin/vers/site/* delicesmedias-site/
cd delicesmedias-site
git add .
git commit -m "Initial site deploy"
git push
```

---

## ÉTAPE 2 — Créer une OAuth App GitHub

1. GitHub → Settings → Developer settings → **OAuth Apps**
2. Cliquer **"New OAuth App"**
3. Remplir :
   - **Application name** : `Delices Medias CMS`
   - **Homepage URL** : `https://delicesmedias.com`
   - **Authorization callback URL** : `https://delicesmedias.com/api/auth`
     _(ou `https://VOTRE-PROJET.pages.dev/api/auth` si pas encore de domaine)_
4. Cliquer **Register application**
5. **Noter le Client ID**
6. Cliquer **Generate a new client secret** → **Noter le Secret**

---

## ÉTAPE 3 — Déployer sur Cloudflare Pages

1. **Cloudflare Dashboard** → Workers & Pages → Create → Pages
2. Connecter votre repo GitHub
3. Configuration du build :
   - **Framework preset** : None
   - **Build command** : _(laisser vide)_
   - **Build output directory** : `/` (ou `.`)
4. Cliquer **Save and Deploy**
5. Cloudflare va déployer le site sur `VOTRE-PROJET.pages.dev`

---

## ÉTAPE 4 — Variables d'environnement Cloudflare

Dans Cloudflare Pages → votre projet → **Settings → Environment variables** :

| Variable              | Valeur                         |
|-----------------------|--------------------------------|
| `GITHUB_CLIENT_ID`    | _(Client ID de l'étape 2)_     |
| `GITHUB_CLIENT_SECRET`| _(Client Secret de l'étape 2)_ |

**Important** : Ajouter pour **Production** ET **Preview** environments.

---

## ÉTAPE 5 — Configurer admin/config.yml

Ouvrir `admin/config.yml` et modifier les deux lignes :

```yaml
backend:
  name: github
  repo: VOTRE_USERNAME/delicesmedias-site   # ← Modifier ici
  branch: main
  base_url: https://delicesmedias.com        # ← Modifier ici (votre domaine)
  auth_endpoint: /api/auth
```

Si vous n'avez pas encore de domaine custom, utiliser :
```yaml
  base_url: https://VOTRE-PROJET.pages.dev
```

---

## ÉTAPE 6 — Configurer blog-loader.js

Ouvrir `js/blog-loader.js` et modifier :

```javascript
const GITHUB_REPO = 'VOTRE_USERNAME/delicesmedias-site'; // ← Modifier
```

---

## ÉTAPE 7 — Pousser les changements et tester

```bash
git add .
git commit -m "Configure Decap CMS"
git push
```

Cloudflare redéploie automatiquement (1-2 minutes).

**Tester l'accès CMS** :
→ `https://votre-site.pages.dev/admin/`

---

## UTILISATION DU CMS

### Créer un article de blog

1. Aller sur `https://delicesmedias.com/admin/`
2. Se connecter avec le compte GitHub
3. Cliquer **"Articles de Blog"** → **"New Article"**
4. Remplir : Titre, Date, Catégorie, Image, Contenu (Markdown)
5. Cocher **"Publié"** si prêt à publier
6. Cliquer **"Publish"** (ou "Save Draft" pour brouillon)
7. Le fichier JSON est automatiquement sauvegardé dans `_posts/`
8. La page blog se met à jour instantanément (via GitHub API)

### Collections disponibles dans le CMS

| Collection     | Dossier        | Affiché sur        |
|----------------|----------------|--------------------|
| Blog           | `_posts/`      | `blog.html`        |
| Événements     | `_events/`     | `events.html`      |
| Portfolio      | `_portfolio/`  | `portfolio.html`   |
| Témoignages    | `_testimonials/`| `testimonials.html`|
| Équipe         | `_team/`       | `team.html`        |
| Partenaires    | `_partners/`   | `partners.html`    |
| Paramètres     | `_data/`       | Toutes les pages   |

---

## STRUCTURE DES FICHIERS AJOUTÉS

```
delicesmedias/
├── admin/
│   ├── index.html          ← Interface Decap CMS
│   └── config.yml          ← Configuration CMS (à modifier)
├── functions/
│   └── api/
│       └── auth.js         ← Cloudflare Function OAuth
├── _posts/                 ← Articles de blog (JSON)
│   ├── 2026-03-24-impact-medias...json
│   └── 2026-03-15-tendances...json
├── js/
│   ├── main.js             ← Animations (inchangé)
│   └── blog-loader.js      ← Chargeur dynamique GitHub API
└── blog.html               ← Page blog (mise à jour)
```

---

## DÉPANNAGE

**"Erreur 404 sur /api/auth"**
→ Vérifier que le dossier `functions/api/auth.js` est à la racine du projet
→ Cloudflare Pages Functions doivent être au niveau racine, pas dans un sous-dossier

**"Articles ne s'affichent pas"**
→ Vérifier `GITHUB_REPO` dans `js/blog-loader.js`
→ Le repo doit être **Public** pour l'API gratuite
→ Vérifier que les fichiers JSON dans `_posts/` ont `"published": true`

**"Cannot authenticate"**
→ Vérifier `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET` dans CF Pages
→ Vérifier la callback URL dans l'OAuth App GitHub (doit correspondre exactement)

**"Rate limit GitHub API"**
→ L'API GitHub gratuite permet 60 req/h non authentifié
→ Pour un site à fort trafic, utiliser un token d'accès GitHub dans les headers

---

## NOTES

- Les articles sont stockés en **JSON dans le repo GitHub** — versionning automatique
- Chaque sauvegarde CMS = un commit GitHub visible dans l'historique
- Aucune base de données, aucun serveur à gérer
- Coût : **GRATUIT** (GitHub gratuit + Cloudflare Pages gratuit)
- L'interface `/admin/` est accessible à tous — protéger avec
  **Cloudflare Access** pour limiter aux admins si nécessaire

---

*Guide rédigé pour Delices Medias Group · Kinerty · 2026*
