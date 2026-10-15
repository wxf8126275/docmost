# AI 服务商配置管理 (ai-provider-config)

## Problem

当前 Docmost 的 AI 服务商（大模型驱动 driver、API Key、Base URL、补全/嵌入模型）只能通过服务器环境变量配置（`AI_DRIVER`、`AI_COMPLETION_MODEL`、`OPENAI_API_KEY`、`OPENAI_API_URL`、`GEMINI_API_KEY`、`AI_EMBEDDING_MODEL` 等），管理员无法在「AI 设置」页面自助管理。

需要在 **AI 设置页** 新增一个与「AI」「MCP」**平级**的「服务商」标签页，支持对一组 AI 服务商进行**增删改查**；密钥以加密方式存储；并且**后端真正读取**工作区保存的默认服务商配置来调用大模型，**覆盖环境变量的默认值**（无配置时回退到环境变量）。

## Behaviors

- 在 `apps/client/src/ee/ai/pages/ai-settings.tsx` 的 `Tabs` 中新增 `provider` 标签（路由 `/settings/ai/providers`），与 `ai` / `mcp` 平级。
- 新增「服务商」管理组件：展示服务商列表，支持**新增 / 编辑 / 删除**服务商。
- 每个服务商字段：
  - `name` 名称
  - `driver` 类型：`openai` | `openai-compatible` | `gemini` | `ollama`
  - `apiKey` API Key（加密存储，UI 不回显明文，编辑时仅当用户输入时才更新）
  - `baseUrl` Base URL（可选，openai-compatible / ollama 常用）
  - `completionModel` 补全模型
  - `embeddingModel` 嵌入模型（可选）
  - `isDefault` 是否默认服务商
- 可指定唯一「默认服务商」；后端调用大模型时优先使用该默认服务商配置。
- 后端提供服务商 CRUD 的 API（Controller / Service / DTO），`apiKey` 必须加密存储（复用现有 `EncryptionService` 的 AEAD 信封加密）。
- 后端 AI 调用链（completion / embedding 客户端工厂）在存在默认服务商配置时，使用其 `driver / apiKey / baseUrl / model`，覆盖环境变量默认值；无配置时回退到环境变量，保持现状行为。
- 仅管理员（`isAdmin`）可访问；沿用现有 `Feature` 开关与 i18n 文案规范（建议新增 `Feature.AI_PROVIDERS`，并纳入 `COMMUNITY_FEATURES` 以便自托管用户配置）。

## Acceptance Criteria

- 管理员打开「AI 设置 → 服务商」可见服务商列表与新增入口 → 手动验证。
- 新建含 `apiKey` 的服务商后，持久化层（`workspace.settings` 或独立实体）中 `apiKey` 为加密密文，明文不可直接读取 → 后端单测验证加密/解密往返。
- 编辑 / 删除服务商后，列表与持久化状态正确更新 → 手动验证 + 后端单测。
- 设置某服务商为默认后，后端调用大模型实际使用其 `driver/baseUrl/model/key` 而非环境变量 → 集成/单测验证客户端工厂入参。
- 无默认/无配置时后端回退到环境变量，行为与现状一致 → 单测验证回退逻辑。
- 非管理员访问服务商 API 被守卫拦截（401/403） → 单测验证权限守卫。
- 前端「服务商」标签与「AI」「MCP」并列，路由 `/settings/ai/providers` 可正常渲染 → 前端组件/路由测试。

## Context

- **Tech stack**：前端 React + Mantine + `react-i18next` + `jotai`（`workspaceAtom`）；路由 `react-router-dom`。后端 NestJS + TypeORM（workspace 用 JSONB 存 `settings`）+ 现有 `EncryptionService`（`apps/server/src/integrations/encryption`，AEAD 信封加密，API 见 `encrypt`/`decrypt`）。
- **Related features**：
  - `workspace.settings.ai` JSONB 当前仅存开关（`search`/`generative`/`chat`/`mcp`/`enforceMcpOauth` 等），通过 `updateWorkspace({...})` 模式更新（参考 `mcp-settings.tsx`）。
  - AI 环境变量定义在 `apps/server/src/integrations/environment/environment.validation.ts`：`AI_DRIVER ∈ {openai, openai-compatible, gemini, ollama}`、`AI_COMPLETION_MODEL`、`OPENAI_API_KEY`、`OPENAI_API_URL`、`GEMINI_API_KEY`、`AI_EMBEDDING_MODEL` 等；读取入口在 `environment.service.ts`（`getAiDriver`/`getAiCompletionModel`/`getOpenAiApiKey`/`getAiEmbeddingModel`）。
  - AI 客户端当前在 `core/ai`（`embedding.service.ts` 用 `createOpenAI`）与 `core/ai-chat`（`ai-chat-llm.client.ts`）直接读取环境变量。
  - `Feature` 枚举位于 `apps/client/src/ee/features.ts`；`COMMUNITY_FEATURES` 决定自托管社区版可用功能。
- **Constraints**：`apiKey` 必须加密存储，API 绝不返回明文给前端；遵循现有 `Feature` 开关、`react-i18next` 文案、`updateWorkspace` 风格；与现有 `workspace.settings` 结构兼容（提供商数据放入 `settings.ai.providers` 还是独立实体，由 plan 决定）。
- **Non-goals**：本次不实现 OAuth/SSO 类服务商接入；不实现服务商连通性测试 UI（可作后续）；是否纳入嵌入模型（`AI_VECTOR_DRIVER`）后端切换由 plan 明确，默认仅覆盖补全/embedding 模型字符串与 driver/apiKey/baseUrl。

## Notes from clarification

- 形态：**多服务商列表（CRUD）**，可选默认服务商。
- 后端联动：**驱动后端真实生效**（加密存储 + 覆盖环境变量）。
