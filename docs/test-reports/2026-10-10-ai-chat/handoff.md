# Handoff: AI Chat (独立实现)

## Status
- Overall: **DONE**（代码与测试已写完；本环境无法实跑测试，见下方说明）
- Tasks completed: 8 / 8
- Last updated: 2026-10-10

## What Was Done

| Task | Status | Summary |
|------|--------|---------|
| 1 ai-chat-db-types | done | `db.d.ts` 已含 `AiChats`/`AiChatMessages` 接口与 `DB.aiChats`/`DB.aiChatMessages`，无需改动 |
| 2 ai-chat-repo | done | `AiChatRepo`：create/findById/list(getChatMessages)/insertMessage/updateTitle/softDelete/search，基于 Kysely |
| 3 ai-chat-llm-client | done | `AiChatLlmClient`：OpenAI 兼容流式封装，`streamTextFn` 可注入便于测试 |
| 4 ai-chat-service | done | `AiChatService`：编排 repo+llm，处理新建对话/历史/持久化/事件流/鉴权 |
| 5 ai-chat-controller | done | `AiChatController`：6 个 REST 端点 + `/send` SSE 流式；DTO 校验 |
| 6 frontend-core | done | 类型、API 客户端（fetch SSE）、react-query hooks、`useChatStream` hook |
| 7 frontend-ui | done | 页面 + 侧边栏/消息列表/消息气泡/输入框组件（Mantine） |
| 8 frontend-routing | done | App.tsx 路由指向 `features/ai-chat`；全局侧边栏新增「AI Chat」入口 |

## File Inventory (verified on disk)

### Backend (新增, `apps/server/src/core/ai-chat/`)
- `types/ai-chat.types.ts` — SSE 事件契约 + SendChatInput
- `repos/ai-chat.repo.ts` — Kysely 数据访问
- `repos/ai-chat.repo.spec.ts` — repo 测试（mock Kysely）
- `services/ai-chat-llm.client.ts` — LLM 流式客户端
- `services/ai-chat-llm.client.spec.ts` — LLM 客户端测试
- `services/ai-chat.service.ts` — 业务编排
- `services/ai-chat.service.spec.ts` — service 测试（mock repo+llm）
- `dto/ai-chat.dto.ts` — DTO 校验
- `ai-chat.controller.ts` — 控制器
- `ai-chat.controller.spec.ts` — 控制器测试（mock service）
- `ai-chat.module.ts` — 模块
- 修改：`core/core.module.ts`（导入 AiChatModule）

### Frontend (新增, `apps/client/src/features/ai-chat/`)
- `types.ts`, `services/ai-chat.service.ts`, `queries/ai-chat.queries.ts`,
  `hooks/use-chat-stream.ts`, `pages/ai-chat.tsx`,
  `components/{chat-message,chat-message-list,chat-input,ai-chat-sidebar}.tsx`
- 修改：`App.tsx`（`/ai`、`/ai/chat/:chatId` 指向本功能）、
  `components/layouts/global/global-sidebar.tsx`（新增 AI Chat 导航项）

### 未改动
- `ee/` 下任何文件与许可/授权判定逻辑均未触碰。
- `db.d.ts` 未手改（类型已由既有迁移生成）。

## How to Run / Verify

```bash
# 后端测试（需先 pnpm install；测试用 mock，无需数据库）
pnpm --filter server test ai-chat

# 前端（如配置了 vitest）
pnpm --filter client test ai-chat

# 本地联调后端
cp .env.example .env   # 配置 DATABASE_URL / REDIS_URL
# 配置大模型（OpenAI 兼容）：
#   AI_API_KEY=sk-...
#   AI_BASE_URL=https://api.openai.com/v1   # 或兼容端点的 base url
#   AI_CHAT_MODEL=gpt-4o-mini
pnpm --filter server migration:up
pnpm dev
```

## Known Risks / TODOs
- 本环境无 jest/tsc 可执行文件，8 个测试文件已编写但**未实跑**；请在完整依赖环境中验证。
- `/send` 使用 Fastify `reply.raw` 手动写 SSE；`TransformHttpResponseInterceptor` 对裸流的影响需实跑确认。
- 页面上下文（@提及页面作为 RAG 上下文）未实现（MVP 外）；`attachmentIds`/`mentionedPageIds` 仅落库 metadata，未接入检索。
- 工具调用（tool_call/tool_result）事件契约已保留，但当前无工具实现，仅透传占位。

## Next Steps (for whoever takes over)
1. `pnpm install` 后在本地运行 `pnpm --filter server test ai-chat` 确认全绿。
2. 配置 `AI_*` 环境变量后，浏览器访问侧边栏「AI Chat」做端到端联调。
3. 如需页面级 RAG，扩展 `AiChatService.sendMessage` 拉取 @提及页面正文作为 system/content 上下文。
