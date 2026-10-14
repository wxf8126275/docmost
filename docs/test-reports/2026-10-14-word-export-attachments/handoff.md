# Handoff: Word Export — Embedded Attachments

## Status
- Overall: **DONE**
- Tasks completed: 5 / 5
- Last updated: 2026-10-14T06:50:00Z

## What Was Done
| Task | Status | Summary |
|------|--------|---------|
| 1 editor-ext-attachment-resolver | done | 新增 `DocxAttachmentResolver`/`DocxAttachmentData` 类型；`OptionsAsync` 增加可选 `getAttachment`；`pageNodeToDocxBuffer` 接收并透传；`attachment`/`pdf` 节点改为 `renderAttachment`；纯函数 `parseAttachmentRef`/`isImageMime`/`imageTypeFromMime` 提取到 `attachment-helpers.ts` |
| 2 editor-ext-file-embed | done | 实现 `embedImageFromData`（图片→`ImageRun` 嵌入）与 `renderFileEmbed`（非图片→`ExternalHyperlink` 指向附件 URL + 文件名，或名称占位回退） |
| 3 server-attachment-resolver | done | `ExportService.resolveDocxAttachment(src, page)` 查 `attachments` 表（按 `spaceId`）+ `StorageService.read` 读字节，返回 `{data,name,mimeType,url}`；`exportPageToDocx` 构造 `getAttachment` 传给 `pageNodeToDocxBuffer`；`mimeFromExt` 在 `mimeType` 为空时按扩展名推断 |
| 4 server-attachment-tests | done | `export.service.spec.ts` 新增 4 个行为测试（图片嵌入路径 / PDF 解析+URL / 扩展名推断 mime / 解析失败降级） |
| 5 verify-runtime-smoke | done | `docx-attachment.smoke.ts` 用真实 `@docmost/editor-ext` 生成 `.docx`，解压确认 `word/media/*.png` 真实图片嵌入；非图片走超链接 |

## File Inventory (verified on disk)

### Created
- `packages/editor-ext/src/lib/prosemirror-docx/attachment-helpers.ts` — 纯函数（无 docx 依赖）
- `packages/editor-ext/src/lib/prosemirror-docx/attachment.ts` — 渲染逻辑
- `packages/editor-ext/src/lib/prosemirror-docx/attachment-helpers.spec.ts` — 8 测试
- `packages/editor-ext/src/lib/prosemirror-docx/attachment.spec.ts` — 4 测试
- `packages/editor-ext/vitest.config.ts` — 最小 vitest 配置
- `apps/server/src/integrations/export/docx-attachment.smoke.ts` — 运行时冒烟

### Modified
- `packages/editor-ext/src/lib/prosemirror-docx/types.ts` — `DocxAttachmentData` / `DocxAttachmentResolver`
- `packages/editor-ext/src/lib/prosemirror-docx/serializer.ts` — `OptionsAsync.getAttachment`
- `packages/editor-ext/src/lib/prosemirror-docx/schema.ts` — `pageNodeToDocxBuffer` 签名 + `attachment`/`pdf` 注册
- `packages/editor-ext/src/lib/prosemirror-docx/index.ts` — 导出新类型
- `packages/editor-ext/src/index.ts` — 顶层转发新类型
- `packages/editor-ext/tsconfig.json` — `exclude` vitest 配置与 spec（保持 dist 布局）
- `apps/server/src/integrations/export/export.service.ts` — `resolveDocxAttachment` + 接线 + `mimeFromExt`
- `apps/server/src/integrations/export/export.service.spec.ts` — +4 测试

### Tests
- `packages/editor-ext`：`attachment-helpers.spec.ts` (8) + `attachment.spec.ts` (4) — 运行 `npx vitest run`
- `apps/server`：`export.service.spec.ts` (7 total, +4 新增) — `npx jest src/integrations/export/export.service.spec.ts --no-coverage`

## Current Blocker (if any)
无。唯一已知限制见 F001：非图片文件以超链接形式携带（docx 库无原生文件嵌入）。

## Next Steps (for whoever takes over)
1. 若需"非图片附件物理内嵌于 .docx"，实现 OLE 嵌入 `XmlComponent` 或改用 HTML/markdown zip 导出（其 `zipAttachments` 已打包文件）。
2. 运行真实 `/api/docx-export` 验证线上环境（带 DB + 存储）的图片/PDF 导出。
3. `pnpm --filter @docmost/editor-ext build` 已在本地执行；合并前确认 CI 构建一致。

## Known Risks / TODOs
- F001（medium）：非图片文件为超链接，非离线内嵌。
- editor-ext 新增 `vitest.config.ts` 与 spec 文件；若该包后续接入统一测试流水线，确认 glob 不冲突。

## How to Resume
```bash
cd /home/wuxiufeng/repos/docmost
sean status word-export-attachments          # 查看状态
npx vitest run -p packages/editor-ext          # 编辑器单测
npx jest src/integrations/export/export.service.spec.ts --no-coverage   # 服务端单测
npx tsx apps/server/src/integrations/export/docx-attachment.smoke.ts    # 运行时冒烟
```
