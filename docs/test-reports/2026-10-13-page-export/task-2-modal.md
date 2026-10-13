# Task 2 — client-export-modal-message

## Objective
改 `export-modal.tsx` catch，使用 `buildExportFailureMessage`，确保不再出现字面 `Export failed:undefined`（沿用现有导出弹窗 UI，不重写）。

## Change
`apps/client/src/components/common/export-modal.tsx`：
- 删除 `message: "Export failed:" + err.response?.data.message`。
- 改为 `const message = await buildExportFailureMessage(err); notifications.show({ message, color: "red" });`。
- 保留 `console.error("export error", err)`。
- 新增 import：`buildExportFailureMessage` from `@/features/page/services/export-error`。

## Validation
- 客户端 `tsc --noEmit` 干净（exit 0）。
- 全局 grep 确认 `export-modal.tsx` 不再含 `err.response?.data.message` 旧拼接。
- 客户端 `eslint` 因环境缺失 `@tanstack/eslint-plugin-query` 未能运行（F001）。

## Note（范围外）
`apps/client/src/features/auth/hooks/use-auth.ts`、`copy-page-modal.tsx`、`move-page-modal.tsx`、`page-import-modal.tsx` 仍含 `err.response?.data.message`。但它们**不使用** `responseType:"blob"`，错误体是 JSON，`message` 可正常读取，不受本 bug 影响，故不在本次范围内。
