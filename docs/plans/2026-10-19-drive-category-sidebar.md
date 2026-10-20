# Plan: Drive Category Sidebar（网盘空间：分类菜单入驻左侧栏）

Generated: 2026-10-19T22:40:00Z
Requirement: ../requirements/2026-10-19-drive-category-sidebar.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | drive-category-nav-component | — | low | no |
| 2 | drive-category-url-state | 1 | medium | no |
| 3 | space-sidebar-drive-categories | 1, 2 | medium | no |

## Dependency Graph

Task 1 → Task 2 → Task 3

（串行链：先抽出可复用导航组件 → 分类状态上移到 URL → 侧栏挂载。无并行任务。）

## Key Decisions

- **分类状态载体：URL 查询参数 `?category=recent|all|images|documents|videos|music`**（缺省/非法值 → `all`）。侧栏（SpaceSidebar）与内容区（DriveBrowser）分别位于 AppShell 的 Navbar 与 Main，跨树共享状态；URL 作为单一事实来源天然满足"刷新后保持/可分享"，且无需引入全局 store 与测试隔离问题。备选 jotai atom 不满足刷新保持（除非 atomWithStorage，引入 localStorage 跨测试泄漏）。
- **先抽取后迁移**：Task 1 先把 `drive-browser.tsx` 内联分类栏抽成受控组件 `DriveCategoryNav`（value/onChange），Task 2 再把状态源换成 URL 并移除内容区窄列，Task 3 才在侧栏挂载。避免"侧栏与内容区各持一份状态"的中间态。
- **页面空间回归**：`space.type === 'page'`（含旧数据缺省）路径零变化，由 Task 3 的回归用例锁定。

## Task Details

### Task 1: drive-category-nav-component
- **Status**: ✅ DONE（2026-10-19 sean run，4 tests；report: docs/test-reports/2026-10-19-drive-category-sidebar/task-1-drive-category-nav-component.md）。实现决策：组件仅含导航项，ScrollArea 包裹留在使用方（侧栏挂载不受 140px 约束）。
- **Creates**:
  - `apps/client/src/features/drive/components/drive-category-nav.tsx`（受控组件：props `value: DriveCategory` + `onChange: (c: DriveCategory) => void`；渲染 6 个分类入口，`aria-label="category-<value>"`，当前项 `data-active`；图标 + `t()` 文案，样式与现内联实现一致）
- **Artifacts**: 无
- **Modifies**:
  - `apps/client/src/features/drive/components/drive-browser.tsx`（删除内联 CATEGORIES/ScrollArea 导航 markup，改用 `<DriveCategoryNav value={category} onChange={setCategory} />`；行为不变）
- **Test**: `apps/client/src/features/drive/components/drive-category-nav.spec.tsx`
- **Steps (TDD)**:
  1. RED：新 spec 导入尚不存在的组件即失败；断言 6 个入口渲染、点击回调携带正确分类、active 标记。
  2. GREEN：从 drive-browser 抽取组件（含 ScrollArea + UnstyledButton 结构），浏览器改用受控用法。
  3. 回归：既有 `drive-browser.spec.tsx`（8 用例）保持全绿。
- **Acceptance**: 组件可独立渲染与交互；浏览器过滤行为与抽取前逐字节等价（既有 spec 证明）。

### Task 2: drive-category-url-state
- **Status**: ✅ DONE（2026-10-19 sean run，10 tests；report: docs/test-reports/2026-10-19-drive-category-sidebar/task-2-drive-category-url-state.md）。URL 契约：`?category=recent|all|images|documents|videos|music`，非法/缺省 → `all`；内容区窄列已移除；cloud-drive 的 `drive-space.spec.tsx` 入口断言随之更新（导航迁出为设计行为）。
- **Creates**: 无
- **Artifacts**: 无
- **Modifies**:
  - `apps/client/src/features/drive/components/drive-browser.tsx`（分类改从 `useSearchParams().get('category')` 读取并校验（非法/缺省 → `all`）；移除左侧分类窄列与 Group 包裹（内容区不再自带导航）；过滤/排序逻辑不变，仅数据源改为 URL）
