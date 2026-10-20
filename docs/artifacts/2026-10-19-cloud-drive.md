# Artifact Catalog — cloud-drive

> Reverse-reference index. Every artifact below carries a header comment
> (`// Catalog: docs/artifacts/2026-10-19-cloud-drive.md`) linking back here.
> Generated/maintained by `sean run` per task.

## Task 1 — db-space-type ✅

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/server/src/database/migrations/20261019T090000-space-drive-type.ts` | database | `spaces.type` (default `page`) + `spaceId` on all drive tables | created |
| `apps/server/src/database/migrations/20261019T100000-drive-space-id-notnull.ts` | database | 弃用 `drive_type`/`owner_id`，`spaceId` NOT NULL（自愈：先回填 v1 行再约束，B001 修复） | created |
| `config/drive.env.example` | config | drive env vars (`DRIVE_STORAGE_QUOTA`) | created |

## Task 2 — batch-backfill-drive ✅

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/server/src/database/backfill/drive-to-spaces.ts` | database | v1 drive → drive space 归并（纯逻辑 + Kysely 执行） | created |
| `apps/server/src/database/backfill/drive-to-spaces.spec.ts` | test | 规划逻辑单测 | created |
| `scripts/backfill-drive-to-spaces.ts` | batch | CLI 运行器（`--dry-run` / `--verify`） | created |

## Task 3 — space-type-service ✅

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/server/src/database/types/entity.types.ts` | database | `SpaceType = 'page' \| 'drive'` | modified |
| `apps/server/src/core/space/dto/create-space.dto.ts` | dto | `type?: SpaceType`（`@IsIn`） | modified |
| `apps/server/src/core/space/services/space.service.ts` | service | `create` 写 `type`（默认 `page`）；列表按 `type` 过滤 | modified |
| `apps/server/src/database/repos/space/space.repo.ts` | database | `getSpacesInWorkspace` 按 `type` 过滤 | modified |
| `apps/server/src/core/space/services/space.service.spec.ts` | test | type 持久化与过滤单测 | modified |

## Task 4 — drive-abilities-reuse ✅

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/server/src/core/casl/interfaces/space-ability.type.ts` | service | `SpaceCaslSubject.Drive` | modified |
| `apps/server/src/core/casl/abilities/space-ability.factory.ts` | service | reader→Read Drive，writer/admin→Manage Drive | modified |
| `apps/server/src/core/casl/abilities/space-ability.factory.spec.ts` | test | Drive 权限用例 | created |

## Task 5 — drive-service-space-scoped ✅（36 tests）

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/server/src/core/drive/services/drive.service.ts` | service | 全部方法 `spaceId` 作用域；移除 owner 逻辑 | modified |
| `apps/server/src/database/repos/drive/drive-folder.repo.ts` | database | 查询/插入/更新/软删/面包屑按 `spaceId` | modified |
| `apps/server/src/database/repos/drive/drive-file.repo.ts` | database | 查询/插入/更新/软删/`sumFileSizes` 按 `spaceId` | modified |
| `apps/server/src/core/drive/services/drive-storage.service.ts` | service | key = `drive/{workspaceId}/{spaceId}/...` | modified |
| `apps/server/src/database/types/db.d.ts` | database | drive 表移除 `driveType`/`ownerId`，`spaceId` 必填 | modified |
| `apps/server/src/core/drive/services/drive.service.spec.ts` | test | spaceId + 跨空间隔离 | modified |
| `apps/server/src/database/repos/drive/drive-folder.repo.spec.ts` | test | repo spaceId 行为 spec | created |
| `apps/server/src/database/repos/drive/drive-file.repo.spec.ts` | test | repo spaceId 行为 spec | created |
| `apps/server/src/core/drive/services/drive-storage.service.spec.ts` | test | spaceId key spec | modified |

## Task 6 — drive-controller-space-scoped ✅（23 tests）

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/server/src/core/drive/drive.controller.ts` | controller | `spaces/:spaceId/drive/*` + 空间能力守卫（403） | modified |
| `apps/server/src/core/drive/drive-public-share.controller.ts` | controller | 公开分享解析（token 门控，保留 `/drive/shares/:token`） | created |
| `apps/server/src/core/drive/drive.module.ts` | service | 移除 `DriveAbilityFactory`，注册两控制器 | modified |
| `apps/server/src/core/drive/dto/drive.dto.ts` | dto | 移除 `driveType` | modified |
| `apps/server/src/core/drive/drive.controller.spec.ts` | test | 路由守卫 + 公开分享 + 模块装配 | modified |
| `apps/server/src/core/casl/interfaces/drive-ability.type.ts` | service | 删除（F010 resolved） | deleted |
| `apps/server/src/core/casl/abilities/drive-ability.factory.ts` | service | 删除（F010 resolved） | deleted |
| `apps/server/src/core/casl/abilities/drive-ability.factory.spec.ts` | test | 删除（F010 resolved） | deleted |

