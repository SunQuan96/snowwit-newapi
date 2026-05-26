# SnowWit New-API 部署完整文档

> 项目：`SunQuan96/snowwit-newapi`（fork 自 `QuantumNous/new-api`）
> 域名：`https://api.snowwit.shop`
> 服务器：香港 4C / 4G / 40G，宝塔面板
> 上游：dorocli（多肉 API）
> 部署日期：2026-05-25

---

## 一、整体架构

```
香港服务器 4C/4G/40G
├─ 宝塔面板                            :8888
├─ Nginx                              :80/443
│   ├─ ai.snowwit.shop  → acg-faka-shop (PHP, 已有发卡站)
│   └─ api.snowwit.shop → 127.0.0.1:3000 (snowwit-newapi)
├─ MySQL 8.0（宝塔，两个项目共用）
│   ├─ acg_faka 库         ← 发卡站
│   └─ snowwit_newapi 库   ← New-API
└─ snowwit-newapi (Docker, host 网络模式)
    镜像：ghcr.io/sunquan96/snowwit-newapi:latest
    构建：GitHub Actions 自动构建 → GHCR (Public)
```

### 核心决策

| 项目 | 方案 | 理由 |
|------|------|------|
| MySQL | 共用宝塔 MySQL，独立库 + 独立账号 | 节省资源，4G 内存够用 |
| Redis | **暂不启用**，用 `MEMORY_CACHE_ENABLED=true` | 单实例够用 |
| 镜像构建 | GitHub Actions → GHCR (Public) | 服务器不耗内存，免登录 pull |
| 网络 | Docker **host 网络模式** | 绕过 iptables / docker0 网桥问题 |
| 反代 | Nginx 反代 `127.0.0.1:3000` | 复用宝塔 SSL |
| CDN | Cloudflare **灰云（DNS only）** | 直连服务器，避免缓存干扰 |
| 上游 | dorocli（多肉），分组 `cc_krio_1M`，倍率 0.55 | 起步单上游 |
| 定价 | **35% 毛利**（成本 ÷ 0.65 = 1.54 倍） | 价格竞争力强 |

---

## 二、MySQL 配置

### 在宝塔建库（已完成）

| 字段 | 值 |
|------|------|
| 数据库名 | `snowwit_newapi` |
| 用户名 | `snowwit_newapi` |
| 密码 | `<db_password>` |
| 字符集 | `utf8mb4` |
| 访问权限 | **所有人**（必须，否则 Docker 连不上） |
| 添加至 | 本地服务器（127.0.0.1） |

### 验证连接

```bash
# 本机 socket
mysql -u snowwit_newapi -p'<db_password>' snowwit_newapi -e "STATUS;"

# TCP（Docker 走这条）
mysql -u snowwit_newapi -p'<db_password>' -h 127.0.0.1 snowwit_newapi -e "SELECT 1;"
```

返回 `1` 即正常。

---

## 三、仓库文件

### 1. `.github/workflows/ghcr-build.yml`

```yaml
name: Build and Push to GHCR

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  packages: write

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ghcr.io/sunquan96/snowwit-newapi

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=sha,prefix=
      - uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

push main 后 GitHub Actions 自动构建 → GHCR。**首次构建成功后必须把包 visibility 改为 Public**。

### 2. `docker-compose.prod.yml`（最终版，host 网络模式）

```yaml
services:
  new-api:
    image: ghcr.io/sunquan96/snowwit-newapi:latest
    container_name: snowwit-newapi
    restart: always
    command: --log-dir /app/logs
    network_mode: host
    volumes:
      - ./data:/data
      - ./logs:/app/logs
    environment:
      - TZ=Asia/Shanghai
      - SQL_DSN=${SQL_DSN}
      - MEMORY_CACHE_ENABLED=true
      - SYNC_FREQUENCY=60
      - BATCH_UPDATE_ENABLED=true
      - BATCH_UPDATE_INTERVAL=5
      - SESSION_SECRET=${SESSION_SECRET}
      - CRYPTO_SECRET=${CRYPTO_SECRET}
      - STREAMING_TIMEOUT=300
      - RELAY_TIMEOUT=0
      - ERROR_LOG_ENABLED=true
      - NODE_TYPE=master
      - NODE_NAME=snowwit-hk-1
      - FRONTEND_BASE_URL=${FRONTEND_BASE_URL:-}
      - TRUSTED_REDIRECT_DOMAINS=${TRUSTED_REDIRECT_DOMAINS:-}
    deploy:
      resources:
        limits:
          memory: 1g
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O - http://localhost:3000/api/status >/dev/null || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
```

### 3. `.env`（在服务器上手写，**不入 Git**）

```env
SQL_DSN=<db_user>:<db_password>@tcp(127.0.0.1:3306)/snowwit_newapi?charset=utf8mb4&parseTime=True&loc=Local

