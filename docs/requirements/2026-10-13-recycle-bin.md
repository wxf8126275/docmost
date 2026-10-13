# Recycle Bin (Trash) — 入口可发现性与权限对齐

> 特性名归一化自用户描述「回收站」→ `recycle-bin`。

## Problem（用户反馈）
页面删除后进入回收站，但**找不到回收站入口**。

## 调查结论：回收站功能本身已完整且可用
- **后端**：`PageController` 提供 `POST /api/pages/trash`（列出已删页）、`POST /api/pages/restore`（恢复）、`POST /api/pages/delete`（软删除 / 永久删除）；`PageRepo` 用 `deletedAt`/`deletedById` 软删除并实现 `restorePage`；`TrashCleanupService` 按 `workspace.trashRetentionDays` 定时清理。
- **前端**：路由 `/s/:spaceSlug/trash`（`App.tsx:157`）→ `SpaceTrash` → `Trash` 组件（`features/page/trash/components/trash.tsx`），列表/恢复/永久删除均可用；`deleted-page-banner` 在查看已删页时提示。

## 入口不可见的根因（两处）
1. **权限不一致（主因）**：入口在 `space-sidebar.tsx` 的空间「⋯」下拉菜单内，被 `canManagePages`（空间级 `SpaceCaslAction.Manage`，即管理员）包裹（`space-sidebar.tsx:354`）。而后端 `trash`/`restore` 仅要求空间级 `SpaceCaslAction.Edit`（`page.controller.ts:482,391`），软删除也只需页面级 `Edit`（`page.controller.ts:351` `validateCanEdit`）。结果：能删页面的普通成员（Edit）看不到回收站入口，无法恢复自己删的页面。
2. **入口隐蔽（次因）**：即便对管理员，入口也只在空间「⋯」下拉菜单中，无侧栏常驻可见项，不易发现。

## 修复方案
- **A. 权限对齐（必做，前端）**：把 `SpaceMenu` 的 Trash 入口显隐从 `canManagePages`（Manage）改为空间级 `Edit`。需：在 `SpaceSidebar` 新增 `canEditPages = spaceAbility.can(SpaceCaslAction.Edit, SpaceCaslSubject.Page)` 并透传给 `SpaceMenu`；将 Trash 的 `<Menu.Item>` 从当前的 `canManagePages` 块（该块还含 Import/Export/Settings，正确应为 Manage）中拆出，改用 `canEditPages` 控制。使所有「能删除/恢复页面」的用户都能看到回收站，与后端 `Edit` 要求一致。
- **B. 可发现性（可选，UX）**：将 Trash 入口提升为空间侧栏常驻可见项（而非仅下拉菜单），降低发现成本。是否改变布局需产品确认。
- **C. 后端一致性核对（验证，无需改动）**：后端 `trash` 仅要求 `Edit`，与调整后前端一致；确认 `getDeletedSpacePages` 返回范围（全空间已删页）对 Edit 用户展示合理即可。

## Acceptance Criteria
- 具备空间级 `Edit` 权限的普通成员，进入任意空间可在「⋯」菜单（或提升后的侧栏项）看到并打开「回收站」，列出/恢复/永久删除页面。 → 手动/集成
- 软删除页面后非管理员也能在回收站恢复。 → 手动
- 前端 `pnpm --filter client build` / `eslint` 通过；可加最小单测验证权限门逻辑（可选）。 → test

## Context
- 技术栈：NestJS 后端 + React(Mantine) 前端；全局 `ValidationPipe`。
- 权限：CASL `SpaceCaslAction`（`Read`/`Edit`/`Manage` 等）作用于 `SpaceCaslSubject.Page`/`Settings`；`spaceAbility.createForUser(user, spaceId)`。`Manage` 为最高权限（管理员），`Edit` 为较低权限（可编辑页面的成员）。
- 现有删除权限：软删除只需 page-level `Edit`；永久删除需 `Manage` on `Settings`（管理员）；trash/restore 需空间级 `Edit`。
- `SpaceMenu` 当前仅接收 `canManagePages` 一个权限 prop（`space-sidebar.tsx:196-199`）。

## Constraints
- 不改后端接口/权限模型（后端 `Edit` 已正确）；仅调整前端入口显隐，必要时小幅重构 `SpaceMenu` props。
- 不改动 `trashRetentionDays` 等无关设置。
- 若做 B（侧栏常驻），需与现有侧栏样式/布局一致。

## Non-goals
- 不实现 workspace 级全局回收站（当前仅 per-space）。
- 不改动软删除/恢复/清理的后端逻辑。

## 检查结论
回收站功能**工作正常**；问题纯粹是前端入口的权限门槛过高（Manage 严于后端 Edit）+ 入口隐蔽。修复集中在前端权限对齐（A），B 为可选 UX 增强。
