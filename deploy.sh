#!/usr/bin/env bash
# =============================================================================
# MzansiServe Deployment Script (Git-based)
# Usage: ./deploy.sh [--env-only | --restart-only | --logs | --setup]
# =============================================================================
set -e

# ─── Configuration ────────────────────────────────────────────────────────────
ZONE="us-central1-c"
INSTANCE="mzansiserveprod"
PROJECT="white-caster-270410"
REMOTE_DIR="/opt/mzansiserve"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="mzansiserve.co.za"
REPO_URL="git@github.com:MzansiServe/mzansiserve-main.git"
BRANCH="${DEPLOY_BRANCH:-$(git -C "$LOCAL_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'main')}"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Helper: run a command on the remote VM ───────────────────────────────────
remote() {
  gcloud compute ssh \
    --zone "$ZONE" \
    --project "$PROJECT" \
    --ssh-flag="-o StrictHostKeyChecking=no" \
    --ssh-flag="-o ServerAliveInterval=10" \
    --ssh-flag="-o ServerAliveCountMax=60" \
    --ssh-flag="-o TCPKeepAlive=yes" \
    "$INSTANCE" -- "$@"
}

# ─── Parse flags ─────────────────────────────────────────────────────────────
ACTION="deploy"
case "${1:-}" in
  --env-only)     ACTION="env"     ;;
  --restart-only) ACTION="restart" ;;
  --logs)         ACTION="logs"    ;;
  --setup)        ACTION="setup"   ;;
  --branch)       BRANCH="${2:?'--branch requires a branch name'}"; shift ;;
  --help|-h)
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  (no flag)       Full deploy: git pull + rebuild + restart"
    echo "  --setup         One-time setup: create SSH deploy key on server"
    echo "  --env-only      Upload .env file only, then restart"
    echo "  --restart-only  Restart containers without syncing code"
    echo "  --logs          Stream live logs from the VM"
    echo "  --branch NAME   Deploy a specific branch (default: current branch)"
    echo ""
    echo "Environment:"
    echo "  DEPLOY_BRANCH   Override the branch to deploy"
    exit 0
    ;;
esac

# ─── Validate gcloud is installed ────────────────────────────────────────────
command -v gcloud &>/dev/null || error "gcloud CLI not found. Install it: https://cloud.google.com/sdk/docs/install"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     MzansiServe  —  Deploy to GCP VM (Git)      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Stream logs ─────────────────────────────────────────────────────────────
if [[ "$ACTION" == "logs" ]]; then
  info "Streaming logs from VM (Ctrl+C to stop)…"
  remote "cd $REMOTE_DIR && docker compose logs -f --tail=100"
  exit 0
fi

# ─── Restart only ────────────────────────────────────────────────────────────
if [[ "$ACTION" == "restart" ]]; then
  info "Restarting containers on VM…"
  remote "cd $REMOTE_DIR && docker compose up -d"
  success "Containers restarted."
  exit 0
fi

# ─── Interactive Deployment Prompts ──────────────────────────────────────────
if [[ "$ACTION" == "deploy" ]]; then
  echo -e "${YELLOW}─── Deployment Configuration ───${NC}"
  
  # 1. Branch selection
  read -p "Deploy branch [$BRANCH]: " input_branch
  BRANCH=${input_branch:-$BRANCH}

  # 2. Repository selection (for forks)
  read -p "Repository URL [$REPO_URL]: " input_repo
  REPO_URL=${input_repo:-$REPO_URL}

  # 3. Seeding selection
  read -p "Run database seeders? (y/N): " input_seed
  if [[ "$input_seed" =~ ^[Yy]$ ]]; then
    RUN_SEEDERS="true"
  else
    RUN_SEEDERS="false"
  fi

  # 4. Confirmation
  echo ""
  echo -e "${CYAN}Summary:${NC}"
  echo -e "  Instance : $INSTANCE"
  echo -e "  Branch   : $BRANCH"
  echo -e "  Repo     : $REPO_URL"
  echo -e "  Seeding  : ${RUN_SEEDERS}"
  echo ""
  read -p "Proceed with deployment? (y/N): " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || error "Deployment cancelled by user."
  echo ""
fi

