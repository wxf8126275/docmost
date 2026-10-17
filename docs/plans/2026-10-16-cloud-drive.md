# Plan: Cloud Drive — 独立云盘（个人盘 + 团队共享盘）

Generated: 2026-10-16T09:30:00Z
Requirement: ../requirements/2026-10-16-cloud-drive.md

## 设计决策（plan 阶段澄清点默认方案）
- **数据模型**：新建 `drive_folders` 与 `drive_files` 两张表（不复用 `attachments`，避免污染页面/AI 附件语义）。层级用 `parent_id` 自引用；根级 = `parent_id IS NULL` + `(drive_type, owner_id)`。
- **双盘**：`drive_type ∈ {personal, shared}`。个人盘 `owner_id = 用户`；共享盘 `owner_id = NULL`（工作区级，按成员角色授权）。
- **存储**：复用现有 S3（`integrations/storage`），上传 key 前缀 `drive/{workspaceId}/{driveType}/{ownerId?}/{folderId?}/{uuid}`。
- **上传限制**：复用 `FILE_UPLOAD_SIZE_LIMIT`（默认 50MB）兜底（见 `attachment-upload-limit`）。
- **Phase 3 在线编辑（OnlyOffice/Collabora）不在本计划拆解**，作为独立 epic，本计划仅占位说明。

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | db-schema | — | medium | no |
| 2 | drive-abilities | 1 | medium | yes |
| 3 | drive-service | 1, 2 | high | no |
| 4 | drive-controller | 2, 3 | high | no |
| 5 | drive-storage-wiring | 3 | medium | yes |
| 6 | client-drive-ui | 4 | high | no |
| 7 | client-drive-upload-preview | 4 | medium | yes |
| 8 | drive-share-links (P2) | 2, 4 | medium | no |
| 9 | drive-quota (P2) | 3 | medium | yes |
| 10 | drive-versions (P2) | 3, 4 | medium | no |
| 11 | client-drive-share-quota (P2) | 8, 9, 10 | low | yes |

## Dependency Graph
```
Task 1 ──┬──> Task 2 ──┬──> Task 3 ──> Task 4 ──> Task 6
         │             │              │           Task 7
         │             │              └──> Task 5
         │             └──> Task 8 ──> Task 11
         │             └──> Task 9 ──> Task 11
         │             └──> Task 10 ─> Task 11
```
Wave 1: [1] → Wave 2: [2] → Wave 3: [3] → Wave 4: [4, 5] → Wave 5: [6, 7, 8, 9, 10] → Wave 6: [11]

---

## Task Details

### Task 1: db-schema
- **Creates**:
  - `apps/server/src/database/migrations/20261016T090000-drive.ts`（建 `drive_folders`、`drive_files`）
  - 修改 `apps/server/src/database/types/db.d.ts`（新增 `DriveFolders` / `DriveFiles` 接口）
  - 修改 `apps/server/src/database/types/entity.types.ts`（新增 `DriveFolder` / `DriveFile` / `Insertable*` / `Updatable*`）
- **Modifies**: `db.d.ts`, `entity.types.ts`
- **Test**: `apps/server/src/database/migrations/drive-schema.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：断言 `drive_folders` / `drive_files` 表及关键列存在（对测试库跑 migration `up` 后查询 `information_schema`）。
  2. 写迁移：两表含 id(uuid v7)、workspace_id(FK cascade)、drive_type、owner_id(可空)、parent_id(可空自引用)、folder_id(可空)、file_name/path/size/ext/mime_type/type、creator_id、时间戳、deleted_at。
  3. 更新 `db.d.ts` 与 `entity.types.ts` 类型。
  4. 重跑测试 GREEN。
- **Acceptance**: 迁移可 `up`/`down`；类型生成无误；`pnpm --filter server tsc` 通过。

### Task 2: drive-abilities
- **Creates**:
  - `apps/server/src/core/casl/interfaces/drive-ability.type.ts`（`DriveCaslAction` / `DriveCaslSubject` / `IDriveAbility`）
  - `apps/server/src/core/casl/abilities/drive-ability.factory.ts`（按 personal/shared + 角色构建能力；个人盘仅本人；共享盘按 workspace 角色 reader/writer/admin）
- **Modifies**: `apps/server/src/core/casl/abilities/index.ts`（导出）
- **Test**: `apps/server/src/core/casl/abilities/drive-ability.factory.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：个人盘 owner ≠ 用户 → 无 `create`；共享盘 reader → 有 `read` 无 `delete`；admin → `manage`。
  2. 实现工厂：复用 `AbilityBuilder`/`createMongoAbility` 模式（参照 `space-ability.factory.ts`）。
  3. GREEN。
