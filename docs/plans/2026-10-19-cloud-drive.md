# Plan: Cloud Drive v2 — 网盘作为空间的新类型（取代独立云盘）

Generated: 2026-10-19T09:30:00Z
Requirement: ../requirements/2026-10-19-cloud-drive.md

## 设计决策（plan 阶段澄清点默认方案）

- **空间类型化**：`spaces` 新增 `type` 列，取值 `page`（默认，向后兼容）/ `drive`。存量空间默认 `page`。
- **网盘归属**：`drive_folders` / `drive_files` / `drive_shares` / `drive_file_versions` 加 `space_id`，删除 `drive_type` + `owner_id`（分步：先加 `space_id`，回填后再弃用旧列并置 `space_id` NOT NULL）。根文件夹 = `space_id` 非空且 `parent_id IS NULL`。
- **无个人盘 / 共享盘之分**：drive 即 `type:drive` 的普通空间，权限完全由空间成员角色（reader / writer / admin）管理。不自动创建个人盘；用户手动创建 drive 空间并配置成员与角色。废弃"个人盘"概念与 `isPersonal` 在 drive 上的语义。
- **权限复用空间 CASL**：扩展 `SpaceCaslSubject` 增加 `Drive`；`SpaceRole.READER` → `Read Drive`，`WRITER`/`ADMIN` → `Manage Drive`。废弃 `DriveAbilityFactory`（原 all-or-nothing `Manage`，无 reader/writer 细分），由空间角色提供细粒度权限。
- **路由**：`@Controller('drive')` → `@Controller('spaces/:spaceId/drive')`，`spaceId` 取自路由参数；控制器内校验 `space.type==='drive'` 且用户具备空间能力。
- **存储 key**：`drive/{workspaceId}/{spaceId}/{folderId|root}/{uuid}{ext}`（去掉 `driveType/ownerId`）。
- **前端导航**：移除独立 `/drive` 入口；drive 空间随空间列表/侧边栏出现（图标区分类型）；打开 drive 空间进入文件夹浏览器（`/s/:spaceSlug` 按 `type` 分流）。所有文案走 `t()`，补齐 `en-US` / `zh-CN`（及 10 种其他语言）`translation.json`。
- **Phase 2（分享/配额/版本）**：v1 已实现的端点随控制器路由一并 re-scope 到 `spaces/:spaceId/drive/...`，数据按 `space_id` 过滤。纳入本轮（否则路由变更会破坏它们）。

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | db-space-type | — | medium | no |
| 2 | batch-backfill-drive | 1 | medium | no |
| 3 | space-type-service | 1 | medium | no |
| 4 | drive-abilities-reuse | 1 | medium | yes |
| 5 | drive-service-space-scoped | 1,3,4 | high | no |
| 6 | drive-controller-space-scoped | 3,4,5 | high | no |
| 7 | client-drive-nav | 6 | high | no |
| 8 | client-drive-ui-space-scoped | 6,7 | high | no |
| 9 | drive-i18n | 7,8 | medium | yes |
| 10 | drive-share-space-scoped (P2) | 5,6 | medium | no |
| 11 | drive-quota-space-scoped (P2) | 5 | medium | yes |
| 12 | drive-versions-space-scoped (P2) | 5,6 | medium | no |
| 13 | client-drive-share-quota (P2) | 9,10,11,12 | low | yes |

## Dependency Graph

```
Task 1 ──┬──> Task 2 (batch, after cols exist)
         ├──> Task 3 ──┐
         └──> Task 4 ──┤
                       └──> Task 5 ──> Task 6 ──> Task 7 ──> Task 8 ──> Task 9
                                  │      │                    │
                                  │      ├────────────────────> Task 10
                                  ├──────────────────────────> Task 11
                                  └──────────────────────────> Task 12
                                                                  │
                                                                  └──> Task 13
```

Wave 1: [1] → Wave 2: [2,3,4] → Wave 3: [5] → Wave 4: [6] → Wave 5: [7,11] → Wave 6: [8,10,12] → Wave 7: [9] → Wave 8: [13]

> **调度备注**：Task 10–13（Phase 2）若产品决定延后，可在 `sean run cloud-drive` 时从 Task 1 起只跑到 Task 9；但控制器路由变更（Task 6）会使 v1 的 `/drive/*` 分享/配额/版本端点失效，故建议一并 re-scope。

