# Task 3 — space-sidebar-drive-categories (drive-category-sidebar)

- **Requirement**: `docs/requirements/2026-10-19-drive-category-sidebar.md`
- **Plan**: `docs/plans/2026-10-19-drive-category-sidebar.md` (Task 3)
- **Status**: done · evidence: exercised
- **Tests**: 4 passed / 4 total · fixes: 0
- **Date**: 2026-10-19

## What changed

分类菜单正式入驻左侧栏——网盘空间的"Pages"位置。

- **Created** `apps/client/src/features/drive/drive-category.ts` — 共享 URL 契约
  （`DRIVE_CATEGORIES` + `parseDriveCategory`，非法/缺省 → `all`）；`drive-browser.tsx`
  的私有校验副随之移除，两侧共用同一事实来源。
- **Modified** `apps/client/src/features/space/components/sidebar/space-sidebar.tsx`
  - `space.type === "drive"` 时，Pages 区段渲染 `<DriveCategoryNav>`（读写 `?category=`），
    不再渲染 Pages 头 + `SpaceTree`；
  - `canManagePages = 能管页面 && 非 drive 空间`：隐藏 `New page`、头部创建图标，
    以及 `SpaceMenu` 中模板/导入/导出/回收站（保留收藏/关注/空间设置）；
  - 保留 `SwitchSpace` 头部、`Overview`、`Search`、`Space settings`；
  - page 空间（含旧数据缺省 type）路径零变化。
- **Created** `space-sidebar.spec.tsx`（4 用例）。

## Tests (4) — `space-sidebar.spec.tsx`

| # | Case | Result |
|---|------|--------|
| 1 | drive 空间：6 个分类入口渲染，无页面树、无 New page | PASS |
| 2 | 点击分类 → 写入 `?category=` URL 参数（探针断言） | PASS |
| 3 | page 空间：保留页面树与 New page，无分类导航（回归） | PASS |
| 4 | 旧数据（无 type）按 page 空间处理（回归） | PASS |

RED 确认：drive 两用例失败（`Unable to find label category-recent`——侧栏只有页面树）。

## Regression

- sidebar + drive 8 套件全绿；客户端全量 **24 文件 / 159 测试**；`tsc --noEmit` 干净。

## Files

- Created: `drive-category.ts`、`space-sidebar.spec.tsx`
- Modified: `space-sidebar.tsx`、`drive-browser.tsx`（复用共享契约）

## Artifacts

无（纯前端）。
