# Plan: Attachment Upload Size Limit (`attachment-upload-limit`)

## Goal
修复页面插入 PDF（及任意文件）时前端报 `File exceeds the 0.0 KB attachment limit` 的错误。做法是让**文件大小上限的解析**在 `FILE_UPLOAD_SIZE_LIMIT` 为空串 / `0` 时回退到默认 `50mb`，前后端都做兜底。**沿用现有前端**——不重写 `upload-pdf-action.tsx` / `upload-image-action.tsx` / `upload-audio-action.tsx` / `upload-video-action.tsx` 等上传 UI。

## Root Cause（recap）
- 前端 `upload-*-action.tsx` 用 `getFileUploadSizeLimit()` + `formatBytes()` 校验；`getFileUploadSizeLimit()`（`apps/client/src/lib/config.ts:81`）默认 `"50mb"`，但 `getConfigValue(key, "50mb")` 的 `??` **不回退空串**。
- `FILE_UPLOAD_SIZE_LIMIT` 为空 / `0` → `bytes("")`→`null` → `formatBytes(null)`（`lib/utils.tsx:37`）→ `"0.0 KB"`；且 `file.size > null(数值0)` 使任何非空文件都"超出"。
- 后端同源：`environment.service.ts:87` 同样不回退空串，`static.module.ts:38` 把空值注入 `window.CONFIG`，`attachment.controller.ts:99` 又用作 multer `fileSize`。
- PDF 在 `attachment.constants.ts:16` 属 `inlineFileExtensions`（允许），报错纯属上限为 0，非类型限制。

## Tasks（TDD：RED→GREEN）

| # | task | complexity | parallel_safe | depends | done_when |
|---|------|-----------|--------------|---------|-----------|
| 1 | `client-config-fallback` | medium | ✅（仅 client） | — | vitest 通过；eslint 干净 |
| 2 | `server-env-fallback` | medium | ✅（仅 server） | — | jest 通过；tsc+eslint 干净 |
| 3 | `verify-limits` | low | ❌ | 1,2 | 双端 type-check/lint 绿；新单测绿 |

### Task 1 — `client-config-fallback`
- **改**：`apps/client/src/lib/config.ts`
  - `getFileUploadSizeLimit()`：
    ```js
    export function getFileUploadSizeLimit() {
      const raw = getConfigValue("FILE_UPLOAD_SIZE_LIMIT") ?? "50mb";
      const limit = bytes(raw);
      return limit && limit > 0 ? limit : bytes("50mb");
    }
    ```
  - `getFileImportSizeLimit()` 同理（`200mb` 默认）：`raw = getConfigValue("FILE_IMPORT_SIZE_LIMIT") ?? "200mb"`，`limit && limit > 0 ? limit : bytes("200mb")`。
  - 返回类型不变（number）。不改 `formatBytes`/`upload-*-action.tsx`。
- **测（vitest，新文件）**：`apps/client/src/lib/config.spec.ts`
  - vitest 下 `import.meta.env.DEV` 为真 → `getConfigValue` 读 `process.env`；用例：`process.env.FILE_UPLOAD_SIZE_LIMIT` 设为 `undefined`/`""`/`"0"`/`"0mb"` → 断言返回 `bytes("50mb")`；设为 `"100mb"` → 返回 `bytes("100mb")`。
  - 该测试在改前**失败**（空串 → `null`/`0`），改后通过。
- **done_when**：`pnpm --filter client exec vitest run src/lib/config.spec.ts` 全绿；`npx eslint src/lib/config.ts src/lib/config.spec.ts` 干净。

### Task 2 — `server-env-fallback`
- **改**：`apps/server/src/integrations/environment/environment.service.ts`
  - `getFileUploadSizeLimit()`：
    ```js
    getFileUploadSizeLimit(): string {
      const val = this.configService.get<string>('FILE_UPLOAD_SIZE_LIMIT', '50mb');
      return val && val.trim() !== '' ? val : '50mb';
    }
    ```
  - `getFileImportSizeLimit()` 同理（`200mb` 默认）。
  - 返回类型不变（string）。无需改 `attachment.controller.ts:99`（它已 `bytes(this.environmentService.getFileUploadSizeLimit())`，服务回退后 multer 上限即正确）。
- **测（jest，新文件）**：`apps/server/src/integrations/environment/environment.service.spec.ts`
  - mock `ConfigService.get` 返回 `""` / `"0"` / `"100mb"` / `undefined` → 断言 `getFileUploadSizeLimit()` 返回 `'50mb'`/`'50mb'`/`'100mb'`/`'50mb'`；`getFileImportSizeLimit()` 对应 `'200mb'`。
  - 该测试在改前**失败**（返回 `""`/`"0"`）。
- **done_when**：`pnpm --filter server jest environment.service.spec` 全绿；`npx tsc --noEmit -p tsconfig.build.json` 与 `npx eslint src/integrations/environment/environment.service.ts src/integrations/environment/environment.service.spec.ts` 干净。

### Task 3 — `verify-limits`
- 跑：`pnpm --filter client exec vitest run src/lib/config.spec.ts` 与 `pnpm --filter server jest environment.service.spec`。
- 类型/lint：client `npx eslint`（Task1 文件）；server `npx tsc --noEmit -p tsconfig.build.json` + `npx eslint`（Task2 文件）。
- 手动验证说明（非自动化）：将 `FILE_UPLOAD_SIZE_LIMIT` 设为空 / `0` / `100mb` 启动，进入页面插入 PDF/图片/音频/视频 → 空/`0` 时**不再**出现 "0.0 KB" 报错（按 50MB 校验），`100mb` 时按 100MB。
- **done_when**：双端 type-check/lint 与新增单测全绿，无上传/导入路径回归。

## Notes
- `formatBytes`（`lib/utils.tsx`）保持不变，以符合"沿用现有前端"；修复点在上游的 limit 取值。
- 同一修复顺带消除 image/audio/video 上传与 DOCX/PDF 导入的同源潜在 bug（`getFileImportSizeLimit` 一并兜底）。
- 不改 PDF 插入业务流程/样式，不引入新配置项，默认 50MB 不变。

## Acceptance（来自需求）
- `FILE_UPLOAD_SIZE_LIMIT` 未设置 / 空 / `0` → 不再报 "0.0 KB"，按 50MB 校验。
- 正常配置（如 `100mb`）仍生效。
- 双端 type-check/eslint 通过；新增单测通过。
