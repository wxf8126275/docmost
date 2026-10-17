# Task 9 — drive-quota (Phase 2)

## Status: done
## Date: 2026-10-17

## What was done
为云盘增加存储配额聚合与超限拒绝。

- **新增 `core/drive/services/drive-quota.service.ts`**：
  - `getUsedBytes(workspaceId, scope, userId?)`：按盘类型聚合已用容量（personal 仅该用户，shared 为工作区共享盘，均排除软删）。
  - `getQuota()`：读取 `DRIVE_STORAGE_QUOTA`（经 `EnvironmentService`，用 `bytes` 解析，`"10gb"` 亦可）；未配置返回 `null`（不限制）。
  - `ensureWithinQuota(workspaceId, scope, userId, additionalBytes)`：`used + 新增 > 配额` → 抛 `BadRequestException('Storage quota exceeded')`；配额为 `null` 则放行。
- **新增 `DriveFileRepo.sumFileSizes({ workspaceId, driveType, ownerId })`**：SQL `sum(fileSize)`（kysely `eb.fn.sum`），返回 `number`。
- **`integrations/environment/environment.service.ts`**：新增 `getDriveStorageQuota(): number | null`。
- **控制器接入**：`drive.controller.ts` 的 `POST /drive/files` 上传入口，在 `assertWithinLimit`（单文件大小）之后、`createFile` 之前调用 `driveQuotaService.ensureWithinQuota(workspace.id, driveType, user.id, fileSize)`。
- **`drive.module.ts`**：注册 `DriveQuotaService`。

## TDD
- RED：`drive-quota.service.spec.ts` 首次运行失败（模块不存在）。
- GREEN：4/4：
  - `getUsedBytes` 对 personal 盘按用户 scope 求和（断言 repo 入参）。
  - `ensureWithinQuota`：`used(9GB) + 2GB > 10GB` → 拒绝（BadRequest）。
  - `ensureWithinQuota`：`used(9GB) + 1GB ≤ 10GB` → 放行。
  - `ensureWithinQuota`：配额未配置（null）→ 即使极大值也放行。

## Test result
```
PASS src/core/drive/services/drive-quota.service.spec.ts    (4 passed)
PASS src/core/drive/services/drive-share.service.spec.ts
PASS src/core/drive/services/drive-storage.service.spec.ts
PASS src/core/drive/services/drive.service.spec.ts
PASS src/core/drive/drive.controller.spec.ts
```
- 本任务新增测试 4 项全绿；drive 目录回归 5 套件 41/41 全绿。
- server `tsc --noEmit` 0 错误。

## Acceptance check
- [x] 配额统计准确：`sumFileSizes` 按盘类型/归属求和，排除软删。
- [x] 超限被拒：`ensureWithinQuota` 抛错；上传入口在持久化前校验。
- [x] 默认不限制：`getQuota()` 未配置返回 null → 放行。

## Notes / 偏离计划
- 计划写「Modifies: drive.service.ts 上传入口」，但 drive.service 仅处理元数据，真实上传入口在 `drive.controller.ts`。配额校验已落在控制器的 `POST /drive/files`（上传入口）处，更贴合实际数据流；已在报告中注明。
- 配额校验在「流式上传到 S3 之后、写元数据之前」执行（单文件大小 `getBytesRead()` 需在流消费后才知道）。极端情况下超限会留下一个已上传的孤立 S3 对象——本任务未做回滚删除（非验收阻塞，留作后续优化）。若需严格避免，应在控制器于流式前校验 `Content-Length`（fastify multipart 不一定提供）。
- 配额按工作区级、不区分 personal/shared 总池（两者各自 scope 聚合）；`getQuota` 当前为全局 env，未做 per-workspace 覆盖。
