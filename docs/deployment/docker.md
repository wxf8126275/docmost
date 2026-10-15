# Docker 自部署指南（Docmost）

本指南说明如何基于本仓库的 `Dockerfile` 与 `docker-compose.yml`，把 Docmost
构建成镜像并以容器方式运行。适用于"稍后自己重新部署"的场景。

两种常见方式：

- **场景 A：全新部署** —— 自带 Postgres（pgvector）+ Redis，一条 `docker compose up` 拉起全套。
- **场景 B：复用已有的 Postgres / Redis** —— 只把 docmost 应用跑成容器，连你已经运行着的数据库/Redis（本次部署采用的就是这个）。

---

## 0. 前置：一次性确认 Dockerfile 能构建

镜像构建在 installer 阶段执行 `pnpm install --frozen-lockfile --prod`，而
`pnpm-workspace.yaml` 把 `apps/*`、`packages/*` 都纳入 workspace。原 Dockerfile
的 installer 阶段只复制了 `apps/server`、`packages/*` 的 `package.json`，
**漏了 `apps/client/package.json`**，会导致构建报：

```
ERR_PNPM_OUTDATED_LOCKFILE: Cannot install with "frozen-lockfile" because
pnpm-lock.yaml is not up to date with <ROOT>/apps/client/package.json
```

本仓库的 Dockerfile 已补上这一行（位于 installer 阶段 `# Copy apps` 段）：

```dockerfile
COPY --from=builder /app/apps/client/package.json /app/apps/client/package.json
```

> 如果你基于更旧的提交构建，请先加上这一行，否则 `docker build` 必失败。

构建镜像（二选一）：

```bash
# 方式 1：docker build
docker build -t docmost:local .

# 方式 2：交给 Compose 构建（见场景 A）
```

> 构建会执行 `pnpm install --frozen-lockfile`，受 `pnpm-workspace.yaml`
> 的 `minimumReleaseAge: 4320`（72h）供应链策略约束——确保 `pnpm-lock.yaml`
> 合规。若改过 `package.json`，先在宿主机 `pnpm install` 重新生成锁文件。
> 构建耗时数分钟，需要联网（拉 `node:26-slim` + pnpm registry）。

---

## 1. 场景 A：全新部署（自带 PG + Redis）

默认 `docker-compose.yml` 已经包含三个服务：`docmost`、`db`（pgvector/pg18）、
`redis:8`。但它写死了 `image: docmost/docmost:latest`（**发布版，不是你的本地代码**）。
要部署本地代码，加一个 override 让它构建本地镜像：

```yaml
# docker-compose.override.yml
services:
  docmost:
    build: .
    image: docmost:local
```

运行：

```bash
docker compose up -d --build
```

配置（写在 `docker-compose.yml` 的 `environment` 或 `.env`）：

| 变量 | 示例 | 说明 |
|------|------|------|
| `APP_SECRET` | `openssl rand -hex 32` 生成 | 会话/令牌签名，**要够长且跨重启稳定** |
| `DATABASE_URL` | `postgresql://docmost:STRONG_DB_PASSWORD@db:5432/docmost` | 主机名用 compose 服务名 `db` |
| `REDIS_URL` | `redis://redis:6379` | 主机名用服务名 `redis` |
| `APP_URL` | `http://localhost:3000` | 对外可访问地址 |

> `db` 服务的默认口令是占位符 `STRONG_DB_PASSWORD`，请换成强密码，并保持
> `DATABASE_URL` 与之同步。`db`/`redis` 的数据分别落在命名卷 `db_data`、
> `redis_data`，docmost 上传文件落在 `docmost` 卷，均持久化。

验证：`curl -I http://localhost:3000`（期望 HTTP 200/302）。

---

## 2. 场景 B：复用已有的 PG / Redis（本次采用）

适合你已有 Postgres / Redis 在运行，只想把 docmost 应用跑成容器并连过去。

### 2.1 取出现有连接串

从你的 `.env`（或现有部署配置）取出：

- `DATABASE_URL`，例如 `postgresql://docmost:docmost123@localhost:15432/docmost`
- `REDIS_URL`，例如 `redis://127.0.0.1:16379`
- `APP_SECRET`（**沿用原来的**，否则已有会话/令牌全部失效）

### 2.2 容器内访问宿主端口

容器里的 `localhost` 是容器自己，不是宿主。把地址里的 `localhost`/`127.0.0.1`
换成 `host.docker.internal`，并给容器加 `--add-host host.docker.internal:host-gateway`：

- `DATABASE_URL=postgresql://docmost:docmost123@host.docker.internal:15432/docmost`
- `REDIS_URL=redis://host.docker.internal:16379`

> 前提：现有 PG/Redis 的端口是**宿主可访问**的（如 `0.0.0.0:15432`）。
> 若它们只在某个 docker 网络内、没有宿主映射，见 2.4。

