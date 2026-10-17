# Task 11 — client-drive-share-quota (Phase 2)

## Status: done
## Date: 2026-10-17

## What was done
为客户端云盘补齐 Phase 2 的「分享」与「配额」UI，并把后端配额读取端点补齐（计划未列出该端点，UI 必须依赖它才能显示已用/总量）。

### 客户端
- **`components/share-dialog.tsx`**（新建）：Mantine `Modal` 分享对话框。含权限 SegmentedControl（Read/Download）与有效期 SegmentedControl（Never/1 hour/1 day/7 days）；点击 `Generate link` 调 `useCreateShareMutation`，成功后展示只读分享链接（`<origin>/api/drive/shares/<token>`）与 `Copy` 按钮。
- **`components/quota-indicator.tsx`**（新建）：用 `formatBytes` 显示 `已用 / 总量`；带进度条（≥90% 红、≥75% 黄、否则绿）；`quota=null` 时显示 `Unlimited`。
- **`components/file-row-actions.tsx`**：新增 `onShare?` 入口，渲染分享 `ActionIcon`。
- **`components/drive-browser.tsx`**：新增 `sharingFile` 状态，向 `FileRowActions` 传 `onShare`，并渲染 `ShareDialog`。
- **`drive-page.tsx`**：接入 `useDriveQuotaQuery(driveType)`，在工具栏嵌入 `QuotaIndicator`。
- **`services/drive-service.ts`**：新增 `createShare(fileId, input)`、`getQuota(driveType)`。
- **`queries/drive-query.ts`**：新增 `useCreateShareMutation`、`useDriveQuotaQuery`。
- **`types/drive.types.ts`**：新增 `CreateShareLinkInput`、`IDriveShare`、`IDriveQuota`。

### 服务端（补齐计划遗漏的读取端点）
- **`services/drive-quota.service.ts`**：新增 `getQuotaInfo(workspaceId, scope, userId)` → `{ usedBytes, quota }`（复用 `getUsedBytes`/`getQuota`）。
- **`drive.controller.ts`**：新增 `GET /drive/quota?driveType=`（JWT + CASL `Manage`），返回 `{ usedBytes, quota }`。

## TDD
- RED：`share-dialog.spec.tsx` 首次运行失败（组件不存在）。
- GREEN：4/4：
  - ShareDialog 渲染权限（Read/Download）与有效期（Never/1 day）选项。
  - ShareDialog 点击生成后调用 `createShare` 并显示包含 token 的链接。
  - QuotaIndicator 显示 `已用 / 总量`。
  - QuotaIndicator 在 `quota=null` 时显示 `Unlimited`。

## Test result
```
PASS src/features/drive/components/share-dialog.spec.tsx (4 passed)
PASS src/features/drive/components/drive-browser.spec.tsx (4 passed)
PASS src/features/drive/components/preview-modal.spec.tsx (4 passed)
PASS src/features/drive/components/upload-dropzone.spec.tsx (3 passed)
→ client drive 目录 4 套件 15/15 全绿
PASS src/core/drive/* (6 suites) → 45/45 全绿（含新增 GET /drive/quota 后回归）
```
- 客户端 `tsc --noEmit` 0 错误；服务端 `tsc --noEmit` 0 错误。

## Acceptance check
- [x] 分享对话框生成链接并显示权限/有效期选项。
- [x] 配额指示器显示已用/总量（含无配额时 Unlimited）。

## Notes / 偏离计划
- 计划 Task 11 的 `Modifies` 仅列客户端文件，未含服务端端点。但「配额在 UI 可用」必须有数据来源，而 Task 9 只做了上传时的配额校验、未暴露读取接口，故补充 `GET /drive/quota` 与 `DriveQuotaService.getQuotaInfo`。这是使功能真正可用的必要补齐。
- `share-dialog.spec.tsx` 同时覆盖 QuotaIndicator（计划 `Test` 字段只列了该文件，步骤却要求验证配额指示器；两者合并于此文件）。
- 测试环境补充 `ResizeObserver` polyfill（Mantine SegmentedControl 依赖）。
- 修正一处测试 mock 形状：`useCreateShareMutation().mutateAsync` 实际返回**未包装**的 `IDriveShare`（服务层 `createShare` 已解包 `res.data.share`），故 mock 直接 resolve 该对象。
