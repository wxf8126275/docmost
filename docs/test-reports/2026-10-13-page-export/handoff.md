# Handoff: Page Export "Export failed:undefined" (`page-export`)

> 生成时间：2026-10-13T04:11:00Z · 状态：DONE（未提交）· 流程：`start → plan → run → review → handoff`

## 状态摘要
- **Status**: DONE。3/3 任务完成，**7/7 单测通过**；评审 PASS（1 个 low 发现 F001）。
- **当前阻塞**：**未提交**（代码 + 测试 + 文档 + `.sean` 元数据均在工作树）。

## 根因（已确认）
前端 `exportPage`/`exportPageToDocx` 用 `api.post(..., { responseType: "blob" })`。后端返回非 2xx 时，axios 把错误响应体存成 **Blob**（非 JSON），`export-modal.tsx:72` 原代码 `"Export failed:" + err.response?.data.message` 中 `data.message` 恒为 `undefined` → 字面 `Export failed:undefined`。

## 文件清单（已核对磁盘）
**修改**
- `apps/client/src/features/page/services/page-service.ts` — `exportPage`/`exportPageToDocx` 的 catch 以 `throw new Error(await parseExportError(err))` 重抛。
- `apps/client/src/components/common/export-modal.tsx` — catch 改用 `buildExportFailureMessage(err)`，删除旧拼接；保留 `console.error`。

**新增**
- `apps/client/src/features/page/services/export-error.ts` — 纯函数 `parseExportError`（Blob→`text()`→`JSON.parse` 取 `message`，回退 `data.message`/`err.message`/`"Export failed"`）与 `buildExportFailureMessage`。
- `apps/client/src/features/page/services/export-error.spec.ts` — 7 个 vitest 用例。

**文档 / 元数据**
- `docs/requirements/2026-10-13-page-export.md`
- `docs/plans/2026-10-13-page-export.md`
- `docs/test-reports/2026-10-13-page-export/{task-1-helper,task-2-modal,task-3-verify,review}.md`
- `docs/.sean/state.json`（page-export → DONE）
- `docs/.sean/history/2026-10-13T040000-start-page-export.json`
- `docs/.sean/history/2026-10-13T040100-plan-page-export.json`
- `docs/.sean/history/2026-10-13T041000-run-page-export.json`

## 接手下一步
1. （可选）安装客户端依赖后跑 `eslint` 关闭 F001：`npx eslint src/features/page/services/export-error.ts src/components/common/export-modal.tsx`。
2. `sean commit page-export` —— 建议拆两个提交：
   - `fix: surface real export error message instead of "Export failed:undefined"`（代码 + 测试：4 个新/改文件）
   - `chore(sean): persist page-export workflow state and history`（文档 + `.sean` 元数据）
3. 启动 dev，触发一次后端导出错误（如无权限页面）→ 确认显示真实服务器消息或 `Export failed`，而非 `undefined`。

## 已知风险 / 范围
- **仅单元测试级验证**；真实「导出成功」路径与「后端错误码」未在真实环境复现（无 dev DB/网络）。本修复**暴露**真实错误码，真正原因需经 Network 面板 / 服务端日志确认（403/400/404/500）。
- **未重写导出 UI**（满足「沿用现有前端」）。
- `/docx-export` 服务端缺失路由（EE，404）属 follow-up：本次不修，但经本修复 docx 404 也会显示真实错误而非 `undefined`。
- 其余弹窗（auth/copy/move/import）虽含 `err.response?.data.message`，但**不使用** `responseType:"blob"`，错误体是 JSON，不受本 bug 影响，故未改。
- 测试环境：项目 vitest 默认 `jsdom` 的 `Blob.prototype.text` 未实现，spec 顶部加 `// @vitest-environment node`（Node 全局 `Blob` 自带 `.text()`）。

## 恢复 / 验证命令
```bash
# 客户端单测（7/7）
pnpm --filter client exec vitest run src/features/page/services/export-error.spec.ts

# 客户端类型检查
cd apps/client && npx tsc --noEmit -p tsconfig.json

# 客户端 lint（需先装 @tanstack/eslint-plugin-query）
npx eslint src/features/page/services/export-error.ts src/components/common/export-modal.tsx

# 工作流状态
# sean status / sean list
```

至此 `page-export` 的 `start → plan → run → review → handoff` 全流程闭合，知识已沉淀，任何 AI 都能据此完成提交与端到端验证。
