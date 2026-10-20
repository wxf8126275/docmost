# Drive File Icons & Views（网盘文件类型图标与双视图）

## Problem
网盘文件列表里所有文件都用同一个通用图标（`IconFile`），照片也无法直接看到缩略图；现有 grid/list 两种视图都只是简单的名称排布，无法像腾讯微云那样按文件类型直观区分、按缩略图浏览。用户参考微云截图提出：**沿用现有样式体系**，但按文件类型显示对应图标（Word 用 Word 图标、照片显示缩略图等），并提供"缩略图方式"和"列表方式"两种展示。

## Behaviors
- 新增 `DriveFileIcon` 组件：按扩展名/MIME 映射文件类型图标与品牌色
  （Word 蓝 `#2B579A` / Excel 绿 `#217346` / PPT 橙 `#D24726` / PDF 红 /
  压缩包 / 代码 / 文本 / 音频 / 视频），未知类型用通用文件图标。
- 图片文件（image/*）在两种视图下均渲染真实缩略图
  （`<img src={downloadFileUrl(spaceId, fileId)}>`，复用 preview-modal 的 URL 模式）；
  图片加载失败回退为图片类型图标。
- **缩略图视图**（grid，磁贴式）：图片显示缩略图、其他文件显示大号类型图标，
  名称在图标下方；悬停/行内提供操作（下载/重命名/分享/删除，复用 `FileRowActions`）。
- **列表视图**（list，微云式三列）：`图标 + 名称` / `上次修改时间` / `大小`；
  行尾操作。文件夹大小显示 "—"。
- 视图切换沿用 DrivePage 顶部现有 grid/list `SegmentedControl`；切换后当前
  分类（`?category=`）、搜索词、所在文件夹状态保持。
- 文件夹在两种视图下保持现有文件夹图标与点击进入行为。

## Acceptance Criteria
- 缩略图视图：图片文件渲染 `<img>`（src 含 `/api/spaces/:spaceId/drive/files/:id/download`）；
  `.docx` 渲染 Word 图标、`.xlsx` 渲染 Excel 图标（可断言图标容器/aria） → verifiable by test
- 列表视图：每行展示"上次修改时间"与"大小"两列；类型图标按扩展名区分 → verifiable by test
- 两种视图渲染同一份数据（分类过滤/搜索在切换后保持一致） → verifiable by test
- 客户端全量 `vitest` + `tsc --noEmit` 通过 → verifiable by test

## Artifacts (expected)

- **Database**: 无
- **Batch**: 无
- **Config**: 无

> 纯前端 UI 调整。若与实际意图不符请指出。

## Context
- Tech stack: React 19 + Mantine + jotai + TanStack Query + react-router；测试 vitest + @testing-library/react
- Related features: `cloud-drive`（DONE，含 B001 修复）、`drive-category-sidebar`（DONE——分类导航在侧栏、`?category=` URL 契约、双视图骨架已在 DriveBrowser）
- 关键文件: `apps/client/src/features/drive/components/drive-browser.tsx`（双视图渲染主体）、`drive-page.tsx`（视图切换）、`preview-modal.tsx`（图片 URL 模式）、`services/drive-service.ts`（`downloadFileUrl`）、`components/file-row-actions.tsx`、`@/lib`（`formatBytes`）
- tabler-icons 3.40 已含所需图标：`IconFileWord`/`IconFileExcel`/`IconFileTypePdf`/`IconFileTypePpt`/`IconFileZip`/`IconFileCode`/`IconFileText`/`IconFileMusic`/`IconFileUnknown`/`IconPhoto`/`IconVideo`
- Constraints: 沿用现有 Mantine 样式与配色（不做微云像素级复刻）；服务端零改动；新列头文案（"上次修改时间"/"大小"）按 cloud-drive Task 9 模式补 12 语言
- Non-goals: 不做微云侧栏其他项（笔记/共享组/保险箱/收藏夹/分享链接/回收站/存储空间管理页）；不做列排序、多选/批量操作、拖拽整理；不生成视频缩略图（仅照片）；不改分类体系（侧栏分类已交付）