- **Acceptance**: 能力与角色映射正确；无越权。

### Task 3: drive-service
- **Creates**:
  - `apps/server/src/database/repos/drive/drive-folder.repo.ts`
  - `apps/server/src/database/repos/drive/drive-file.repo.ts`
  - `apps/server/src/core/drive/services/drive.service.ts`（文件夹 CRUD、移动、软删、面包屑解析；文件记录创建、按 folder 列举、重命名、移动、软删、路径解析）
- **Modifies**: 无
- **Test**: `apps/server/src/database/repos/drive/drive-folder.repo.spec.ts`, `apps/server/src/core/drive/services/drive.service.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：建根文件夹（personal）、建子文件夹、列举根、重命名、移动到另一文件夹、软删（deleted_at 非空）、个人盘越权访问被拒（service 层结合 abilities 或入参校验）。
  2. 实现 repos + service（复用 `jsonObjectFrom`、`executeWithCursorPagination`、事务 `dbOrTx` 模式，参照 `attachment.repo.ts`）。
  3. GREEN；验证行为非实现细节。
- **Acceptance**: 文件夹层级与文件归属正确；软删生效；越权在 service 边界被拦。

### Task 4: drive-controller
- **Creates**:
  - `apps/server/src/core/drive/drive.controller.ts`
  - `apps/server/src/core/drive/drive.module.ts`
  - `apps/server/src/core/drive/dto/drive.dto.ts`（`class-validator`：folderId/fileName/driveType/targetFolderId 等）
- **Modifies**: `apps/server/src/app.module.ts`（注册 `DriveModule`）
- **Test**: `apps/server/src/core/drive/drive.controller.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试（e2e/unit，mock service）：`GET /drive/folders?driveType=personal&parentId=`、 `POST /drive/folders`、`PATCH /drive/folders/:id`、`DELETE`、`POST /drive/files`（multipart）、`PATCH /drive/files/:id`、`DELETE`、`GET /drive/files/:id/download` 各返回预期；无权限 403。
  2. 实现 controller + DTO + module（imports `StorageModule`、`UserModule`、`WorkspaceModule`、`TokenModule`，参照 `attachment.module.ts`）。
  3. GREEN。
- **Acceptance**: 端点契约稳定；DTO 校验生效；权限守卫拦截越权。

### Task 5: drive-storage-wiring
- **Creates**: 无（或修改）
- **Modifies**: `apps/server/src/core/drive/services/drive.service.ts`（或独立的 `drive-storage.service.ts`）：接入 `StorageService` 生成 drive 前缀 key、上传、删除对象；在上传入口校验 `getFileUploadSizeLimit()`（复用 `attachment-upload-limit` 的兜底逻辑）。
- **Test**: `apps/server/src/core/drive/services/drive-storage.service.spec.ts`（mock StorageService，断言 key 前缀与超限抛错）
- **Steps (TDD)**:
  1. 写失败测试：超限文件上传抛 `PayloadTooLarge`；key 前缀含 `drive/{workspaceId}/{driveType}`。
  2. 接入 S3 + 大小校验。
  3. GREEN。
- **Acceptance**: 文件落 S3；超限被拒；删除文件同步删对象。

### Task 6: client-drive-ui
- **Creates**:
  - `apps/client/src/features/drive/`：`drive-page.tsx`、`components/drive-browser.tsx`、`components/folder-tree.tsx`、`components/breadcrumb.tsx`、`components/file-grid.tsx`、`components/file-row-actions.tsx`、`services/drive-service.ts`、`queries/drive-query.ts`、`types/drive.types.ts`
- **Modifies**:
  - `apps/client/src/App.tsx`（`<Layout>` 内新增 `/drive`（个人）、`/drive/shared`（共享）、`/drive/f/:folderId`）
  - 全局侧边栏导航（新增「云盘」入口，参照现有 `/spaces`、`/home` 导航项）
- **Test**: `apps/client/src/features/drive/components/drive-browser.spec.tsx`
- **Steps (TDD)**:
  1. 写失败测试：渲染 drive 页 → 个人/共享切换存在；点击文件夹 → 面包屑更新；删除/重命名/移动/下载动作触发对应 service 调用。
  2. 实现布局、导航、浏览器（网格/列表切换、排序、名称搜索）、动作菜单、面包屑。
  3. GREEN；`pnpm --filter client build` / eslint 通过。
- **Acceptance**: 双盘切换与文件夹浏览可用；动作完整；权限受限时动作隐藏/禁用。

### Task 7: client-drive-upload-preview
- **Creates**:
  - `apps/client/src/features/drive/components/upload-dropzone.tsx`（多文件 + 文件夹拖拽，进度）
  - `apps/client/src/features/drive/components/preview-modal.tsx`（图片缩略、`<audio>`/`<video>` 播放、文档图标）
