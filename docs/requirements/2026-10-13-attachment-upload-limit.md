# Attachment Upload Size Limit — 修复「0.0 KB 类型附件限制」报错

> 特性名归一化自用户描述「页面插入 PDF 报 0.0 KB 限制」→ `attachment-upload-limit`（根因影响所有文件上传，PDF 为报告案例）。

## Problem（用户反馈）
在页面插入 PDF 文件时，前端校验报错：`File exceeds the 0.0 KB attachment limit`（文件超出了 0.0 KB 类型附件限制）。要求**沿用现有前端**（不重写插入 PDF 的 UI），仅修复该错误。

## 调查结论 / 根因
- 报错来自前端上传校验：`upload-pdf-action.tsx:25,29`（以及 image/audio/video 同构逻辑）调用 `getFileUploadSizeLimit()` 与 `formatBytes()`。
- `getFileUploadSizeLimit()`（`apps/client/src/lib/config.ts:81-84`）默认 `"50mb"`，实际取值 `getConfigValue("FILE_UPLOAD_SIZE_LIMIT", "50mb")` → `window.CONFIG.FILE_UPLOAD_SIZE_LIMIT` → `bytes(...)`。
- 当 `FILE_UPLOAD_SIZE_LIMIT` 配置为**空串或 `0`** 时：
  - `getConfigValue` 的 `??` **不会**回退空串（空串非 nullish）；后端 `configService.get(key, '50mb')` 同理（空串已"defined"，不回退）。
  - 前端 `bytes("")` → `null`；`formatBytes(null)`（`lib/utils.tsx:37-53`）进入：`null/1024=0`、`Math.log(0)=-Infinity` → 最终 `toFixed(1)` → **`"0.0 KB"`**。
  - 校验 `file.size > getFileUploadSizeLimit()` 即 `file.size > null(数值0)` → 任何非空文件都"超出" → 报错。
- 后端同源：`static.module.ts:38-39` 把 `environmentService.getFileUploadSizeLimit()`（默认 `"50mb"`，空串不回退）注入 `window.CONFIG`；`attachment.controller.ts:99` 又用其作 multer `fileSize`。PDF 本就被允许（`attachment.constants.ts:16` `.pdf` ∈ `inlineFileExtensions`），故报错**纯属上限被解析为 0/空**，而非类型不允许。

## 修复方案（沿用现有前端，最小修改）
**A. 前端兜底（直接修复报错，必做）**：`apps/client/src/lib/config.ts` 的 `getFileUploadSizeLimit()` 在 `bytes()` 结果为 `null`/`NaN` 或 `<=0` 时回退默认 `50mb`：
```js
export function getFileUploadSizeLimit() {
  const raw = getConfigValue("FILE_UPLOAD_SIZE_LIMIT") ?? "50mb";
  const limit = bytes(raw);
  return limit && limit > 0 ? limit : bytes("50mb");
}
```
- **不改动** `upload-pdf-action.tsx` 等上传 UI（满足"沿用现有前端"）。
- 可选：对 `getFileImportSizeLimit()` 做同样兜底，防止导入侧同源 bug。

**B. 后端兜底（根治，推荐）**：`apps/server/src/integrations/environment/environment.service.ts` 的 `getFileUploadSizeLimit()` 在取值为空串/空白时回退 `"50mb"`，确保注入 `window.CONFIG` 的值恒为非空默认，并让后端 multer 上限正确：
```js
getFileUploadSizeLimit(): string {
  const val = this.configService.get<string>('FILE_UPLOAD_SIZE_LIMIT', '50mb');
  return val && val.trim() !== '' ? val : '50mb';
}
```
- 同样可加 `getFileImportSizeLimit()` 一致性兜底。

## Acceptance Criteria
- 当 `FILE_UPLOAD_SIZE_LIMIT` 未设置 / 为空串 / 为 `0` 时，页面插入 PDF（及图片/音频/视频）**不再**报 "0.0 KB" 错误，校验按 50MB 上限进行。 → 手动（构造 config 为空/0 验证）
- 正常配置（如 `100mb`）仍按配置生效。 → 手动
- 前端 `pnpm --filter client build` / `eslint` 通过；后端 `tsc` / `eslint` 通过。 → test
- （可选）加最小单测验证 `getFileUploadSizeLimit` 空/0/正常三态。 → test

## Context
- 前端：React + Mantine；附件上限走 `window.CONFIG` 注入 + `bytes` 包解析。
- 后端：NestJS；`EnvironmentService.getFileUploadSizeLimit()` 经 `@nestjs/config` 读 env，`static.module` 注入 `window.CONFIG`，`attachment.controller` 用其作 multer `fileSize`。
- `bytes` 包语义：`bytes("50mb")`→52428800；`bytes("")`→`null`；`bytes("0")`→`0`。
- 现有 PDF 上传 UI：`upload-pdf-action.tsx` 调 `handlePdfUpload`（@docmost/editor-ext）+ `uploadFile`；类型校验 `application/pdf`，大小校验 `getFileUploadSizeLimit()`。

## Constraints
- **不重写/不改** 插入 PDF 的前端 UI（`upload-pdf-action.tsx` 及 editor-ext 用法），仅修复上限解析。
- 不改 `formatBytes`（或仅在其内部对 null/NaN 兜底以防他处同样显示——可选）。
- 保持默认 50MB 不变；不引入新配置项。

## Non-goals
- 不修改 PDF 插入的业务流程/样式。
- 不调整后端存储/类型白名单（PDF 本就允许）。
- 不处理"env 实际为空"的产品配置建议，仅做代码兜底。

## 验证结论
根因是 `FILE_UPLOAD_SIZE_LIMIT` 为空/0 时 `bytes()` 解析为 `null`/`0`，导致前端显示"0.0 KB"且任何文件超限；PDF 类型本身被允许。修复集中在 `lib/config.ts` 与 `environment.service.ts` 的兜底回退，最小且不影响现有 UI。