---

## Task Details

### Task 1: db-space-type
- **Status**: ✅ DONE（2026-10-19 sean run，4 tests；report: docs/test-reports/2026-10-19-cloud-drive/task-1-db-space-type.md）。偏差：`db.d.ts` 的 `driveType`/`ownerId` 在 Task 5 直接移除（`Insertable` 否则拒绝缺失列）。B001 修复（2026-10-19）：迁移 B 改为自愈——`up()` 先调用 `applyBackfill` 折叠 v1 行、sweep 残留 NULL 的 shares/versions，再删列设 NOT NULL；原"回填为人工前置"的设计导致含 v1 数据的库启动崩溃（crash-loop）。
- **Creates**:
  - `apps/server/src/database/migrations/20261019T090000-space-drive-type.ts`（加 `spaces.type` 默认 `'page'`；4 张 drive 表加 `space_id` 可空 + FK cascade）
  - `apps/server/src/database/migrations/20261019T100000-drive-space-id-notnull.ts`（**回填后执行**：`drive_folders`/`drive_files` 删 `drive_type`/`owner_id`，`space_id` 置 NOT NULL；含 down 还原）
  - `config/drive.env.example`（config：说明 `DRIVE_STORAGE_QUOTA` 等 drive 相关环境变量）
- **Modifies**: `apps/server/src/database/types/db.d.ts`（`Spaces` 加 `type`；drive 接口加 `spaceId`、移除 `driveType`/`ownerId`）、`apps/server/src/database/types/entity.types.ts`（对应 `Insertable`/`Updatable`/`Selectable`）
- **Artifacts**:
  - `migrations/20261019T090000-space-drive-type.ts` (database, 空间类型化 + spaceId)
  - `migrations/20261019T100000-drive-space-id-notnull.ts` (database, 弃用旧列)
  - `config/drive.env.example` (config, drive 环境变量模板)
- **Test**: `apps/server/src/database/migrations/drive-space-type.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：对测试库跑 migration A `up` 后，断言 `spaces` 有 `type` 列（默认 `'page'`）、4 张 drive 表有 `space_id` 列。
  2. 写 migration A（加列 + FK）。
  3. 更新 `db.d.ts` / `entity.types.ts`（加 `type`/`spaceId`，移除 `driveType`/`ownerId`）。
  4. 写失败测试：migration B `up` 后 `space_id` 非空、`drive_type`/`owner_id` 不存在（该测试在回填后可启用）。
  5. 写 migration B；GREEN。
- **Acceptance**: 迁移 `up`/`down` 可逆；存量 `spaces.type='page'`；`tsc` 通过；类型与 DB 一致。

### Task 2: batch-backfill-drive
- **Creates**:
  - `apps/server/src/database/backfill/drive-to-spaces.ts`（核心：分组 / 确定性 space id / 规划 ops / Kysely 幂等执行；纯逻辑可单测）
  - `apps/server/src/database/backfill/drive-to-spaces.spec.ts`（规划逻辑单测：分组、确定性 id、personal→private+admin、shared→workspace+reader、幂等）
  - `scripts/backfill-drive-to-spaces.ts`（CLI 运行器：复用 migrate 的 DB 连接，`--dry-run` / `--verify`）
- **Artifacts**:
  - `apps/server/src/database/backfill/drive-to-spaces.ts` (database, 归并逻辑)
  - `apps/server/src/database/backfill/drive-to-spaces.spec.ts` (test)
  - `scripts/backfill-drive-to-spaces.ts` (batch, CLI 运行器)
- **Modifies**: 无
- **Test**: `apps/server/src/database/backfill/drive-to-spaces.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：给定 v1 个人盘 + 共享盘样例数据，断言回填产出对应的 drive space 与 `space_id` 映射。
  2. 实现脚本（复用 `SpaceService.create` / `SpaceMemberService` 或原始 SQL）。
  3. GREEN。
- **Acceptance**: 脚本可 `--dry-run` 预览、可幂等重跑；`--verify` 校验所有 drive 行均有 `space_id` 且关联到存在的 drive space。