- **Modifies**: `apps/client/src/features/drive/components/drive-browser.tsx`（挂 dropzone 与预览入口）
- **Test**: `apps/client/src/features/drive/components/upload-dropzone.spec.tsx`
- **Steps (TDD)**:
  1. 写失败测试：dropzone 选择多文件 → 调用上传 service 多次且显示进度；打开预览 → 图片/音视频渲染。
  2. 实现拖拽上传（含目录 `webkitdirectory`）、进度条、预览模态。
  3. GREEN。
- **Acceptance**: 多文件/文件夹上传成功；预览覆盖图片/音视频/文档图标。

### Task 8: drive-share-links (Phase 2)
- **Creates**:
  - 迁移 + `drive_shares` 表（`apps/server/src/database/migrations/...-drive-shares.ts`）
  - `apps/server/src/core/drive/services/drive-share.service.ts`（生成 token、权限 read/download、有效期）
  - controller 端点 `POST /drive/files/:id/share`、`GET /drive/shares/:token`
- **Modifies**: `db.d.ts`, `entity.types.ts`, `drive.controller.ts`, `drive.module.ts`
- **Test**: `apps/server/src/core/drive/services/drive-share.service.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：生成分享 → 持 token 可只读/下载；过期 token 拒绝；越权用户不能为他人文件生成分享。
  2. 实现分享服务 + 端点。
  3. GREEN。
- **Acceptance**: 分享链接按权限/有效期生效。

### Task 9: drive-quota (Phase 2)
- **Creates**:
  - `apps/server/src/core/drive/services/drive-quota.service.ts`（聚合 workspace/user 已用容量；读取 `DRIVE_STORAGE_QUOTA` 配置）
- **Modifies**: `drive.service.ts` 上传入口（超限拒绝）；`environment.service.ts` 加 `getDriveStorageQuota()`
- **Test**: `apps/server/src/core/drive/services/drive-quota.service.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：已用 + 新文件 > 配额 → 上传被拒；配额未配置 → 不限制。
  2. 实现聚合 + 校验。
  3. GREEN。
- **Acceptance**: 配额统计准确；超限被拒；默认不限制。

### Task 10: drive-versions (Phase 2)
- **Creates**:
  - 迁移 + `drive_file_versions` 表
  - `apps/server/src/core/drive/services/drive-version.service.ts`（覆盖上传产生新版本；列举/回溯）
- **Modifies**: `db.d.ts`, `entity.types.ts`, `drive.controller.ts`, `drive.service.ts`（上传时写版本）
- **Test**: `apps/server/src/core/drive/services/drive-version.service.spec.ts`
- **Steps (TDD)**:
  1. 写失败测试：同文件覆盖上传 → 旧版本入 `drive_file_versions`；回溯 → 当前指向历史版本路径。
  2. 实现版本记录 + 回溯端点 `GET /drive/files/:id/versions`、`POST /drive/files/:id/versions/:vid/restore`。
  3. GREEN。
- **Acceptance**: 版本可追溯与恢复。

### Task 11: client-drive-share-quota (Phase 2)
- **Creates**:
  - `apps/client/src/features/drive/components/share-dialog.tsx`
  - `apps/client/src/features/drive/components/quota-indicator.tsx`
- **Modifies**: `apps/client/src/features/drive/components/file-row-actions.tsx`（加分享入口）、`drive-page.tsx`（加配额展示）
- **Test**: `apps/client/src/features/drive/components/share-dialog.spec.tsx`
- **Steps (TDD)**:
  1. 写失败测试：分享对话框生成链接并显示权限/有效期选项；配额指示器显示已用/总量。
  2. 实现对话框与配额 UI。
  3. GREEN。
- **Acceptance**: 分享与配额在 UI 可用。

---

## Phase 3（独立 epic，本计划不拆解）
- Word(`.docx`) / 电子表格(`.xlsx`) 在线编辑：集成 OnlyOffice 或 Collabora/CODE（独立服务、格式双向转换、协同、回调保存）。作为 `cloud-drive-office-edit` 独立需求/计划跟进。

## 验证总览
- 后端：`pnpm --filter server test`（task 1–5, 8–10 的 spec）；`pnpm --filter server lint` / `tsc`。
- 前端：`nx run client:test` 或 vitest（task 6,7,11 的 spec）；`pnpm --filter client build` / eslint。
- 端到端 demo：进入 `/drive` → 建文件夹 → 拖拽上传多文件 → 预览 → 个人/共享切换 → （P2）分享链接 + 配额 + 版本。
