# Personal Space Backend (Personal Space API)

> 特性名归一化自用户命令中的接口路径 `/api/personal-space/info` → `personal-space`。

## Problem
用户访问页面时，`POST /api/personal-space/info` 报 **404**。根因：前端 `apps/client/src/ee/personal-space` 模块（service / queries / components）已完整实现企业版「个人空间」客户端，并发起两个请求：
- `getPersonalSpace()` → `POST /personal-space/info`（返回 `ISpace | null`）
- `createPersonalSpace()` → `POST /personal-space/create`

但后端**只有** `SpaceRepo.findPersonalSpace`（`apps/server/src/database/repos/space/space.repo.ts:71`）仓库方法，**完全没有**对应的 Controller / Service / Module，因此 `info` 与 `create` 都没有路由承接，全部 404。仅修复 `info` 不足以让前端流程可用（`create` 同样 404，且 `top-menu` 在 `info` 返回 null 时依赖 `create` 创建空间），故两者一并实现。

## Behaviors
- 新建 `apps/server/src/ee/personal-space/` 模块：`PersonalSpaceController` + `PersonalSpaceService` + `PersonalSpaceModule`。
- `PersonalSpaceController`：`@Controller('personal-space')`，全局前缀 `api` → `/api/personal-space/*`；`@UseGuards(JwtAuthGuard)` + `@AuthUser()` + `@AuthWorkspace()`。
  - `POST info`：返回当前用户在 `workspaceId` 下的个人空间（`spaceRepo.findPersonalSpace(user.id, workspaceId)`），无则返回 `null`。
  - `POST create`：`dto: { name?: string }`。幂等——若已存在个人空间则直接返回；否则调用 `SpaceService.createSpace(user, workspaceId, { name, slug, description }, undefined, { isPersonal: true })` 创建（该服务已处理成员加入、审计、slug 唯一校验），返回所建空间。
- 复用：`SpaceModule`（导出 `SpaceService`）注入到 `PersonalSpaceModule`；`SpaceRepo` 由全局 `DatabaseModule` 提供；slug 用 `generateSlugId`（`apps/server/src/common/helpers/nanoid.utils.ts`）生成。
- 在 `apps/server/src/ee/ee.module.ts` 的 `imports` 中注册 `PersonalSpaceModule`。

## Acceptance Criteria
- `POST /api/personal-space/info` 不再 404；个人空间存在时返回空间对象（含 `slug`/`id`），不存在时返回 `null`。 → 手动/集成验证
- `POST /api/personal-space/create` 不再 404；首次创建返回新空间，重复调用幂等返回同一空间；`top-menu` 的「Personal space」菜单项出现并可跳转。 → 手动/集成验证
- `pnpm --filter server test` 相关单元用例通过（info 返回 null/对象、create 幂等、复用 SpaceService）。 → test

## Context
- 技术栈：NestJS + Kysely(Postgres)；全局 `ValidationPipe({ whitelist: true, transform: true })` → DTO 必须声明前端下发的字段。
- 路由前缀 `api`；控制器使用 `@UseGuards(JwtAuthGuard)` + `@AuthUser()` + `@AuthWorkspace()`。
- `Space` 实体（`@docmost/db` `Spaces` 表）已含 `isPersonal`、`creatorId`、`slug`、`name`、`description` 等列；`CreateSpaceDto` 要求 `name`(min2) 与 `slug`（匹配 `^[a-zA-Z0-9][a-zA-Z0-9_-]*$`）。
- 前端 `ISpace`（`apps/client/src/features/space/types/space.types.ts`）含 `slug`/`id`/`name`/`isPersonal`/`creatorId`；`top-menu` 仅用 `personalSpace.slug` 跳转，`create-personal-space-modal` 用返回空间的 `slug` 跳转。

## Constraints
- 不修改前端。
- 不改动迁移；复用现有 `spaces` 表（`isPersonal` 列已存在）。
- 复用 `SpaceService.createSpace` 与 `SpaceRepo.findPersonalSpace`，不重复实现空间创建/查询逻辑。

## Non-goals
- 不在服务端额外强制 `PERSONAL_SPACES` feature flag 或 `workspace.settings.spaces.allowPersonal` 开关（前端已 gate；避免引入与会话不一致的服务端拒绝）。如后续需要可在 `create` 增加校验。
- 不实现个人空间的 update / delete。