### Task 3: space-type-service
- **Modifies**:
  - `apps/server/src/core/space/dto/create-space.dto.ts`（加 `type?: 'page'|'drive'`，校验枚举）
  - `apps/server/src/core/space/services/space.service.ts`（`create()` 写入 `type`（默认 `'page'`）；`getWorkspaceSpaces`/列表支持按 `type` 过滤；可选 `createDriveSpace()` 助手（用户手动创建 drive 空间，不自动建个人盘））
  - `apps/server/src/core/space/services/space.service.spec.ts`（修改，加 type 用例）
- **Test**: `apps/server/src/core/space/services/space.service.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：创建 `type:'drive'` 空间成功且 `type` 落库；不传 `type` 时默认 `'page'`；列表可按 `type` 过滤。
  2. 实现 DTO + service。
  3. GREEN。
- **Acceptance**: 空间类型可写可读；默认 `page` 不破坏现有行为；`tsc`/eslint 通过。

### Task 4: drive-abilities-reuse
- **Modifies**:
  - `apps/server/src/core/casl/interfaces/space-ability.type.ts`（`SpaceCaslSubject` 增加 `Drive`）
  - `apps/server/src/core/casl/abilities/space-ability.factory.ts`（角色映射：`READER`→`Read Drive`，`WRITER`/`ADMIN`→`Manage Drive`）
  - 删除 `apps/server/src/core/casl/interfaces/drive-ability.type.ts` 与 `apps/server/src/core/casl/abilities/drive-ability.factory.ts`（从 `drive.module.ts` 移除 provider）
  - `apps/server/src/core/casl/abilities/space-ability.factory.spec.ts`（修改，加 Drive 用例）
- **Test**: `apps/server/src/core/casl/abilities/space-ability.factory.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：space READER → `can(Read, Drive)` 且 `cannot(Manage, Drive)`；WRITER/ADMIN → `can(Manage, Drive)`。
  2. 扩展 space ability；删除 drive ability 文件。
  3. GREEN。
- **Acceptance**: drive 操作权限由空间角色细分决定；无越权（reader 不可上传/删除）。

### Task 5: drive-service-space-scoped
- **Status**: ✅ DONE（2026-10-19 sean run，36 tests；report: docs/test-reports/2026-10-19-cloud-drive/task-5-drive-service-space-scoped.md）。偏差：`db.d.ts` 的 `driveType`/`ownerId` 在本任务直接移除（`Insertable` 否则拒绝缺失列），迁移 B 头部由 GATED 改 ENABLED（回填为前置条件）；跨空间隔离三层落地（repo where / service 传递 / controller 显式校验）。
- **Modifies**:
  - `apps/server/src/core/drive/services/drive.service.ts`（所有方法 `driveType`+`ownerId` 参数改为 `spaceId`；去除 owner 逻辑；按 `spaceId` 过滤）
  - `apps/server/src/database/repos/drive/drive-folder.repo.ts`、`drive-file.repo.ts`（查询加 `space_id` 过滤；插入写 `space_id`）
  - `apps/server/src/core/drive/services/drive-storage.service.ts`（`generateKey` 用 `spaceId` 取代 `driveType/ownerId`：`drive/{workspaceId}/{spaceId}/{folderId|root}/{uuid}{ext}`）
  - `apps/server/src/core/drive/services/drive.service.spec.ts`（修改：改用 `spaceId`，加跨空间隔离用例）
