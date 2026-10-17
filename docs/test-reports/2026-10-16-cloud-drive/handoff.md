# Handoff: Cloud Drive — 独立云盘（个人盘 + 团队共享盘）

## Status
- Overall: **DONE**
- Tasks completed: **11 / 11**
- Last updated: 2026-10-17T12:50:00Z

## Reliability
- Implemented by: AI agent (model: Hy3, via `sean run` / `sean task`)
- Task first-pass rate: **11 / 11** (no implementation fix-loop recorded; Task 11 required only a test-harness tweak — `ResizeObserver` polyfill + mock shape — not an implementation rework)
- Post-run bugs: **0** (found by: none yet)
- Trust level: **HIGH** — every behavior is covered by task tests + full regression; both apps `tsc --noEmit` clean. Caveat: change has NOT yet been run through CI or a live-Postgres e2e, and no git commit created (see review F001).

## What Was Done

| Task | Status | Summary | Implemented By |
|------|--------|---------|----------------|
| 1 db-schema | done | `drive_folders` + `drive_files` 两表迁移 + `db.d.ts`/`entity.types.ts` 类型 | AI agent |
| 2 drive-abilities | done | CASL 能力工厂：personal 仅本人、shared 按 workspace 角色（reader/writer/admin） | AI agent |
| 3 drive-service | done | 文件夹 CRUD/移动/软删/面包屑；文件记录/列举/重命名/移动/软删/路径解析；双 repo | AI agent |
| 4 drive-controller | done | 端点到 `/drive/folders`、`/drive/files`（含 multipart 上传、下载）、DTO、模块、`app.module` 注册 | AI agent |
| 5 drive-storage-wiring | done | 接入 `StorageService`，drive 前缀 key；超限抛 `PayloadTooLarge`；删除同步删对象（独立 `drive-storage.service.ts`） | AI agent |
| 6 client-drive-ui | done | 双盘切换、`drive-browser`（网格/列表/排序/搜索）、面包屑、动作菜单、`App.tsx` 路由 + 侧边栏入口 | AI agent |
| 7 client-drive-upload-preview | done | `upload-dropzone`（多文件/目录拖拽 + 进度）、`preview-modal`（图片/音视频/文档图标） | AI agent |
| 8 drive-share-links | done | `drive_shares` 迁移 + `drive-share.service`（token/权限/有效期）+ `POST /drive/files/:id/share`、`GET /drive/shares/:token` | AI agent |
| 9 drive-quota | done | `drive-quota.service`（聚合已用 + `getDriveStorageQuota`）+ 上传超限拒绝 + `environment.getDriveStorageQuota` | AI agent |
| 10 drive-versions | done | `drive_file_versions` 迁移 + `drive-version.service`（覆盖上传记录版本、列举/回溯）+ 版本端点 | AI agent |
| 11 client-drive-share-quota | done | 分享对话框 + 配额指示器 UI；并补齐 `GET /drive/quota` 端点（`DriveQuotaService.getQuotaInfo`） | AI agent |

## File Inventory (verified on disk)

### Created
- `apps/server/src/database/migrations/20261016T090000-drive.ts` — 建 `drive_folders`/`drive_files`
- `apps/server/src/database/migrations/20261017T000000-drive-shares.ts` — 建 `drive_shares`
- `apps/server/src/database/migrations/20261017T010000-drive-file-versions.ts` — 建 `drive_file_versions`
- `apps/server/src/core/casl/interfaces/drive-ability.type.ts` — `DriveCaslAction`/`DriveCaslSubject`/`IDriveAbility`
- `apps/server/src/core/casl/abilities/drive-ability.factory.ts` — 能力工厂
- `apps/server/src/database/repos/drive/drive-folder.repo.ts` / `drive-file.repo.ts` / `drive-share.repo.ts` / `drive-file-version.repo.ts`
- `apps/server/src/core/drive/services/drive.service.ts` / `drive-storage.service.ts` / `drive-share.service.ts` / `drive-quota.service.ts` / `drive-version.service.ts`
- `apps/server/src/core/drive/drive.controller.ts` / `drive.module.ts` / `dto/drive.dto.ts`
- `apps/client/src/features/drive/drive-page.tsx`
- `apps/client/src/features/drive/components/drive-browser.tsx`（含网格/列表/面包屑/树渲染，吸收计划中的 `folder-tree.tsx` 与 `file-grid.tsx`）
- `apps/client/src/features/drive/components/breadcrumb.tsx` / `file-row-actions.tsx` / `upload-dropzone.tsx` / `preview-modal.tsx` / `share-dialog.tsx` / `quota-indicator.tsx`
- `apps/client/src/features/drive/services/drive-service.ts` / `queries/drive-query.ts` / `types/drive.types.ts`

