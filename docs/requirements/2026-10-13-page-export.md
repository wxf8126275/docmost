# Requirement: Page Export shows "Export failed:undefined" (`page-export`)

## Problem
导出页面时 UI 提示 `Export failed:undefined`。字面 `undefined` 是**前端缺陷**：导出请求使用 `responseType: "blob"`，当后端返回非 2xx 错误时，axios 把错误响应体存成 `Blob`（而非 JSON）。`export-modal.tsx:72` 的 catch 拼接了 `err.response?.data.message`，但 `err.response.data` 是 `Blob`，`.message` 恒为 `undefined`，于是拼出字面量 `Export failed:undefined`。

## Impact
- 真正的失败原因（403 权限、400「无可导出页面」、404 路由缺失、或 500）被掩盖。
- 用户无法判断导出失败是权限、内容缺失还是服务端错误。

## Root Cause
- `apps/client/src/features/page/services/page-service.ts` 的 `exportPage` / `exportPageToDocx` 用 `{ responseType: "blob" }`（成功时需二进制文件），但**失败分支没有解析 blob 错误体**。
- `apps/client/src/components/common/export-modal.tsx:70-74` catch 直接拼接 `err.response?.data.message`，对 blob 响应体永远是 `undefined`。

## 传播链（已核对）
- 前端默认格式 Markdown（`export-modal.tsx:38`），`handleExport` → `exportPage({pageId,format,...})`（`page-service.ts:116`）→ `api.post("/pages/export", data, {responseType:"blob"})`。
- 后端 `ExportController`（`@Controller()` + `@Post('pages/export')`，`export.controller.ts:51`）路由 `/api/pages/export` 匹配；正常页面应能成功返回文件。
- 一旦后端返回错误（任意非 2xx），axios 错误体为 `Blob` → 前端 `data.message` 为 `undefined` → 提示 `Export failed:undefined`。

## Constraints（来自用户）
- **沿用现有前端页面**：复用现有导出弹窗/UI，**不重写**导出界面。
- 修复该错误。

## Proposed Fix（仅前端，最小改动）
- **A. `page-service.ts`**：新增错误体解析 helper——请求失败时，若 `err.response?.data` 是 `Blob`，用 `await blob.text()` + `JSON.parse` 提取 `message`；否则直接用 `err.response?.data?.message`；再回退 `err.message`。以 `new Error(message)` 重抛。覆盖 `exportPage` 与 `exportPageToDocx`。
- **B. `export-modal.tsx`**：catch 内基于 `err.message` 构造提示，绝不再出现 `undefined`，例如 `message: err?.message ? "Export failed: " + err.message : "Export failed"`。
- **C. 保留** `console.error("export error", err)` 便于排查。

## Acceptance
- 任何情况下都不再显示字面 `Export failed:undefined`。
- 后端返回错误时，显示真实的服务器错误信息（或干净的 `Export failed`）。
- 成功导出（markdown/html/docx、单页/含子页/含附件）行为完全不变。
- 现有导出弹窗 UI 保持不变（reuse）。

## Notes / Follow-up
- 触发失败的底层 HTTP 错误需通过浏览器 Network 面板 / 服务端日志确认；本前端修复会把它暴露出来。常见候选：403（查看权限不足）、400（无可导出页面 / 根页面不可访问）、404（docx 路由缺失）、500。
- **额外发现**：`/docx-export` 当前仓库服务端**无任何控制器路由**（全仓搜索 `docx-export|docxExport|exportToDocx|DocxExport` 为 0 命中）。若 docx 导出也在范围内，需单独补齐该端点 / EE 接线；本次按「沿用前端」聚焦共享错误处理，docx 的 404 同样会被本修复正确显示而非 `undefined`。
- 后端导出逻辑本身（markdown 单页路径）对正常页面可成功：`getProsemirrorContent` 对 null 内容安全（`common/helpers/prosemirror/utils.ts:117`）。
