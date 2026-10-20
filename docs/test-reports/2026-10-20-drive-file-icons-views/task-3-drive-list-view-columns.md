# Task 3 — drive-list-view-columns (drive-file-icons-views)

- **Requirement**: `docs/requirements/2026-10-20-drive-file-icons-views.md`
- **Plan**: `docs/plans/2026-10-20-drive-file-icons-views.md` (Task 3)
- **Status**: done · evidence: exercised
- **Tests**: 10 passed / 10 total · fixes: 0
- **Date**: 2026-10-20

## What changed

微云式列表视图落地，i18n 补齐，browser 完成"瘦身"。

- **Created** `apps/client/src/features/drive/components/drive-list-view.tsx`
  — Mantine `Table` 四列：`Name`（`DriveFileIcon` 类型图标/图片缩略图 + 名称，可点预览/进入）
  / `Last modified`（`toLocaleString()`，无效时间显示空）/ `Size`（`formatBytes`，
  文件为 null 或文件夹显示 "—"）/ 操作列（文件 `FileRowActions`，文件夹重命名+删除）。
- **Modified** `drive-browser.tsx` — 内联 list markup（64 行）抽取为 `<DriveListView>`；
  清理闲置导入。**343 → 278 行**（任务开始时约 370 行）。
- **Modified** 12 × `translation.json` — 新增 `Size`、`Last modified`（24 处，既有翻译保留）。

## Tests (10) — `drive-list-view.spec.tsx`

| # | Case | Result |
|---|------|--------|
| 1 | 三列表头渲染（Name / Last modified / Size） | PASS |
| 2 | 文件夹与文件行渲染 | PASS |
| 3 | 文件行显示格式化的上次修改时间 | PASS |
| 4 | 文件行显示 formatBytes 大小；文件夹显示 "—" | PASS |
| 5 | 名称单元格渲染图片缩略图（space 作用域 URL） | PASS |
| 6 | 点击文件夹行 → onFolderOpen | PASS |
| 7 | 点击文件行 → onFilePreview | PASS |
| 8 | 文件夹操作透传且不触发打开 | PASS |
| 9 | 文件操作（删除/下载）透传 | PASS |
| 10 | 12 语言均含 Size + Last modified | PASS |

RED 确认：组件缺失（导入失败）；组件就位后 i18n 用例 RED（12 语言缺 key）→ 填充后 GREEN。
（RED 期一处自撰修正：`import.meta.glob` 相对路径少一级。）

## Regression

- drive 10 套件 / **59 测试**全绿（+10）；客户端全量 **27 文件 / 184 测试**；`tsc --noEmit` 干净。

## Files

- Modified: `drive-browser.tsx`、12 × `public/locales/*/translation.json`
- Created: `drive-list-view.tsx`、`drive-list-view.spec.tsx`

## Artifacts

无（纯前端；翻译文件为代码资产，已登记于产物目录）。