# 用 `openssl rand -hex 32` 生成，64 位十六进制
SESSION_SECRET=<openssl-rand-hex-32-here>
# 一旦投产不可更改（否则渠道密钥全部解不出来），同样 `openssl rand -hex 32` 生成
CRYPTO_SECRET=<openssl-rand-hex-32-here>

FRONTEND_BASE_URL=https://api.snowwit.shop
TRUSTED_REDIRECT_DOMAINS=ai.snowwit.shop
```

⚠️ 密钥已用 `openssl rand -hex 32` 生成。`CRYPTO_SECRET` 一旦投产**不可更改**（否则渠道密钥全部解不出来）。

### 4. `scripts/deploy.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_DIR}"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
CONTAINER="snowwit-newapi"
HEALTH_URL="http://127.0.0.1:3000/api/status"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; }

[[ -f "${COMPOSE_FILE}" ]] || { err "找不到 ${COMPOSE_FILE}"; exit 1; }
[[ -f "${ENV_FILE}"      ]] || { err "找不到 ${ENV_FILE}"; exit 1; }

if docker compose version >/dev/null 2>&1; then DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"
else err "docker compose 不可用"; exit 1; fi

log "1/5 拉取仓库最新代码..."
git fetch --prune origin
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git pull --ff-only origin "${CURRENT_BRANCH}"

log "2/5 拉取最新镜像..."
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
```

### 5. `deploy/nginx/api.conf.example`

参考文件，实际配置粘贴到宝塔 `api.snowwit.shop` 的 `server { }` 内。详见第五章。

---

## 四、服务器首次部署完整流程

### 1. 安装 Docker

宝塔 → 软件商店 → Docker → 安装。

```bash
docker --version          # 29.5.1
docker compose version    # v5.1.3
git --version             # 2.43.0
```

### 2. 克隆仓库

```bash
mkdir -p /www/wwwroot/snowwit-newapi
cd /www/wwwroot
git clone https://github.com/SunQuan96/snowwit-newapi.git
cd snowwit-newapi
mkdir -p data logs
```

### 3. 生成密钥 + 写 `.env`

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)"
echo "CRYPTO_SECRET=$(openssl rand -hex 32)"
nano .env
# 粘贴上面 .env 内容（含两个密钥），保存
chmod 600 .env
chmod +x scripts/deploy.sh
```

### 4. 测 MySQL TCP

```bash
mysql -u snowwit_newapi -p'<db_password>' -h 127.0.0.1 snowwit_newapi -e "SELECT 1;"
```

### 5. GHCR 包公开

GitHub → Your packages → `snowwit-newapi` → Settings → Change package visibility → **Public**。

```bash
docker pull ghcr.io/sunquan96/snowwit-newapi:latest
# 看到 Pull complete 即免登录成功
```

### 6. 启动

```bash
./scripts/deploy.sh
```

成功标志：
```
[deploy] ✅ 服务已就绪：http://127.0.0.1:3000/api/status
```

### 7. 验证

```bash
curl -s http://127.0.0.1:3000/api/status | head -c 200
docker ps --filter name=snowwit-newapi
docker logs snowwit-newapi --tail 30
```

容器日志关键行：
```
[SYS] using MySQL as database
[SYS] New API ready in 1013 ms
```

---

## 五、Nginx 反代（宝塔）

### 站点创建

宝塔 → 网站 → 添加站点：

| 项 | 值 |
|---|----|
| 域名 | `api.snowwit.shop` |
| 根目录 | `/www/wwwroot/snowwit-newapi` |
| FTP / 数据库 / PHP | 全部 **不创建** |
| PHP版本 | **纯静态** |

### SSL

设置 → SSL → Let's Encrypt → 申请 → 开启强制 HTTPS。

### Nginx 配置

修改 `/www/server/panel/vhost/nginx/api.snowwit.shop.conf`，在 `include enable-php-00.conf;` 之前插入：

```nginx
    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        chunked_transfer_encoding on;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_set_header Host              $host;
        proxy_read_timeout 86400;
    }
```

并 **注释掉** 抢路由的两段（默认存在）：

```nginx
#    location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$ { ... }
#    location ~ .*\.(js|css)?$ { ... }
```

否则前端 `*.js / *.css` 全部 404。

### 重载

```bash
nginx -t && nginx -s reload
```

### 验证

```bash
# 直测（绕开 Cloudflare）
curl -s -H "Host: api.snowwit.shop" http://127.0.0.1/api/status | head -c 200
# 应返回 JSON：{"data":{...},"success":true}

# 公网
curl -I https://api.snowwit.shop
# server: nginx + x-oneapi-request-id 表示通了
```

---

