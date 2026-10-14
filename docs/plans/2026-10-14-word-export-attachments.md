# Plan: Word Export — Embedded Attachments

Generated: 2026-10-14T05:30:00Z
Requirement: ../requirements/2026-10-14-word-export-attachments.md

## 调查结论（plan 阶段已验证）

- **根因**：`packages/editor-ext/src/lib/prosemirror-docx/schema.ts` 中 `attachment` / `pdf` / `video` / `audio` 节点都走 `renderFileLine`（仅输出名称文本）。图片节点走 `renderImage` → `getImageBuffer` 解析器，已嵌入字节。
- **`docx@9.7.1` 能力边界**：`node_modules/docx/dist/index.d.ts` 中 `ParagraphChild` 仅支持文本/图片(`ImageRun`)/超链接(`ExternalHyperlink`)，**无 `EmbeddedFile` / OLE 原生嵌入**。因此：
  - 图片类附件 → 直接以 `ImageRun` 嵌入（确定可行，主修复点）。
  - 非图片文件（PDF/docx/zip 等）→ 无法像图片一样原生嵌入；采用 **OLE 嵌入对象（自写最小 `XmlComponent`）+ 失败回退为指向附件下载 URL 的超链接**，运行时验证（见 Task 5）。
- **解析器现状**：服务端 `export.service.ts` 的 `exportPageToDocx` 已通过 `resolveDocxImage(src, page)` 从 `attachments` 表取 `filePath` 并经 `StorageService.read` 读字节，按 `/files/<id>` 提取 id。`attachments` 表含 `mimeType`/`fileExt`/`fileName`/`filePath`/`type`（见 `entity.types.ts`）。
- **测试约束（沿用 `word-export-error` 任务1）**：`docx`/`image-dimensions`/`@tiptap/*` 为 ESM-only，Jest(CJS) 无法加载 → 服务端测试 **mock `@docmost/editor-ext` 等模块**，验证编排与解析器自身逻辑；真实 `.docx` 字节生成留待运行时冒烟。

## 目标

页面导出为 Word 时，附件内容随文档一并导出：
1. 图片类附件（含作为 `attachment`/`pdf` 节点挂载的图片文件）→ 嵌入为图片。
2. 非图片文件 → 尽力嵌入为 OLE 对象，失败时回退为可点击的附件链接 + 文件名（仍携带引用）。
3. 解析失败/超大/不支持 → 保持名称占位，不中断导出（现有优雅降级不变）。

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | editor-ext: 通用附件解析器类型 + 图片附件嵌入 | — | medium | no |
| 2 | editor-ext: 非图片文件嵌入（OLE + 超链接回退） | 1 | high | no |
| 3 | server: `getAttachment` 解析器实现与接线 | 1 | medium | yes |
| 4 | server: 解析器单测（mock ESM） | 3 | medium | no |
| 5 | verify: 运行时冒烟（图片 + 文件，真实 .docx 校验） | 2, 3 | medium | no |

## Dependency Graph

```
Task 1 ──→ Task 2
Task 1 ──→ Task 3 ──→ Task 4
Task 2 ──→ Task 5
Task 3 ──→ Task 5
```

Wave 1: [1]
Wave 2: [2, 3]（3 与 1 同包但 2 也改 schema.ts，故 2 串行于 1；3 跨包可并行）
Wave 3: [4, 5]（4 依赖 3，5 依赖 2&3，均就绪后可并行）

## Task Details

### Task 1: editor-ext 通用附件解析器类型 + 图片附件嵌入
- **Creates**:
  - `packages/editor-ext/src/lib/prosemirror-docx/attachment.ts`（纯函数 + 渲染器）
- **Modifies**:
  - `packages/editor-ext/src/lib/prosemirror-docx/types.ts`（新增 `AttachmentData`、`DocxAttachmentResolver`）
  - `packages/editor-ext/src/lib/prosemirror-docx/serializer.ts`（`OptionsAsync` 增加 `getAttachment?: DocxAttachmentResolver`）
  - `packages/editor-ext/src/lib/prosemirror-docx/schema.ts`（`pageNodeToDocxBuffer` 接收 `getAttachment`；`attachment`/`pdf` 改挂 `renderAttachment`；提取纯函数 `parseAttachmentRef(node)`、`isImageMime(mime)`）
- **Test**: `packages/editor-ext/src/lib/prosemirror-docx/attachment.spec.ts`（vitest，纯函数单测）
- **Acceptance**:
  - `parseAttachmentRef` 能从 `src`(`/api/files/<id>/<name>`、`./files/<id>`)、`attachmentId`、`name` 解析出 `{ id, name }`。
  - `isImageMime('image/png')===true`，`isImageMime('application/pdf')===false`。
  - 渲染器：当 `getAttachment` 返回图片字节时走 `state.image`；未提供解析器时回退到名称行（保持现有行为）。
- **steps**: red（纯函数单测先失败）→ green（实现）→ 接线 schema。

