# Plan: Personal Space Backend

## Intent
后端缺 `ee/personal-space` 模块，导致前端 `ee/personal-space` 客户端（`getPersonalSpace` / `createPersonalSpace`）调用的 `POST /api/personal-space/info` 与 `POST /api/personal-space/create` 全部 404。本计划实现该后端模块，**复用**现有 `SpaceService.createSpace`（已支持 `isPersonal`、成员加入、审计、slug 唯一校验）与 `SpaceRepo.findPersonalSpace`，不重复造轮子。

## 模块布局（全部新建于 `apps/server/src/ee/personal-space/`）
- `personal-space.dto.ts` —— `CreatePersonalSpaceDto`
- `personal-space.service.ts` —— `PersonalSpaceService`
- `personal-space.service.spec.ts` —— 服务单测（TDD）
- `personal-space.controller.ts` —— `PersonalSpaceController`
- `personal-space.module.ts` —— `PersonalSpaceModule`
- 修改 `apps/server/src/ee/ee.module.ts` —— 注册 `PersonalSpaceModule`

## 实现细节

### `personal-space.dto.ts`
```ts
export class CreatePersonalSpaceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
}
```
（`info` 端点无请求体，无需 DTO。）

### `personal-space.service.ts`
依赖注入：`SpaceRepo`（来自 `@docmost/db`，全局 `DatabaseModule` 提供）与 `SpaceService`（来自 `../../core/space/services/space.service`，由 `SpaceModule` 导出）。引入 `generateSlugId`（`common/helpers/nanoid.utils.ts`）。

- `getPersonalSpace(user: User, workspaceId: string): Promise<Space | null>`
  → `const s = await this.spaceRepo.findPersonalSpace(user.id, workspaceId); return s ?? null;`
- `createPersonalSpace(user: User, workspaceId: string, dto: CreatePersonalSpaceDto): Promise<Space>`
  1. 幂等：`const existing = await this.spaceRepo.findPersonalSpace(user.id, workspaceId); if (existing) return existing;`
  2. `const name = dto.name?.trim() || 'Personal Space';`
  3. `const slug = generateSlugId();`
  4. `return this.spaceService.createSpace(user, workspaceId, { name, description: '', slug }, undefined, { isPersonal: true });`

### `personal-space.controller.ts`
`@Controller('personal-space')` + `@UseGuards(JwtAuthGuard)` + `@AuthUser()` + `@AuthWorkspace()`（路由前缀 `api` → `/api/personal-space/*`）。
- `@Post('info')` → `return this.personalSpaceService.getPersonalSpace(user, workspace.id);`（无 `@Body()`，前端发 `{}`，whitelist 下安全）
- `@Post('create')` → `return this.personalSpaceService.createPersonalSpace(user, workspace.id, dto);`

### `personal-space.module.ts`
```ts
@Module({
  controllers: [PersonalSpaceController],
  providers: [PersonalSpaceService],
  imports: [SpaceModule],
})
export class PersonalSpaceModule {}
```
（`SpaceModule` 导出 `SpaceService`；`SpaceRepo` 由全局 `DatabaseModule` 提供。）

### `ee.module.ts`
`import { PersonalSpaceModule } from './personal-space/personal-space.module';` 并加入 `imports` 数组。

## 任务拆分（TDD）
| id | name | complexity | parallel_safe | depends_on | done_when |
|----|------|-----------|---------------|-----------|-----------|
| 1 | `personal-space-dto` | low | true | — | DTO 文件写好、`tsc` 通过 |
| 2 | `personal-space-service` | high | false | 1 | 服务 + `spec` 写好，单测全绿（行为断言） |
| 3 | `personal-space-controller-module` | medium | false | 2 | controller + module 写好，`tsc` 通过 |
| 4 | `wire-ee-module` | low | false | 3 | `ee.module.ts` 接好，`tsc --noEmit` 与 `eslint` 通过 |

### 任务 2 单测覆盖（mock `SpaceRepo` 与 `SpaceService`）
- `getPersonalSpace`：`findPersonalSpace` 返回 `undefined` → 返回 `null`；返回实体 → 原样返回。
- `createPersonalSpace`：
  - 已存在个人空间 → 直接返回 existing，**不调用** `spaceService.createSpace`。
  - 不存在 → 调用 `spaceService.createSpace(user, wsId, { name, description:'', slug }, undefined, { isPersonal:true })`，返回创建结果；断言 `slug` 为字符串、`name` 透传或默认 `'Personal Space'`、`isPersonal:true`。

## 验证（run 阶段）
- `pnpm --filter server jest ee/personal-space/personal-space.service.spec.ts` → 全绿
- `npx tsc --noEmit -p tsconfig.build.json` → 无类型错误
- `npx eslint src/ee/personal-space src/ee/ee.module.ts` → 无 lint 问题

## 验收（来自需求）
- `POST /api/personal-space/info` 不再 404：存在返回空间对象（含 `slug`/`id`），不存在返回 `null`。
- `POST /api/personal-space/create` 不再 404：首次创建返回新空间，重复调用幂等返回同一空间；`top-menu`「Personal space」出现并可跳转。
- `pnpm --filter server test` 相关单元用例通过。

## 约束 / 非目标（来自需求）
- 不改前端；不改迁移（`spaces.isPersonal` 已存在）；复用 `SpaceService` / `SpaceRepo`。
- 不新增 feature-flag / workspace-setting 服务端强校验（前端已 gate）；不实现个人空间的 update / delete。