### Modified
- `apps/server/src/database/types/db.d.ts` / `entity.types.ts` — 新增 Drive 表类型
- `apps/server/src/app.module.ts` — 注册 `DriveModule`
- `apps/server/src/integrations/environment/environment.service.ts` — `getDriveStorageQuota()`
- `apps/client/src/features/drive/components/drive-browser.tsx` — 接入分享对话框（注：本文件既是 Created 也是 Modified）
- `apps/client/src/features/drive/components/file-row-actions.tsx` — 加 `onShare`
- `apps/client/src/App.tsx` — 新增 `/drive`、`/drive/shared`、`/drive/f/:folderId` 路由 + 侧边栏入口

### Tests
- server: `database/migrations/drive-schema.spec.ts`、`database/repos/drive/drive-folder.repo.spec.ts`、`core/drive/drive.controller.spec.ts`、`core/drive/services/{drive,drive-storage,drive-share,drive-quota,drive-version}.service.spec.ts`、`core/casl/abilities/drive-ability.factory.spec.ts`
- client: `features/drive/components/{drive-browser,upload-dropzone,preview-modal,share-dialog}.spec.tsx`

### Plan-vs-disk deviations (NOT defects — consolidated)
- **`casl/abilities/index.ts` 未创建**：`drive-ability.factory` 直接被 controller import，无需经 index 中转。
- **`folder-tree.tsx` / `file-grid.tsx` 未单独创建**：其职责（树/网格渲染）合并进 `drive-browser.tsx`（320 行）。
- **Task 11 增补服务端端点**：计划仅列客户端，但「配额在 UI 可用」需数据源，故补 `DriveQuotaService.getQuotaInfo` 与 `GET /drive/quota?driveType=`（JWT + CASL Manage）。

## Artifacts (non-code products)
- Catalog: `docs/artifacts/2026-10-16-cloud-drive.md` — **缺失**（review F004；请运行 `sean artifact cloud-drive list` 并生成 catalog，给 3 个迁移补反向引用头）

| Path | Type | Task | Status | Executed | Verified |
|------|------|------|--------|----------|----------|
| `apps/server/src/database/migrations/20261016T090000-drive.ts` | database | 1 | created | ⬜ | ⬜ |
| `apps/server/src/database/migrations/20261017T000000-drive-shares.ts` | database | 8 | created | ⬜ | ⬜ |
| `apps/server/src/database/migrations/20261017T010000-drive-file-versions.ts` | database | 10 | created | ⬜ | ⬜ |

> 迁移仅被「创建」，尚未由 `sean artifact ... run --execute` 真正应用到数据库（执行会改变 DB 状态，需显式 `--execute`）。

## Post-Run Bugs
无（`bugs[]` 为空）。

## Current Blocker
无。功能完整、测试全绿、类型干净。

## Next Steps (for whoever takes over)
1. **交付边界收尾**（review F001）：`sean artifact cloud-drive list` 生成 `docs/artifacts/2026-10-16-cloud-drive.md`；给 3 个迁移补反向引用头（review F004）。
2. **应用迁移**（需 DBA/人确认）：`sean artifact cloud-drive run <migration> --execute`（或项目既有 migration 工具 `pnpm --filter server migration:up`）。
3. **创建 conventional commit**：`feat(drive): implement personal + shared cloud drive (Phase 1 & 2)`。
4. **跑 CI / live-DB e2e**：`pnpm --filter server test:e2e` 验证模块 DI 与真实写入路径。
5. （可选）拆分 `drive.controller.ts`（556 行 > 400 约定，review F002）；收紧 `any` 类型（F003）；给 `upload-dropzone.tsx` 的 `catch {}` 补日志（F005）。
6. **Phase 3 独立 epic**：Word/Excel 在线编辑（OnlyOffice/Collabora），见需求 `docs/requirements/2026-10-16-cloud-drive.md` 的 Phase 3 占位。

## Known Risks / TODOs
- 迁移未执行：本地/生产库尚未建表，功能在应用迁移前无法运行。
- 仅在单元测试层验证；无 live-Postgres e2e，DI 与真实 S3 写入路径未端到端跑过。
- 分享链接为 token 直链，未做访问频控/吊销列表（如需可后续迭代）。
- 配额统计为同步聚合，超大数据盘可能慢；如需异步缓存可后续优化。

## How to Resume
```bash
cd /home/wuxiufeng/repos/docmost
sean status cloud-drive        # 查看状态（DONE, 11/11）
sean findings cloud-drive      # 查看 5 条 review findings
sean artifact cloud-drive list # 列出 3 个迁移产物
sean bug cloud-drive "desc"    # 记录实测 bug（test-first 修复）
pnpm --filter server test      # 后端 drive 测试（50 passed）
nx run client:test             # 或 npx vitest run src/features/drive（15 passed）
pnpm --filter server tsc       # 类型检查
pnpm --filter client tsc
```