# ─── Setup: create SSH deploy key on server ──────────────────────────────────
setup_deploy_key() {
  info "Setting up SSH deploy key on the server…"
  remote "
    if [ ! -f ~/.ssh/deploy_key ]; then
      echo 'Generating new SSH deploy key…'
      ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N '' -C 'mzansiserve-deploy@gcp'
      # Configure SSH to use this key for GitHub
      cat > ~/.ssh/config << 'SSHEOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/deploy_key
  StrictHostKeyChecking no
SSHEOF
      chmod 600 ~/.ssh/config
      echo 'Deploy key created.'
    else
      echo 'Deploy key already exists.'
    fi
    echo ''
    echo '═══════════════════════════════════════════════════════════'
    echo '  Copy the public key below and add it as a Deploy Key at:'
    echo '  https://github.com/MzansiServe/mzansiserve-main/settings/keys'
    echo '  (Check \"Allow write access\" is NOT needed — read-only is fine)'
    echo '═══════════════════════════════════════════════════════════'
    echo ''
    cat ~/.ssh/deploy_key.pub
    echo ''
  "
}

if [[ "$ACTION" == "setup" ]]; then
  # Also ensure Docker is installed
  info "Step 1 — Ensuring Docker is installed…"
  remote "
    if ! command -v docker &>/dev/null; then
      echo 'Installing Docker…'
      curl -fsSL https://get.docker.com | sudo sh
      sudo usermod -aG docker \$(whoami)
      echo 'Docker installed.'
    else
      echo 'Docker already installed.'
    fi
    if ! docker compose version &>/dev/null 2>&1; then
      echo 'Installing Docker Compose plugin…'
      sudo apt-get install -y docker-compose-plugin 2>/dev/null || true
    else
      echo 'Docker Compose already installed.'
    fi
  "
  success "Docker ready."

  info "Step 2 — Ensuring Git is installed…"
  remote "
    if ! command -v git &>/dev/null; then
      echo 'Installing Git…'
      sudo apt-get update -qq && sudo apt-get install -y git
    else
      echo 'Git already installed.'
    fi
  "
  success "Git ready."

  info "Step 3 — Opening GCP firewall ports…"
  gcloud compute firewall-rules describe mzansiserve-http \
    --project "$PROJECT" &>/dev/null 2>&1 || \
  gcloud compute firewall-rules create mzansiserve-http \
    --project "$PROJECT" \
    --allow tcp:80,tcp:5006,tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server \
    --description "MzansiServe HTTP ports" \
    --quiet 2>/dev/null || true
  gcloud compute instances add-tags "$INSTANCE" \
    --zone "$ZONE" \
    --project "$PROJECT" \
    --tags http-server 2>/dev/null || true
  success "Firewall ready."

  info "Step 4 — Setting up SSH deploy key…"
  setup_deploy_key

  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   Setup complete!                                 ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${YELLOW}Next steps:${NC}"
  echo -e "  1. Copy the public key above"
  echo -e "  2. Go to: ${CYAN}https://github.com/MzansiServe/mzansiserve-main/settings/keys${NC}"
  echo -e "  3. Click ${GREEN}Add deploy key${NC}, paste the key, and save"
  echo -e "  4. Run: ${YELLOW}./deploy.sh${NC} to do your first git-based deploy"
  echo ""
  exit 0
fi

# ─── Upload environment file ─────────────────────────────────────────────────
ENV_FILE="$LOCAL_DIR/.env"
if [[ -f "$LOCAL_DIR/.env.production" ]]; then
  info "Using .env.production for deployment."
  ENV_FILE="$LOCAL_DIR/.env.production"
fi

info "Uploading $(basename "$ENV_FILE") to VM (as .env)…"
remote "sudo mkdir -p $REMOTE_DIR && sudo chown \$(whoami):\$(whoami) $REMOTE_DIR" 2>/dev/null || true
gcloud compute scp \
  --zone "$ZONE" \
  --project "$PROJECT" \
  "$ENV_FILE" \
  "${INSTANCE}:${REMOTE_DIR}/.env"
success ".env uploaded."

if [[ "$ACTION" == "env" ]]; then
  info "Recreating containers to pick up new .env…"
  remote "cd $REMOTE_DIR && docker compose up -d"
  success "Done — env-only deploy complete."
  exit 0
fi

# ─── Full deploy ──────────────────────────────────────────────────────────────

