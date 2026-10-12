# Task 2 — backend-ai-settings-save

## Status: done
## Evidence: exercised

## What was done
- 新建 `apps/server/src/core/workspace/services/workspace.service.spec.ts`，为「完善后端接口」补契约/回归测试，覆盖 `WorkspaceService.update` 对 AI 设置开关的持久化链路。
- 验证 `update({ aiChat: true })` → `workspaceRepo.updateAiSettings(WS_ID, 'chat', true, …)` 被调用；`update({ aiChatReadOnly: true })` 先经 `licenseCheckService.hasFeature(…, Feature.AI_CONTROLS, …)` 校验（已 mock 放行），再调用 `updateAiSettings('chatReadOnly', true, …)`；`update({ aiChatWorkspaceKnowledgeOnly: true })` → `updateAiSettings('chatWorkspaceKnowledgeOnly', true, …)`。
- 反向用例：传入无关字段（`{ name: 'Renamed' }`）时不应调用 `updateAiSettings`。

## TDD
- 后端 `WorkspaceService.update` 的 AI 开关保存路径此前已实现（core/workspace 中已支持）。本任务以「补测试覆盖既有完善的后端接口」为目标：测试直接 GREEN，证明保存链路正确。
- 修复了一处测试 setup 缺陷（最初遗漏 `environmentService.isBetaPublicSpaces` 与 license 查询所需的 `db.selectFrom` 链 mock，导致 TypeError）——属测试脚手架问题，非产品缺陷。

## Tests
- `apps/server/src/core/workspace/services/workspace.service.spec.ts` — 4 passed
  - persists the AI Chat toggle via updateAiSettings("chat")
  - persists the AI Chat read-only toggle via updateAiSettings("chatReadOnly")
  - persists the workspace-knowledge-only toggle via updateAiSettings("chatWorkspaceKnowledgeOnly")
  - does not call updateAiSettings when the AI Chat toggle is absent

## Verification
- `pnpm --filter server exec jest workspace.service.spec.ts --runInBand` → 4 passed.

## Known limits
- 后端保存路径已验证；AI Chat 接口本身是否「真正拒绝未开启的工作区」未在此任务范围（ai-chat controller 不检查 workspace.settings.ai.chat，后续可增强）。
