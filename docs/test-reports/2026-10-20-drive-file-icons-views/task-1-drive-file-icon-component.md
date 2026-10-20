# Task 1 — drive-file-icon-component (drive-file-icons-views)

- **Requirement**: `docs/requirements/2026-10-20-drive-file-icons-views.md`
- **Plan**: `docs/plans/2026-10-20-drive-file-icons-views.md` (Task 1)
- **Status**: done · evidence: exercised
- **Tests**: 8 passed / 8 total · fixes: 0
- **Date**: 2026-10-20

## What changed

新建"文件如何可视化"的单一组件，为两个视图（Task 2/3）提供公共依赖。

- **Created** `apps/client/src/features/drive/components/drive-file-icon.tsx`
  - `getDriveFileType(file)`（导出纯函数）：扩展名优先（大小写不敏感）、MIME 兜底
    → `word | excel | powerpoint | pdf | image | video | audio | archive | code | text | unknown`；
  - `DriveFileIcon({ file, spaceId, size })`：
    - 图片 → `<img src={downloadFileUrl(spaceId, file.id)}>`（`loading="lazy"` 缓解 N+1、
      `objectFit: cover`），`onError` → 回退 photo 图标；
    - 其余 → tabler 类型图标 + 品牌色（Word `#2B579A`/Excel `#217346`/PPT `#D24726`/
      PDF `#E74C3C`/压缩包 `#f08c00`/代码·文本 `#495057`/音频 `#0ca678`/视频 `#7048e8`/
      未知 `#868e96`）；
    - 容器带 `data-file-type` 稳定测试钩子。

## Tests (8) — `drive-file-icon.spec.tsx`

| # | Case | Result |
|---|------|--------|
| 1 | office 扩展名映射（.docx/.DOC/.xlsx/.csv/.pptx/.pdf） | PASS |
| 2 | 压缩包/代码/文本/音频/视频/图片映射 | PASS |
| 3 | MIME 兜底 → unknown | PASS |
| 4 | 图片渲染真实缩略图（URL 含 `/api/spaces/sp1/drive/files/img1/download`） | PASS |
| 5 | .docx → word 徽标且无 img | PASS |
| 6 | .xlsx → excel 徽标 | PASS |
| 7 | 缩略图加载失败 → 回退 photo 图标（`data-file-type` 仍为 image） | PASS |
| 8 | 未知类型 → 通用图标 | PASS |

RED 确认：`Failed to resolve import "./drive-file-icon"`（组件不存在）。

## Regression

- drive 8 套件 / **42 测试**全绿（+8）；`tsc --noEmit` 干净。

## Files

- Created: `drive-file-icon.tsx`、`drive-file-icon.spec.tsx`

## Artifacts

无。
