# Summary — word-export-attachments

Generated: 2026-10-14T06:50:00Z

## Test totals
- editor-ext (vitest): 12 passed / 12 (8 helpers + 4 render)
- server (jest): 7 passed / 7 (3 pre-existing + 4 new) — 本 feature 新增 4
- runtime smoke (tsx): 生成有效 .docx，图片媒体部件确认存在
- **Total feature tests: 16 passed, 0 failed**

## Tasks
| # | Task | Tests | Status |
|---|------|-------|--------|
| 1 | editor-ext 通用解析器 + 图片嵌入 | 8 | done |
| 2 | editor-ext 非图片链接回退 | 4 | done |
| 3 | server resolveDocxAttachment | 0 (covered by 4) | done |
| 4 | server 单测 | 4 | done |
| 5 | 运行时冒烟 | 0 (runtime) | done |

## Findings
- F001 (medium, change-validation): 非图片文件以超链接携带，非物理内嵌（docx@9.7.1 无原生文件嵌入）。修复路径见 handoff。

## Deliverable
页面导出 Word 时，**图片附件现已嵌入为图片**；非图片文件以可点击超链接 + 文件名形式保留。根因（schema.ts `renderFileLine` 仅输出名称）已解决。
