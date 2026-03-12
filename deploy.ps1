# Script de deploiement CareforAudio pour Windows PowerShell
# Copie les fichiers sur le serveur et optionnellement lance docker compose

param(
    [switch]$AutoDeploy  # Ajouter -AutoDeploy pour lancer docker compose automatiquement sur le serveur
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Deploiement CareforAudio" -ForegroundColor Green

# Charger les variables d'environnement depuis .env
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "ERREUR: Fichier .env non trouve" -ForegroundColor Red
    exit 1
}

# Verifier les variables necessaires
$deployHost = $env:DEPLOY_HOST
$deployUser = $env:DEPLOY_USER
$deployPath = $env:DEPLOY_PATH

if (-not $deployHost -or -not $deployUser -or -not $deployPath) {
    Write-Host "ERREUR: Variables de deploiement manquantes dans .env" -ForegroundColor Red
    Write-Host "Ajoutez ces variables a votre .env :"
    Write-Host "  DEPLOY_HOST=votre-serveur.com"
    Write-Host "  DEPLOY_USER=votre-utilisateur"
    Write-Host "  DEPLOY_PATH=/opt/careforaudio"
    Write-Host "  DEPLOY_SSH_KEY=C:\Users\VotreUser\.ssh\id_rsa (optionnel)"
    Write-Host "  DEPLOY_SSH_PORT=22 (optionnel)"
    exit 1
}

# Configuration SSH
$sshKeyPath = if ($env:DEPLOY_SSH_KEY) {
    if ($env:DEPLOY_SSH_KEY -like "~/*") {
        $env:DEPLOY_SSH_KEY -replace "~", $env:USERPROFILE
    } else {
        $env:DEPLOY_SSH_KEY
    }
} else {
    "$env:USERPROFILE\.ssh\id_rsa"
}
$sshKey = $sshKeyPath
$sshPort = if ($env:DEPLOY_SSH_PORT) { $env:DEPLOY_SSH_PORT } else { "22" }

Write-Host "Preparation du deploiement..." -ForegroundColor Yellow
Write-Host "  Host: $deployUser@$deployHost"
Write-Host "  Path: $deployPath"
Write-Host "  SSH Key: $sshKey"
if ($AutoDeploy) {
    Write-Host "  Mode: deploiement automatique (docker compose inclus)" -ForegroundColor Cyan
} else {
    Write-Host "  Mode: copie uniquement (utilisez -AutoDeploy pour lancer docker automatiquement)"
}

# Creer l'archive a deployer
Write-Host "Creation de l'archive..." -ForegroundColor Yellow

if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar --exclude='.git' `
        --exclude='node_modules' `
        --exclude='dist' `
        --exclude='.next' `
        --exclude='*.log' `
        --exclude='coverage' `
        --exclude='.vscode' `
        --exclude='.idea' `
        --exclude='.DS_Store' `
        --exclude='.env' `
        --exclude='.env.*' `
        -czf "$env:TEMP\careforaudio-deploy.tar.gz" .
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR: Echec de la creation de l'archive" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ERREUR: 'tar' n'est pas disponible. Installez Git Bash ou utilisez WSL." -ForegroundColor Red
    exit 1
}

# Copier l'archive vers le serveur
Write-Host "Copie vers le serveur..." -ForegroundColor Yellow
& scp -i "$sshKey" -P $sshPort "$env:TEMP\careforaudio-deploy.tar.gz" "${deployUser}@${deployHost}:/tmp/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Echec de la copie SCP" -ForegroundColor Red
    exit 1
}

# Nettoyer l'archive locale
Remove-Item "$env:TEMP\careforaudio-deploy.tar.gz" -ErrorAction SilentlyContinue

# Script distant : extraction + docker compose si -AutoDeploy
Write-Host "Extraction sur le serveur..." -ForegroundColor Yellow

$dockerBlock = if ($AutoDeploy) { @"

echo "[INFO] Arret des conteneurs existants..."
docker compose -f docker-compose.prod.yml down

echo "[INFO] Demarrage des conteneurs..."
docker compose -f docker-compose.prod.yml up -d --build

echo "[SUCCES] Application demarree !"
docker compose -f docker-compose.prod.yml ps
"@ } else { @"

echo "[INFO] Pour demarrer l'application, executez:"
echo "  cd $deployPath"
echo "  docker compose -f docker-compose.prod.yml down"
echo "  docker compose -f docker-compose.prod.yml up -d --build"
"@ }

$remoteScript = @"
set -e

echo "[INFO] Creation du dossier de deploiement..."
sudo mkdir -p $deployPath
sudo chown -R `$USER:`$USER $deployPath || true
cd $deployPath

echo "[INFO] Extraction de l'archive..."
tar -xzf /tmp/careforaudio-deploy.tar.gz -C . --no-same-owner --no-same-permissions 2>&1 | grep -v "Permission denied" || true
sudo chown -R `$USER:`$USER . 2>/dev/null || chown -R `$USER:`$USER . 2>/dev/null || true
rm /tmp/careforaudio-deploy.tar.gz

echo "[SUCCES] Fichiers copies avec succes dans $deployPath"
$dockerBlock
"@

# Ecrire le script dans un fichier temporaire local avec fins de ligne Unix
$localScriptPath = "$env:TEMP\careforaudio-deploy-script.sh"
$remoteScriptUnix = $remoteScript -replace "`r`n", "`n" -replace "`r", "`n"
[System.IO.File]::WriteAllText($localScriptPath, $remoteScriptUnix, [System.Text.UTF8Encoding]::new($false))

# Copier le script sur le serveur
Write-Host "Copie du script d'extraction..." -ForegroundColor Yellow
& scp -i "$sshKey" -P $sshPort "$localScriptPath" "${deployUser}@${deployHost}:/tmp/careforaudio-deploy-script.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Echec de la copie du script" -ForegroundColor Red
    exit 1
}

# Executer le script sur le serveur
& ssh -i "$sshKey" -p $sshPort "${deployUser}@${deployHost}" "bash /tmp/careforaudio-deploy-script.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Echec du script distant" -ForegroundColor Red
    exit 1
}

# Nettoyer le script local
Remove-Item $localScriptPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deploiement termine !" -ForegroundColor Green

if (-not $AutoDeploy) {
    Write-Host "Pour demarrer l'application, connectez-vous au serveur et executez:" -ForegroundColor Yellow
    Write-Host "  ssh -i $sshKey -p $sshPort $deployUser@$deployHost" -ForegroundColor Cyan
    Write-Host "  cd $deployPath" -ForegroundColor Cyan
    Write-Host "  docker compose -f docker-compose.prod.yml down" -ForegroundColor Cyan
    Write-Host "  docker compose -f docker-compose.prod.yml up -d --build" -ForegroundColor Cyan
}
