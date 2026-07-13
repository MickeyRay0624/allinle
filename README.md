# ALLINLE - 德州扑克记账与牌技训练工具

> ⚠️ **定位声明**：ALLINLE 是一款德州扑克 **记账工具** 和 **牌技训练工具**，不是线上赌博平台。所有练习筹码仅为模拟筹码，不具备任何财产属性。

---

## 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [本地开发](#本地开发)
5. [正式微信登录](#正式微信登录)
6. [环境变量说明](#环境变量说明)
7. [管理后台权限系统](#管理后台权限系统)
8. [生产部署](#生产部署)
9. [Nginx HTTPS 配置](#nginx-https-配置)
10. [小程序合法域名配置](#小程序合法域名配置)
11. [安全加固](#安全加固)
12. [埋点日志](#埋点日志)
13. [风控日志](#风控日志)
14. [健康检查](#健康检查)
15. [数据库备份与恢复](#数据库备份与恢复)
16. [上线前审核 Checklist](#上线前审核-checklist)
17. [常见问题](#常见问题)
18. [下一步开发建议](#下一步开发建议)

---

## 项目概述

ALLINLE 提供三大核心功能：

1. **个人/团队记账**：记录线下德州扑克牌局的买入、兑现、盈亏
2. **线上练习房**：与好友进行私密练习（非公开匹配）
3. **单人机器人练习**：与 AI 机器人练习牌技，支持手牌复盘和数据分析

### 合规红线

项目从第一天起就遵守以下红线，确保不触碰赌博监管：

- ❌ 不实现充值、提现、兑换、钱包、支付、抽水、分成
- ❌ 练习筹码不可兑换、不可交易、不可转入记账
- ❌ 不做公开大厅、不做陌生人匹配
- ❌ 不做排行榜奖励、不做现金化
- ❌ 不做自由聊天（仅预设快捷语）
- ❌ 不做任何与支付、真钱相关的功能

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 小程序 | 微信原生 + TypeScript |
| 后端 API | NestJS + TypeScript |
| 数据库 | MySQL 8.4 (Prisma ORM) |
| 缓存 | Redis 7.2 |
| 实时通信 | Socket.IO (WebSocket) |
| 管理后台 | React + Vite + TypeScript |
| 部署 | Docker Compose / PM2 + Nginx |

---

## 项目结构

```
allinle/
├── apps/
│   ├── api/           # NestJS API 服务
│   ├── admin/         # React 管理后台
│   └── miniprogram/   # 微信小程序
├── packages/
│   └── shared/        # 共享代码（类型、扑克引擎、错误码）
├── deploy/
│   ├── nginx/         # Nginx 配置
│   ├── pm2/           # PM2 进程管理
│   └── scripts/       # 部署/备份脚本
├── docker/            # Docker 初始化脚本
├── docs/
│   └── api-tests/     # API 测试文件 (.http)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 本地开发

### 前置条件

- Node.js >= 20
- pnpm (通过 `npm install -g pnpm` 安装)
- Docker Desktop（用于运行 MySQL 和 Redis）

### 启动步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入本地配置

# 3. 启动数据库和 Redis
docker-compose up -d

# 4. 生成 Prisma Client
pnpm prisma:generate

# 5. 同步数据库 schema
pnpm prisma:migrate

# 6. （可选）填充种子数据
pnpm prisma:seed

# 7. 启动 API 服务
pnpm dev:api

# 8. 启动管理后台（另一个终端）
pnpm dev:admin

# 9. 打开管理后台
open http://localhost:5173

# 10. 查看 API 文档
open http://localhost:3000/api/docs
```

### 开发登录

开发环境下可使用 `POST /api/auth/dev-login` 快速获取 token：

```bash
curl -X POST http://localhost:3000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"nickname": "测试用户"}'
```

> ⚠️ dev-login **仅限 NODE_ENV !== production** 时使用。生产环境会返回 `AUTH_DEV_LOGIN_DISABLED`。

### 运行测试

```bash
# 所有测试
pnpm test

# 仅 API 测试
pnpm --filter @allinle/api test

# 仅共享包测试
pnpm --filter @allinle/shared test
```

---

## 正式微信登录

### 获取微信 AppID 和 Secret

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入「开发」→「开发管理」→「开发设置」
3. 复制 **AppID** 和 **AppSecret**
4. **切勿将 AppSecret 提交到 Git！**

### 配置

```env
WX_APPID=wx1234567890abcdef
WX_SECRET=your_actual_secret_here
```

### 生成随机 Secret

```bash
openssl rand -base64 32
```

使用此命令生成强随机的 `JWT_SECRET` 和 `ADMIN_JWT_SECRET`。

### 登录流程

```
小程序端                    API 服务端                 微信服务器
   |                          |                        |
   |-- wx.login() ----------->|                        |
   |                          |-- code2Session ------>|
   |                          |<-- openid + session_key|
   |                          |                        |
   |                          |-- 查找/创建 User       |
   |<-- JWT token + user -----|                        |
   |                          |                        |
   |-- 后续请求带 Bearer ----|                        |
```

1. 小程序调用 `wx.login()` 获取临时 `code`
2. 调用 `POST /api/auth/wx-login` 传入 `code`
3. 服务端调用微信 `code2Session` 换取 `openid`
4. 根据 `openid` 查找或创建用户
5. 返回 JWT token（**不返回 session_key**）

---

## 环境变量说明

| 变量 | 说明 | 生产环境要求 |
|------|------|------------|
| `NODE_ENV` | 运行环境 | 设置为 `production` |
| `JWT_SECRET` | 用户 JWT 密钥 | **必须**使用 `openssl rand -base64 32` 生成 |
| `ADMIN_JWT_SECRET` | 管理员 JWT 密钥 | **必须**使用随机生成，不得与 JWT_SECRET 相同 |
| `WX_APPID` | 微信小程序 AppID | 必填 |
| `WX_SECRET` | 微信小程序 Secret | 必填，不得提交 Git |
| `CORS_ORIGIN` | 允许的跨域来源 | 设为你的域名 |
| `DATABASE_URL` | 数据库连接字符串 | 使用强密码 |
| `API_RATE_LIMIT_PER_MINUTE` | API 限流 | 建议 60 |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | 登录限流 | 建议 10 |

---

## 管理后台权限系统

### 角色定义

| 角色 | 权限 |
|------|------|
| `SUPER_ADMIN` | 全部权限：创建管理员、修改系统配置、查看审计日志 |
| `ADMIN` | 管理权限：查看用户、管理练习房、查看风控日志 |
| `OPERATOR` | 只读权限：查看仪表盘和基本数据 |

### 首次登录

首次使用默认账号登录会自动创建 SUPER_ADMIN：

- 用户名：`admin`
- 密码：`admin123456`

> ⚠️ **生产环境必须修改默认密码！**

### 用户 Token 与管理 Token 隔离

- 用户接口（小程序）使用 `JWT_SECRET` 签名，`type: "USER"`
- 管理员接口使用 `ADMIN_JWT_SECRET` 签名，`type: "ADMIN"`
- 两套 token **不可混用**

---

## 生产部署

### 1. 服务器初始化

```bash
# 运行初始化脚本
sudo bash deploy/scripts/setup-server.sh
```

该脚本会自动安装 Node.js 20+、pnpm、PM2、Nginx、Certbot。

### 2. 部署 API

```bash
# 克隆项目
cd /var/www
git clone <your-repo> allinle
cd allinle

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
vim .env  # 填入生产配置

# 生成 Prisma Client 并迁移
export $(cat .env | xargs)
pnpm prisma:generate
pnpm prisma:migrate

# 构建
pnpm build:api

# 使用 PM2 启动
pm2 start deploy/pm2/ecosystem.config.js
pm2 save
pm2 startup
```

### 3. 部署管理后台

```bash
pnpm build:admin
sudo cp -r apps/admin/dist/* /var/www/allinle/admin/
```

### 4. Docker Compose（生产数据库）

> ⚠️ 生产环境建议使用云服务商提供的 MySQL/Redis，而非 Docker。

如果使用 Docker Compose：

```bash
# 修改 docker-compose.yml 中的端口映射和密码
docker-compose -f docker-compose.prod.yml up -d
```

---

## Nginx HTTPS 配置

### 获取 SSL 证书

```bash
sudo certbot --nginx -d api.allinle.example.com -d admin.allinle.example.com
```

### Nginx 配置文件

参考 `deploy/nginx/allinle.conf`，包含：

- HTTP → HTTPS 强制跳转
- SSL/TLS 1.2+ 配置
- WebSocket 反向代理（`/practice-room` 路径升级为 WebSocket）
- 安全头（X-Frame-Options, HSTS 等）

### 部署 Nginx 配置

```bash
sudo cp deploy/nginx/allinle.conf /etc/nginx/sites-available/allinle
sudo ln -s /etc/nginx/sites-available/allinle /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 配置定时证书续期

```bash
sudo crontab -e
# 添加：
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## 小程序合法域名配置

在微信公众平台「开发」→「开发管理」→「开发设置」中配置：

### request 合法域名
```
https://api.allinle.example.com
```

### socket 合法域名
```
wss://api.allinle.example.com
```

> 域名必须已备案、已配置 HTTPS、且不在微信黑名单中。

---

## 安全加固

### 已实施的安全措施

1. **JWT Token 分离**：用户 token 和管理员 token 使用不同密钥
2. **CORS 白名单**：生产环境通过 `CORS_ORIGIN` 白名单控制
3. **Rate Limiting**：全局限流 + 登录接口更严格限流
4. **Helmet 安全头**：自动添加 CSP、HSTS、X-Frame-Options 等
5. **敏感词过滤**：自动检测赌博、支付、代理等敏感词汇
6. **Token 脱敏**：日志中自动隐藏 Bearer token 和密码字段
7. **生产环境密钥检查**：启动时检查 JWT_SECRET 是否使用默认值
8. **错误信息脱敏**：生产环境不暴露内部错误详情
9. **Swagger 生产禁用**：生产环境不暴露 API 文档
10. **管理审计日志**：所有管理操作完整记录

---

## 埋点日志

### 事件上报

```bash
POST /api/events/track
Content-Type: application/json

{
  "eventName": "page_view",
  "eventGroup": "miniprogram",
  "metadata": { "page": "/pages/index/index" }
}
```

### 预定义事件

| 事件组 | 事件名 | 说明 |
|--------|--------|------|
| `miniprogram` | `app_launch` | 小程序启动 |
| `miniprogram` | `page_view` | 页面浏览 |
| `auth` | `login_success` | 登录成功 |
| `auth` | `login_fail` | 登录失败 |
| `practice` | `room_create` | 创建练习房 |
| `practice` | `room_join` | 加入练习房 |
| `practice` | `hand_start` | 手牌开始 |
| `practice` | `hand_end` | 手牌结束 |
| `ledger` | `game_create` | 创建记账 |
| `ledger` | `game_confirm` | 确认记账 |

---

## 风控日志

系统自动记录以下风控事件：

- `HIGH_CHIPS_ROOM`：练习房初始筹码过高
- `COMPLIANCE_NOT_CONFIRMED`：未确认合规声明
- `SUSPICIOUS_ACTION`：可疑游戏操作
- `ROOM_CLOSED_BY_ADMIN`：管理员关闭房间

管理后台可在「风控日志」页面查看。

---

## 健康检查

```bash
GET /api/health
```

返回示例：

```json
{
  "status": "ok",
  "timestamp": "2026-07-09T10:00:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "db": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

---

## 数据库备份与恢复

### 定时备份

```bash
# 添加 cron 任务
crontab -e
# 每天凌晨 2 点备份
0 2 * * * /var/www/allinle/deploy/scripts/backup-db.sh
```

### 手动备份

```bash
bash deploy/scripts/backup-db.sh
# 备份文件位于 /var/backups/allinle/
```

### 恢复

```bash
bash deploy/scripts/restore-db.sh /var/backups/allinle/allinle_20260709_020000.sql.gz
```

---

## 上线前审核 Checklist

### 小程序审核准备

- [ ] AppID 和 Secret 已配置
- [ ] request 合法域名已添加
- [ ] socket 合法域名已添加  
- [ ] HTTPS 证书有效
- [ ] 服务器域名已备案
- [ ] 所有页面文案检查（无赌博暗示）
- [ ] 功能页面完整可操作
- [ ] 无隐藏的支付/充值入口
- [ ] 练习页面明确标注"模拟筹码，不具备财产属性"
- [ ] 合规声明弹窗可正常展示
- [ ] 用户协议和隐私政策链接可用
- [ ] 类目选择：工具 > 记账 或 教育 > 培训

### 安全审核

- [ ] JWT_SECRET 和 ADMIN_JWT_SECRET 使用强随机值
- [ ] WX_SECRET 未提交到代码仓库
- [ ] CORS 白名单正确配置
- [ ] HTTPS 已启用
- [ ] Swagger 在生产环境已禁用
- [ ] 错误信息不泄露内部细节
- [ ] 日志中不包含敏感信息（token、密码）

### 运维准备

- [ ] 数据库备份 cron 已配置
- [ ] PM2 已配置开机自启
- [ ] SSL 证书自动续期已配置
- [ ] 监控告警已配置
- [ ] 文档已更新

---

## 常见问题

### 1. wx-login 报 invalid code

`code` 由 `wx.login()` 获取，**只能使用一次**且有效期为 5 分钟。确保是小程序端实时获取的 code，不要重复使用。

### 2. 小程序请求不在合法域名

在微信公众平台配置 `request 合法域名`，必须是 HTTPS 且已备案的域名。开发阶段可在开发者工具中勾选「不校验合法域名」。

### 3. socket 合法域名错误

WebSocket 连接使用 `wss://` 协议，需要在公众平台配置 `socket 合法域名`。

### 4. HTTPS 证书无效

确保使用 Let's Encrypt 或其他可信 CA 签发的证书。自签名证书在小程序中不被信任。

### 5. WebSocket 连接失败

检查 Nginx 是否正确配置了 WebSocket 升级（参考 `deploy/nginx/allinle.conf`）。

### 6. CORS 报错

检查 `CORS_ORIGIN` 环境变量是否包含请求来源的域名。

### 7. Nginx 502

通常是后端服务未启动或 PM2 进程崩溃。检查 `pm2 status` 和 `pm2 logs`。

### 8. PM2 进程启动失败

检查 `dist/main.js` 是否存在（需要先 `pnpm build:api`），以及环境变量是否正确加载。

### 9. Prisma migration 失败

确保 `DATABASE_URL` 正确且数据库可访问。可尝试 `pnpm prisma:migrate` 重新执行。

### 10. Redis 连接失败

检查 Redis 服务是否启动：`redis-cli ping`。Docker 环境检查 `docker-compose ps`。

### 11. 生产环境 dev-login 不可用

这是设计如此。生产环境 `NODE_ENV=production` 时 dev-login 会自动返回 403 错误。

### 12. 管理后台无权限

确认登录账号的角色权限。OPERATOR 角色只有只读权限，SUPER_ADMIN 拥有全部权限。

### 13. Swagger 生产环境访问不了

生产环境自动禁用 Swagger 文档。可在开发环境通过 `http://localhost:3000/api/docs` 查看。

### 14. 小程序审核如何解释线上练习

建议说明：「本功能为德州扑克牌技练习和记账工具，所有筹码为模拟训练用虚拟筹码，不具备财产属性，不提供充值、提现、兑换功能。」

---

## 下一步开发建议（第六阶段）

1. **CI/CD 流水线**：GitHub Actions 自动化测试和部署
2. **监控告警**：接入 Sentry/DataDog 进行错误监控
3. **性能优化**：Redis 缓存热点数据，API 响应压缩
4. **日志聚合**：ELK 或 Loki 集中管理日志
5. **多语言支持**：i18n 国际化
6. **数据大盘**：管理后台增加图表和数据可视化
7. **通知系统**：小程序订阅消息推送
8. **灰度发布**：支持按比例分流到不同版本
