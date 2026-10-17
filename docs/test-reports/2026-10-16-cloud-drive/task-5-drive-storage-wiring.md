# Task 5 — drive-storage-wiring

## Status: done
## Date: 2026-10-16

## What was done
- `core/drive/services/drive-storage.service.ts`：新增 `DriveStorageService`，把 Task 4 控制器里内联的 S3 接入逻辑抽出，集中管理：
  - `getMaxFileSize()` / `getFileUploadSizeLimit()`：解析 `FILE_UPLOAD_SIZE_LIMIT`（`bytes()` 解析，未配置返回 0）。
  - `generateKey({workspaceId, driveType, ownerId, folderId, fileName})`：规范化 S3 key = `drive/{wsId}/{type}/{ownerId|shared}/{folderId|root}/{uuid7}{ext}`。
  - `assertWithinLimit(bytes)`：超限抛 `BadRequestException`（未配置上限则不限制）。
  - `upload(key, content)` / `readStream(key)`：委托 `StorageService`。
- 重构 `core/drive/drive.controller.ts`：移除直接注入的 `StorageService`/`EnvironmentService` 与内联的 `bytes`/`path`/`uuid` key 生成；上传/下载/大小校验统一走 `DriveStorageService`。构造函数变为 `(driveService, driveStorageService, driveAbility)`。
- `core/drive/drive.module.ts`：在 providers 注册 `DriveStorageService`。
- 同步更新 `core/drive/drive.controller.spec.ts`：构造参数与上传/下载用例断言改为 `driveStorageService`（getMaxFileSize/generateKey/upload/assertWithinLimit/readStream）。

## TDD
- RED：spec 引用的 `drive-storage.service` 不存在 → TS2307；修正 spec 相对路径层级（`services/` 下需 `../../../integrations`）。
- GREEN：8 用例通过。覆盖：大小解析、个人/共享盘 key 前缀、upload/readStream 委托、超限抛错、限额内通过、未配置上限放行。
- 修复：测试用真实 `Readable` 流；`upload` 参数类型对齐 `StorageService` 的 `Buffer | Readable`。

## Test result
```
PASS src/core/drive/services/drive-storage.service.spec.ts   (8 passed)
全 drive 套件: 42 passed (6 suites)
```
- `tsc --noEmit` 无 drive 相关错误。

## Acceptance check
- [x] S3 接入落地（`upload`/`readStream` 经 `StorageService`，复用现有 S3 集成）。
- [x] key 前缀正确：`drive/{ws}/{type}/{owner|shared}/{folder|root}/{uuid}{ext}` 经单测验证。
- [x] 超限拒绝：`assertWithinLimit` 抛错，且控制器在 multipart 解析层 `limits.fileSize` 已提前 413 拦截。

## Notes
- 软删除（`softDeleteFile`）暂不 purge S3 对象——保留对象以便后续恢复/版本（Task 10）。`DriveStorageService.delete(key)` 未新增（避免未使用代码）；硬删/S3 清理留待 Task 10 接入时再加。
- 双保险：multipart `limits.fileSize` 在流到达前拦截（413），`assertWithinLimit` 在字节计数后二次校验。