## Task 10 — drive-share-space-scoped ✅（7 tests，服务端于 Task 5+6 步吸收）

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/server/src/core/drive/services/drive-share.service.ts` | service | 分享创建/解析按 `spaceId`；写入 `share.spaceId` | modified |
| `apps/server/src/core/drive/services/drive-share.service.spec.ts` | test | spaceId 分享 spec | modified |

## Task 11 — drive-quota-space-scoped ✅（4 tests，同上吸收）

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/server/src/core/drive/services/drive-quota.service.ts` | service | 已用容量按 `spaceId` 聚合 | modified |
| `apps/server/src/core/drive/services/drive-quota.service.spec.ts` | test | spaceId 配额 spec | modified |

## Task 12 — drive-versions-space-scoped ✅（6 tests，同上吸收）

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/server/src/core/drive/services/drive-version.service.ts` | service | 版本记录/恢复按 `spaceId` 校验并写入 | modified |
| `apps/server/src/core/drive/services/drive-version.service.spec.ts` | test | spaceId 版本 spec | modified |

## Task 7 — client-drive-nav ✅（5 tests）

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/client/src/App.tsx` | client | 移除孤立 `/drive` 路由 | modified |
| `apps/client/src/pages/space/space-home.tsx` | client | 按 `space.type` 分流（drive→DrivePage） | modified |
| `apps/client/src/components/layouts/global/global-sidebar.tsx` | client | 移除独立 Drive 导航项 | modified |
| `apps/client/src/features/space/components/spaces-page/all-spaces-list.tsx` | client | drive 类型标识 + page/drive 筛选 | modified |
| `apps/client/src/features/space/components/create-space-form.tsx` | client | 创建空间可选 page/drive 类型 | modified |
| `apps/client/src/features/space/types/space.types.ts` | client | `ISpace.type` | modified |
| `apps/client/src/features/drive/drive-space.spec.tsx` | test | 入口分流/sidebar/列表标识筛选 | created |

## Task 8 — client-drive-ui-space-scoped ✅（19 tests）

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/client/src/features/drive/types/drive.types.ts` | client | `spaceId` 取代 DriveType；`DriveCategory` | modified |
| `apps/client/src/features/drive/services/drive-service.ts` | client | 端点 `/spaces/:spaceId/drive/*` | modified |
| `apps/client/src/features/drive/queries/drive-query.ts` | client | hooks/keys/mutations spaceId 化 | modified |
| `apps/client/src/features/drive/drive-page.tsx` | client | 由 spaceSlug 解析 spaceId；移除 personal/shared 选择器 | modified |
| `apps/client/src/features/drive/components/drive-browser.tsx` | client | spaceId 作用域 + 微云式分类栏 | modified |
| `apps/client/src/features/drive/components/upload-dropzone.tsx` | client | spaceId 上传 | modified |
| `apps/client/src/features/drive/components/share-dialog.tsx` | client | spaceId 分享 | modified |
| `apps/client/src/features/drive/components/preview-modal.tsx` | client | spaceId 预览/下载 URL | modified |
| 4 个组件 spec（browser/dropzone/preview/share） | test | spaceId + 分类/过滤/排序断言 | modified |

## Task 9 — drive-i18n ✅（4 tests）

| Artifact | Type | Purpose | Status |
|----------|------|---------|--------|
| `apps/client/public/locales/{en-US,zh-CN,de-DE,es-ES,fr-FR,it-IT,ja-JP,ko-KR,nl-NL,pt-BR,ru-RU,uk-UA}/translation.json` | i18n | 12 语言 × 31 drive/空间类型 key（371 处新增，既有翻译保留） | modified |
| `apps/client/src/features/drive/i18n.spec.tsx` | test | 12 语言 key 完备性守卫 | created |

## Task 13 — client-drive-share-quota ✅（吸收于 Task 8+9）

无独立代码产物：share-dialog/quota-indicator 的 space 作用域化在 Task 8 完成，i18n 在 Task 9 完成；验证 spec 为 `share-dialog.spec.tsx`（4 tests，计入 Task 8）。

---

**特性状态：全部 13 个任务完成（2026-10-19）。**
