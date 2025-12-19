# Careformance Audio - MVP Local

Application SaaS de diffusion audio pour athlètes.

## Prérequis

1.  **Node.js** (v18+)
2.  **PostgreSQL** (installé et lancé localement)

## Installation & Démarrage

### 1. Configuration de la Base de Données

Créez une base de données PostgreSQL nommée `careformance` :
```bash
# Exemple si psql est installé (ou utilisez pgAdmin)
createdb careformance
```

### 2. Backend (Serveur API)

Ouvrez un terminal dans le dossier `backend` :

1.  Installez les dépendances :
    ```bash
    npm install
    ```

2.  Configurez l'environnement :
    Créez un fichier `.env` dans `backend/` avec le contenu suivant :
    ```env
    DATABASE_URL="postgresql://postgres:password@localhost:5432/careformance?schema=public"
    JWT_SECRET="supersecretkey"
    JWT_REFRESH_SECRET="superrefreshkey"
    PORT=3000
    API_URL="http://localhost:3000"
    ```
    *(Remplacez `postgres:password` par votre utilisateur/mot de passe Postgres local)*

3.  Initialisez la base de données et les données de test :
    ```bash
    npm run prisma:migrate
    npm run seed
    ```

4.  Lancez le serveur :
    ```bash
    npm run dev
    ```
    Le serveur tourne sur `http://localhost:3000`. Les fichiers uploadés iront dans `backend/uploads`.

### 3. Frontend (Application Web)

Ouvrez un **nouveau** terminal dans le dossier `frontend` :

1.  Installez les dépendances :
    ```bash
    npm install
    ```

2.  Lancez l'application :
    ```bash
    npm run dev
    ```
    Accédez à `http://localhost:5173`.

## Identifiants de Test

- **Admin** : `admin@careformance.com` / `admin`
- **Athlète** : `athlete@careformance.com` / `care1234!`

## Fonctionnalités MVP

- **Auth** : Login, Refresh Token, Hashage mot de passe.
- **Rôles** : Admin (Gestion) vs User (Écoute).
- **Audio** : 
    - L'Admin peut uploader des fichiers `.mp3`, `.wav`.
    - Les fichiers sont stockés localement dans `backend/uploads/`.
    - L'utilisateur ne voit que les audios autorisés (par groupe ou accès direct).
