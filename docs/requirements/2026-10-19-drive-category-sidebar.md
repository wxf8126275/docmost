# Drive Category Sidebar（网盘空间：分类菜单入驻左侧栏）

## Problem
网盘空间（`space.type === 'drive'`）的左侧空间栏仍渲染页面专属内容——"Pages"区块、`SpaceTree` 页面树、"New page" 按钮及模板/导入/导出等菜单项；而网盘分类菜单（最近/全部/图片/文档/视频/音乐）目前蜷缩在内容区 `DriveBrowser` 内的一窄列。信息架构错位：网盘空间没有页面，分类菜单理应占据页面树的位置（参考腾讯微云的左侧分类导航）。

## Behaviors
- 当 `space.type === 'drive'` 时，`SpaceSidebar` 的 "Pages" 区段改为渲染网盘分类菜单：`最近`、`全部`、`图片`、`文档`、`视频`、`音乐`。
- 分类菜单与内容区联动：侧栏当前分类高亮；点击切换后 `DriveBrowser` 的列表按该分类过滤（`最近` = 按修改时间倒序；`图片`/`文档`/`视频`/`音乐` = 按扩展名/MIME 过滤）。
- `DriveBrowser` 内容区内原左侧分类窄列移除（避免两处入口重复）。
- drive 空间侧栏隐藏页面专属项：`New page`、"Pages" 标题与 `SpaceTree`、以及页面centric 的菜单项（模板/导入/导出/回收站）；保留空间级项：`SwitchSpace` 头部、`Overview`、`Search`、`Space settings`、收藏/关注。
- 页面空间（`space.type === 'page'`，含旧数据默认）行为完全不变。
- 分类状态跨组件共享（侧栏 ⇄ 内容区）且刷新后保持（jotai atom 或 URL 查询参数，`sean plan` 阶段定）。
- 移动端抽屉（同一 `SpaceSidebar`）同样生效。

## Acceptance Criteria
- drive 空间：左侧栏出现 6 个分类入口，且无页面树 / `New page` → verifiable by test（组件渲染断言）
- 点击侧栏分类 → 内容区列表按该分类过滤、侧栏高亮同步 → verifiable by test
- page 空间：左侧栏仍为页面树，无分类菜单（回归） → verifiable by test
- 客户端全量 `vitest` + `tsc --noEmit` 通过 → verifiable by test

## Artifacts (expected)

- **Database**: 无
- **Batch**: 无
- **Config**: 无

> 纯前端 UI 调整（无数据库/批处理/配置产物）。若与实际意图不符请指出。

## Context
- Tech stack: React + Mantine + jotai + TanStack Query + react-router；测试 vitest + @testing-library/react
- Related features: `cloud-drive`（DONE，2026-10-19；分类栏当前实现于 `apps/client/src/features/drive/components/drive-browser.tsx`；i18n key `Recent/All/Images/Documents/Videos/Music` 已随其 Task 9 补齐 12 语言）
- 关键文件: `apps/client/src/features/space/components/sidebar/space-sidebar.tsx`（左侧栏，含 Pages/SpaceTree）、`apps/client/src/components/layouts/global/global-app-shell.tsx`（`/s/*` 路由渲染 SpaceSidebar）、`apps/client/src/features/drive/components/drive-browser.tsx`、`apps/client/src/features/drive/drive-page.tsx`
- Constraints: 不破坏 page 空间侧栏与既有 drive 功能；分类过滤逻辑本身不重写（已存在于 drive-browser，仅迁移位置与提升状态）；服务端零改动
- Non-goals: 不做 drive 回收站 UI；不改分享/配额/版本；不改服务端任何代码
