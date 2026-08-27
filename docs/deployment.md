# ALLINLE 通用生产部署指南

本文档适用于单台 Ubuntu 22.04/24.04 服务器：

- NestJS API 由 PM2 管理；
- React 管理后台由 Nginx 提供静态文件；
- Nginx 负责 HTTPS、REST API 和 Socket.IO 反向代理；
- MySQL 与 Redis 可使用云服务，也可通过 Docker Compose 部署在本机。

示例安装目录为 `/opt/allinle`，域名为 `api.example.com` 与 `admin.example.com`。请按实际环境替换。

## 1. 部署前准备

- 使用具有 `sudo` 权限的普通用户，并配置 SSH 密钥登录。
- 将 API 与管理后台域名解析到服务器。
- 防火墙仅对外开放 SSH、HTTP 和 HTTPS。
- 安装 Git。
- 如使用本机 MySQL/Redis，按照 [Docker 官方 Ubuntu 指南](https://docs.docker.com/engine/install/ubuntu/) 安装 Docker Engine 与 Compose 插件。

设置当前终端使用的部署变量：

```bash
export REPOSITORY_URL="https://github.com/<owner>/<repository>.git"
export INSTALL_DIR="/opt/allinle"
export API_DOMAIN="api.example.com"
export ADMIN_DOMAIN="admin.example.com"
```

## 2. 克隆项目与初始化主机

```bash
sudo mkdir -p "$INSTALL_DIR"
sudo chown "$USER":"$(id -gn)" "$INSTALL_DIR"
git clone "$REPOSITORY_URL" "$INSTALL_DIR"
cd "$INSTALL_DIR"

sudo ALLINLE_ROOT="$INSTALL_DIR" ALLINLE_USER="$USER" \
  bash deploy/scripts/setup-server.sh

pnpm install --frozen-lockfile
```

初始化脚本会确保 Node.js 版本受支持，并安装 pnpm、PM2、Nginx、Certbot 和 MySQL 客户端。全新服务器默认安装 Node.js 24 LTS。

## 3. 配置生产环境变量

```bash
cd "$INSTALL_DIR"
cp .env.example .env
chmod 600 .env
vim .env
```

至少修改以下变量：

| 变量                       | 说明                                               |
| -------------------------- | -------------------------------------------------- |
| `NODE_ENV`                 | 设置为 `production`                                |
| `JWT_SECRET`               | 使用 `openssl rand -hex 32` 生成                   |
| `ADMIN_JWT_SECRET`         | 单独生成，不得与用户 JWT 密钥相同                  |
| `ADMIN_DEFAULT_PASSWORD`   | 设置强随机密码                                     |
| `DATABASE_URL`             | Prisma 使用的 MySQL 连接地址                       |
| `MYSQL_*`                  | Compose 与备份脚本使用的数据库配置                 |
| `REDIS_HOST/PORT/PASSWORD` | Redis 连接信息，生产环境必须设置密码               |
| `CORS_ORIGIN`              | 管理后台完整地址，例如 `https://admin.example.com` |
| `PUBLIC_BASE_URL`          | API 完整地址，例如 `https://api.example.com`       |
| `WX_APPID/WX_SECRET`       | 微信小程序后台提供的凭据                           |
| `UPLOAD_DIR`               | 用户上传文件的持久化目录                           |

`.env` 只保存在服务器，不得提交到 Git。若密码含有 `@`、`:`、`/` 等字符，写入 `DATABASE_URL` 前需要进行 URL 编码。

## 4. 启动 MySQL 与 Redis

使用云数据库或已有服务时，在 `.env` 中填写连接信息并跳过本步骤。

在同一台服务器使用 Docker 时：

```bash
cd "$INSTALL_DIR"
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

生产 Compose 只把 MySQL 与 Redis 端口绑定到 `127.0.0.1`，不会直接暴露到公网。

## 5. 数据库迁移与构建

```bash
cd "$INSTALL_DIR"
pnpm prisma:generate
pnpm prisma:deploy
pnpm build
mkdir -p logs apps/api/uploads backups
```

生产环境使用 `prisma migrate deploy` 应用仓库中已有的迁移。不要在生产环境运行会生成开发迁移的 `prisma migrate dev`。

## 6. 使用 PM2 启动 API

```bash
cd "$INSTALL_DIR"
set -a
. ./.env
set +a

ALLINLE_ROOT="$INSTALL_DIR" pm2 start deploy/pm2/ecosystem.config.js
pm2 save
pm2 startup
```

执行 `pm2 startup` 后，运行终端输出的 `sudo` 命令以启用开机自启。

实时房间使用 Socket.IO，默认只启动一个 API 实例。接入跨实例 Socket.IO 适配器后，才可通过 `WEB_CONCURRENCY` 安全扩容。

## 7. 配置 Nginx 与 HTTPS

仓库中的 `deploy/nginx/allinle.conf` 是通用 HTTP 模板。替换域名和安装目录后启用：

```bash
cd "$INSTALL_DIR"
sudo cp deploy/nginx/allinle.conf /etc/nginx/sites-available/allinle
sudo sed -i "s#api.example.com#$API_DOMAIN#g" /etc/nginx/sites-available/allinle
sudo sed -i "s#admin.example.com#$ADMIN_DOMAIN#g" /etc/nginx/sites-available/allinle
sudo sed -i "s#/opt/allinle#$INSTALL_DIR#g" /etc/nginx/sites-available/allinle
sudo ln -sfn /etc/nginx/sites-available/allinle /etc/nginx/sites-enabled/allinle
sudo nginx -t
sudo systemctl reload nginx
```

确认两个域名均可通过 HTTP 访问后签发证书：

```bash
sudo certbot --nginx -d "$API_DOMAIN" -d "$ADMIN_DOMAIN"
sudo certbot renew --dry-run
```

## 8. 部署验证

```bash
curl "https://$API_DOMAIN/api/health"
pm2 status
pm2 logs allinle-api --lines 100
docker compose -f docker-compose.prod.yml ps
```

健康检查应返回 `status: ok`，并包含 MySQL 与 Redis 状态。

## 9. 后续版本更新

更新前先备份数据库：

```bash
cd "$INSTALL_DIR"
bash deploy/scripts/backup-db.sh
```

然后拉取代码、迁移并重新构建：

```bash
cd "$INSTALL_DIR"
git pull --ff-only
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:deploy
pnpm build

set -a
. ./.env
set +a

ALLINLE_ROOT="$INSTALL_DIR" \
  pm2 reload deploy/pm2/ecosystem.config.js --update-env
```

## 10. 数据库备份与恢复

备份脚本默认读取项目根目录的 `.env`，并将文件保存到 `<项目目录>/backups`。

手动备份：

```bash
cd "$INSTALL_DIR"
bash deploy/scripts/backup-db.sh
```

每天凌晨 2 点自动备份：

```cron
0 2 * * * ALLINLE_ROOT=/opt/allinle /opt/allinle/deploy/scripts/backup-db.sh >> /opt/allinle/logs/backup.log 2>&1
```

恢复备份：

```bash
cd "$INSTALL_DIR"
bash deploy/scripts/restore-db.sh backups/allinle_YYYYMMDD_HHMMSS.sql.gz
```

恢复会要求输入 `RESTORE` 二次确认。自动化恢复可在文件参数后添加 `--yes`。

可用配置：

| 变量                    | 默认值                         |
| ----------------------- | ------------------------------ |
| `ALLINLE_ROOT`          | 根据脚本位置自动识别项目根目录 |
| `ALLINLE_ENV_FILE`      | `<项目目录>/.env`              |
| `BACKUP_DIR`            | `<项目目录>/backups`           |
| `BACKUP_RETENTION_DAYS` | `30`                           |

## 11. 生产安全检查

- [ ] `.env` 权限为 `600`，且未提交到 Git。
- [ ] 用户 JWT 与管理员 JWT 使用不同的随机密钥。
- [ ] 已修改默认管理员密码。
- [ ] MySQL 与 Redis 未暴露到公网。
- [ ] SSH 使用密钥认证，并限制密码登录。
- [ ] HTTPS 证书自动续期测试通过。
- [ ] PM2 已保存进程列表并配置开机启动。
- [ ] 数据库定时备份已启用，并做过恢复演练。
- [ ] `/api/health` 已接入服务器监控。

## 12. 常见问题

### Nginx 返回 502

检查 API 是否运行以及本机端口是否可访问：

```bash
pm2 status
pm2 logs allinle-api --lines 100
curl http://127.0.0.1:3000/api/health
```

### Prisma 迁移失败

检查 `.env` 中的 `DATABASE_URL`，确认数据库已启动，然后重新执行：

```bash
pnpm prisma:deploy
```

### Redis 连接失败

检查 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`，以及容器状态：

```bash
docker compose -f docker-compose.prod.yml ps
```

### WebSocket 无法连接

检查 Nginx 是否保留 `Upgrade` 与 `Connection` 请求头，并确认客户端使用 `wss://` 地址。

## 官方参考

- [Prisma：生产环境迁移](https://www.prisma.io/docs/cli/migrate/deploy)
- [PM2：开机自启](https://pm2.keymetrics.io/docs/usage/startup/)
- [Docker：Compose 生产部署](https://docs.docker.com/compose/how-tos/production/)
- [Certbot：Nginx HTTPS](https://certbot.eff.org/instructions?ws=nginx)
