# Task 3 — frontend-ai-settings-toggle

## Status: done
## Evidence: exercised

## What was done
- 新建 `apps/client/src/ee/ai/ai-settings-toggle.spec.tsx`，验证「设置 → AI 设置」页中的 AI 开关在自托管社区版（无许可证、entitlement 为空）下可交互。
- 直接验证 `useHasFeature('ai')` / `useHasFeature('ai:controls')` 在空 entitlement 下返回 `true`（依赖 Task 1 把两 feature 加入 `COMMUNITY_FEATURES`）。
- 渲染 `EnableAiChat` / `EnableGenerativeAi` / `EnableAiSearch` 组件，断言其 `Switch` 对应的 `<input>` 的 `disabled` 为 `false`（即 `hasAccess` 为 `true`，不再被企业版门控禁用）。

## TDD
- RED: 临时回退 `features.ts`（COMMUNITY_FEATURES 不含 `'ai'`）后，`useHasFeature('ai')` 返回 `false`，三个组件开关 `disabled` 为 `true` → 失败。
- GREEN: 恢复 `features.ts`（含 `'ai'` / `'ai:controls'`）后，5 个用例全部通过。
- 修复了两处测试脚手架问题（属环境，非产品缺陷）：
  1. Mantine 组件渲染需 `MantineProvider` 包裹。
  2. jsdom 缺少 `window.matchMedia`，Mantine 的 color-scheme 检测调用它 → 在 spec 中 polyfill。

## Tests
- `apps/client/src/ee/ai/ai-settings-toggle.spec.tsx` — 5 passed
  - useHasFeature(Feature.AI) returns true with an empty entitlement
  - useHasFeature(Feature.AI_CONTROLS) returns true with an empty entitlement
  - EnableAiChat renders an enabled switch
  - EnableGenerativeAi renders an enabled switch
  - EnableAiSearch renders an enabled switch

## Verification
- `pnpm --filter client exec vitest run src/ee/ai/ai-settings-toggle.spec.tsx` → 5 passed.

## Known limits
- 仅验证 UI 开关可交互；AI Chat 后端可用性由 Task 4（build-and-verify）与既有 ai-chat 测试覆盖。
