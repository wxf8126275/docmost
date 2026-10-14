# Test Report — Task 2: editor-ext 非图片文件嵌入（链接回退）

- Status: PASS
- Tests: 4 passed / 4 total (vitest, `attachment.spec.ts`)
- Command: `cd packages/editor-ext && npx vitest run src/lib/prosemirror-docx/attachment.spec.ts`

## What was built
- `attachment.ts` (new): `embedImageFromData(state, data, mimeType)` 用 `imageDimensionsFromData` 校验并用 `ImageRun` 嵌入图片字节，返回是否成功；`renderFileEmbed(state, node, attachment?)` 在非图片时生成 `ExternalHyperlink`（带 `url`）或名称占位；`renderAttachment` 编排：图片→`embedImageFromData`，文件→`renderFileEmbed`，无解析器/失败→名称占位（不中断导出）。

## Test cases (behavior)
1. `embedImageFromData` 对有效 PNG 返回 true 且 `current[0]` 为 `ImageRun`。
2. `embedImageFromData` 对无法解码字节返回 false（`current` 为空，触发回退）。
3. `renderFileEmbed` 有 `url` 时生成 `ExternalHyperlink`。
4. `renderFileEmbed` 无 `url` 时生成名称 `TextRun`。

## 关于 OLE
plan 标注的 OLE 原生嵌入经确认在 `docx@9.7.1` 不可行（无 `EmbeddedFile`/`OLE` 类）。按 plan 回退方案，非图片文件以**可点击超链接 + 文件名**形式携带，运行时冒烟（Task 5）验证了该路径可生成有效 .docx。OLE 增强列为可选后续（见 F001）。
