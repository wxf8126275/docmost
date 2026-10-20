# Plan: Drive File Icons & Views（网盘文件类型图标与双视图）

Generated: 2026-10-20T09:10:00Z
Requirement: ../requirements/2026-10-20-drive-file-icons-views.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | drive-file-icon-component | — | low | no |
| 2 | drive-thumbnail-view | 1 | medium | no |
| 3 | drive-list-view-columns | 1, 2 | medium | no |

## Dependency Graph

Task 1 → Task 2 → Task 3

（串行：Task 2/3 都要改 `drive-browser.tsx` 的接线；Task 1 的图标组件是两者公共依赖。）

## Key Decisions

- **`DriveFileIcon` 单一组件承载"文件如何可视化"**：图片渲染 `<img src={downloadFileUrl(spaceId, file.id)}>`（复用 preview-modal 的 URL 模式），`onError` 回退类型图标；其余按 ext/MIME 映射 tabler 图标 + 品牌色（Word `#2B579A`/Excel `#217346`/PPT `#D24726`/PDF `#E74C3C`）。类型判定抽为纯函数 `getDriveFileType(file)` 便于单测。
- **两个视图各自独立组件**（`drive-grid-view.tsx` / `drive-list-view.tsx`），`drive-browser.tsx` 只保留共享状态（分类/搜索/弹窗）与接线——避免 browser 超过 400 行规范，且每个视图可独立测试。共享 props/handlers 类型放入 `features/drive/types/drive.types.ts`（`DriveItemHandlers` / `DriveViewBaseProps`）。
- **列表三列**（微云式）：`Name`（key 已有）/ `Last modified` / `Size`（两者需补 12 语言，mechanical，沿用 cloud-drive Task 9 模式）；时间用 locale 格式化，大小用 `@/lib` 的 `formatBytes`；文件夹大小显示 "—"。
- 视图切换沿用 DrivePage 现有 grid/list SegmentedControl，不新增 UI。

## Task Details

### Task 1: drive-file-icon-component
- **Status**: ✅ DONE（2026-10-20 sean run，8 tests；report: docs/test-reports/2026-10-20-drive-file-icons-views/task-1-drive-file-icon-component.md）。`getDriveFileType` 为导出纯函数（ext 优先/MIME 兜底）；图片缩略图带 `loading="lazy"`；`data-file-type` 为测试钩子。
- **Creates**:
  - `apps/client/src/features/drive/components/drive-file-icon.tsx` — `getDriveFileType(file)`（纯函数：ext 优先、mime 兜底 → `word|excel|powerpoint|pdf|image|video|audio|archive|code|text|unknown`）+ `DriveFileIcon({ file, spaceId, size })`（图片 → img + onError 回退；其余 → 类型图标 + 品牌色；容器带 `data-file-type` 测试钩子）
- **Artifacts**: 无
- **Modifies**: 无（纯新增，browser 暂不动）
- **Test**: `apps/client/src/features/drive/components/drive-file-icon.spec.tsx`
- **Steps (TDD)**:
  1. RED：spec 断言映射（.docx→word、.xlsx→excel、.pptx→powerpoint、.pdf→pdf、.zip→archive、.js→code、.md→text、.mp3→audio、.mp4→video、.xyz→unknown）；图片渲染 `<img>` 且 src 含 `/api/spaces/sp1/drive/files/file1/download`；img onError 后回退图标。组件不存在 → RED。
  2. GREEN：实现组件（img 用本地 state 记录加载失败）。
  3. 回归：drive 既有 spec 不受影响。
- **Acceptance**: 全部映射用例 + 图片缩略图 URL + 回退行为通过。

### Task 2: drive-thumbnail-view
- **Status**: ✅ DONE（2026-10-20 sean run，7 tests；report: docs/test-reports/2026-10-20-drive-file-icons-views/task-2-drive-thumbnail-view.md）。`DriveItemHandlers`/`DriveViewBaseProps` 落于 drive.types.ts；既有 browser spec 10 用例零修改通过（行为等价）；browser 370→343 行。
- **Creates**:
  - `apps/client/src/features/drive/components/drive-grid-view.tsx` — 缩略图磁贴视图：`SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}`；文件夹磁贴（IconFolder + 名称，点击进入）；文件磁贴（`DriveFileIcon size={48}` 居中 + 名称 lineClamp + `FileRowActions`）