### Task 2: editor-ext 非图片文件嵌入（OLE + 超链接回退）
- **Modifies**:
  - `packages/editor-ext/src/lib/prosemirror-docx/attachment.ts`（新增 OLE 嵌入 `XmlComponent` 与超链接回退分支）
  - `packages/editor-ext/src/lib/prosemirror-docx/schema.ts`（`renderAttachment` 接 OLE 分支）
- **Test**: `packages/editor-ext/src/lib/prosemirror-docx/attachment.spec.ts`（扩展；OLE 描述符构建 + 回退决策单测）
- **Acceptance**:
  - 非图片附件：`getAttachment` 返回字节时，构建 OLE 嵌入对象描述符（含关系/二进制部件占位）；若 docx 运行时不支持 → 产出指向附件 URL 的 `ExternalHyperlink` + 文件名文本。
  - 纯函数 `buildEmbedDescriptor({ data, name, mimeType })` 返回 `{ kind: 'ole' | 'hyperlink', ... }`，由单测覆盖两种分支。
  - 不引入 `any`；OLE 组件失败时上层 try/catch 降级为名称行，不中断导出。
- **复杂度说明**: OLE 为 `docx` 库未暴露能力，需自写 `XmlComponent`；若实现期确认不可行，严格按需求回退到超链接方案，并在 handoff 标注。

### Task 3: server `getAttachment` 解析器实现与接线
- **Modifies**:
  - `apps/server/src/integrations/export/export.service.ts`
    - 新增 `private async resolveDocxAttachment(src, page): Promise<{ data: Uint8Array; name: string; mimeType: string } | undefined>`
      - 复用 `resolveDocxImage` 的 id 提取正则 `/files/([^/?]+)/`；查 `attachments` 表取 `filePath`/`fileName`/`mimeType`（按 `spaceId` 限定）。
      - 经 `StorageService.read(filePath)` 读字节；`mimeType` 为空时用 `fileExt` 推断。
      - 失败返回 `undefined`（优雅降级）。
    - 在 `exportPageToDocx` 中构造 `getAttachment: DocxAttachmentResolver` 传入 `pageNodeToDocxBuffer`。
- **files_create**: 无
- **Test**: 由 Task 4 覆盖
- **Acceptance**: 图片附件字节被解析并交给渲染器；PDF/文件附件解析出 `mimeType` 与字节；越权/缺失返回 `undefined` 不抛异常。

### Task 4: server 解析器单测（mock ESM）
- **Modifies**:
  - `apps/server/src/integrations/export/export.service.spec.ts`
- **Test**: 同文件（Jest；mock `@docmost/editor-ext`、`collaboration.util`、`@sindresorhus/slugify`、`prosemirror/utils`，沿用现有 mock 样板）
- **Acceptance（行为，非实现）**:
  - 图片附件节点 → `getAttachment` 返回字节（断言 `pageNodeToDocxBuffer` 被传入解析器且字节被读取）。
  - PDF/文件附件节点 → 解析出 `mimeType` 与 `filePath` 读取。
  - 解析失败（无 `filePath`/读取异常）→ 返回 `undefined`，导出仍成功（不崩溃）。
  - 越权（attachment 跨 `spaceId`）→ 返回 `undefined`。

### Task 5: verify 运行时冒烟
- **Creates**:
  - `apps/server/src/integrations/export/docx-attachment.smoke.ts`（`tsx` 脚本：构造含图片附件 + PDF 附件的页面 ProseMirror JSON，调用 `exportPageToDocx`，写盘 `.docx`）
- **Depends On**: 2, 3
- **Test**: null（运行时人工/脚本校验，非 Jest）
- **Acceptance**:
  - 真实 `.docx` 经 `file -` / 解压校验：含图片 media 部件；非图片附件以 OLE 对象或超链接形式存在。
  - 记录 docx ESM 限制（同 `word-export-error` F001）：Jest 下仅验证编排，真实字节由本冒烟证明。
  - 若 OLE 不可行，确认回退超链接方案生效并写入 handoff。

## 风险与回退
- **R1（OLE 可行性）**：`docx@9.7.1` 无原生文件嵌入。Task 2 实施时若确认 OLE 不可行，严格回退为超链接 + 文件名（仍满足"携带附件引用"），并在 handoff/verify 明确标注，不阻塞交付。
- **R2（ESM 测试）**：真实 `.docx` 字节无法在 Jest 校验，依赖 Task 5 运行时冒烟 + 既有上游库保证。
- **R3（权限/体积）**：超大附件经 `StorageService` 流式读取；越界/失败均 `undefined` 降级，不影响整体导出。

## 不在范围内
- 不改 docx 导出接口契约（`export.controller.ts` 已存在）。
- 不处理 HTML/Markdown zip 导出（其 `zipAttachments` 已正常打包附件）。
- 不改 `video`/`audio` 节点的"名称仅占位"行为（二进制媒体在 docx 中无合理内嵌表示；如需可后续追加超链接）。