- **Test**: `apps/client/src/features/drive/components/drive-browser.spec.tsx`（修改：新增 URL 驱动用例）
- **Steps (TDD)**:
  1. RED：新增用例——`MemoryRouter` 初始 `?category=images` 时仅渲染图片文件（修复前浏览器用本地默认 `all`，`notes.pdf` 仍可见 → RED）；`?category=bogus`/缺省 → 全部；`?category=recent` → 按修改时间倒序。
  2. GREEN：浏览器读取并校验 URL 参数；删除窄列。
  3. 回归：Task 1 的 nav spec + 其余 drive spec 全绿。
- **Acceptance**: URL 为分类唯一事实来源；非法值回落 `all`；刷新保持（URL 驱动）；内容区无重复导航。

### Task 3: space-sidebar-drive-categories
- **Status**: ✅ DONE（2026-10-19 sean run，4 tests；report: docs/test-reports/2026-10-19-drive-category-sidebar/task-3-space-sidebar-drive-categories.md）。新增共享模块 `features/drive/drive-category.ts`（DRIVE_CATEGORIES + parseDriveCategory）作为 URL 单一契约；`canManagePages = 能管页面 && 非 drive 空间` 统一门控 New page/头部图标/SpaceMenu 页面项。
- **Creates**: 无
- **Artifacts**: 无
- **Modifies**:
  - `apps/client/src/features/space/components/sidebar/space-sidebar.tsx`（按 `space.type` 分支）：
    - "Pages" 区段：drive → 渲染 `<DriveCategoryNav value={urlCategory} onChange={setCategory}/>`（写 URL 参数）；page → 原 Pages 头 + `SpaceTree` 不变；
    - 隐藏 drive 下的页面专属项：`New page` 菜单、以及 `SpaceMenu` 中模板/导入/导出/回收站（保留收藏/关注/空间设置）；
    - 保留 `SwitchSpace` 头部、`Overview`、`Search`、`Space settings`。
- **Test**: `apps/client/src/features/space/components/sidebar/space-sidebar.spec.tsx`（新建；mock 模式沿用 `drive-space.spec.tsx` 的模块 mock 手法）
- **Steps (TDD)**:
  1. RED：drive 空间 → 断言 6 个分类入口存在、`SpaceTree` 不在、`New page` 不在（现状树在 → RED）；点击分类 → URL 更新；page 空间 → 树在、导航不在（回归，RED 前即绿、GREEN 后仍绿）。
  2. GREEN：实现分支与菜单项门控。
  3. 回归：客户端全量 vitest + `tsc --noEmit`。
- **Acceptance**: drive 空间左侧栏分类菜单占据页面树位置且与内容区联动；page 空间零变化；移动端抽屉同源生效。

## Risks / Notes

- `space-sidebar.tsx` 现存已 ~420 行（超 400 行规范，存量债务）；本任务仅小增量分支，不做整体整改（如需整改另立任务）。
- Task 2 删除内容区窄列后，DrivePage/DriveBrowser 布局简化，需肉眼确认无残留空容器（spec 断言 + tsc 保证结构正确）。
- i18n key（Recent/All/Images/Documents/Videos/Music）已由 cloud-drive Task 9 补齐 12 语言，本计划不新增 key。
- 服务端零改动；无数据库/批处理/配置产物（需求已声明）。

## Suggested Commit (after run)

```
feat(client): move drive category nav into the space sidebar

- extract DriveCategoryNav as a controlled component
- drive category state via ?category= URL param (refresh-safe)
- SpaceSidebar renders categories in place of the page tree for drive spaces

Tests: N passed
Regression: client vitest + tsc green
```
