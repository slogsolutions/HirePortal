#!/usr/bin/env bash
# deploy-employee.sh (final update for your server)
# Purpose: pull latest, build Vite frontend (dist), copy to timestamped release dir,
# atomically switch /var/www/employee-frontend -> release, cleanup old releases,
# backup previous release, and deploy/restart backend via pm2.

set -euo pipefail
IFS=$'
        '

# ---------- CONFIG (override with env vars if needed) ----------
NOW="$(date +%Y%m%d-%H%M%S)"
ROOT="${ROOT:-/root/HirePortal/HirePortal}"
FRONTEND_DIR="${FRONTEND_DIR:-$ROOT/client}"
BACKEND_DIR="${BACKEND_DIR:-$ROOT/server}"
WEBROOT="${WEBROOT:-/var/www/employee-frontend}"
RELEASES_DIR="${RELEASES_DIR:-/var/www/releases-employee-frontend}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/deploy-backups}"
PM2_NAME="${PM2_NAME:-employee-backend}"
BUILD_DIRNAME="${BUILD_DIRNAME:-dist}"   # vite default output is 'dist'
AUTO_STASH="${AUTO_STASH:-1}"            # 1 = auto-stash local changes
LOGFILE="${LOGFILE:-/var/log/deploy-employee.log}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
OWNER="${OWNER:-www-data:www-data}"
RSYNC_OPTS=( -a --delete --quiet )
DEBUG="${DEBUG:-0}"                      # set DEBUG=1 to enable set -x tracing
# ---------------------------------------------------------------

# ensure logfile exists and writable by current user
sudo mkdir -p "$(dirname "$LOGFILE")" || true
sudo touch "$LOGFILE" || true
sudo chown "$(whoami):$(whoami)" "$LOGFILE" || true

# Redirect all stdout/stderr to logfile and to console (so everything is logged)
# Use tee so we still see output on the terminal when running interactively.
exec > >(tee -a "$LOGFILE") 2>&1

if [ "$DEBUG" = "1" ]; then
  set -x
fi

log(){
  echo "[$(date +"%F %T")] $*"
}

# Trap errors and exit to capture useful debugging info
trap 'rc=$?; if [ "$rc" -ne 0 ]; then log "ERROR: script exited with code $rc at "; fi' EXIT
trap 'rc=$?; log "ERROR trap: command failed with exit code $rc at line $LINENO"' ERR

log "== DEPLOY START: $NOW =="

# required commands
for cmd in git npm pm2 nginx rsync tar sudo; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "ERROR: required command '$cmd' not found. Install before running."
    exit 1
  fi
done

# prepare directories
sudo mkdir -p "$BACKUP_DIR" "$RELEASES_DIR"
sudo chown -R "$(whoami):$(whoami)" "$BACKUP_DIR" "$RELEASES_DIR" || true

safe_git_pull(){
  local repo_dir="$1"
  local branch="$2"
  pushd "$repo_dir" > /dev/null
  log "In $repo_dir (branch $branch): git fetch $GIT_REMOTE $branch ..."
  git fetch "$GIT_REMOTE" "$branch" --quiet || true

  if [ -n "$(git status --porcelain)" ]; then
    if [ "$AUTO_STASH" = "1" ]; then
      local stname="deploy-autostash-$NOW"
      log "Local changes detected in $repo_dir — stashing as '$stname' ..."
      git stash push -u -m "$stname" || true
      STASHED=1
    else
      log "ERROR: Local changes present in $repo_dir. Aborting (AUTO_STASH=0)."
      popd > /dev/null
      return 1
    fi
  else
    STASHED=0
  fi

  log "git pull --rebase $GIT_REMOTE $branch"
  if ! git pull --rebase "$GIT_REMOTE" "$branch"; then
    log "ERROR: git pull failed in $repo_dir"
    if [ "$STASHED" = "1" ]; then git stash pop || true; fi
    popd > /dev/null
    return 1
  fi

  if [ "$STASHED" -eq 1 ]; then
    log "Attempting to pop stash in $repo_dir ..."
    if ! git stash pop; then
      log "WARNING: stash pop produced conflicts in $repo_dir. Please resolve manually."
    fi
  fi

  popd > /dev/null
  return 0
}

