# Plan: Page Export "Export failed:undefined" (`page-export`)

## Goal
修复导出页面时提示 `Export failed:undefined`。根因是前端用 `responseType:"blob"` 发导出请求，后端返回非 2xx 时错误体是 `Blob`，`export-modal.tsx:72` 直接读 `err.response?.data.message`（恒 `undefined`）。

## Constraints（来自用户）
- **沿用现有前端页面**：复用现有导出弹窗/UI，不重写导出界面。
- 仅前端最小改动。

## 设计决策
把两件事抽成**纯函数**以便单测，避免 React 渲染测试：
- `parseExportError(err): string` — 从 axios 错误中恢复真实消息：
  1. 若 `err.response?.data` 是 `Blob`：读 `blob.text()` → `JSON.parse` → 取 `message`；
  2. 否则取 `err.response?.data?.message`；
  3. 回退 `err.message`；最终再回退为 `"Export failed"`。
- `buildExportFailureMessage(err): string` — 组合最终展示文本，绝不含字面 `undefined`，例：`errMsg ? "Export failed: " + errMsg : "Export failed"`。内部复用 `parseExportError`。

纯函数放在 `apps/client/src/features/page/services/page-service.ts`（与 `exportPage`/`exportPageToDocx` 同文件，便于 `exportPage` 在 catch 中 `throw new Error(parseExportError(err))`，让 `err.message` 已是真实消息）。

## Tasks（TDD）

### Task 1 — `client-export-error-helper`（medium, parallel_safe: true）
- 在 `page-service.ts` 新增 `parseExportError` 与 `buildExportFailureMessage`；在 `exportPage`/`exportPageToDocx` 的 catch 中以 `throw new Error(parseExportError(err))` 重抛。
- 新增 `page-service.spec.ts`（vitest），**先写失败用例再实现（RED→GREEN）**：
  - 错误体为 Blob 且含 `{"message":"Page not found"}` → `parseExportError` 返回 `"Page not found"`（当前返回 `"undefined"` → RED）。
  - 错误体为普通对象 `{message:"Forbidden"}` → 返回 `"Forbidden"`。
  - `err.response` 缺失、仅 `err.message` → 返回该 `err.message`。
  - 全无信息 → 回退 `"Export failed"`。
  - `buildExportFailureMessage` 对上述组合出 `"Export failed: <msg>"` 或 `"Export failed"`，永不出现 `undefined`。
- `done_when`：vitest 全绿；客户端 `tsc --noEmit` 干净。

### Task 2 — `client-export-modal-message`（medium, parallel_safe: false，依赖 Task1 的 helper）
- 改 `export-modal.tsx:70-74` catch：`message: buildExportFailureMessage(err)`（替换原 `"Export failed:" + err.response?.data.message`）。
- 保留 `console.error("export error", err)`。
- `done_when`：客户端 `tsc --noEmit` 干净；`eslint` 干净（如可运行）；行为上不再出现 `Export failed:undefined`。

### Task 3 — `verify-export`（low, parallel_safe: false）
- 跑 `page-service.spec.ts` 全绿；客户端 `tsc --noEmit` +（如可运行）`eslint`。
- 全局搜索确认无残留 `"Export failed:" + err.response?.data.message` 模式。
- 手动验证说明：开启导出，触发后端错误（如无权限页面）→ 显示真实服务器消息或 `Export failed`，而非 `undefined`。
- `done_when`：单测 + 类型检查 + lint 全绿；需求 Acceptance 全满足。

## 范围外
- `/docx-export` 服务端缺失路由（EE）属 follow-up，本次不修（docx 导出经本修复也会显示真实 404 而非 `undefined`）。记入 review findings。

## 风险
- 解析 Blob 错误体需 `vi.mock` 拦截 http 客户端（`api`/`axios`）；vitest 用 `vi.fn()` 模拟 `api.post` 返回 reject 的 axios 错误即可，无需真实网络。
- 组件接线（Task2）仅经类型/lint 验证，无渲染单测——属 low 风险。