## 六、Cloudflare 配置

### DNS

`api.snowwit.shop` A 记录指向服务器公网 IP，**橙云改灰云（DNS only）**。

理由：

- 灰云直连服务器，调试简单
- 避免 Cloudflare 缓存命中默认页
- 避免 Cloudflare 与本机 Let's Encrypt 双 SSL 冲突

后期想用 CDN 时再切橙云，配套：

- SSL/TLS 模式 = Full (strict)
- Cache Rule 排除 `/api/*`、`/v1/*`
- Rate Limiting 防滥用

---

## 七、踩坑记录（保留供以后参考）

### Pit 1：Docker iptables 链冲突

报错：
```
Failed to Setup IP tables: ... iptables: No chain/target/match by that name
```

宝塔防火墙改 iptables 时把 Docker 链清掉了。**解决**：
```bash
systemctl restart docker
```

### Pit 2：容器连 MySQL 超时

报错：
```
dial tcp 172.17.0.1:3306: connect: connection timed out
```

`host.docker.internal` 解析到 Docker 网桥，但宿主机 MySQL 只监听 127.0.0.1。**解决**：

1. `docker-compose.prod.yml` 改用 `network_mode: host`，删除 `ports` 和 `extra_hosts`
2. `.env` 里 DSN 改成 `tcp(127.0.0.1:3306)`
3. `docker compose down && up -d`

### Pit 3：Nginx 反代没生效，访问是默认页

宝塔反代项保存被 `ai.snowwit.shop.conf` 里 `client_max_body_size` 重复挡住。**解决**：手动改 `api.snowwit.shop.conf` 添加 `location /`，不要走宝塔向导。

### Pit 4：前端资源 404

```
GET https://api.snowwit.shop/assets/index-xxx.js 404
```

宝塔默认在 conf 里加了两段 `location ~ .*\.(js|css)?$ { ... }` 静态规则，Nginx 正则优先于前缀，抢了 `/assets/*` 路由。**解决**：注释这两段，reload。

### Pit 5：GHCR 镜像 unauthorized

GHCR 包默认 private。**解决**：Package settings → Change visibility → Public（不是仓库的 visibility，是包的）。

### Pit 6：Passkey 保存报错

报错：
```
Passkey 不允许使用不安全的 Origin: http://localhost:3000
```

默认 Origin 是 localhost。**解决**：

| 字段 | 改成 |
|------|------|
| 服务显示名称 | `Snowwit API` |
| 网站域名标识 | `api.snowwit.shop` |
| 允许的 Origins | `https://api.snowwit.shop` |
| 允许通过 Passkey 登录 | 不勾选 |
| 允许不安全 Origin | 不勾选 |

### Pit 7：服务器地址末尾带 `/`

填 `https://api.snowwit.shop/` 会导致 OAuth 回调出现双斜杠。**应填**：`https://api.snowwit.shop`（无末尾 `/`）。

### Pit 8：「上游价格同步」按字段勾选，不要全勾

`POST /api/ratio_sync/fetch`（源码：`controller/ratio_sync.go:142+`）实际上是一个**带 diff 预览 + 按字段勾选**的工作流，**不是一键全覆盖**。

可同步的 10 个字段（源码：`controller/ratio_sync.go:64-75`）：

```
model_ratio, completion_ratio, cache_ratio, create_cache_ratio,
image_ratio, audio_ratio, audio_completion_ratio,
model_price, billing_mode, billing_expr
```

**错误用法（曾发生过）**：在 diff 预览页**全部勾选确认** → `model_ratio` 被覆盖成上游 dorocli 渠道里登记的 Anthropic 官方倍率（haiku 0.5 / sonnet 1.5 / opus 2.5），所有客户费率瞬间变 1× 官方价，毛利从 35% 滑到 -45%。

**正确用法**：

1. 进入「分组与模型定价设置 → Upstream Sync」Tab
2. 点 Fetch，看 diff 表（前端：`web/default/.../upstream-ratio-sync.tsx:376-434`）
3. **只勾 `cache_ratio` 和 `create_cache_ratio` 两列**（这俩是上游真实数据，可信）
4. **不勾 `model_ratio` 和 `completion_ratio` 列**（这俩是你自己定的售价倍率，不能被覆盖）
5. 确认应用

**同步前必备份**：把当前 4 段定价 JSON 复制到笔记里，出问题可秒回滚。

**事故恢复**：把第八章「分组与模型定价设置」中的 4 段 JSON 完整粘回去保存即可，售价立刻恢复。

**附加收益**：通过这种细粒度勾选，可以拿到 dorocli 公开的缓存倍率真实值（例如 haiku 从估计 0.1 → 真实 0.17），又不会冲掉自己的售价。

---

## 八、New-API 后台配置

