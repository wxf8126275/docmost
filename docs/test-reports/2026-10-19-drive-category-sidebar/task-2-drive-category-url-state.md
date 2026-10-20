# Task 2 — drive-category-url-state (drive-category-sidebar)

- **Requirement**: `docs/requirements/2026-10-19-drive-category-sidebar.md`
- **Plan**: `docs/plans/2026-10-19-drive-category-sidebar.md` (Task 2)
- **Status**: done · evidence: exercised
- **Tests**: 10 passed / 10 total · fixes: 0
- **Date**: 2026-10-19

## What changed

分类状态的唯一事实来源从 DriveBrowser 本地 state 上移到 URL。

- **Modified** `apps/client/src/features/drive/components/drive-browser.tsx`
  - 新增 `parseCategory()`：校验 `?category=` 参数（合法 6 值之一，非法/缺省 → `all`）；
  - `const [searchParams] = useSearchParams(); const category = parseCategory(searchParams.get("category"))`——删除 `useState<DriveCategory>`；
  - **移除内容区左侧分类窄列**（Group + ScrollArea + `DriveCategoryNav` 包裹），浏览器不再自带导航入口；过滤/排序逻辑不变，仅数据源改为 URL。
- **Modified** `drive-browser.spec.tsx` —— 4 个"点击内嵌导航"用例改写为 6 个 URL 驱动用例（images/documents 过滤、recent 倒序、invalid 回落、missing 默认、内容区无导航），既有 4 个 spaceId 用例保留。
- **Modified**（跨特性契约更新）`drive-space.spec.tsx`（cloud-drive）——入口用例原断言内容区含 `category-all`；导航已按设计迁至侧栏，改为断言浏览器主体渲染（`upload-dropzone`）。

## Tests (10) — `drive-browser.spec.tsx`

| # | Case | Result |
|---|------|--------|
| 1-4 | renders/opens folder、delete folder/file（spaceId 作用域） | PASS |
| 5 | `?category=images` 仅显示图片（文件夹隐藏） | PASS |
| 6 | `?category=documents` 仅显示文档 | PASS |
| 7 | `?category=recent` 按修改时间倒序 | PASS |
| 8 | `?category=bogus` 回落 all | PASS |
| 9 | 无参数默认 all | PASS |
| 10 | 内容区不渲染分类导航（导航在侧栏） | PASS |

RED 确认：改写后 5 个新用例失败（浏览器忽略 URL、仍渲染内嵌导航）。

## Regression

- drive 7 套件 / 34 测试全绿；客户端全量 **23 文件 / 155 测试**（+2）；`tsc --noEmit` 干净。

## Files

- Modified: `drive-browser.tsx`、`drive-browser.spec.tsx`、`drive-space.spec.tsx`

## Artifacts

无。