# ---------- FRONTEND (Vite) ----------
log "-> FRONTEND: $FRONTEND_DIR"
if [ ! -d "$FRONTEND_DIR" ]; then
  log "ERROR: frontend directory $FRONTEND_DIR not found. Aborting."
  exit 1
fi
pushd "$FRONTEND_DIR" > /dev/null

FRONT_BRANCH="${FRONT_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)}"
log "Frontend branch: $FRONT_BRANCH"
if ! safe_git_pull "$FRONTEND_DIR" "$FRONT_BRANCH"; then
  log "ERROR: updating frontend repo failed."
  popd > /dev/null
  exit 1
fi

# install deps
if [ -f package-lock.json ]; then
  log "npm ci (frontend)"
  npm ci --no-audit --silent
else
  log "npm install (frontend)"
  npm install --silent
fi

# build (vite uses `npm run build` by default)
log "Building frontend (vite)..."
if ! npm run build --silent; then
  log "ERROR: frontend build failed. Aborting."
  popd > /dev/null
  exit 1
fi

BUILD_PATH="$FRONTEND_DIR/$BUILD_DIRNAME"
if [ ! -d "$BUILD_PATH" ]; then
  log "ERROR: build output not found at $BUILD_PATH. Aborting."
  popd > /dev/null
  exit 1
fi

# backup current webroot (if any)
BACKUP_FILE="$BACKUP_DIR/employee-frontend-backup-$NOW.tar.gz"
if [ -L "$WEBROOT" ]; then
  REALROOT="$(readlink -f "$WEBROOT")"
  log "Existing webroot is symlink -> $REALROOT — creating tar backup $BACKUP_FILE"
  sudo tar -czf "$BACKUP_FILE" -C "$(dirname "$REALROOT")" "$(basename "$REALROOT")" || true
elif [ -d "$WEBROOT" ]; then
  log "Existing webroot is real dir -> archiving to $BACKUP_FILE"
  sudo tar -czf "$BACKUP_FILE" -C "$(dirname "$WEBROOT")" "$(basename "$WEBROOT")" || true
else
  log "No existing webroot at $WEBROOT (first deploy)."
fi

# create new release and rsync build -> new release
NEW_RELEASE="$RELEASES_DIR/employee-frontend-$NOW"
log "Creating release $NEW_RELEASE"
sudo rm -rf "$NEW_RELEASE" || true
sudo mkdir -p "$NEW_RELEASE"
log "Rsyncing $BUILD_PATH/ -> $NEW_RELEASE/"
sudo rsync "${RSYNC_OPTS[@]}" "$BUILD_PATH/" "$NEW_RELEASE/"

# set ownership and perms
log "chown -> $OWNER and set group read/execute"
sudo chown -R $OWNER "$NEW_RELEASE"
sudo chmod -R g+rX "$NEW_RELEASE" || true

# if WEBROOT is a real directory (not symlink), move it into releases as a backup dir
if [[ -e "$WEBROOT" && ! -L "$WEBROOT" && -d "$WEBROOT" ]]; then
  SAFE_BACKUP="$RELEASES_DIR/employee-frontend-$NOW-backup"
  log "WEBROOT is real directory. Moving $WEBROOT -> $SAFE_BACKUP"
  sudo mv "$WEBROOT" "$SAFE_BACKUP"
  sudo chown -R $OWNER "$SAFE_BACKUP" || true
fi

# atomically switch symlink
log "Switching symlink: $WEBROOT -> $NEW_RELEASE"
sudo ln -sfn "$NEW_RELEASE" "$WEBROOT"
# best-effort set symlink owner
sudo chown -h $OWNER "$WEBROOT" 2>/dev/null || true