### 系统设置 → 通用

| 字段 | 值 |
|------|----|
| 服务器地址 | `https://api.snowwit.shop`（无末尾 /） |

### 系统设置 → 配置登录注册

公开商用阶段（P3 前）保守配置：

```
☑ 允许通过密码进行登录
☐ 其他全部取消（含注册、邮箱验证、OAuth、Turnstile、Passkey）
```

**P3 阶段** 配齐 SMTP + Turnstile 后再开放注册。

### 系统设置 → Passkey

仅修配置，不启用：

| 字段 | 值 |
|------|----|
| 服务显示名称 | `Snowwit API` |
| 网站域名标识 | `api.snowwit.shop` |
| 允许的 Origins | `https://api.snowwit.shop` |
| 允许 Passkey 登录 | 不勾选 |
| 允许不安全 Origin | 不勾选 |

### 系统设置 → 分组与模型定价设置（35% 毛利档）

切换到 **手动编辑** 标签。

#### 模型固定价格

**保持默认**，不动（mj/sora/veo 等图像视频模型，用不到不影响）。

#### 模型倍率（`model_ratio`）

```json
{
  "claude-haiku-4-5-20251001": 0.42,
  "claude-sonnet-4-5-20250929": 1.27,
  "claude-sonnet-4-6": 1.27,
  "claude-opus-4-6": 2.12,
  "claude-opus-4-6-thinking": 2.12,
  "claude-opus-4-7": 2.12,
  "claude-opus-4-7-thinking": 2.12
}
```

#### 提示缓存倍率（`cache_ratio`，已按 dorocli 实际比例精确）

```json
{
  "claude-haiku-4-5-20251001": 0.17,
  "claude-sonnet-4-5-20250929": 0.1,
  "claude-sonnet-4-6": 0.166666666667,
  "claude-opus-4-6": 0.12,
  "claude-opus-4-6-thinking": 0.1,
  "claude-opus-4-7": 0.12,
  "claude-opus-4-7-thinking": 0.12
}
```

> ✅ haiku-4-5 缓存价 0.17 来自一次「上游价格同步」操作返回的真实值（已替代原估计值 0.1）。

#### 缓存创建倍率（`cache_creation_ratio`）

```json
{
  "claude-haiku-4-5-20251001": 1.25,
  "claude-sonnet-4-5-20250929": 1.25,
  "claude-sonnet-4-6": 1.25,
  "claude-opus-4-6": 1.25,
  "claude-opus-4-6-thinking": 1.25,
  "claude-opus-4-7": 1.25,
  "claude-opus-4-7-thinking": 1.25
}
```

> New-API 注释：5m cache 用此倍率；1h cache 自动 ×1.6 = 2.0x。

#### 模型补全倍率（`completion_ratio`）

```json
{
  "claude-haiku-4-5-20251001": 5,
  "claude-sonnet-4-5-20250929": 5,
  "claude-sonnet-4-6": 5,
  "claude-opus-4-6": 5,
  "claude-opus-4-6-thinking": 5,
  "claude-opus-4-7": 5,
  "claude-opus-4-7-thinking": 5
}
```

#### 图片输入 / 音频 / 音频补全倍率

**保持默认**，不动（GPT 相关，用不到）。

---

## 九、渠道配置（dorocli）

### 上游信息

| 项 | 值 |
|----|----|
| 名称 | dorocli（多肉 API） |
| Base URL | `https://www.dorocli.cc` |
| 令牌 | `<your-dorocli-token>` |
| 套餐 | `cc_krio_满血_带缓存`（cc_krio_1M 分组） |
| 进货倍率 | 0.55 |

### dorocli 模型 → 成本（每 1M tokens）

| 模型 | 输入 $ | 输出 $ | 缓存读 $ | 缓存创建 $ | dorocli 模型倍率 |
|------|--------|--------|----------|-----------|-----------------|
| claude-haiku-4-5-20251001 | 0.55 | 2.75 | ? | ? | 0.5 |
| claude-sonnet-4-5-20250929 | 1.65 | 8.25 | 0.165 | 2.063 | 1.5 |
| claude-sonnet-4-6 | 1.65 | 8.25 | 0.275 | 2.063 | 1.5 |
| claude-opus-4-6 | 2.75 | 13.75 | 0.330 | 3.438 | 2.5 |
| claude-opus-4-6-thinking | 2.75 | 13.75 | 0.275 | 3.438 | 2.5 |
| claude-opus-4-7 | 2.75 | 13.75 | 0.330 | 3.438 | 2.5 |
| claude-opus-4-7-thinking | 2.75 | 13.75 | 0.330 | 3.438 | 2.5 |

### 在 New-API 添加渠道

**渠道 → 添加渠道**：