- **Test**: `apps/server/src/core/drive/services/drive.service.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：在 space A 建文件夹/文件，断言 `space_id=A`；同文件在 space B 列举不可见（跨空间隔离）；移动/软删/面包屑正确。
  2. 重构 service + repos + storage key。
  3. GREEN。
- **Acceptance**: 文件夹/文件严格按 `spaceId` 归属；跨空间不可见；软删生效。

### Task 6: drive-controller-space-scoped
- **Status**: ✅ DONE（2026-10-19 sean run，23 tests；report: docs/test-reports/2026-10-19-cloud-drive/task-6-drive-controller-space-scoped.md）。偏差：公开分享解析拆为独立 `DrivePublicShareController`（`@Controller('drive')`，token 门控、空间无关，保留 v1 `/drive/shares/:token` 契约）；F010 落实——drive-ability 三文件已删除。Tasks 10/11/12 服务端重构在本步吸收（控制器编译所需）。
- **Modifies**:
  - `apps/server/src/core/drive/drive.controller.ts`（`@Controller('drive')` → `@Controller('spaces/:spaceId/drive')`；方法解析 `spaceId`，校验 `space.type==='drive'` 且用户具备空间能力，替换 `assertDriveAbility`；分享/配额/版本端点一并迁移）
  - `apps/server/src/core/drive/dto/drive.dto.ts`（移除 `driveType`，相关 DTO 加 `spaceId` 校验/去除）
  - `apps/server/src/core/drive/drive.module.ts`（注入 `SpaceAbilityFactory` + `SpaceMemberService`；移除 `DriveAbilityFactory`；保留 `StorageModule`）
  - `apps/server/src/core/drive/drive.controller.spec.ts`（修改：新路由前缀 + 非成员/非 drive space 返回 403）
- **Test**: `apps/server/src/core/drive/drive.controller.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：`GET /spaces/:spaceId/drive/folders` 对 drive space 成员返回 200；非成员 403；非 drive 类型 space 返回 4xx；分享/下载/版本端点随路由迁移。
  2. 重构 controller + DTO + module。
  3. GREEN。
- **Acceptance**: 端点契约为 space 作用域；权限由空间能力守卫；`tsc`/eslint 通过。

### Task 7: client-drive-nav
- **Status**: ✅ DONE（2026-10-19 sean run，5 tests；report: docs/test-reports/2026-10-19-cloud-drive/task-7-client-drive-nav.md）。与 Task 8 合并执行（服务端路由已在 Task 5+6 切换，客户端 drive 整体失效至 7+8 完成）。补充：创建空间表单新增 page/drive 类型选择（用户手动创建 drive 空间）；i18n 留给 Task 9。
- **Modifies**:
  - `apps/client/src/App.tsx`（移除 `<Route path="/drive">`；`/s/:spaceSlug` 按 `space.type` 分流：drive 空间渲染 `DrivePage`，page 空间渲染页面树）
  - `apps/client/src/components/layouts/global/global-sidebar.tsx`（移除独立 `Drive` 导航项；drive 空间随空间列表出现）
  - `apps/client/src/pages/spaces/spaces.tsx` + 空间列表/卡片组件（加类型图标/筛选项：`page` vs `drive`；复用 `t()` 标签）
  - `apps/client/src/features/drive/drive-page.tsx`（改为接收 `spaceSlug`/`spaceId`，作为空间内容渲染）
  - 新建 `apps/client/src/features/drive/drive-space.spec.tsx`（测试：drive 空间入口渲染浏览器；sidebar 不再含独立 Drive）
- **Test**: `apps/client/src/features/drive/drive-space.spec.tsx`
- **Steps (TDD)**:
  1. 写失败测试：空间列表含 drive 类型标识；点击 drive 空间 → 渲染 drive 浏览器；sidebar 无独立 Drive 项。
  2. 实现路由分流 + 列表类型标识 + 移除独立导航。
  3. GREEN；`pnpm --filter client build`/eslint 通过。
- **Acceptance**: 网盘融入空间体系；无孤立 `/drive` 入口；类型可区分。

### Task 8: client-drive-ui-space-scoped
- **Status**: ✅ DONE（2026-10-19 sean run，19 tests；report: docs/test-reports/2026-10-19-cloud-drive/task-8-client-drive-ui-space-scoped.md）。腾讯微云式分类栏已落地于 drive-browser（最近/全部/图片/文档/视频/音乐，按 ext/MIME 过滤，最近=修改时间倒序）；客户端全量 145 tests + tsc 通过；eslint 因环境缺 @tanstack/eslint-plugin-query 未跑（finding F011）。
- **Modifies**:
  - `apps/client/src/features/drive/services/drive-service.ts`、`queries/drive-query.ts`、`types/drive.types.ts`（端点改为 `/spaces/:spaceId/drive/...`；以 `spaceId`/`spaceSlug` 取代 `driveType` personal/shared 选择器；列表支持按分类过滤参数）
  - `apps/client/src/features/drive/components/drive-browser.tsx`（新增左侧分类栏，参考腾讯微云：`最近`、`全部`、`图片`、`文档`、`视频`、`音乐` 等；按文件类型 / MIME / 扩展名过滤，`最近` = 按创建 / 修改时间倒序）、`breadcrumb.tsx`、`file-row-actions.tsx`、`upload-dropzone.tsx`、`preview-modal.tsx`、`quota-indicator.tsx`、`share-dialog.tsx`（改用 space 作用域 service + 分类过滤）
  - 相应 spec：`drive-browser.spec.tsx`、`upload-dropzone.spec.tsx`、`preview-modal.spec.tsx`、`share-dialog.spec.tsx`（修改：断言调用新端点 + 分类过滤生效）
