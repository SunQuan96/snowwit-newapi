#!/usr/bin/env bash
# SnowWit New-API 服务器端一键更新脚本
#
# 流程：git pull -> docker pull -> docker up -d -> 清理旧镜像 -> 健康检查
#
# 用法（在服务器 /www/wwwroot/snowwit-newapi 目录下）：
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
#
# 也可以由宝塔「计划任务」定时调用。

set -euo pipefail

# 切到脚本所在仓库根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_DIR}"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
CONTAINER="snowwit-newapi"
HEALTH_URL="http://127.0.0.1:3000/api/status"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; }

# 前置检查
[[ -f "${COMPOSE_FILE}" ]] || { err "找不到 ${COMPOSE_FILE}"; exit 1; }
[[ -f "${ENV_FILE}"      ]] || { err "找不到 ${ENV_FILE}（参考 .env.example 创建）"; exit 1; }
command -v docker >/dev/null || { err "docker 未安装"; exit 1; }

# Compose v2 优先，回退 v1
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  err "docker compose / docker-compose 都不可用"; exit 1
fi

log "1/5 拉取仓库最新代码..."
git fetch --prune origin
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log "    当前分支：${CURRENT_BRANCH}"
git pull --ff-only origin "${CURRENT_BRANCH}"

log "2/5 拉取最新镜像（GHCR）..."
${DC} -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull

log "3/5 启动 / 更新容器..."
${DC} -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

log "4/5 清理无用镜像..."
docker image prune -f >/dev/null || true

log "5/5 等待健康检查..."
for i in $(seq 1 20); do
  sleep 3
  if curl -fsS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
    log "✅ 服务已就绪：${HEALTH_URL}"
    ${DC} -f "${COMPOSE_FILE}" ps
    exit 0
  fi
  warn "  探测中 (${i}/20) ..."
done

err "❌ 启动超时，请查看日志："
err "    ${DC} -f ${COMPOSE_FILE} logs --tail=200 ${CONTAINER}"
exit 1