| 字段 | 填写 |
|------|------|
| 类型 | **Anthropic Claude**（不是 OpenAI，因为是 Claude 原生协议且带 cache） |
| 名称 | `dorocli-cc_krio_满血` |
| 分组 | `default` |
| 密钥 | `<your-dorocli-token>` |
| 代理 / Base URL | `https://www.dorocli.cc`（不带 `/v1`） |
| 默认测试模型 | `claude-haiku-4-5-20251001` |
| 优先级 / 权重 | 0 / 1 |
| 状态 | 启用 |

### 模型字段（粘贴）

```
claude-haiku-4-5-20251001,claude-opus-4-6,claude-opus-4-6-thinking,claude-opus-4-7,claude-opus-4-7-thinking,claude-sonnet-4-5-20250929,claude-sonnet-4-6
```

### 测试

保存后点测试，7 个模型应全部 ✅。

---

## 十、对外卖价表（35% 毛利档）

| 模型 | 成本输入 / 输出 | 卖价输入 / 输出（$/1M） | 相对 Anthropic 官方 |
|------|----------------|----------------------|---------------------|
| haiku-4-5 | 0.55 / 2.75 | **0.84 / 4.20** | 约 17% |
| sonnet-4-5/6 | 1.65 / 8.25 | **2.54 / 12.70** | 约 17% |
| opus 系列 | 2.75 / 13.75 | **4.24 / 21.20** | 约 5.6% |

毛利稳定 35%（普通输入、输出、缓存读、缓存创建全部对齐）。

---

## 十一、待办风险（基于源码核实）

| # | 风险 | 处理建议 | 紧急度 |
|---|------|---------|--------|
| 1 | ~~haiku-4-5 缓存价 dorocli 未披露~~ | 已闭环：通过上游同步 diff 拿到真实值 0.17 | ✅ 已解决 |
| 2 | 1h cache 上游定价未确认 | 查 dorocli 文档；不确认就只用 5m cache。源码自动 ×1.6 倍率：`relay/helper/price.go:36` | 🟡 中 |
| 3 | 客户调用大模型不可控 | New-API 没有"单次请求最大 token 数"原生字段（确认：`model/token.go` 无此字段）。**真实方案**：① 令牌启用 `ModelLimits` 白名单不含 opus；② 后台 Tab #7 启用 `ModelRequestRateLimitEnabled`（按 userId 限速）；③ Nginx/CF 限 body size | 🟡 中 |
| 4 | Rate Limit 未启用 | New-API 自带速率限制（源码 `setting/rate_limit.go` + `middleware/model-rate-limit.go`）。后台 Tab #7「速率限制设置」开启 `ModelRequestRateLimitEnabled`，按 userId 维度限速 | 🟢 低 |
| 5 | 没设最低充值额 | 后台 Tab #5「支付设置」→ 充值最低额 ¥10 | 🟢 低 |
| 6 | `SelfUseModeEnabled` 风险敞口 | 务必保持关闭（源码 `setting/operation_setting/operation_setting.go:6`）。开了会让未定价模型按 75 倍率收费，灾难 | 🔴 高（核对一次即可） |

---

## 十二、商业化路线（公开商用）

```
P0 ✅ 完成 → 多肉渠道跑通 + root 自测
P1 🟡 进行中 → 兑换码体系（发卡站卖卡密）
P2 🔵 计划 → 站内支付（易支付 或 Stripe）
P3 ⚪ 计划 → 开放注册（SMTP + Turnstile + 防薅）
```

### P1 兑换码（推荐先做）

- New-API 后台 → 兑换码 → 批量生成
- 导出 CSV → ai.snowwit.shop 上架 50/100/500 元卡密
- 用户在 New-API 输入兑换码充值
- **两套系统完全解耦**（不用 API 联动）

### 推荐套餐定价（毛利 35% 基础上加包销折扣）

| 套餐 | 价格 | 给 token 等值 | 实际成本 | 毛利 |
|------|------|--------------|---------|------|
| 体验 | ¥50 | $5 | ~$2.5 (≈¥18) | ¥32（64%）|
| 标准 | ¥100 | $12 | ~$6 (≈¥43) | ¥57（57%）|
| 进阶 | ¥300 | $40 | ~$20 (≈¥144) | ¥156（52%）|
| 大额 | ¥1000 | $150 | ~$75 (≈¥540) | ¥460（46%）|

### P2 支付（二选一先接）

- **易支付**：国内微信/支付宝，需自建或买现成易支付站
- **Stripe**：海外信用卡，需注册 Stripe 商户

### P3 注册必备（开放注册前必须）

- SMTP：Resend / 腾讯企业邮 / 阿里云邮件推送
- Turnstile：Cloudflare 申请 Site Key + Secret Key
- 注册赠送额度 = 0
- 邮箱域名黑名单（禁 10minutemail 等）