### 2.3 运行

```bash
docker run -d --name docmost-app \
  --add-host host.docker.internal:host-gateway \
  -e APP_URL=http://localhost:3000 \
  -e APP_SECRET=<沿用你的 APP_SECRET> \
  -e DATABASE_URL=postgresql://docmost:docmost123@host.docker.internal:15432/docmost \
  -e REDIS_URL=redis://host.docker.internal:16379 \
  -e STORAGE_DRIVER=local -e PORT=3000 \
  -p 3000:3000 \
  -v docmost_storage:/app/data/storage \
  --restart unless-stopped \
  docmost:local
```

- 端口冲突时改宿主侧，例如 `-p 3055:3000`，并同步把 `APP_URL` 改成
  `http://localhost:3055`。
- 存储卷 `docmost_storage` 持久化上传文件。
- 验证：
  ```bash
  docker logs docmost-app      # 应见 Database connection successful + No pending database migrations
  curl -I http://localhost:3000
  ```

### 2.4 进阶：复用仅在 docker 网络内的 DB（无宿主映射）

若现有库像 `docmost-db-1`（pgvector，只在 `docmost_default` 网络、内部端口 5432，
没有宿主映射），把新容器接入该网络并用其别名 `db`：

```bash
docker run -d --name docmost-app \
  --network docmost_default \
  -e DATABASE_URL=postgresql://docmost:STRONG_DB_PASSWORD@db:5432/docmost \
  -e REDIS_URL=redis://redis:6379 \
  ... docmost:local
```

（Redis 同理：接入它所在的网络用服务别名，或用 2.2 的宿主映射端口方式。）

---

## 3. 存储持久化

应用把上传文件写到容器内 `/app/data/storage`。

- 用命名卷：`-v docmost_storage:/app/data/storage`（推荐，简单持久化）。
- 想直接在宿主查看/备份：绑定挂载 `-v ./data:/app/data/storage`。

---

## 4. 升级到新代码

```bash
# 重新构建镜像
docker build -t docmost:local .          # 或场景 A: docker compose build

# 场景 B：删旧容器再起新的（用同样的 run 命令）
docker rm -f docmost-app && docker run ... docmost:local

# 场景 A：
docker compose up -d --build
```

> 若改过 `package.json`，先在宿主机 `pnpm install` 重新生成 `pnpm-lock.yaml`，
> 否则构建时 `--frozen-lockfile` 会因锁文件不一致 / 供应链策略失败。

---

## 5. 停止与清理

```bash
docker stop docmost-app && docker rm docmost-app     # 删容器，卷保留
docker volume rm docmost_storage                    # 连存储卷一起删（谨慎）
```

---

## 6. 可选：实时协作服务（collaboration）

Dockerfile 的 `CMD` 只启动 API 主进程（`pnpm start`）。Docmost 的实时协作由
独立进程 `pnpm collab`（`collab:prod`）提供。需要时可另起一个容器跑
`pnpm collab`，共享同一镜像、同一套环境变量，并暴露其端口（默认 3001）：

```yaml
# 也可写进 docker-compose.override.yml
services:
  collab:
    image: docmost:local
    depends_on: [db, redis]
    environment:
      APP_URL: 'http://localhost:3000'
      APP_SECRET: '<同上>'
      DATABASE_URL: 'postgresql://docmost:STRONG_DB_PASSWORD@db:5432/docmost'
      REDIS_URL: 'redis://redis:6379'
    command: ["pnpm", "collab"]
    ports: ["3001:3001"]
    restart: unless-stopped
```

---

## 7. 常见坑

1. **默认 compose 拉的是发布版镜像**：想部署本地代码必须加 `docker-compose.override.yml`
   的 `build: .` 或自己 `docker build`，否则你改的代码不会生效。
2. **Dockerfile 必须复制 `apps/client/package.json`**：否则构建报
   `ERR_PNPM_OUTDATED_LOCKFILE`（见第 0 节）。
3. **容器里 `localhost` ≠ 宿主**：复用宿主服务要用 `host.docker.internal`
   + `--add-host host.docker.internal:host-gateway`（场景 B）。
4. **`DATABASE_URL` 主机名**：同 docker 网络内用服务别名（`db`），跨宿主用
   `host.docker.internal` 或宿主机 IP。
5. **`APP_SECRET` 太短或每次重启都变**：会话/令牌失效，请用 `openssl rand -hex 32`
   生成并固定。
6. **改 `package.json` 后必须重新生成 `pnpm-lock.yaml`**：构建用 `--frozen-lockfile`，
   否则失败；且受 `minimumReleaseAge` 供应链策略约束。
7. **端口被占用**：改宿主映射（如 `3055:3000`），并同步 `APP_URL`。
