# Test Report — Task 4: server 附件解析器单测

- Status: PASS
- Tests: 4 new passed / 4 total (jest, `export.service.spec.ts` 新增部分；该文件共 7 测试)
- Command: `cd apps/server && npx jest src/integrations/export/export.service.spec.ts --no-coverage`

## What was verified
沿用既有 mock 样板（`@docmost/editor-ext`、`collaboration.util`、`@sindresorhus/slugify`、`prosemirror/utils`），验证 `exportPageToDocx` 编排与新增 `getAttachment` 解析器逻辑：

1. **图片附件嵌入路径** — `attachment` 节点触发 `getAttachment`，返回字节 + `image/png` mime + 指向 `/api/files/att-img/photo.png` 的 url。
2. **PDF 文件解析** — 返回 `application/pdf` mime 与精确 url `https://test.docmost.dev/api/files/att-pdf/doc.pdf`。
3. **扩展名推断 mime** — 表 `mimeType` 为 null 时，按 `photo.PNG` 扩展名回退为 `image/png`。
4. **解析失败降级** — 无附件行时 `getAttachment` 返回 `undefined`，导出仍成功（不崩溃）。

## Environment notes
服务端 Jest(CJS) 无法加载 ESM 依赖（`docx` 等），故 `@docmost/editor-ext` 被 mock，仅验证编排与解析器自身 DB/存储逻辑；真实 .docx 字节生成由 Task 5 运行时冒烟覆盖。
