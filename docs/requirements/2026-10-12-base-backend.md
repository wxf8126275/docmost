# Base Backend (Bases API)

## Problem
点击页面编辑页底部「Get started」里的 **Base** / **Kanban** 按钮，前端调用 `POST /api/bases/convert` 报错 `Cannot POST /api/bases/convert`。根因：整个后端 `apps/server/src/ee/base` 模块缺失（仅有数据库迁移 `20260529T125146-bases.ts`、WS 桥 `ws/base-realtime.bridge.ts` 与 `nanoid.utils.ts` 中的 ID 辅助函数），前端 `apps/client/src/ee/base` 已完整实现但无后端承接。

## Behaviors
- 实现 `BaseController`（`@Controller('bases')`，全局前缀 `api` → `/api/bases/*`），覆盖前端 `base-service.ts` 依赖的全部 21 个端点。
- 实现 `BaseService`：convert（页面转 Base）、info、create/update/delete/list、properties CRUD+reorder、rows CRUD+reorder+info+list（含 filter/sort）、views CRUD+list、export-csv。
- 复用已有迁移schema（`base_properties` / `base_rows` / `base_views` / `pages.is_base` & `base_schema_version`）。
- 位置（position）采用与前端 `fractional-indexing-jittered` 兼容的 base62  lexicographic 方案，服务端仅在「初始创建 / 追加无 position」时生成，其余由前端下发并原样存储排序。
- 接入 `ee.module.ts`（AppModule 已按条件动态加载）。

## Acceptance Criteria
- `POST /api/bases/convert` 不再 404，且能把空页面转换为 Base 并创建默认属性 + 默认视图，返回符合 `IBase` 结构的数据。 → 手动/集成验证
- `getBaseInfo` / `listRows` / `listViews` 返回结构与前端 `base.types.ts` 一致（`listRows` 返回 `{items, meta, references}`）。 → 单元/集成验证
- 其余 CRUD 端点可用，写操作带 `JwtAuthGuard` + 页面级权限校验。 → 单元验证
- `pnpm --filter server test` 相关用例通过。 → test

## Context
- Tech stack: NestJS + Kysely(Postgres)，全局 `ValidationPipe({ whitelist: true, transform: true })` → DTO 必须声明所有前端下发的字段，否则被剥离。
- 全局路由前缀 `api`；控制器使用 `@UseGuards(JwtAuthGuard)` + `@AuthUser()` + `@AuthWorkspace()`。
- 相关 Feature flag: `Feature.BASES`（`useHasFeature` 控制前端显隐，后端此处不强制，但应在写操作时校验页面归属 workspace）。
- 数据库类型已含 `baseProperties/baseRows/baseViews`（`packages`... 实际为 `apps/server/src/database/types/db.d.ts` 经 `@docmost/db` 别名）。
- 公式（formula）求值在前端 `@docmost/base-formula/client` 完成，后端仅持久化定义，不求值。

## Constraints
- 不修改前端。
- 不改动迁移；复用现有表结构。
- 排序/筛选在后端以 JS 实现（best-effort），覆盖常见 operator；relation 类（any/none/all）暂作透传。

## Non-goals
- 真正的实时协作（仅实现满足 `base-realtime.bridge.ts` 接口的极简 `BaseWsService`，广播能力留空）。
- 后台类型转换 job（pendingType）的完整异步链路。
- 公式引擎在服务端求值。
