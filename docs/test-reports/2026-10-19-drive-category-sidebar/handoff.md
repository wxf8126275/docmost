# Handoff: drive-category-sidebar（网盘分类菜单入驻左侧栏）

## Status
- Overall: DONE（3/3 任务）
- Last updated: 2026-10-19T23:40:00Z

## Reliability
- Implemented by: step-5-preview
- Task first-pass rate: 3/3（无 task 进入 fix loop；两处自撰测试小修：拆分双渲染用例、跨特性 spec 契约更新，均属 RED 期创作修正）
- Post-run bugs: 0
- Trust level: HIGH

## What Was Done

| Task | Status | Summary |
|------|--------|---------|
| 1 | done | 抽取受控组件 `DriveCategoryNav`（value/onChange，6 分类入口） |
| 2 | done | 分类状态上移 URL `?category=`（parseDriveCategory 校验，非法→all）；内容区窄列移除 |
| 3 | done | SpaceSidebar 按 `space.type` 分支：drive → Pages 区段渲染分类导航（写 URL）+ 隐藏页面专属项；page 零变化 |

## File Inventory (verified on disk)

### Created
- `apps/client/src/features/drive/components/drive-category-nav.tsx` — 受控分类导航（仅导航项，滚动包裹归使用方）
- `apps/client/src/features/drive/drive-category.ts` — 共享 URL 契约（`DRIVE_CATEGORIES` / `parseDriveCategory`）
- `apps/client/src/features/drive/components/drive-category-nav.spec.tsx` — 4 用例
- `apps/client/src/features/space/components/sidebar/space-sidebar.spec.tsx` — 4 用例（含 SearchProbe URL 探针）

### Modified
- `apps/client/src/features/drive/components/drive-browser.tsx` — 分类读 URL；删除内嵌导航与 Group/ScrollArea 包裹；私有校验改共享模块
- `apps/client/src/features/space/components/sidebar/space-sidebar.tsx` — drive 分支（分类导航 + canManagePages 门控）
- `apps/client/src/features/drive/components/drive-browser.spec.tsx` — 分类用例改写为 URL 驱动（10 用例）
- `apps/client/src/features/drive/drive-space.spec.tsx` — cloud-drive 跨特性契约更新（入口断言改为浏览器主体）

## Artifacts
- Catalog: `docs/artifacts/2026-10-19-drive-category-sidebar.md`
- 无 database/batch/config 产物（纯前端）。

## Post-Run Bugs
无。

## Current Blocker
无。（继承自 cloud-drive 的 F011：客户端 eslint 因环境缺 `@tanstack/eslint-plugin-query` 仍未跑。）

## Next Steps
1. 浏览器实测：drive 空间左侧栏出现 6 分类；点击切换内容区过滤 + URL 变化；刷新保持；page 空间侧栏不变。
2. （可选）`pnpm --filter client build` 生产构建确认。
3. git 提交（见下）。

## Known Risks / TODOs
- `space-sidebar.tsx` 存量已超 400 行（本次 +~50 行）；如需整改另立任务。
- 分类切换用 `replace: true` 写 URL，不产生历史记录（有意为之，避免回退栈污染）。

## How to Resume
```bash
cd /home/wuxiufeng/repos/docmost
sean status drive-category-sidebar
cd apps/client && npx vitest run
```

## Suggested Commit

```
feat(client): move drive category nav into the space sidebar

- extract DriveCategoryNav as a controlled component
- drive category state via ?category= URL param (refresh-safe, deep-linkable)
- SpaceSidebar renders the nav in place of the page tree for drive spaces;
  page spaces keep the page tree unchanged

Tests: 18 passed (3 tasks)
Regression: client vitest 24 files / 159 tests + tsc green
```