---

## 十三、日常运维

### 更新流程

#### 本地（写代码）

```bash
git add .
git commit -m "feat: xxx"
git push origin main
```

GitHub Actions 自动构建 → GHCR。

#### 服务器（部署）

```bash
cd /www/wwwroot/snowwit-newapi
./scripts/deploy.sh
```

### 日志位置

```bash
# 应用日志
docker logs snowwit-newapi -f

# 容器内部日志
ls /www/wwwroot/snowwit-newapi/logs/

# Nginx
tail -f /www/wwwlogs/api.snowwit.shop.log
tail -f /www/wwwlogs/api.snowwit.shop.error.log
```

### 备份（建议挂宝塔计划任务）

每天 03:00 执行：

```bash
DATE=$(date +%Y%m%d)
BK=/www/backup/snowwit-newapi
mkdir -p $BK

# MySQL 库
mysqldump -u snowwit_newapi -p'<db_password>' --single-transaction --quick \
  --default-character-set=utf8mb4 snowwit_newapi | gzip > $BK/db-$DATE.sql.gz

# 容器数据目录
tar -C /www/wwwroot/snowwit-newapi -czf $BK/data-$DATE.tar.gz data

# 保留 14 天
find $BK -type f -mtime +14 -delete
```

### 容灾建议

- **再接 1~2 家备用上游**（API2D / Closex / AnyRouter）防 dorocli 跑路
- **MySQL 主从**（资源充足时）
- **Uptime Kuma 监控**（任何监控平台都行）

---

## 十四、二开分支策略（可选，等基础稳定后）

```bash
git remote add upstream https://github.com/QuantumNous/new-api.git
git checkout -b custom/main
git push -u origin custom/main

# 定期合并上游
git fetch upstream
git checkout main
git merge upstream/main
git push origin main

git checkout custom/main
git merge main          # 处理冲突
git push origin custom/main
```

- `main`：跟随上游
- `custom/main`：你的二开改动
- 部署用 `custom/main` 分支跑构建

---

## 十五、关键 URL / 账号

| 项 | 值 |
|----|----|
| 仓库 | https://github.com/SunQuan96/snowwit-newapi |
| 上游 | https://github.com/QuantumNous/new-api |
| 镜像 | `ghcr.io/sunquan96/snowwit-newapi:latest` |
| Actions | https://github.com/SunQuan96/snowwit-newapi/actions |
| 站点 | https://api.snowwit.shop |
| 后台默认 | root / 123456（首次登录立刻改） |
| 发卡站 | https://ai.snowwit.shop |
| 上游 dorocli | https://www.dorocli.cc |
| 官方文档 | https://docs.newapi.pro |

---

## 十六、命令速查

```bash
# 部署
cd /www/wwwroot/snowwit-newapi && ./scripts/deploy.sh

# 查容器
docker ps --filter name=snowwit-newapi

# 查日志
docker logs snowwit-newapi -f --tail 200

# 重启
docker compose -f docker-compose.prod.yml --env-file .env restart

# 完全重建
docker compose -f docker-compose.prod.yml --env-file .env down
docker compose -f docker-compose.prod.yml --env-file .env up -d

# 健康检查
curl -s http://127.0.0.1:3000/api/status | head -c 200

# Nginx 测试 + 重载
nginx -t && nginx -s reload

# 看 Nginx 配置
cat /www/server/panel/vhost/nginx/api.snowwit.shop.conf

# MySQL 验证
mysql -u snowwit_newapi -p'<db_password>' -h 127.0.0.1 snowwit_newapi -e "SELECT 1;"

# 测试 curl（替换令牌）
curl https://api.snowwit.shop/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","messages":[{"role":"user","content":"hello"}]}'
```

---

## 十七、当前状态总结

```
基础设施   ████████████████████  100% ✅
后台安全   ██████████████░░░░░░   70% 🟡（待启用速率限制 / 配通知告警）
渠道接入   ████████████████████  100% ✅（dorocli 7 个 Claude 模型）
定价配置   ████████████████████  100% ✅（35% 毛利，缓存倍率精确）
变现链路   ░░░░░░░░░░░░░░░░░░░░    0% 🔴（兑换码、支付待做）
开放注册   ░░░░░░░░░░░░░░░░░░░░    0% ⚪（P3 阶段）
运维体系   ████░░░░░░░░░░░░░░░░   20% 🟡（备份脚本未挂任务）
```

下一步：**兑换码生成 + 发卡站上架 + 站内支付选型**。

---

## 十八、日常运维 Checklist（基于源码核实，Classic 主题）

> 本节路径以本仓库当前使用的 **Classic 主题**为准（源码：`web/classic/src/pages/Setting/index.jsx:60-180`），所有字段都给出 `文件:行号` 证据。每项一次配置后可永久受益，无需"被动盯上游价格"。

