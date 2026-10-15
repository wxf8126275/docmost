# Plan: AI 服务商配置管理 (ai-provider-config)

Generated: 2026-10-15T12:00:00Z
Requirement: ../requirements/2026-10-15-ai-provider-config.md

## Goal

在 AI 设置页新增与「AI」「MCP」平级的「服务商」标签页，支持多服务商 CRUD；密钥加密存储；后端读取工作区默认服务商配置调用大模型，覆盖环境变量（`AI_DRIVER` 等），无配置时回退环境变量。

## Key Architecture Findings (from codebase)

- 当前 AI 客户端只在三处读取环境变量：`core/ai-chat/services/ai-chat-llm.client.ts`（chat：`getOpenAiApiKey`/`getOpenAiApiUrl`/`getAiChatModel`）、`core/ai/services/embedding.service.ts`（embed：`getOpenAiApiKey`/`getOpenAiApiUrl`/`getAiEmbeddingModel`）、`core/ai/processors/ai-queue.processor.ts`（embedding 模型名）。
- 密钥加密复用 `integrations/encryption/EncryptionService`（`encrypt`/`decrypt`，AEAD 信封）。
- 管理员权限守卫参考 `ee/api-key/api-key.controller.ts`（`JwtAuthGuard` + CASL `Manage/API` 能力）；客户端用 `useUserRole().isAdmin` 门控。
- AI 为社区功能（无许可也可用），故 `Feature.AI_PROVIDERS` 应加入 `COMMUNITY_FEATURES`。
- 数据访问用 Kysely：`database/migrations/` 迁移 + `database/types/db.d.ts` 表类型 + `database/types/entity.types.ts` 实体类型；repo 用 `@InjectKysely()`。
- 前端 AI 设置页：`apps/client/src/ee/ai/pages/ai-settings.tsx`（Tabs: `ai`/`mcp`，路由 `/settings/ai`、`/settings/ai/mcp`）；i18n 用 `t("...")` 内联英文（react-i18next fallback）。

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | db-schema-and-repo | — | medium | no |
| 2 | server-service | 1 | high | no |
| 3 | server-controller | 2 | medium | no |
| 4 | backend-wiring | 2 | high | no |
| 5 | client-routing-tab | — | low | yes |
| 6 | client-provider-ui | 3, 5 | high | no |

## Dependency Graph

```
Task 1 → Task 2 → Task 3 ─┐
         Task 2 → Task 4   ├─→ Task 6
Task 5 ───────────────────┘
```

## Task Details

### Task 1: db-schema-and-repo
- **Creates**:
  - `apps/server/src/database/migrations/<YYYYMMDD>Thhmmss-add-ai-providers.ts` — 建表 `aiProviders`：`id`(uuid pk)、`workspaceId`(uuid)、`name`、`driver`(varchar)、`apiKeyEncrypted`(text, nullable)、`baseUrl`(varchar, nullable)、`completionModel`(varchar)、`embeddingModel`(varchar, nullable)、`isDefault`(boolean default false)、`createdAt`/`updatedAt`；索引 `workspaceId` 与唯一约束（`workspaceId`+`isDefault` 由 service 保证唯一）。
  - `apps/server/src/core/ai/repos/ai-provider.repo.ts` — Kysely repo：`insertProvider`、`updateProvider`、`findById`、`listByWorkspace`、`findDefault(workspaceId)`、`deleteProvider`、`setDefault(workspaceId, id)`（先清旧 default 再置新）。
  - `apps/server/src/core/ai/repos/ai-provider.repo.spec.ts` — 用内存/Kysely 测试 insert/list/findDefault/setDefault(唯一)/delete。
- **Modifies**:
  - `apps/server/src/database/types/db.d.ts` — 增加 `AiProviders` 表接口与 `Database` 的 `aiProviders` 键。
  - `apps/server/src/database/types/entity.types.ts` — 增加 `AiProvider` 实体类型。
