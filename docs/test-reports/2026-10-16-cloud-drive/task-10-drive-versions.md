# Task 10 — drive-versions (Phase 2)

## Status: done
## Date: 2026-10-17

## What was done
为云盘文件增加版本历史（覆盖上传产生新版本，可追溯与回滚）。

- **迁移** `database/migrations/20261017T010000-drive-file-versions.ts`：新建 `drive_file_versions` 表（`workspace_id`/`file_id` FK cascade、`version_number` (int, 每文件 1-based 序列)、`file_name`、`file_path`、`file_size`、`file_ext`、`mime_type`、`creator_id`、时间戳；版本为不可变历史，无 `deleted_at`）。
- **类型** `db.d.ts`（新增 `DriveFileVersions` 接口 + `DB.driveFileVersions` 键）、`entity.types.ts`（新增 `DriveFileVersion` / `Insertable` / `Updatable`）。
- **Repo** `database/repos/drive/drive-file-version.repo.ts`：`insertVersion` / `nextVersionNumber`（`max(version_number)+1`）/ `listVersions`（按版本号降序）/ `getVersion`（`versionId`+`fileId` 联合校验）。
- **Service** `core/drive/services/drive-version.service.ts`：
  - `recordVersion({ fileId, workspaceId, creatorId })`：先取当前文件（不存在/跨工作区 → `NotFound`），计算下一版本号，把当前 `fileName/path/size/ext/mime` 快照入库。
  - `listVersions(fileId)`。
  - `restoreVersion({ fileId, versionId, workspaceId })`：取版本（跨工作区/不存在 → `NotFound`），把 live `drive_files` 行的 `filePath/size/ext/mime` 指回历史版本。
- **控制器 `drive.controller.ts`** 新增端点：
  - `GET /drive/files/:fileId/versions`（JWT + CASL `Manage`）：列举版本。
  - `POST /drive/files/:fileId/versions/:versionId/restore`（JWT + CASL `Manage`）：回滚。
  - `POST /drive/files/:fileId/versions`（JWT + CASL `Manage`）：**上传新版本**——先把旧内容快照入 `drive_file_versions`，再把文件行指向新上传（遵循单文件大小限制与配额）。
- **`drive.service.ts`** 新增 `updateFile(fileId, updatable)` 委托（供回滚/版本上传更新元数据）。
- **`drive.module.ts`** 注册 `DriveVersionService` / `DriveFileVersionRepo`。

## TDD
- RED：`drive-version.service.spec.ts` 首次运行失败（模块不存在）。
- GREEN：4/4：
  - `recordVersion`：把当前文件快照成新版本行（断言 `filePath`/`fileSize`/`versionNumber`/`fileId`/`workspaceId`/`creatorId`）。
  - `listVersions`：透传 repo 结果。
  - `restoreVersion`：把 live 文件 `filePath` 指向历史版本路径（断言 `updateFile` 入参与返回值）。
  - `restoreVersion`：版本不属于该文件 → `NotFound`，且不调用 `updateFile`。

## Test result
```
PASS src/core/drive/services/drive-version.service.spec.ts   (4 passed)
PASS src/core/drive/services/drive-share.service.spec.ts
PASS src/core/drive/services/drive-quota.service.spec.ts
PASS src/core/drive/services/drive-storage.service.spec.ts
PASS src/core/drive/services/drive.service.spec.ts
PASS src/core/drive/drive.controller.spec.ts
```
- 本任务新增测试 4 项全绿；drive 目录回归 6 套件 45/45 全绿。
- server `tsc --noEmit` 0 错误。

## Acceptance check
- [x] 同文件覆盖上传 → 旧版本入 `drive_file_versions`（由 `POST /drive/files/:fileId/versions` + `recordVersion` 实现）。
- [x] 回溯 → 当前指向历史版本路径（`restoreVersion` 更新 `drive_files.file_path`）。
- [x] 版本可追溯（列举）/ 可恢复（回滚端点）。

## Notes / 偏离计划
- 计划只列 `GET .../versions` 与 `POST .../versions/:vid/restore`。为满足「上传时写版本」（计划 `Modifies` 也提到 drive.service.ts 上传写版本），额外加了 `POST /drive/files/:fileId/versions` 覆盖上传端点：先快照旧版本、再更新文件行；并复用单文件大小限制与配额校验。这样版本功能真正可用，而非仅服务层逻辑。
- 版本行不可变，无软删；`restoreVersion` 直接把 live 行指回历史版本路径（不额外再写一条「当前状态」版本，保持语义简单：历史保留、当前=所选历史）。
- `file.driveType` 在 DB 类型为 `string`，在控制器 `uploadFileVersion` 调用 `generateKey`/`ensureWithinQuota` 处做了 `'personal'|'shared'` 窄化。
- 测试 fixture 在 GREEN 阶段补了 `workspaceId`（服务按工作区作用域校验，属预期行为）。
