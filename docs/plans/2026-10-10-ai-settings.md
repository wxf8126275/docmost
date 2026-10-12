# Plan: AI 设置模块 — 启动 AI Chat（自托管社区版）

Generated: 2026-10-10T15:30:00Z
Requirement: ../requirements/2026-10-10-ai-settings.md

## 目标回顾

解除 AI 设置页与 AI Chat 子选项上的企业版 Feature 门控（`Feature.AI` / `Feature.AI_CONTROLS`
不在 `COMMUNITY_FEATURES`），使自托管社区版可在「设置 → AI 设置」中配置并真正启用 AI Chat。
沿用现有前端页面，不重写 UI。后端 AI 设置保存（`WorkspaceService.update`）与 AI Chat 接口
（`core/ai-chat`）已就绪，本次以「门控解除 + 补测试验证」为主，并做端到端编译/启动验证。

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | frontend-community-features | —         | low        | yes           |
| 2 | backend-ai-settings-save    | —         | medium     | yes           |
| 3 | frontend-ai-settings-toggle | 1         | medium     | no            |
| 4 | build-and-verify           | 1,2,3     | low        | no            |

## Dependency Graph
Task 1 → Task 3 → Task 4
Task 2 → Task 4

## Task Details

### Task 1: frontend-community-features
- **Creates**: `apps/client/src/ee/features.spec.ts`
- **Modifies**: `apps/client/src/ee/features.ts`
- **Test**: `apps/client/src/ee/features.spec.ts`
- **Acceptance**: `COMMUNITY_FEATURES` 同时包含 `Feature.AI`（`'ai'`）与 `Feature.AI_CONTROLS`（`'ai:controls'`）；且 `useHasFeature(Feature.AI)` 在 entitlement 为空时返回 `true`。
- **Steps (TDD)**:
  1. RED: 新建 `features.spec.ts`，断言 `COMMUNITY_FEATURES` 包含 `'ai'` 和 `'ai:controls'`（此时失败）。
  2. GREEN: 在 `features.ts` 的 `COMMUNITY_FEATURES` 数组中加入 `Feature.AI` 与 `Feature.AI_CONTROLS`。
  3. Verify: 运行测试；并补一条直接验证 `useHasFeature` 逻辑（import `useHasFeature` 并断言空 entitlement 下对 `'ai'` 返回 `true`）。

### Task 2: backend-ai-settings-save
- **Creates**: `apps/server/src/core/workspace/services/workspace.service.spec.ts`
- **Modifies**: （无，纯新增测试；若发现保存路径缺失则补充实现）
- **Test**: 同上
- **Acceptance**: 调用 `workspaceService.update(wsId, { aiChat: true })` 时，
  `workspaceRepo.updateAiSettings` 以 `'chat'` 与 `true` 被调用；
  调用 `update(wsId, { aiChatReadOnly: true })` 时以 `'chatReadOnly'` 被调用；
  调用 `update(wsId, { aiChatWorkspaceKnowledgeOnly: true })` 时以 `'chatWorkspaceKnowledgeOnly'` 被调用。
- **Steps (TDD)**:
  1. RED: 新建 spec，构造 `WorkspaceService` 并 mock 其依赖（`workspaceRepo`、`licenseCheckService.hasFeature` 返回 `true`、`environmentService`、`db`、`auditService` 等），用 `jest.mock('@docmost/db/utils')` 注入 `executeTx` 直接执行事务回调；断言 `updateAiSettings` 未被调用（初始未实现断言 → 失败）。
  2. GREEN: 当前 `WorkspaceService.update` 已实现该保存路径，使断言通过（本任务核心为「补测试覆盖既有完善的后端接口」；若 RED 暴露真实缺失则就地修复实现）。
  3. Verify: 三个开关各一条用例；重新运行确认稳定。

### Task 3: frontend-ai-settings-toggle
- **Creates**: `apps/client/src/ee/ai/components/ai-settings-toggle.spec.tsx`
- **Modifies**: （无）
- **Test**: 同上（React Testing Library + renderHook/组件渲染）
- **Acceptance**: 在 `entitlementAtom` 为空（无许可证）的条件下渲染 `EnableAiChat`（来自 `@/ee/ai-chat/components/enable-ai-chat.tsx`），其 `Switch` 的 `disabled` 为 `false`（即 `hasAccess` 为 `true`）；同理验证 `EnableGenerativeAi` / `EnableAiSearch` 在 `Feature.AI` 加入 `COMMUNITY_FEATURES` 后不再被禁用。
- **Steps (TDD)**:
  1. RED: 写测试，渲染上述组件并断言 `Switch` 不 `disabled`（因 `COMMUNITY_FEATURES` 尚缺 `'ai'`，初始失败）。
  2. GREEN: 依赖 Task 1 把 `'ai'` 加入 `COMMUNITY_FEATURES` 后，测试转绿。
  3. Verify: 用 `jest.mock` 隔离 `updateWorkspace` 网络调用；确认开关可点击（not disabled）。

### Task 4: build-and-verify
- **Creates**: （无）
- **Modifies**: （无）
- **Test**: 复用 `apps/server/src/core/ai-chat/ai-chat.controller.spec.ts`（证明 controller 不依赖 license，已存在）；本任务运行全量相关测试 + 编译。
- **Acceptance**:
  - 服务端 `tsc` 类型检查通过；客户端 `build` 通过。
  - `pnpm --filter server test` 中 ai-chat 与 workspace 相关用例通过。
  - 启动应用（或仅冒烟）确认 `/settings/ai` 页面可加载、AI Chat 开关可保存、`/ai` 页面与 `/api/ai/chats/*` 接口自托管可用（env 配置 LLM 后）。
- **Steps**:
  1. 运行 server 测试（含 Task 2、ai-chat controller spec）。
  2. 运行 client 构建。
  3. 输出验证结论与已知限制（AI Search / Generative 后端缺失，仅保留开关与标志）。

## 已知限制（Non-goals，记录于验收报告）
- AI Search（embedding / 向量搜索）与 Generative AI（Ask AI）后端不在此范围，仅保留开关与设置标志。解除 `Feature.AI` 会让 `search-spotlight.tsx` 的 AI 搜索入口在自托管版可见，但其后端未实现 —— 标记为已知限制，不在本次修复。
- MCP 的 `Feature.MCP` 门控保持不变。