if [ ! -f "$NEW_RELEASE/index.html" ]; then
  log "WARNING: index.html not found in $NEW_RELEASE — check Vite build output."
fi

log "Frontend deployed: $WEBROOT -> $(readlink -f "$WEBROOT")"

popd > /dev/null

# ---------- BACKEND ----------
log "-> BACKEND: $BACKEND_DIR"
if [ ! -d "$BACKEND_DIR" ]; then
  log "ERROR: backend directory $BACKEND_DIR not found. Aborting."
  exit 1
fi
pushd "$BACKEND_DIR" > /dev/null

BACK_BRANCH="${BACK_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)}"
log "Backend branch: $BACK_BRANCH"
if ! safe_git_pull "$BACKEND_DIR" "$BACK_BRANCH"; then
  log "ERROR: updating backend repo failed."
  popd > /dev/null
  exit 1
fi

# install backend deps
if [ -f package-lock.json ]; then
  log "npm ci (backend)"
  npm ci --no-audit --silent
else
  log "npm install (backend)"
  npm install --silent
fi

# optional backend build
if npm run | grep -q "build"; then
  log "Running backend build (if present)"
  npm run build --silent || log "Backend build returned non-zero (continuing)."
fi

# pm2 restart / start
if [ -f ecosystem.config.js ]; then
  log "Reloading/starting pm2 via ecosystem.config.js"
  pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
else
  log "Managing pm2 process by name: $PM2_NAME"
  if pm2 pid "$PM2_NAME" > /dev/null 2>&1; then
    pm2 restart "$PM2_NAME" || pm2 start npm --name "$PM2_NAME" -- start
  else
    # attempt to load PORT from .env
    if [ -f .env ]; then
      export PORT="$(grep -E '^PORT=' .env | head -n1 | cut -d'=' -f2- || echo 3001)"
    fi
    PORT="${PORT:-3001}"
    log "Starting pm2 process '$PM2_NAME' with PORT=$PORT"
    PORT=$PORT pm2 start npm --name "$PM2_NAME" -- start
  fi
fi

pm2 save || true

log "Forcing pm2 restart of employee-backend (explicit)"
pm2 restart employee-backend || {
  log "pm2 restart employee-backend failed — attempting pm2 start"
  pm2 start npm --name "employee-backend" -- start || log "pm2 start employee-backend failed — inspect manually"
}
pm2 save || log "pm2 save failed after forced restart"


popd > /dev/null

# ---------- nginx reload ----------
log "Testing nginx and reloading"
if sudo nginx -t >/dev/null 2>&1; then
  sudo systemctl reload nginx || log "WARNING: nginx reload failed."
else
  log "ERROR: nginx config test failed; not reloading. Run 'sudo nginx -t' to view details."
fi

# ---------- cleanup old releases ----------
log "Cleaning up old releases (keep $KEEP_RELEASES)"
cd "$RELEASES_DIR" || true
releases=( $(ls -1d employee-frontend-* 2>/dev/null | sort -r) ) || releases=()
count=${#releases[@]}
if (( count > KEEP_RELEASES )); then
  to_delete=( "${releases[@]:KEEP_RELEASES}" )
  for r in "${to_delete[@]}"; do
    log "Removing old release: $r"
    sudo rm -rf -- "$RELEASES_DIR/$r"
  done
else
  log "No old releases to remove (found $count)."
fi

# ---------- final ----------
log "Recent releases:"
ls -1t "$RELEASES_DIR" | sed -n '1,10p' || true
log "Deployed release: $NEW_RELEASE"
log "Backup (if any): $BACKUP_FILE"
log "== DEPLOY COMPLETE: $(date +%Y%m%d-%H%M%S) =="
log "To inspect backend logs: pm2 logs $PM2_NAME --lines 200"
log "To inspect nginx errors: sudo tail -n 200 /var/log/nginx/employee.error.log"

exit 0