### 18.1 后台设置页全景

Classic 主题的「设置」页是一个 Tabs 组件，root 用户能看到 12 个 Tab，URL 形如 `https://api.snowwit.shop/setting?tab=<key>`：

| # | Tab 名称 | URL key | 用途 |
|---|---|---|---|
| 1 | **运营设置** | `operation` | 通用、监控、额度、签到、日志、屏蔽词 |
| 2 | 仪表盘设置 | `dashboard` | Dashboard 组件配置 |
| 3 | 聊天设置 | `chats` | 内置 Chat 页 |
| 4 | 绘图设置 | `drawing` | MJ 等 |
| 5 | 支付设置 | `payment` | 易支付/Stripe/Creem/Waffo |
| 6 | **分组与模型定价设置** | `ratio` | **改价 + 上游同步** |
| 7 | **速率限制设置** | `ratelimit` | 模型请求 RPM/RPD |
| 8 | 模型相关设置 | `models` | Claude/Gemini/Grok 默认设置 |
| 9 | 模型部署设置 | `model-deployment` | 模型部署相关 |
| 10 | 性能设置 | `performance` | 性能调优 |
| 11 | 系统设置 | `system` | 登录注册、SMTP、OAuth、SSRF、Passkey |
| 12 | 其他设置 | `other` | 公告、关于 |

> 个人通知不在「设置」里，在 **右上角头像 → 个人设置 → 通知设置**（源码：`web/classic/src/components/settings/personal/cards/NotificationSettings.jsx`）

### 18.2 一次性配置清单（5~15 分钟）

按顺序做完后，dorocli 上新模型 / 渠道掉线 / 余额低，全部事件驱动通知。

#### ① Tab #1「运营设置」(`?tab=operation`)

源码：`web/classic/src/components/settings/OperationSetting.jsx:33-84`

**通用设置 卡片**

- [ ] `SelfUseModeEnabled` = **❌ 关闭**（开了会让未定价模型按 75 倍率收费，灾难）
- [ ] `RetryTimes` = `3`

**监控设置 卡片**

- [ ] `monitor_setting.auto_test_channel_enabled` = ✅
- [ ] `monitor_setting.auto_test_channel_minutes` = `10`
- [ ] `AutomaticDisableChannelEnabled` = ✅（渠道失败到阈值自动禁用，源码 `service/channel.go:45-64`）
- [ ] `AutomaticEnableChannelEnabled` = ✅（自愈，源码 `service/channel.go:67-77`）
- [ ] `ChannelDisableThreshold` = `30`（秒）
- [ ] `QuotaRemindThreshold` = `500000`（折合 $1，全局默认告警阈值）
- [ ] `AutomaticDisableKeywords` / `AutomaticDisableStatusCodes` 保持默认

**额度设置 卡片**

- [ ] `QuotaForNewUser` = `0`（P3 开放注册前防薅羊毛）
- [ ] `QuotaForInviter` / `QuotaForInvitee` = `0`

#### ② Tab #7「速率限制设置」(`?tab=ratelimit`)

源码：`web/classic/src/components/settings/RateLimitSetting.jsx:29-35`，限速维度：**userId**（`middleware/model-rate-limit.go:166-199`）

- [ ] `ModelRequestRateLimitEnabled` = ✅
- [ ] `ModelRequestRateLimitDurationMinutes` = `1`
- [ ] `ModelRequestRateLimitCount` = `120`
- [ ] `ModelRequestRateLimitSuccessCount` = `60`
- [ ] `ModelRequestRateLimitGroup` = `{}`（按需对不同分组覆盖）

#### ③ Tab #6「分组与模型定价设置」(`?tab=ratio`)

- [ ] 用第八章的 35% 毛利档 JSON 替换 4 段（`model_ratio` / `cache_ratio` / `cache_creation_ratio` / `completion_ratio`）
- [ ] 「Upstream Sync」按 Pit 8 规则使用（**只勾 `cache_ratio` / `create_cache_ratio` 列**）

#### ④ 个人设置 → 通知设置（右上角头像菜单）

源码：`web/classic/.../personal/cards/NotificationSettings.jsx`，字段定义：`dto/user_settings.go:3-19`

- [ ] **Notification Method**：`email` 或 `webhook`（推荐 webhook 接飞书，本仓库已有 `feishu-cron-reminder` skill）
- [ ] **Notification Email** / **Webhook URL** 填好
- [ ] **Quota Warning Threshold** = `500000`（余额低于 $1 推送）
- [ ] **接收上游模型更新通知** = ✅（管理员才能看到这个开关，源码 `dto/user_settings.go:13`）
- [ ] **接受未设置价格的模型** = ❌（默认就是 ❌）

