#!/bin/bash
# Script de deploiement CareforAudio pour macOS/Linux
# Usage: ./deploy.sh [--auto-deploy]

set -e

AUTO_DEPLOY=false
if [[ "$1" == "--auto-deploy" ]]; then
    AUTO_DEPLOY=true
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Deploiement CareforAudio${NC}"

# Charger les variables d'environnement depuis .env
if [ -f .env ]; then
    export $(grep -v '^\s*#' .env | grep '=' | xargs)
else
    echo -e "${RED}ERREUR: Fichier .env non trouve${NC}"
    exit 1
fi

# Verifier les variables necessaires
if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ] || [ -z "$DEPLOY_PATH" ]; then
    echo -e "${RED}ERREUR: Variables de deploiement manquantes dans .env${NC}"
    echo "Ajoutez ces variables a votre .env :"
    echo "  DEPLOY_HOST=votre-serveur.com"
    echo "  DEPLOY_USER=votre-utilisateur"
    echo "  DEPLOY_PATH=/opt/careforaudio"
    echo "  DEPLOY_SSH_KEY=~/.ssh/id_rsa (optionnel)"
    echo "  DEPLOY_SSH_PORT=22 (optionnel)"
    exit 1
fi

# Configuration SSH
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_rsa}"
SSH_PORT="${DEPLOY_SSH_PORT:-22}"

echo -e "${YELLOW}Preparation du deploiement...${NC}"
echo "  Host: $DEPLOY_USER@$DEPLOY_HOST"
echo "  Path: $DEPLOY_PATH"
echo "  SSH Key: $SSH_KEY"
if [ "$AUTO_DEPLOY" = true ]; then
    echo -e "  Mode: ${CYAN}deploiement automatique (docker compose inclus)${NC}"
else
    echo "  Mode: copie uniquement (utilisez --auto-deploy pour lancer docker automatiquement)"
fi

# Creer l'archive
echo -e "${YELLOW}Creation de l'archive...${NC}"
ARCHIVE_PATH="/tmp/careforaudio-deploy.tar.gz"

tar --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.next' \
    --exclude='*.log' \
    --exclude='coverage' \
    --exclude='.vscode' \
    --exclude='.idea' \
    --exclude='.DS_Store' \
    --exclude='.env' \
    --exclude='.env.*' \
    -czf "$ARCHIVE_PATH" .

# Copier l'archive vers le serveur
echo -e "${YELLOW}Copie vers le serveur...${NC}"
scp -i "$SSH_KEY" -P "$SSH_PORT" "$ARCHIVE_PATH" "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/"

# Nettoyer l'archive locale
rm -f "$ARCHIVE_PATH"

# Script distant
echo -e "${YELLOW}Extraction sur le serveur...${NC}"

if [ "$AUTO_DEPLOY" = true ]; then
    DOCKER_BLOCK='
echo "[INFO] Arret des conteneurs existants..."
docker compose -f docker-compose.prod.yml down

echo "[INFO] Demarrage des conteneurs..."
docker compose -f docker-compose.prod.yml up -d --build

echo "[SUCCES] Application demarree !"
docker compose -f docker-compose.prod.yml ps'
else
    DOCKER_BLOCK="
echo \"[INFO] Pour demarrer l'application, executez:\"
echo \"  cd $DEPLOY_PATH\"
echo \"  docker compose -f docker-compose.prod.yml down\"
echo \"  docker compose -f docker-compose.prod.yml up -d --build\""
fi

REMOTE_SCRIPT="set -e

echo '[INFO] Creation du dossier de deploiement...'
sudo mkdir -p $DEPLOY_PATH
sudo chown -R \$USER:\$USER $DEPLOY_PATH || true
cd $DEPLOY_PATH

echo '[INFO] Extraction de l archive...'
tar -xzf /tmp/careforaudio-deploy.tar.gz -C . --no-same-owner --no-same-permissions 2>&1 | grep -v 'Permission denied' || true
sudo chown -R \$USER:\$USER . 2>/dev/null || chown -R \$USER:\$USER . 2>/dev/null || true
rm /tmp/careforaudio-deploy.tar.gz

echo '[SUCCES] Fichiers copies avec succes dans $DEPLOY_PATH'
$DOCKER_BLOCK"

ssh -i "$SSH_KEY" -p "$SSH_PORT" "${DEPLOY_USER}@${DEPLOY_HOST}" "$REMOTE_SCRIPT"

echo ""
echo -e "${GREEN}Deploiement termine !${NC}"

if [ "$AUTO_DEPLOY" = false ]; then
    echo -e "${YELLOW}Pour demarrer l'application, connectez-vous au serveur et executez:${NC}"
    echo -e "${CYAN}  ssh -i $SSH_KEY -p $SSH_PORT $DEPLOY_USER@$DEPLOY_HOST${NC}"
    echo -e "${CYAN}  cd $DEPLOY_PATH${NC}"
    echo -e "${CYAN}  docker compose -f docker-compose.prod.yml down${NC}"
    echo -e "${CYAN}  docker compose -f docker-compose.prod.yml up -d --build${NC}"
fi
