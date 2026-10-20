# Bugs: cloud-drive

## B001: 迁移 B 在含 v1 数据的库上崩溃（space_id NULL → NOT NULL 失败）

- **Classification**: implementation
- **Task**: 1 (db-space-type)
- **Found by**: user-manual
- **Status**: ✅ fixed (2026-10-19)

### Symptom

后端启动即崩溃（crash-loop）：

```
ERROR: Failed to execute migration "20261019T100000-drive-space-id-notnull"
ERROR: Failed to run database migration. Exiting program.
ERROR: column "space_id" of relation "drive_folders" contains null values
```

### Reproduction

1. 用一个存在 v1 drive 数据（`drive_folders`/`drive_files` 行，`space_id` 为 NULL）的数据库。
2. 启动 backend。
3. 迁移 A（加 `spaceId` 可空列）成功；迁移 B（设 `spaceId` NOT NULL + 删 `drive_type`/`owner_id`）被 Postgres 拒绝 → `DatabaseMigrationService` 退出程序。

### Root Cause

迁移 B 假设"回填已先执行"（文件头注释把回填写成人工前置条件），但：

- 早前澄清"生产无 v1 数据"不适用于该环境——库里实际存在 v1 drive 行；
- 回填（`scripts/backfill-drive-to-spaces.ts`）是独立手工步骤，没有任何机制保证它在迁移 B 之前运行；
- 于是 B 在含 NULL 的行上执行 `SET NOT NULL`，Postgres 报错，迁移失败即进程退出。

即：**数据迁移的前置条件没有被自动化**，只是写在注释里。

### Fix

让迁移 B **自愈**：`up()` 先调用已测试的回填模块 `applyBackfill(db)`
（`apps/server/src/database/backfill/drive-to-spaces.ts`，幂等：确定性 space id +
`ON CONFLICT DO NOTHING` + 仅处理 `space_id IS NULL` 的行），把 v1 行折叠进
`type='drive'` 空间；随后再做防御性 sweep（把仍残留 NULL 的
`drive_shares`/`drive_file_versions` 从其文件继承 `space_id`，覆盖脚本中途失败
的partial 状态）；最后才删 legacy 列 + 设 NOT NULL。

效果：任何入口（boot / CLI）跑迁移 B 都不会再因 v1 数据崩溃；无 v1 数据时回填为
no-op。独立脚本保留作 dry-run/verify 的人工工具。

### Regression Test

`apps/server/src/database/migrations/drive-space-type.spec.ts`（新增 2 个用例）：
- `B: backfills v1 rows BEFORE any schema alteration` —— 断言 `applyBackfill`
  被调用且先于一切 schema 变更（修复前 RED：`upB` 从不调用回填）。
- `B: sweeps residual NULL share/version rows from their files, then constrains`
  —— 断言 sweep 的原始 SQL 存在，且顺序为 backfill → sweep → drop/setNotNull。

### Verification

- 迁移 + 回填 spec：**13/13 全绿**（RED→GREEN 已观察：修复前 2 个新用例失败）。
- server 全量回归：726/738 通过（较修复前 +2，即新增回归用例）；12 个失败套件为
  存量 DI 债务（此前已经 git stash 对照证明与本次无关），无 drive/migration/
  backfill 相关失败。
- 运行时效果：含 v1 数据的库再次启动时，迁移 B 先回填再约束，不再崩溃
  （用户环境重启 backend 即恢复；无 v1 数据时回填为 no-op）。