- **Test**: `apps/client/src/features/drive/components/drive-browser.spec.tsx`（+ 上述 spec 修改）
- **Steps (TDD)**:
  1. 写失败测试：浏览器渲染使用 `spaceId`；上传/预览/移动/分享动作调用 space 作用域端点。
  2. 重构 service/queries/types 与组件。
  3. GREEN。
- **Acceptance**: 全部 drive 交互走 space 作用域端点；个人/共享由空间成员关系决定而非前端选择器。

### Task 9: drive-i18n
- **Status**: ✅ DONE（2026-10-19 sean run，4 tests；report: docs/test-reports/2026-10-19-cloud-drive/task-9-drive-i18n.md）。12 语言 × 31 key 全部补齐（既有翻译保留）；组件无硬编码文案（扫描确认，`EXPIRY_OPTIONS` label 经 `t()`）。
- **Modifies**:
  - `apps/client/public/locales/en-US/translation.json`、`zh-CN/translation.json`（及 de-DE/es-ES/fr-FR/it-IT/ja-JP/ko-KR/nl-NL/pt-BR/ru-RU/uk-UA）补充缺失 key：`Drive`、`Page`、`New folder`、`Storage`、`Unlimited`、`This folder is empty`、`Root`、`Folder name`、`Generate link`、`Drag files here or click to upload`、`Storage quota`、`Share link`，以及分类栏 `Recent`、`All`、`Images`、`Documents`、`Videos`、`Music` 等全部 drive/空间类型文案（不再需要 `Personal`/`Shared`）
  - drive 组件：将硬编码英文字符串替换为 `t('key')`
  - 新建 `apps/client/src/features/drive/i18n.spec.tsx`（断言 en-US 含全部必需 drive key；组件渲染不出现裸硬编码英文字符串）
- **Test**: `apps/client/src/features/drive/i18n.spec.tsx`
- **Steps (TDD)**:
  1. 写失败测试：导入 en-US `translation.json` 断言必需 key 存在；组件渲染文本经 `t()`。
  2. 补充所有语言 key + 替换硬编码文案。
  3. GREEN。
- **Acceptance**: 所有 drive/空间类型用户可见文案经 `t()`；en-US + zh-CN 全覆盖；切换语言生效。

### Task 10: drive-share-space-scoped (P2)
- **Status**: ✅ DONE（2026-10-19 sean run，7 tests；服务端在 Task 5+6 合并步吸收完成；report: docs/test-reports/2026-10-19-cloud-drive/task-10-drive-share-space-scoped.md）
- **Modifies**:
  - `apps/server/src/core/drive/services/drive-share.service.ts`（以 `spaceId` 取代 `driveType/ownerId`；分享创建者须为 space 成员）
  - `apps/server/src/database/repos/drive/drive-share.repo.ts`（按 `space_id` 过滤）
  - `apps/server/src/core/drive/services/drive-share.service.spec.ts`（修改）
- **Test**: `apps/server/src/core/drive/services/drive-share.service.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：为 drive space 内文件生成分享（spaceId 作用域）；非成员不能为他人空间文件生成分享；过期 token 拒绝。
  2. 重构分享服务 + repo。
  3. GREEN。
- **Acceptance**: 分享链接按空间作用域 + 权限/有效期生效。

### Task 11: drive-quota-space-scoped (P2)
- **Status**: ✅ DONE（2026-10-19 sean run，4 tests；服务端在 Task 5+6 合并步吸收完成；report: docs/test-reports/2026-10-19-cloud-drive/task-11-drive-quota-space-scoped.md）
- **Modifies**:
  - `apps/server/src/core/drive/services/drive-quota.service.ts`（按 `spaceId` 聚合已用容量；复用 `DRIVE_STORAGE_QUOTA`）
  - `apps/server/src/core/drive/services/drive-quota.service.spec.ts`（修改）
- **Test**: `apps/server/src/core/drive/services/drive-quota.service.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：按 `spaceId` 计算已用；已用 + 新文件 > 配额 → 拒绝；未配置 → 不限制。
  2. 重构配额聚合。
  3. GREEN。
