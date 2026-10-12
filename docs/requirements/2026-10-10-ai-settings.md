# AI 设置模块：启动 AI Chat（自托管社区版）

## Problem

docmost 的「设置 → AI 设置」前端页面已存在（`apps/client/src/ee/ai/pages/ai-settings.tsx`），
提供若干开关：AI Search、Generative AI、AI Chat（+ 只读 / 仅工作区知识 子开关）、MCP。
后端 `WorkspaceService.update` 也已支持把这些开关持久化到 `workspace.settings.ai`。

但是：
- 该页面与 AI Chat 子选项受企业版 Feature 门控控制——`Feature.AI` 与 `Feature.AI_CONTROLS`
  **不在** `COMMUNITY_FEATURES` 列表中。在自托管社区版（无企业许可证）下，`useHasFeature` 返回
  `false`，所有 AI 开关被 `disabled` 并提示「需要升级」，管理员无法在 UI 中开启 / 控制 AI 功能。
- AI Chat 的后端实现（`apps/server/src/core/ai-chat`）已经完整（controller / service / repo /
  LLM 客户端）并注册到 `core.module`，却因前端门控被挡住，无法「启动」。

换言之：AI 设置模块的「开关 UI」与「AI Chat 功能」都已就绪，唯独被企业版许可门控挡在自托管
社区版之外。本次任务即解除这一门控，使自托管社区版可以使用 AI 设置并真正跑通 AI Chat。

## Behaviors

- 自托管社区版（无许可证）中，「设置 → AI 设置」页所有 AI 开关（重点是 AI Chat 及其子开关）
  可正常显示并可交互（不再 disabled / 提示升级）。
- 管理员保存 **AI Chat** 开关后，`workspace.settings.ai.chat` 正确持久化。
- 管理员保存 **AI Chat 只读** / **仅工作区知识** 子开关后，对应 `workspace.settings.ai.*` 正确持久化。
- AI Chat 功能（`/ai` 页面 + `/api/ai/chats/*` 接口）在自托管社区版可用；LLM 配置从环境变量
  （`OPENAI_API_KEY` / base URL / `getAiChatModel()`）正确读取。
- 沿用现有前端页面结构（不重写 `ee/ai/pages/ai-settings.tsx`、`ee/ai-chat/*` 等 UI）。

## Acceptance Criteria

- `COMMUNITY_FEATURES` 包含 `Feature.AI` 与 `Feature.AI_CONTROLS` → verifiable by test
- `useHasFeature(Feature.AI)` 在自托管社区版（无许可证）返回 `true` → verifiable by test
- 设置页 `EnableAiChat` / `EnableGenerativeAi` / `EnableAiSearch` 开关在 `hasAccess=false` 时不再 disabled → verifiable by test / demo
- 后端保存 `aiChat` 开关经 `WorkspaceService.update` → `workspaceRepo.updateAiSettings('chat', …)` 被调用 → verifiable by test
- 后端保存 `aiChatReadOnly` / `aiChatWorkspaceKnowledgeOnly` 经 `WorkspaceService.update` → `updateAiSettings` 对应 key 被调用 → verifiable by test
- `/api/ai/chats/*` 接口在自托管社区版可达，AI Chat 端到端可用（env 配置后）→ verifiable by e2e / demo
- 编译通过（server `tsc` + client `build`）→ verifiable by build

## Context

- 技术栈：NestJS 11 (Fastify) + Kysely/Postgres；React 19 + Vite + Mantine + React Router。
- 门控机制：`useHasFeature(feature) = hasLicensedFeature || COMMUNITY_FEATURES.includes(feature)`
  （见 `apps/client/src/ee/hooks/use-feature.ts`）。
- 前端 AI 设置页：`apps/client/src/ee/ai/pages/ai-settings.tsx` 调用 `updateWorkspace({…})`
  保存；`EnableAiChat` / `EnableGenerativeAi` / `EnableAiSearch` / `AiChatReadOnly` /
  `AiChatWorkspaceKnowledgeOnly` 组件分别受 `Feature.AI` / `Feature.AI_CONTROLS` 门控。
- 前端 AI Chat 入口：`global-sidebar.tsx` 的「AI Chat」项与 `App.tsx` 路由 `/ai` **已不受** Feature
  门控，始终可见可访问。
- 后端 AI 设置保存：`WorkspaceService.update` 已处理 `aiSearch` / `generativeAi` / `aiChat` /
  `aiChatReadOnly` / `aiChatWorkspaceKnowledgeOnly` / `mcpEnabled` / `enforceMcpOauth`，
  调用 `workspaceRepo.updateAiSettings`；其中 `aiChatReadOnly` / `aiChatWorkspaceKnowledgeOnly`
  仍受服务端 `AI_CONTROLS` 许可校验（本次通过把 `AI_CONTROLS` 加入 `COMMUNITY_FEATURES` 解除）。
- AI Chat 后端：`apps/server/src/core/ai-chat`（controller / service / repos / llm-client），
  已在 `core.module.ts` 注册；LLM 客户端从 `EnvironmentService` 读取 `OPENAI_API_KEY` /
  `getOpenAiApiUrl()` / `getAiChatModel()`。
- 约束：沿用现有前端页面；不重写 UI；遵循 `docs/team/conventions.md`。

## Non-goals

- **不实现** AI Search（embedding / 向量搜索）后端 —— 仅保留开关与设置标志（现状）。
- **不实现** Generative AI（Ask AI）后端 —— 仅保留开关与设置标志（现状）。
- 不改动 MCP 的 `Feature.MCP` 门控（保持企业版特性）。
- 不新增 AI provider（`API key` / `base URL` / `model`）的 workspace 级配置表单
  （现有前端页面无此表单，用户要求沿用现有页面）。
- 不修改 `ee/` 下许可校验逻辑本身，仅把 AI 相关 feature 标记为社区可用。
