# Task 1 — frontend-community-features

## Status: done
## Evidence: exercised

## What was done
- 在 `apps/client/src/ee/features.ts` 的 `COMMUNITY_FEATURES` 中加入 `Feature.AI` 与 `Feature.AI_CONTROLS`。
- 影响：自托管社区版（无企业许可证）下 `useHasFeature(Feature.AI)` / `useHasFeature(Feature.AI_CONTROLS)` 返回 `true`，「设置 → AI 设置」页中所有 AI 开关（AI Search / Generative AI / AI Chat）及 AI Chat 子选项（只读 / 仅工作区知识）不再被禁用 / 提示升级。

## TDD
- RED: 新建 `apps/client/src/ee/features.spec.ts`，断言 `COMMUNITY_FEATURES` 包含 `Feature.AI` 与 `Feature.AI_CONTROLS`。临时回退 `features.ts` 后运行 → 2 failed（`expected [...] to include 'ai'` / `'ai:controls'`），确认测试确实锻炼新行为。
- GREEN: 将两 feature 加入 `COMMUNITY_FEATURES` 后运行 → 2 passed。

## Tests
- `apps/client/src/ee/features.spec.ts` — 2 passed
  - includes Feature.AI
  - includes Feature.AI_CONTROLS

## Verification
- `pnpm --filter client exec vitest run src/ee/features.spec.ts` → 2 passed.
- 复跑从零确认稳定通过。

## Known limits
- 本次仅解除前端门控；AI Search / Generative AI 后端不在此任务范围（仅保留开关与设置标志）。