- **Artifacts**: 无
- **Modifies**:
  - `apps/client/src/features/drive/types/drive.types.ts`（新增 `DriveItemHandlers` / `DriveViewBaseProps` 共享类型）
  - `apps/client/src/features/drive/components/drive-browser.tsx`（内联 grid markup 抽取为 `<DriveGridView>`；handlers 在 browser 组装一次）
- **Test**: `apps/client/src/features/drive/components/drive-grid-view.spec.tsx`（新建）+ `drive-browser.spec.tsx`（更新：grid 视图图片断言改 img/word 徽标）
- **Steps (TDD)**:
  1. RED：grid-view spec——图片磁贴渲染 img（URL）、docx 渲染 `data-file-type="word"`、文件夹点击回调、删除/分享/下载/重命名回调透传；browser spec 中"renders folders and files"等同步更新为新结构。组件不存在 → RED。
  2. GREEN：实现 + browser 接线。
  3. 回归：drive 全套件。
- **Acceptance**: 缩略图视图按需求渲染；browser 现有行为（打开文件夹/删除/重命名/预览/分享）不回归。

### Task 3: drive-list-view-columns
- **Status**: ✅ DONE（2026-10-20 sean run，10 tests；report: docs/test-reports/2026-10-20-drive-file-icons-views/task-3-drive-list-view-columns.md）。`Size`/`Last modified` 已补 12 语言（spec 断言锁定）；browser 完成抽取后 370→278 行。
- **Creates**:
  - `apps/client/src/features/drive/components/drive-list-view.tsx` — 微云式列表：Mantine `Table` 表头（`t("Name")` / `t("Last modified")` / `t("Size")`）+ 行（图标+名称 / `new Date(updatedAt).toLocaleString()` / `formatBytes(fileSize)`，文件夹 "—"）/ 行尾 `FileRowActions`
- **Artifacts**: 无
- **Modifies**:
  - `apps/client/src/features/drive/components/drive-browser.tsx`（内联 list markup 抽取为 `<DriveListView>`）
  - `apps/client/public/locales/{12 语言}/translation.json`（新增 `Size`、`Last modified`）
- **Test**: `apps/client/src/features/drive/components/drive-list-view.spec.tsx`（新建）+ `drive-browser.spec.tsx`（更新）
- **Steps (TDD)**:
  1. RED：list-view spec——表头三列渲染；文件行显示格式化时间与 `formatBytes` 大小；文件夹大小 "—"；删除等回调透传。i18n：断言 12 语言含 `Size`/`Last modified`（沿用 cloud-drive i18n.spec 的 glob 手法，落 `drive-list-view.spec.tsx` 或复用 drive/i18n.spec.tsx 追加）。组件/key 不存在 → RED。
  2. GREEN：实现 + 12 语言补 key（既有翻译保留）。
  3. 回归：drive 全套件 + 客户端全量 + tsc。
- **Acceptance**: 列表三列数据正确；两种视图数据一致；i18n 12 语言齐备。

## Risks / Notes

- `drive-browser.tsx` 现约 380 行：本计划通过抽取两个视图组件使其**下降**（共享状态 + 弹窗保留），顺势缓解 400 行规范压力。
- 图片缩略图依赖下载端点鉴权（同源 cookie）——与 preview-modal 现有行为一致，无新增安全面。
- 大量图片同时加载缩略图可能有性能影响（N+1 请求）；本计划不做懒加载/虚拟化（非目标），仅在报告中记录。
- 视频仍用类型图标（不生成 poster）——需求已明确仅照片。

## Suggested Commit (after run)

```
feat(client): drive file-type icons and thumbnail/list views

- DriveFileIcon maps ext/mime to tabler icons with brand colors; images
  render real thumbnails (download URL) with icon fallback
- extract DriveGridView (thumbnail tiles) and DriveListView (name /
  last-modified / size columns) from DriveBrowser
- add Size + Last modified i18n keys across 12 locales

Tests: N passed
Regression: client vitest + tsc green
```