- **Acceptance**: 迁移可 `migration:up` 成功；repo spec 全绿（含 default 唯一性、按 workspace 隔离）。

### Task 2: server-service
- **Creates**:
  - `apps/server/src/core/ai/services/ai-provider.service.ts` — `AiProviderService`：
    - `createProvider(workspaceId, dto)`：用 `EncryptionService.encrypt` 加密 `apiKey`（非空时），调用 repo 写入；若 `isDefault` 则 `setDefault`。
    - `updateProvider(id, workspaceId, dto)`：仅当 `apiKey` 传入才重加密更新；`isDefault` 处理。
    - `listProviders(workspaceId)`：返回列表，**不含 `apiKey` 明文**（映射为 `hasApiKey: boolean`）。
    - `deleteProvider(id, workspaceId)`。
    - `getActiveProviderConfig(workspaceId)`：取 `findDefault`；有则解密返回 `{driver, apiKey, baseUrl, completionModel, embeddingModel}`；无则基于 `EnvironmentService`（`getAiDriver`/`getOpenAiApiKey`/`getOpenAiApiUrl`/`getAiCompletionModel`/`getAiEmbeddingModel`）返回环境变量配置——保持现状行为。
  - `apps/server/src/core/ai/dto/ai-provider.dto.ts` — `CreateAiProviderDto`（`name` required、`driver` ∈ enum、`apiKey` required、`baseUrl` optional、`completionModel` required、`embeddingModel` optional、`isDefault` optional boolean）、`UpdateAiProviderDto`（同字段均 optional，但 `apiKey` 仅传时更新）、`AiProviderResponseDto`。
  - `apps/server/src/core/ai/services/ai-provider.service.spec.ts` — 覆盖：加密落库、更新不泄露明文且可选更新 key、list 无明文、单 default 约束、`getActiveProviderConfig` 默认/回退两条路径。
- **Modifies**: `apps/server/src/core/ai/ai.module.ts`（providers 增加 `AiProviderService, AiProviderRepo`；imports 增加 `EncryptionModule`）。
- **Acceptance**: service spec 全绿；`getActiveProviderConfig` 在「有默认」与「无默认回退」下分别返回正确来源。

### Task 3: server-controller
- **Creates**:
  - `apps/server/src/core/ai/ai-provider.controller.ts` — `@Controller('ai-providers')` + `JwtAuthGuard`；端点：`POST`（list）、`POST('create')`、`POST('update')`、`POST('delete')`、`POST('set-default')`；每个端点 `assertManage`（CASL `Manage/API` 或管理员校验，沿用 api-key 模式）；响应经 `AiProviderResponseDto`（无明文 key）。
  - `apps/server/src/core/ai/ai-provider.controller.spec.ts` — 覆盖：非管理员 403；各端点成功；响应体中**不含 `apiKey` 明文**。
- **Modifies**: `apps/server/src/core/ai/ai.module.ts`（controllers 增加 `AiProviderController`）。
- **Acceptance**: 控制器 spec 全绿；权限拦截与密钥不回显均验证。

### Task 4: backend-wiring
- **Modifies**:
  - `apps/server/src/core/ai-chat/services/ai-chat-llm.client.ts` — `streamChat`/`buildModel` 接受可选 `ResolvedAiProvider` 覆盖（apiKey/baseUrl/model），缺省回退 `EnvironmentService`。
  - `apps/server/src/core/ai/services/embedding.service.ts` — `embed` 接受可选 `ResolvedAiProvider` 覆盖（apiKey/baseUrl/embeddingModel），缺省回退。
  - `apps/server/src/core/ai-chat/services/ai-chat.service.ts` + 其 controller：解析工作区默认 provider（`AiProviderService.getActiveProviderConfig(workspaceId)`，controller 已有 `AuthWorkspace`）并传入 `streamChat`。
  - `apps/server/src/core/ai/processors/ai-queue.processor.ts`：`embedPages` 解析 `workspaceId` 的默认 provider 传入 `embeddingService.embed`（模型名也用 provider.embeddingModel）。
  - 更新既有 `ai-chat-llm.client.spec.ts`、`embedding.service.spec.ts` 以适配新签名，并新增 provider 覆盖测试。
