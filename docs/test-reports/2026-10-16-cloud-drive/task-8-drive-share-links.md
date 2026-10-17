# Task 8 — drive-share-links (Phase 2)

## Status: done
## Date: 2026-10-17

## What was done
为云盘文件增加时间盒、token 门控的分享链接。

- **迁移** `database/migrations/20261017T000000-drive-shares.ts`：新建 `drive_shares` 表（`workspace_id`/`file_id` FK cascade、`creator_id`、`token`（全局唯一）、`permission` enum('read'|'download')、`expires_at`、`deleted_at` 等），`token` 加唯一约束。
- **类型** `db.d.ts`（新增 `DriveShares` 接口 + `DB.driveShares` 键）、`entity.types.ts`（新增 `DriveShare` / `InsertableDriveShare` / `UpdatableDriveShare`）。
- **Repo** `database/repos/drive/drive-share.repo.ts`：`createShare` / `findByToken`（按 token 查未软删）/ `softDeleteShare`，沿用 `dbOrTx` + `baseFields` 模式。
- **Service** `core/drive/services/drive-share.service.ts`：
  - `createFileShare({ authUserId, workspaceId, fileId, permission, expiresAt })`：校验文件归属——个人盘仅本人可分享（`Forbidden`），跨工作区/不存在 → `NotFound`；`token` 用 `nanoIdGen().toLowerCase()` 生成（与现有 `shares` 表一致的 nanoid 方案）。
  - `resolveShare(token)`：查 token → 拒绝软删/过期（`BadRequest` expired）/未知（`NotFound`）；再取文件核对工作区。
- **Controller** `drive.controller.ts` 新增端点：
  - `POST /drive/files/:fileId/share`（需 JWT + CASL `Manage`）：先取文件再 `assertDriveAbility`，返回 `{ share: { token, permission, expiresAt, fileId, createdAt } }`。
  - `GET /drive/shares/:token`（**公开**，无 JWT）：返回分享元数据 + 文件只读信息。
  - `GET /drive/shares/:token/download`（**公开**）：`resolveShare` 后要求 `permission==='download'`，否则 `Forbidden`，再流式返回文件字节（复用 `driveStorageService.readStream`）。
- **Module** `drive.module.ts`：注册 `DriveShareService` / `DriveShareRepo`。
- **DTO** `dto/drive.dto.ts`：`CreateShareLinkDto`（`permission` ∈ read/download，`expiresAt` ISO8601）。

## TDD
- RED：`drive-share.service.spec.ts` 首次运行失败（模块不存在）。
- GREEN：`drive-share.service.spec.ts` 6/6：创建带 token 默认 read 权限；拒绝他人个人文件（Forbidden）；拒绝跨工作区（NotFound）；有效 token 解析返回 share+file；过期拒绝；未知 token 拒绝。

## Test result
```
PASS src/core/drive/services/drive-share.service.spec.ts    (6 passed)
PASS src/core/drive/services/drive-storage.service.spec.ts
PASS src/core/drive/services/drive.service.spec.ts
PASS src/core/drive/drive.controller.spec.ts
```
- 本任务新增测试 6 项全绿；drive 目录回归 37/37 全绿。
- server `tsc --noEmit` 0 错误（含新增迁移/类型/控制器）。

## Acceptance check
- [x] 分享链接按权限（read/download）生效：`getShare` 公开只读；`/download` 仅 download 权限可拉取字节。
- [x] 有效期：`expiresAt` 过期 → 解析拒绝（"expired"）。
- [x] 越权防护：个人盘他人文件 → `Forbidden`；共享盘由 controller 的 CASL `Manage` 把关；跨工作区文件 → `NotFound`。

## Notes / 偏离计划
- 计划只列 `POST /drive/files/:id/share` 与 `GET /drive/shares/:token`；为满足"持 token 可下载"的验收，额外加了 `GET /drive/shares/:token/download`（公开下载端点，要求 download 权限）。
- 公开解析端点未加 JWT 守卫（分享链接本身即凭证，token 全局唯一）；文件工作区以 share 内嵌 `workspaceId` 为准，避免依赖请求中的 workspace 上下文。
- `file.driveType` 在 DB 类型为 `string`，在调用 `assertDriveAbility` 处窄化为 `'personal' | 'shared'`。
- 未新增迁移 spec（计划 test 仅 service spec）；迁移文件已落地，运行时由迁移运行器自动应用。