- **Acceptance**: 配额按空间统计准确；超限拒绝；默认不限制。

### Task 12: drive-versions-space-scoped (P2)
- **Status**: ✅ DONE（2026-10-19 sean run，6 tests；服务端在 Task 5+6 合并步吸收完成；report: docs/test-reports/2026-10-19-cloud-drive/task-12-drive-versions-space-scoped.md）
- **Modifies**:
  - `apps/server/src/core/drive/services/drive-version.service.ts`、`apps/server/src/database/repos/drive/drive-file-version.repo.ts`（按 `space_id` 过滤/写入）
  - `apps/server/src/core/drive/services/drive-version.service.spec.ts`（修改）
- **Test**: `apps/server/src/core/drive/services/drive-version.service.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：覆盖上传产生版本（归属正确 spaceId）；回溯指向历史版本。
  2. 重构版本服务 + repo。
  3. GREEN。
- **Acceptance**: 版本可追溯/恢复且作用域正确。

### Task 13: client-drive-share-quota (P2)
- **Status**: ✅ DONE（2026-10-19 sean run；report: docs/test-reports/2026-10-19-cloud-drive/task-13-client-drive-share-quota.md）。实质由 Task 8（share-dialog/quota-indicator space 作用域化）+ Task 9（i18n）落地，共享 spec `share-dialog.spec.tsx`（4 tests，已计入 Task 8）。
- **Modifies**:
  - `apps/client/src/features/drive/components/share-dialog.tsx`、`quota-indicator.tsx`（space 作用域端点 + i18n）
  - `apps/client/src/features/drive/components/share-dialog.spec.tsx`（修改）
- **Test**: `apps/client/src/features/drive/components/share-dialog.spec.tsx`
- **Steps (TDD)**:
  1. 写失败测试：分享对话框生成链接并显示权限/有效期；配额指示器显示已用/总量（space 作用域）。
  2. 实现对话框与配额 UI。
  3. GREEN。
- **Acceptance**: 分享与配额在 drive 空间 UI 可用且文案 i18n。

---

## Phase 3（独立 epic，本计划不拆解）
- Word(`.docx`) / 电子表格(`.xlsx`) 在线编辑：集成 OnlyOffice 或 Collabora/CODE。作为 `cloud-drive-office-edit` 独立需求/计划跟进。

## 验证总览
- 后端：`pnpm --filter server test`（task 1–6, 10–12 的 spec）；`pnpm --filter server lint` / `tsc`。
- 前端：`nx run client:test` 或 vitest（task 7–9, 13 的 spec）；`pnpm --filter client build` / eslint。
- 端到端 demo：空间列表见 drive 类型 → 打开 drive 空间 → 建文件夹 → 拖拽上传 → 预览 → 分享链接 + 配额 + 版本；切换语言验证文案。

## 澄清结论（已确认，已同步需求文档）

- **无个人网盘**：drive 即 `type:drive` 的普通空间，无 personal/shared 之分；权限完全由空间成员角色（reader/writer/admin）管理。不自动创建个人盘，用户手动创建 drive 空间并配置成员（Task 3）。
- **无生产 v1 数据**：batch 回填脚本（Task 2）仅作为幂等安全网保留，一般无需执行。
- **权限**：完全删除 `drive-ability.factory`，复用空间 CASL（reader→Read Drive，writer/admin→Manage Drive）（Task 4）。
- **网盘内导航（参考腾讯微云）**：drive 空间内左侧分类 `最近`/`全部`/`图片`/`文档`/`视频`/`音乐`，按文件类型/MIME/扩展名过滤（Task 8 + i18n Task 9）。
- **Phase 2**：分享 / 配额 / 版本（Task 10–13）本轮一并实施（控制器路由整体迁移使然）。
