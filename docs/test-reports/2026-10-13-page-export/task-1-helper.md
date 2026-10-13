# Task 1 — client-export-error-helper (RED → GREEN)

## Objective
让前端能从 blob 错误体解析真实错误消息，消除 `Export failed:undefined`。

## TDD
1. 先写 `export-error.spec.ts`（7 用例）并运行 → **RED**：`Failed to resolve import "./export-error"`（模块未创建）。
2. 创建 `apps/client/src/features/page/services/export-error.ts`，实现 `parseExportError` / `buildExportFailureMessage`：
   - `parseExportError`：若 `err.response.data` 是 Blob（`typeof .text === 'function'`）→ `await data.text()` → `JSON.parse` 取 `message`；否则取 `data.message`；再回退 `err.message`；最终回退 `"Export failed"`。
   - `buildExportFailureMessage`：组合为 `"Export failed: <msg>"` 或 `"Export failed"`，永不含 `undefined`。
3. 在 `page-service.ts` 的 `exportPage` / `exportPageToDocx` 中以 `throw new Error(await parseExportError(err))` 重抛。
4. 重跑 → **GREEN**：7/7 通过。

## 环境调整（测试环境，非代码修复）
项目 vitest 默认 `jsdom` 环境，`jsdom` 的 `Blob.prototype.text` 未实现，导致 Blob 消息用例回退成 `"Export failed"` 失败。在 spec 顶部加 `// @vitest-environment node`（Node 全局 `Blob` 自带 `.text()`），复跑转绿。

## Tests
| 用例 | 结果 |
|------|------|
| Blob 含 `{"message":"Page not found"}` → 返回该消息 | ✅ |
| 普通对象 `{message:"Forbidden"}` → 返回该消息 | ✅ |
| 仅 `err.message` → 返回该消息 | ✅ |
| Blob 非 JSON 且无消息 → 回退 `"Export failed"` | ✅ |
| `buildExportFailureMessage` 真实消息 → `"Export failed: Page not found"` | ✅ |
| `buildExportFailureMessage` 无信息 → `"Export failed"` | ✅ |
| `buildExportFailureMessage` 永不出现字面 `undefined` | ✅ |

## Validation
- `pnpm --filter client exec vitest run .../export-error.spec.ts` → 7 passed.
- 客户端 `tsc --noEmit` 干净（exit 0）。
- 客户端 `eslint` 因环境缺失 `@tanstack/eslint-plugin-query` 未能运行（同 attachment-upload-limit 的 F001 模式）。
