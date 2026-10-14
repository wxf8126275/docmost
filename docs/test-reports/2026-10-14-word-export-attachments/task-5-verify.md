# Test Report — Task 5: verify 运行时冒烟

- Status: PASS
- Tests: 0 (运行时脚本，非 Jest) — 端到端生成并解压校验真实 .docx
- Command: `npx tsx apps/server/src/integrations/export/docx-attachment.smoke.ts`

## 运行结果
- 生成 `/tmp/word-export-attachments-smoke.docx`，9439 字节。
- `is zip container: true`（首字节 `PK`）—— 有效 OOXML/.docx。
- 解压校验：`word/media/942e1e03f5d868bdda5e4ac2804b51043b1fd1cb.png` 存在 —— **图片附件作为真实图片嵌入文档内部**。
- 非图片 PDF 附件经 `renderFileEmbed` 生成 `ExternalHyperlink`（URL + 文件名），文档正常生成无报错。

## 结论
用户报告的"docx 里只有附件名称、没有内容"问题已修复：图片类附件现在随文档嵌入为图片（运行时验证）；非图片文件以可点击超链接 + 文件名形式携带（docx 库无原生文件嵌入，见 F001）。

## 说明
脚本用最小 prosemirror schema 构造 Node，调用**真实** `@docmost/editor-ext`（ESM docx/image-dimensions），因 Jest(CJS) 无法加载，故以 `tsx` 运行时验证。完整线上环境（带 DB + 存储）验证可运行真实 `/api/docx-export`。