- **Test**: `apps/server/src/core/ai-chat/services/ai-chat-llm.client.spec.ts`（修改/新增：传入 provider 时 `createOpenAI` 用其 apiKey/baseUrl/model；不传时回退 env）。
- **Acceptance**: 传入默认 provider 时实际用其配置调用；无 provider 时行为同现状（env）。

### Task 5: client-routing-tab
- **Creates**:
  - `apps/client/src/ee/ai/components/provider-settings.tsx` — 占位（Task 6 实现）。
  - `apps/client/src/ee/ai/pages/ai-settings-tab.spec.tsx` — 测试 Tab 渲染（含 `provider` 标签；非 admin 不渲染）。
- **Modifies**:
  - `apps/client/src/App.tsx` — 增加路由 `ai/providers` → `<AiSettings />`（复用页面，靠 pathname 区分 tab）。
  - `apps/client/src/ee/ai/pages/ai-settings.tsx` — `Tabs.List` 增加 `provider` Tab；`activeTab` 增加 `providers` 判断；`handleTabChange` 增加 `navigate("/settings/ai/providers")`；新增 `Tabs.Panel value="providers"` 渲染 `<ProviderSettings />`。
  - `apps/client/src/ee/features.ts` — 增加 `AI_PROVIDERS: 'ai:providers'` 并加入 `COMMUNITY_FEATURES`。
- **Acceptance**: 路由 `/settings/ai/providers` 渲染「服务商」标签且高亮；与 AI/MCP 平级。

### Task 6: client-provider-ui
- **Creates**:
  - `apps/client/src/ee/ai/components/provider-settings.tsx` — 完整实现：服务商列表（名称、driver、model、默认徽标、操作）、新增/编辑弹窗表单（字段：name、driver 下拉、apiKey 密码框——仅输入时提交、baseUrl、completionModel、embeddingModel、设为默认开关）、删除确认；用 `useHasFeature(Feature.AI_PROVIDERS)` + `isAdmin` 门控；调用 API service。
  - `apps/client/src/ee/ai/services/ai-provider-service.ts` — `listAiProviders`、`createAiProvider`、`updateAiProvider`、`deleteAiProvider`、`setDefaultAiProvider`（fetch 封装）。
  - `apps/client/src/ee/ai/types/ai-provider.types.ts` — `AiProvider`、`CreateAiProviderInput` 等。
  - `apps/client/src/ee/ai/components/provider-settings.spec.tsx` — 渲染列表、打开创建表单、必填校验、删除确认交互（mock service）。
  - `apps/client/src/ee/ai/services/ai-provider-service.spec.ts` — mock fetch 验证请求体与端点。
- **Modifies**: i18n（在组件中用 `t("...")` 内联英文，沿用现有模式；如需集中词条则补对应 locale）。
- **Acceptance**: 可新增/编辑/删除服务商；apiKey 不回显明文；设为默认生效；UI 测试与 service 测试全绿。

## Notes / Risks

- 迁移后若仓库用 `kysely-codegen`，需重新生成 `db.d.ts`（计划以手填接口兜底）。
- driver 实际调用：openai / openai-compatible / ollama 均经 `createOpenAI({apiKey, baseURL})`；gemini 暂按 baseURL 兼容网关处理，深度适配可后续。
- `getActiveProviderConfig` 是「驱动后端真实生效」的核心；回退路径必须保留以确保无配置时与现状一致。
- 文件冲突：Task 5 与 Task 6 都触及 `provider-settings.tsx`，已设为顺序依赖（6 依赖 5）。
