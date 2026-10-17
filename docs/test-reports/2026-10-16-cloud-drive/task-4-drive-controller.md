# Task 4 — drive-controller

## Status: done
## Date: 2026-10-16

## What was done
- `core/drive/drive.controller.ts`：`@Controller('drive')`（全局前缀 `api` → `api/drive/...`）。
  - 文件夹：`GET /folders`、`POST /folders`、`PATCH /folders/:folderId`、`DELETE /folders/:folderId`
  - 文件：`GET /files`、`POST /files`（multipart 上传）、`PATCH /files/:fileId`、`DELETE /files/:fileId`、`GET /files/:fileId/download`
  - 每个写/读操作先经 `assertDriveAbility(user, driveType, subject)` 调用 `DriveAbilityFactory.createForUser`，无权限抛 `ForbiddenException`。
  - 上传：`req.file({limits})` 接 multipart，`driveType/folderId` 来自 `file.fields`；S3 key = `drive/{workspaceId}/{driveType}/{ownerId|shared}/{folderId|root}/{uuid7}{ext}`；经 `StorageService.upload` 落盘后 `DriveService.createFile` 记录。
  - 下载：`DriveService.getFile` 取记录校验 workspace 归属，`StorageService.readStream` 流式返回。
  - 复用现有 `JwtAuthGuard`、`FileInterceptor`、`@AuthUser/@AuthWorkspace`、`getFileUploadSizeLimit()`（超限 413 → 400）。
- `core/drive/dto/drive.dto.ts`：`CreateFolderDto` / `UpdateFolderDto` / `UpdateFileDto`（class-validator，`driveType` 限 `personal|shared`）。
- `core/drive/drive.module.ts`：注册 controller + `DriveService` + 两个 repo，`imports: [StorageModule]`。
- 修改 `core/core.module.ts`：注册 `DriveModule`（计划写 `app.module.ts` 不确切，实际模块在 `core.module` 注册）。
- 补充 `DriveService.getFile/getFolder`（供下载/校验）。

## TDD
- RED：spec 引用的 `drive.controller` 不存在 → TS2307；修正 `DriveAbilityFactory` 默认导入、mock 路径、构造参数。
- GREEN：10 用例通过。直接实例化 controller + mock 各依赖，覆盖：能力校验（允许/拒绝）、各端点委托 service、上传（storage+createFile）、下载（getFile+readStream+stream）。
- 修复 1 处：mock `getFile` 缺 `workspaceId` 致下载判等失败（属测试数据问题，非实现缺陷）。

## Test result
```
PASS src/core/drive/drive.controller.spec.ts
Tests: 10 passed
```
- 全 drive 套件（含 task1-3）：34/34 通过；`tsc --noEmit` 无 drive 相关错误。

## Acceptance check
- [x] 端点契约稳定（folders/files CRUD + 上传 + 下载）。
- [x] DTO 校验生效（`driveType` 枚举约束）。
- [x] 权限守卫在 controller 层拦截越权（403）。

## Notes
- 上传的 S3 key 前缀与大小限制落点：Task 5（`drive-storage-wiring`）将把「key 前缀 + 大小校验」抽到独立 `DriveStorageService`，本任务先内联实现以保证可用。
- 下载目前走流式直返；后续如需支持外链/浏览器内预览可考虑 presigned URL（与 Task 6 前端预览配合）。
