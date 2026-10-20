# Task 1 — drive-category-nav-component (drive-category-sidebar)

- **Requirement**: `docs/requirements/2026-10-19-drive-category-sidebar.md`
- **Plan**: `docs/plans/2026-10-19-drive-category-sidebar.md` (Task 1)
- **Status**: done · evidence: exercised
- **Tests**: 4 passed / 4 total · fixes: 0
- **Date**: 2026-10-19

## What changed

抽取受控组件，为"分类菜单迁驻左侧栏"铺路。

- **Created** `apps/client/src/features/drive/components/drive-category-nav.tsx`
  — 受控组件（props: `value: DriveCategory` + `onChange`），渲染 6 个分类入口
  （`aria-label="category-<value>"`，当前项 `data-active`），仅含导航项；
  ScrollArea 包裹保留在使用方（布局关注点分离，侧栏挂载时不受 140px 宽度约束）。
- **Modified** `apps/client/src/features/drive/components/drive-browser.tsx`
  — 删除内联 `CATEGORIES` 数组与导航 markup，改用
  `<ScrollArea w={140}><DriveCategoryNav value={category} onChange={setCategory} /></ScrollArea>`；
  清理不再使用的图标与 `UnstyledButton` 导入。行为等价。

## Tests (4) — `drive-category-nav.spec.tsx`

| # | Case | Result |
|---|------|--------|
| 1 | renders all six categories | PASS |
| 2 | marks only the active category (`data-active`) | PASS |
| 3 | onChange fires with the clicked category (documents) | PASS |
| 4 | onChange fires with the recent category | PASS |

RED 确认：spec 首次运行 `Failed to resolve import "./drive-category-nav"`（组件不存在）。

## Regression

- drive 7 个套件全绿（nav 4 + browser 8 + dropzone 3 + preview 4 + share 4 + i18n 4 + drive-space 5 = 32）；
- 客户端全量 **23 文件 / 153 测试**（较前 +1 文件 +4 测试）；`tsc --noEmit` 干净。

## Files

- Created: `drive-category-nav.tsx`, `drive-category-nav.spec.tsx`
- Modified: `drive-browser.tsx`

## Artifacts

无（纯前端组件抽取）。
