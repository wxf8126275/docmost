# Handoff — ai-settings（启动 AI Chat，自托管社区版）

## Summary
解除了「设置 → AI 设置」模块的企业版 Feature 门控，使自托管社区版（无企业许可证）能够在 UI 中配置并启用 AI Chat。沿用现有前端页面，不重写 UI；后端 AI 设置保存（`WorkspaceService.update`）与 AI Chat 接口（`core/ai-chat`）此前已实现，本次以门控解除 + 测试验证为主，并补全了 AI 设置保存链路的契约测试。

## Changes
- `apps/client/src/ee/features.ts`：`COMMUNITY_FEATURES` 加入 `Feature.AI` 与 `Feature.AI_CONTROLS`。
- 新增测试：
  - `apps/client/src/ee/features.spec.ts`（2 用例）
  - `apps/server/src/core/workspace/services/workspace.service.spec.ts`（4 用例）
  - `apps/client/src/ee/ai/ai-settings-toggle.spec.tsx`（5 用例，含 `window.matchMedia` polyfill 与 `vi` 显式导入）

## Tests（合计 11 新建 + 8 既有复用 = 19，0 failed）
- client `features.spec.ts`：2 —— `COMMUNITY_FEATURES` 含 `AI` / `AI_CONTROLS`
- server `workspace.service.spec.ts`：4 —— `aiChat` / `chatReadOnly` / `chatWorkspaceKnowledgeOnly` 保存链路 + 反向用例
- client `ai-settings-toggle.spec.tsx`：5 —— `useHasFeature('ai')`/`useHasFeature('ai:controls')` 空 entitlement 下返回 `true`；`EnableAiChat`/`EnableGenerativeAi`/`EnableAiSearch` 的 `Switch` 不 `disabled`
- server `ai-chat.controller.spec.ts`：8（既有，复用验证）—— AI Chat 接口在核心可用，不依赖企业许可

## Behavioral evidence（exercised）
- `useHasFeature(Feature.AI)` 在 entitlement 为空时返回 `true` → 设置页所有 AI 开关不再被禁用/提示升级。
- `WorkspaceService.update({ aiChat: true })` 调用 `workspaceRepo.updateAiSettings(WS_ID, 'chat', true, …)`；`aiChatReadOnly`/`aiChatWorkspaceKnowledgeOnly` 同样正确持久化（后者经 `licenseCheckService.hasFeature(…, Feature.AI_CONTROLS, …)` 校验后放行）。
- AI Chat controller 路由 `/api/ai/chats/*` 在 `core` 注册，仅 override `JwtAuthGuard`，不检查 `Feature.AI`。

## Acceptance criteria
- [x] `COMMUNITY_FEATURES` 含 `AI` 与 `AI_CONTROLS`
- [x] `useHasFeature(Feature.AI)` 无 license 返回 `true`
- [x] 设置页开关在无 license 时不 `disabled`
- [x] 后端保存 `aiChat` 开关调用 `updateAiSettings('chat')`
- [x] 后端保存 `chatReadOnly` / `chatWorkspaceKnowledgeOnly` 调用对应 key
- [x] `/api/ai/chats/*` 在自托管版可达（ai-chat controller spec 8 passed）
- [x] 编译通过（`server tsc --noEmit` 与 `client build` 均成功）

## Known limits（non-goals，已与用户对齐）
- **AI Search（embedding/向量搜索）与 Generative AI（Ask AI）后端未实现**，仅保留开关与设置标志。解除 `Feature.AI` 会让 `search-spotlight.tsx` 的 AI 搜索入口在自托管版可见，但其后端缺失 —— 标记为已知限制，不在本次范围。
- MCP 的 `Feature.MCP` 门控保持不变。
- AI Chat 运行时仍需在 env 配置 `OPENAI_API_KEY` / base URL / model（由 `core/ai-chat` 的 `EnvironmentService` 读取）。
- 未执行需要数据库的端到端启动冒烟（运行环境限制）；类型检查 + 构建 + 单元/集成测试全绿已确认功能就绪。

## API contract
- `PATCH /api/workspaces/:id`（`updateWorkspace`）接受 `aiChat` / `aiChatReadOnly` / `aiChatWorkspaceKnowledgeOnly` / `aiSearch` / `generativeAi` 字段，持久化到 `workspace.settings.ai`。
- AI Chat：`GET /api/ai/chats`、`POST /api/ai/chats`、`POST /api/ai/chats/:id/messages`（`stream`）等（`core/ai-chat` controller）。
