# Plan: Word(docx) 导出功能实现

Generated: 2026-10-14T04:30:00Z
Requirement: ../requirements/2026-10-14-word-export-error.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | server-docx-export | — | high | no |
| 2 | frontend-interceptor-guard | — | medium | yes |
| 3 | verify | 1, 2 | low | no |

## Dependency Graph

Task 1 → Task 3
Task 2 → Task 3

## Task Details

### Task 1: server-docx-export

- **Modifies**:
  - `apps/server/src/integrations/export/dto/export-dto.ts` — 新增 `ExportDocxPageDto { pageId: string }`
  - `apps/server/src/integrations/export/export.controller.ts` — 新增 `POST docx-export` 方法
  - `apps/server/src/integrations/export/export.service.ts` — 新增 `exportPageToDocx(page, userId?)` + 私有 `resolveDocxImage(src, page)`
- **Test**: `apps/server/src/integrations/export/export.service.spec.ts`
- **Behavior**: 用 `@docmost/editor-ext` 的 `pageNodeToDocxBuffer(node, getImageBuffer)` 把页面 ProseMirror 内容转 docx。标题前置为 H1；mention 经 `turnPageMentionsToLinks` 转链接；图片经 `DocxImageResolver` 从存储读取附件字节嵌入（解析失败则跳过）。控制器校验 `validateCanView`，缺失返回 404，最终以 blob + `content-disposition` 返回。
- **TDD steps (red → green → verify)**:
  1. RED: 用 mock 依赖构造 `ExportService`，对“含 heading+paragraph、无 mention”的页面调用 `exportPageToDocx`，断言返回 `Buffer` 且 `result.slice(0,2).toString() === 'PK'`（docx 是 ZIP）。运行 → 失败（方法未实现）。
  2. GREEN:
     - DTO：`ExportDocxPageDto`（`pageId` 必填）。
     - Service：`exportPageToDocx` 取 `getProsemirrorContent(page.content)` → `turnPageMentionsToLinks`（无 mention 时早期返回，避免额外 DB 调用）→ 前置标题 H1 → `jsonToNode` → `pageNodeToDocxBuffer(node, resolver)`。`resolver` 为 `DocxImageResolver`：调用私有 `resolveDocxImage` 从 src 解析 attachmentId → 查 `attachments` 表取 `filePath` → `storageService.read` → `Uint8Array`；失败返回 `undefined`（序列化器跳过）。
     - Controller：`@UseGuards(JwtAuthGuard) @Post('docx-export')`，加载页面（`includeContent`），`validateCanView`，调 `exportPageToDocx`，设置 `Content-Type` 与 `Content-Disposition` 后 `res.send(buffer)`。
  3. VERIFY: 测试通过；追加“图片解析抛错 → 仍生成 docx（图片跳过）”用例；自查函数 ≤40 行、无 `any`、含解释 WHY 的注释；确认 `export-modal` 走 docx 分支能拿到 `content-disposition`。
- **Acceptance**: 单页 docx 导出返回合法 `.docx`；含图页面不崩溃；权限/404 正确；`api-client` 的 `/api/docx-export` 命中 `exemptEndpoints` 保留响应头。

### Task 2: frontend-interceptor-guard

- **Modifies**: `apps/client/src/lib/api-client.ts`
- **Test**: `apps/client/src/lib/api-client.spec.ts`
- **Behavior**: `case 404` 对 `error.response.data.message` 做存在性+类型防护，提取导出纯函数 `isWorkspaceNotFound(error)`（精确类型、禁用 `any`），blob 错误体不再触发 `undefined.toLowerCase()`。
- **TDD steps**:
  1. RED: 写 4 用例（blob 404 body 返 `false` 且不抛错 / JSON `{"message":"workspace not found"}` 返 `true` / 其它 message 返 `false` / 无 `response` 返 `false`）。运行 → 因函数未定义失败。
  2. GREEN: 实现 `isWorkspaceNotFound` 并在 `case 404` 使用。重跑 → 全绿。
  3. VERIFY: 重跑稳定通过；自查函数 ≤40 行、无 `any`、含 WHY 注释。
- **Acceptance**: 任意 blob 错误体不再抛 `Cannot read properties of undefined (reading 'toLowerCase')`；原 redirect 行为不变。

### Task 3: verify

- **Depends on**: 1, 2
- **Behavior**: 运行服务端 Jest 新 spec；`tsc --noEmit`（server + client）确认无回归。
- **Steps**: `pnpm --filter @docmost/server test -- export.service.spec`；`npx tsc --noEmit -p apps/server/tsconfig.json`；`npx tsc --noEmit -p apps/client/tsconfig.json`。
- **Acceptance**: 新测试通过；tsc 干净。环境若缺依赖无法跑（沿用 `page-export` 的 F001 模式），记入 finding。

## Notes / Non-goals

- 仅单页 docx 导出（不做 space 批量 docx）。
- 图片嵌入 best-effort（解析失败跳过，符合 `renderImage` 既有行为）。
- EE 许可门控不在范围：路由直接可用，便于社区环境验证；与上游 EE 行为差异已在 requirement 注明。
- Task 1 与 Task 2 相互独立，可在并行执行阶段并发；Task 3 汇总验证。
