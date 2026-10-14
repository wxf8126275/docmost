# Test Report — Task 1: editor-ext 通用附件解析器类型 + 图片附件嵌入

- Status: PASS
- Tests: 8 passed / 8 total (vitest, `attachment-helpers.spec.ts`)
- Command: `cd packages/editor-ext && npx vitest run src/lib/prosemirror-docx/attachment-helpers.spec.ts`

## What was built
- `types.ts`: 新增 `DocxAttachmentData { data, name, mimeType?, url? }` 与 `DocxAttachmentResolver`。
- `serializer.ts`: `OptionsAsync` 增加可选 `getAttachment`。
- `attachment-helpers.ts` (new): 纯函数 `parseAttachmentRef(node)`（从 `src`/`attachmentId` 提取 id）、`isImageMime(mime)`、`imageTypeFromMime(mime)`。无 docx 依赖，便于单测。
- `schema.ts`: `pageNodeToDocxBuffer(doc, getImageBuffer, getAttachment?)`；`attachment`/`pdf` 节点由 `renderFileLine` 改为 `renderAttachment`（实现见 Task 2）。
- `index.ts`: 顶层与 prosemirror-docx 子入口均转发新类型。

## Test cases (behavior)
1. `parseAttachmentRef` 从 `/api/files/<id>/<name>` 提取 id 与 name。
2. `parseAttachmentRef` 从裸 `/files/<id>` 提取 id。
3. `parseAttachmentRef` 无 src 时回退 `attachmentId`。
4. `parseAttachmentRef` 无属性返回空字段。
5. `isImageMime('image/png')`/`IMAGE/JPEG` 为 true；`application/pdf`/undefined 为 false。
6. `imageTypeFromMime('image/jpeg')`→jpg、`image/png`→png、`image/gif`→gif。
7. `imageTypeFromMime('image/webp')`→png；undefined/未知→png。
