# Handoff: Personal Space Backend (`personal-space`)

> 状态：**DONE（4/4 任务，5/5 测试）**，但 **代码改动尚未提交**（见下方「当前阻塞 / 接手下一步」）。

## 特性背景
`POST /api/personal-space/info` 报 404。根因：前端 `ee/personal-space` 客户端（service / queries / components）已完整，但后端**只有** `SpaceRepo.findPersonalSpace` 仓库方法，缺 Controller/Service/Module，因此 `info` 与 `create` 都 404。仅修 `info` 不够——前端 `top-menu` 在 `info` 返回 null 且开关开启时会调 `create`，故两者一并实现。

## 文档索引
- 需求：`docs/requirements/2026-10-13-personal-space.md`
- 计划：`docs/plans/2026-10-13-personal-space.md`
- 服务单测报告：`docs/test-reports/2026-10-13-personal-space/task-2-service.md`
- 评审报告：`docs/test-reports/2026-10-13-personal-space/review.md`
- 本交接：`docs/test-reports/2026-10-13-personal-space/handoff.md`

## 文件清单（已核对磁盘）
**新建**
- `apps/server/src/ee/personal-space/personal-space.dto.ts` —— `CreatePersonalSpaceDto`（`name?` 可选，min2/max100，自动 trim）
- `apps/server/src/ee/personal-space/personal-space.service.ts` —— `PersonalSpaceService`
- `apps/server/src/ee/personal-space/personal-space.service.spec.ts` —— 5 个行为级单测
- `apps/server/src/ee/personal-space/personal-space.controller.ts` —— `POST info` / `POST create`
- `apps/server/src/ee/personal-space/personal-space.module.ts` —— import `SpaceModule`
- `apps/server/src/ee/ee.module.ts`（修改）—— 注册 `PersonalSpaceModule`

## 行为契约
- `POST /api/personal-space/info`：`getPersonalSpace` 返回当前用户在 `workspaceId` 下的个人空间（`spaceRepo.findPersonalSpace(user.id, workspaceId)`），无则 `null`。前端 `info` 发 `{}`，`null` 表示尚不存在。
- `POST /api/personal-space/create`（`{name?}`）：幂等——已存在直接返回；否则 `spaceService.createSpace(user, wsId, { name, description:'', slug: generateSlugId() }, undefined, { isPersonal: true })`。返回所建空间（含 `slug`/`id`）。

## 复用（未重写）
- `SpaceService.createSpace`（成员加入、`spaces.isPersonal` 写入、审计、`slug` 唯一校验）
- `SpaceRepo.findPersonalSpace`
- `generateSlugId`（`common/helpers/nanoid.utils.ts`）

## 验证（已执行，全绿）
- `pnpm --filter server jest ee/personal-space/personal-space.service.spec.ts` → **5/5 通过**
- `npx tsc --noEmit -p tsconfig.build.json` → 类型检查通过
- `npx eslint src/ee/personal-space src/ee/ee.module.ts` → 无 lint 问题

## 当前阻塞 / 接手下一步
- **无功能阻塞**。但 `git status` 显示 `apps/server/src/ee/personal-space/`（新增）、`ee.module.ts`（修改）、`docs/.../personal-space/*`（新增）**均未提交**。下一步：
  1. （可选，关闭 F001）启动 dev DB，用前端「个人空间」页或 `pnpm --filter server test:e2e` 对真实 Postgres 做端到端验证（重点：`create` 的写库/加成员/审计路径）。
  2. `sean commit personal-space`：当前工作树里 personal-space 是唯一未提交的特性，可直接一个提交 `feat(ee): implement personal-space backend API`（含 `ee/personal-space/*` + `ee.module.ts` + 需求/计划/test-reports 文档）；另补 `chore(sean): persist personal-space workflow state and history`（含 `docs/.sean/state.json` + 3 个 history 快照）。

## 已知风险 / 非目标
- **F001（medium, reliable-delivery）**：单测 mock `SpaceRepo`/`SpaceService`，未对真实 DB 做 e2e，改动未过交付边界（未提交）。修复见上。
- 非目标：未在服务端强制 `PERSONAL_SPACES` feature flag / `workspace.settings.spaces.allowPersonal`（前端已 gate，按需求明确为非目标）。如后续需要，可在 `createPersonalSpace` 增加校验。
- `info` 返回 `null`（HTTP 200）与前端 `ISpace | null` 契约一致；`Space` 实体无 `hostname` 字段，与现有 `/spaces/info` 行为一致，前端仅用 `slug`/`id`。

## 恢复命令
```bash
cd /home/wuxiufeng/repos/docmost
sean status personal-space
pnpm --filter server jest ee/personal-space/personal-space.service.spec.ts
npx tsc --noEmit -p tsconfig.build.json   # 类型检查（若 build 的 dist 清理被安全拦截）
npx eslint src/ee/personal-space src/ee/ee.module.ts
```

知识已沉淀：任何 AI（或你）都能据此无缝接手，完成 e2e 验证与提交。