#### ⑤ 渠道编辑页（dorocli 渠道）

源码：`dto/channel_settings.go:38-43`

- [ ] **上游模型更新检测** `upstream_model_update_check_enabled` = ✅
- [ ] **上游模型更新自动同步** `upstream_model_update_auto_sync_enabled` = ❌（只要通知不要自动改）
- [ ] **AutoBan** = ✅

#### ⑥ 每个令牌（卡密）

源码：`model/token.go:14-31`

- [ ] **启用模型限制** + 白名单填 `claude-haiku-4-5-20251001,claude-sonnet-4-5-20250929,claude-sonnet-4-6`（**不含 opus**）
- [ ] **无限额度**：❌ 永远不开
- [ ] **过期时间**：建议设（如 90 天）
- [ ] B 端客户：填 **AllowIps** 白名单

### 18.3 事件驱动反应表

| 事件 | 触发源 | 反应时间 | 你要做什么 |
|---|---|---|---|
| dorocli 上新模型 | `controller/channel_upstream_update.go:652-679` cron | ≤30 分钟 | 收到通知，评估是否上架（默认未定价 = 客户调不通） |
| dorocli 某模型下线 | 同上 | ≤30 分钟 | 看是否影响业务 |
| dorocli 渠道挂了 | `controller/channel-test.go:960-983` 自动测试 | ≤10 分钟 | 切备用上游（如有） |
| dorocli 渠道恢复 | `AutomaticEnableChannelEnabled` | ≤10 分钟 | 无需动作 |
| root 余额 < 阈值 | `service/quota.go:443-497` 每次结算后异步检查 | 即时（限频 10min/2 次） | 充值 |
| Anthropic 官方调价 | — | 不通知 | 无需动作（你的售价是相对倍率，自动跟降） |
| dorocli 进货倍率变 | — | 不通知（合约性质） | 看合约到期 |

### 18.4 主动巡检计划

| 频率 | 动作 | 耗时 |
|---|---|---|
| 每收到上新模型通知 | 评估是否上架（不上架就保持默认拒绝） | 5 分钟 |
| 每月 1 次 | 登 dorocli 后台看「公告 + 进货倍率有没有变 + 余额」 | 5 分钟 |
| 每季度 1 次 | 复核 4 段定价 JSON 与 dorocli 实际进货倍率的毛利率 | 15 分钟 |
| 每年 1 次 | dorocli 合约续费前重新谈进货倍率（当前 0.55） | 1 小时 |

### 18.5 New-API **不存在**的功能（已源码确认，别再期望）

| 我以为有的功能 | 真实情况 | 替代方案 |
|---|---|---|
| 单次请求最大 token 数 | `model/token.go` 无此字段 | 令牌 `ModelLimits` 白名单 + Nginx 限 body size |
| Token 级 RPM/RPD | 不存在，限速以 userId 为维度（`middleware/model-rate-limit.go:166-199`） | 给每个客户单独建用户账号 |
| 渠道按 priority/weight 自动降权 | 只有"自动禁用 + 自动启用"，不存在自动降权（`service/channel_select.go:108-118`） | 接备用上游 |
| 全局「白名单模式」 | 不存在 | 默认拦截未定价已等效，无需配置 |
| 通知投递失败二次告警 | 失败只写 SysLog（`service/user_notify.go:42-44`） | 用多个通知渠道冗余（同时配 email + webhook） |
| 上游价格同步一键全覆盖 endpoint | 不存在，必须经过 diff 预览 + 字段勾选 | 见 Pit 8 |

### 18.6 自动化告警脚本（可选，零依赖）

如果嫌登 dorocli 后台烦，可挂宝塔计划任务每日 9 点跑：

```bash
#!/bin/bash
# /www/wwwroot/snowwit-newapi/scripts/check_dorocli.sh
# 监控 dorocli 价格页变动，发现差异推飞书

SNAPSHOT=/tmp/dorocli-pricing.html
URL="https://www.dorocli.cc/pricing"   # 实际页面 URL 以 dorocli 后台为准

NEW=$(curl -sL "$URL")
if [ -f "$SNAPSHOT" ]; then
  if ! diff -q <(echo "$NEW") "$SNAPSHOT" > /dev/null; then
    curl -X POST "$FEISHU_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"msg_type\":\"text\",\"content\":{\"text\":\"⚠️ dorocli 价格页变动，请人工确认\"}}"
  fi
fi
echo "$NEW" > "$SNAPSHOT"
```

挂定时任务：

```bash
0 9 * * * /www/wwwroot/snowwit-newapi/scripts/check_dorocli.sh
```

`FEISHU_WEBHOOK` 在 `.env` 或脚本里硬编码均可。
