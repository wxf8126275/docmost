# Task 3 — drive-service

## Status: done
## Date: 2026-10-16

## What was done
- `database/repos/drive/drive-folder.repo.ts`：文件夹数据访问（findById / createFolder / updateFolder / softDeleteFolder / listFolders）。
  - `listFolders` 按 `workspaceId` + `driveType` 过滤；个人盘强制 `ownerId`，共享盘 `ownerId is null`；`parentId` 为 `null` 表示根级、字符串表示某文件夹内。含 `deletedAt is null`。
- `database/repos/drive/drive-file.repo.ts`：文件数据访问（同上结构，表 `driveFiles`，字段含 `folderId/fileName/filePath/fileSize/fileExt/mimeType/type`）。
- `core/drive/services/drive.service.ts`：业务编排 + **归属规则**（本任务核心校验点）。
  - 个人盘：`ownerId` / `creatorId` 一律取当前 `authUser.id`（即使入参带了别人的 `ownerId` 也会被覆盖）→ 防止越权把文件塞给别人私人盘。
  - 共享盘：`ownerId = null`，仅按 workspace 归属。
  - 提供 `getBreadcrumb`：沿 `parentId` 回溯到根，生成面包屑。
- 说明：CASL 越权拦截按代码库惯例放在 **controller 层**（Task 4），service 层只做数据归属与委托，不持有 ability 检查。

## TDD
- RED：spec 引用的 `drive-folder.repo` / `drive.service` / `drive-file.repo` 尚不存在 → TS2307。
- GREEN：实现后 18 用例通过。
  - repo 测试沿用 `ai-provider.repo.spec` 的 Proxy mock db 范式（返回 canned 结果）。
  - service 测试以 mock repos 验证行为：归属强制、委托、面包屑回溯。

## Test result
```
PASS src/core/drive/services/drive.service.spec.ts
PASS src/database/repos/drive/drive-folder.repo.spec.ts
Tests: 18 passed
```

## Acceptance check
- [x] 文件夹层级与文件归属正确（个人盘=当前用户，共享盘=workspace）。
- [x] 软删生效（`deletedAt` 置位，列举已排除）。
- [x] 越权在"数据归属"边界被拦：个人盘入参 `ownerId` 被强制覆盖为 authUser；列举始终按 authUser 作用域。

## Notes
- `listFolders`/`listFiles` 本任务返回数组，未接游标分页（沿用附件表筛选思路，分页可留待 controller/前端分批，或后续 Task 增强）。
- `drive-file.repo` 的 `listFiles` 测试未单独建 spec（与 folder 同构）；如需要可补 `drive-file.repo.spec.ts`。
