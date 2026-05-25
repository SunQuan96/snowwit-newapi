# SnowWit New-API 生产部署速查

> 适配：香港宝塔服务器 4C/4G，复用宿主机 MySQL 8.0，镜像走 GitHub Actions -> GHCR。

## 1. 服务器目录约定

```
/www/wwwroot/snowwit-newapi/
├─ docker-compose.prod.yml   ← 仓库自带
├─ scripts/deploy.sh         ← 仓库自带
├─ deploy/nginx/             ← Nginx 配置示例
├─ .env                      ← 手写，不入 Git
├─ data/                     ← 容器持久化数据
└─ logs/                     ← 容器日志
```

## 2. 一次性准备

### 2.1 GHCR 镜像设为 Public

第一次 `git push main` 后，GitHub Actions 会构建并推送到 `ghcr.io/sunquan96/snowwit-newapi`：

1. GitHub 头像 → **Your packages** → `snowwit-newapi`
2. **Package settings** → **Change visibility** → **Public**
   （否则服务器 `docker pull` 会 401，需要 `docker login ghcr.io`）

### 2.2 服务器克隆 + 配置 .env

```bash
mkdir -p /www/wwwroot/snowwit-newapi
cd /www/wwwroot
git clone https://github.com/SunQuan96/snowwit-newapi.git
cd snowwit-newapi
mkdir -p data logs

# 生成两个 64 位十六进制密钥
echo "SESSION_SECRET=$(openssl rand -hex 32)" >  .env.tmp
echo "CRYPTO_SECRET=$(openssl rand -hex 32)"  >> .env.tmp

cat > .env <<'EOF'
# === 数据库（宝塔 MySQL，本机端口 3306）===
SQL_DSN=snowwit_newapi:2026sun.@tcp(host.docker.internal:3306)/snowwit_newapi?charset=utf8mb4&parseTime=True&loc=Local

# === 安全密钥（请粘贴 .env.tmp 里的两行）===
SESSION_SECRET=
CRYPTO_SECRET=

# === 前端基础 URL（用于回调/分享）===
FRONTEND_BASE_URL=https://api.example.com

# === 与发卡站联动时填写（逗号分隔）===
TRUSTED_REDIRECT_DOMAINS=shop.example.com
EOF

cat .env.tmp   # 把这两行手动贴进 .env，然后删掉
rm .env.tmp
chmod 600 .env
```

> **关于 host.docker.internal**：`docker-compose.prod.yml` 里已经加了 `extra_hosts: host.docker.internal:host-gateway`，所以容器里能用这个域名连到宿主机 3306。比写死 `172.17.0.1` 更稳。

### 2.3 MySQL 访问权限自检（宿主机执行）

```bash
# 1) 本机 TCP 必须通（Docker 走的就是这条路）
mysql -u snowwit_newapi -p'2026sun.' -h 127.0.0.1 snowwit_newapi -e "SELECT 1;"

# 2) Docker 默认网桥地址通不通（如果上面通了，这里通常也通）
mysql -u snowwit_newapi -p'2026sun.' -h 172.17.0.1 snowwit_newapi -e "SELECT 1;" || true
```

如果 TCP 连接报 `Access denied`：宝塔 → 数据库 → 编辑 `snowwit_newapi` → **访问权限**改为「所有人」。

### 2.4 Nginx 配置

把 [`deploy/nginx/api.conf.example`](nginx/api.conf.example) 中的两个 `location` 段贴进宝塔 `api.example.com` 站点的配置文件里（保留宝塔自动生成的 SSL/HTTPS 强转部分），删掉默认的 `location /`，然后 `nginx -t && systemctl reload nginx`。

## 3. 启动 / 更新

### 3.1 首次启动

```bash
cd /www/wwwroot/snowwit-newapi
chmod +x scripts/deploy.sh

# 等 GitHub Actions 第一次构建完成（Actions 页面绿色）后再执行
./scripts/deploy.sh
```

### 3.2 日常更新（push 后）

```bash
cd /www/wwwroot/snowwit-newapi
./scripts/deploy.sh
```

脚本会按顺序：`git pull → docker pull → up -d → image prune → health check`。

## 4. 验证

```bash
# 容器状态
docker ps --filter name=snowwit-newapi

# 本机健康检查
curl -s http://127.0.0.1:3000/api/status | head -c 200

# 公网访问
curl -I https://api.example.com/api/status
```

浏览器登录 `https://api.example.com`，默认账号 `root / 123456`，**立即改密码 + 关闭注册**。

## 5. 排错速查

| 现象 | 排查方向 |
| --- | --- |
| 容器一直 restart | `docker logs snowwit-newapi` 看是不是 DSN/密钥错 |
| `Access denied for user` | 宝塔库的访问权限 = 所有人；密码用单引号包住；DSN 里的 `@tcp(host.docker.internal:3306)` 写对 |
| `connection refused 3306` | 宿主机 MySQL 没监听 0.0.0.0 / 防火墙拦截了 docker0；改 `/etc/mysql/my.cnf` `bind-address=0.0.0.0` 然后重启 MySQL |
| 流式响应卡住 / 客户端报 timeout | Nginx 必须有 `proxy_buffering off`，且 `proxy_read_timeout >= 600s` |
| `docker pull ... unauthorized` | GHCR 包没设 Public，或先 `echo $PAT \| docker login ghcr.io -u SunQuan96 --password-stdin` |
| 浏览器 502 | 容器没起 / 端口没监听 127.0.0.1:3000，看 `ss -lntp \| grep 3000` |
| Actions 构建 OOM | 不在服务器构建，全部交给 GitHub Runner，本地仅 `git push` |

## 6. 备份建议

宝塔 → 计划任务 → 添加 Shell 任务（每日凌晨 3 点）：

```bash
DATE=$(date +%Y%m%d)
BK=/www/backup/snowwit-newapi
mkdir -p $BK

# MySQL 库
mysqldump -u snowwit_newapi -p'2026sun.' --single-transaction --quick \
  --default-character-set=utf8mb4 snowwit_newapi | gzip > $BK/db-$DATE.sql.gz

# 容器数据目录（含上传文件等）
tar -C /www/wwwroot/snowwit-newapi -czf $BK/data-$DATE.tar.gz data

# 保留最近 14 天
find $BK -type f -mtime +14 -delete
```

## 7. 升级到 Redis（以后再做）

单实例够用就先用内存缓存。要拉 Redis 时：

1. `docker-compose.prod.yml` 增加 `redis` service（或直接装宝塔 Redis）；
2. `.env` 加 `REDIS_CONN_STRING=redis://:password@host.docker.internal:6379/0`；
3. 容器 `environment` 里把 `MEMORY_CACHE_ENABLED=true` 删掉；
4. `./scripts/deploy.sh` 重启。