info "Step 1/5 — Pulling latest code from GitHub…"
remote "
  set -e

  # Ensure remote dir exists
  sudo mkdir -p $REMOTE_DIR && sudo chown \$(whoami):\$(whoami) $REMOTE_DIR
  cd $REMOTE_DIR

  if [ -d '.git' ]; then
    echo 'Repository exists. Running git pull…'
    git fetch origin
    git checkout $BRANCH 2>/dev/null || git checkout -b $BRANCH origin/$BRANCH
    git reset --hard origin/$BRANCH
    echo 'Pull complete.'
  else
    echo 'Initializing git in existing directory…'
    git init
    git remote add origin $REPO_URL 2>/dev/null || git remote set-url origin $REPO_URL
    git fetch origin
    # Overwrite any existing files that conflict with the repo
    git reset --hard origin/$BRANCH
    git checkout $BRANCH 2>/dev/null || git checkout -b $BRANCH
    git branch --set-upstream-to=origin/$BRANCH $BRANCH 2>/dev/null || true
    echo 'Git initialized and synced.'
  fi

  echo ''
  echo 'Latest commit:'
  git log --oneline -1
"
success "Code synced via git (branch: $BRANCH)."

info "Step 2/5 — Ensuring .env is in place…"
# Re-upload .env after git pull (git won't touch it because it's in .gitignore,
# but let's be safe in case the first clone didn't have it)
gcloud compute scp \
  --zone "$ZONE" \
  --project "$PROJECT" \
  "$ENV_FILE" \
  "${INSTANCE}:${REMOTE_DIR}/.env" 2>/dev/null
success ".env verified."

info "Step 3/5 — Building & starting containers…"
PUBLIC_IP=$(gcloud compute instances describe "$INSTANCE" \
  --zone "$ZONE" \
  --project "$PROJECT" \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "34.30.76.206")
info "  Public IP: $PUBLIC_IP"

remote "
  set -e
  cd $REMOTE_DIR

  # Inject domain or IP so VITE_API_URL is correct for the frontend build
  [[ -n '$DOMAIN' ]] && HOST='$DOMAIN' || HOST='$PUBLIC_IP'
  export PUBLIC_IP=$PUBLIC_IP
  export HOST=\$HOST
  if [[ -n '$DOMAIN' ]]; then
    export VITE_API_URL='https://$DOMAIN'
  else
    export VITE_API_URL='http://$PUBLIC_IP:5006'
  fi

  # ── Free up ports from any host-level services ──
  echo 'Freeing ports on host...'
  sudo systemctl stop nginx   2>/dev/null || true
  sudo systemctl disable nginx 2>/dev/null || true
  sudo systemctl stop apache2  2>/dev/null || true
  sudo systemctl disable apache2 2>/dev/null || true
  sudo fuser -k 80/tcp   2>/dev/null || true
  sudo fuser -k 5006/tcp 2>/dev/null || true
  sudo fuser -k 443/tcp  2>/dev/null || true
  sleep 1
  echo 'Ports cleared.'

  # Make entrypoint executable
  chmod +x docker-entrypoint.sh 2>/dev/null || true

  # Build & bring up (detached)
  # docker-entrypoint.sh handles: flask db upgrade + flask seed-all (if RUN_SEEDERS=true)
  RUN_SEEDERS=$RUN_SEEDERS PUBLIC_IP=\$PUBLIC_IP HOST=\$HOST docker compose up --build -d

  # Clean up dangling images
  docker image prune -f 2>/dev/null || true
"
success "Containers are up."

info "Step 4/5 — Health check…"
sleep 5
remote "
  cd $REMOTE_DIR
  echo '--- Running containers ---'
  docker compose ps
  echo ''
  echo '--- Last 15 log lines ---'
  docker compose logs --tail=15
"

info "Step 5/5 — Deployment summary"
COMMIT=$(remote "cd $REMOTE_DIR && git log --oneline -1" 2>/dev/null || echo "unknown")

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         🚀  Deployment complete!                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Branch   : ${CYAN}$BRANCH${NC}"
echo -e "  Commit   : ${CYAN}$COMMIT${NC}"
echo -e "  Site     : ${CYAN}https://$DOMAIN${NC}"
echo -e "  Seeded   : ${CYAN}$RUN_SEEDERS${NC}"
echo ""
echo -e "  ${YELLOW}Commands:${NC}"
echo -e "    ./deploy.sh              Full deploy (git pull + rebuild)"
echo -e "    ./deploy.sh --env-only   Upload .env and restart"
echo -e "    ./deploy.sh --logs       Stream live logs"
echo -e "    ./deploy.sh --setup      Re-run first-time setup"
echo ""
