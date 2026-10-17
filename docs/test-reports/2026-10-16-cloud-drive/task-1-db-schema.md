# Task 1 — db-schema (drive)

## Status: done
## Date: 2026-10-16

## What was done
- 新增迁移 `apps/server/src/database/migrations/20261016T090000-drive.ts`，创建 `drive_folders` 与 `drive_files` 两张表。
  - `drive_folders`：`workspace_id`(FK cascade)、`drive_type`('personal'|'shared')、`owner_id`(可空)、`parent_id`(自引用，空=根)、`name`、`creator_id`、时间戳、`deleted_at`。
  - `drive_files`：含 `folder_id`(可空=盘根)、`file_name/path/size/ext/mime_type/type`、其余同文件夹。
- `db.d.ts` 新增 `DriveFolders`/`DriveFiles` 接口并注册到 `DB`。
- `entity.types.ts` 新增 `DriveFolder`/`DriveFile` 及 Insertable/Updatable 类型。

## TDD
- RED：`drive.migration.spec.ts` 引用尚未创建的迁移模块 → TS2307 编译失败。
- GREEN：实现迁移后 2 个用例通过（建表列断言 + down 删表不抛错）。
- 全程 mock Kysely schema builder，**无需活体 Postgres**。

## Test result
```
PASS src/database/migrations/drive.migration.spec.ts
  ✓ creates drive_folders and drive_files with the expected columns
  ✓ down drops both tables without throwing
Tests: 2 passed
```
- `npx tsc --noEmit` 无 drive 相关类型错误。

## Acceptance check
- [x] 迁移可 up/down；类型生成无误；tsc 通过。
- [x] 不复用 `attachments`，层级用 `parent_id` 自引用，根以 `(drive_type, owner_id)` 标识。

## Notes
- 实际库表结构需在有 PG 时跑 `migration:up` + `migration:codegen` 二次确认（与项目既有约定一致：单测 mock，不连活体库）。
