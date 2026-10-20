# Handoff: cloud-drive（云盘空间化改造）

## Status
- Overall: DONE（13/13 任务；1 个 run 后 bug 已修复）
- Last updated: 2026-10-19T22:05:00Z

## Reliability
- Implemented by: step-5-preview
- Task first-pass rate: 13/13（无 task 进入 fix loop；两处强耦合合并执行：Task 5+6、Task 7+8）
- Post-run bugs: 1（B001，found by: user-manual，已修复并附回归测试）
- Trust level: **MEDIUM**
  - 1 个 user-manual bug（迁移 B 在含 v1 数据的库上崩溃），已用回归测试修复；
  - 建议在真实库上验证一次迁移（重启 backend 观察迁移 B 通过）后升回 HIGH。

## What Was Done

| # | Task | 状态 | 摘要 |
|---|------|------|------|
| 1 | db-space-type | done | `spaces.type` + drive 表 `space_id`；迁移 B 自愈（B001） |
| 2 | batch-backfill-drive | done | v1 drive → drive space 幂等回填（安全网） |
| 3 | space-type-service | done | `CreateSpaceDto.type` + 列表按 type 过滤 |
| 4 | drive-abilities-reuse | done | drive 权限复用空间 CASL（reader→Read，writer/admin→Manage） |
| 5 | drive-service-space-scoped | done | service/repos/storage key 全面 `spaceId` 化 |
| 6 | drive-controller-space-scoped | done | `spaces/:spaceId/drive/*` + 空间守卫；公开分享独立控制器 |
| 7 | client-drive-nav | done | 移除 `/drive`；按 `space.type` 分流；列表类型标识+筛选 |
| 8 | client-drive-ui-space-scoped | done | 客户端 drive 全链路 space 化 + 微云式分类栏 |
| 9 | drive-i18n | done | 12 语言 × 31 key |
| 10 | drive-share-space-scoped | done | 分享按 spaceId（服务端，Task 5+6 步吸收） |
| 11 | drive-quota-space-scoped | done | 配额按 spaceId（同上吸收） |
| 12 | drive-versions-space-scoped | done | 版本按 spaceId（同上吸收） |
| 13 | client-drive-share-quota | done | 实质由 Task 8+9 落地（吸收） |

## File Inventory（已在盘上核对）

### Created（server）
- `migrations/20261019T090000-space-drive-type.ts`、`20261019T100000-drive-space-id-notnull.ts`（自愈式）
- `database/backfill/drive-to-spaces.ts`（+spec）、`scripts/backfill-drive-to-spaces.ts`
- `core/drive/drive-public-share.controller.ts`
- `core/casl/abilities/space-ability.factory.spec.ts`、repo spec ×2、`features/drive/i18n.spec.tsx`、`drive-space.spec.tsx`

### Modified（server）
- `core/drive/**`（service/repos/storage/quota/share/version/dto/module/controller + specs）
- `core/casl/interfaces/space-ability.type.ts`、`abilities/space-ability.factory.ts`
- `core/space/**`（dto/service/repo/spec）、`database/types/{db.d.ts,entity.types.ts}`

### Modified（client）
- `features/drive/**`（types/service/query/page/components + specs）
- `pages/space/space-home.tsx`、`App.tsx`、`components/layouts/global/global-sidebar.tsx`
- `features/space/**`（types/create-form/spaces-page）、12 个 `public/locales/*/translation.json`

### Deleted（F010 落实）
- `core/casl/interfaces/drive-ability.type.ts`、`abilities/drive-ability.factory.ts`(+spec)

## Artifacts
- Catalog: `docs/artifacts/2026-10-19-cloud-drive.md`

| Path | Type | Task | Status | Executed | Verified |
|------|------|------|--------|----------|----------|
| `20261019T090000-space-drive-type.ts` | database | 1 | created | ✅（用户环境已应用） | ✅ |
| `20261019T100000-drive-space-id-notnull.ts` | database | 1 | created | ⬠（B001 修复后待用户在真实库重启验证） | ⬠ |
| `scripts/backfill-drive-to-spaces.ts` | batch | 2 | created | ⬜ | ⬜ |
| `config/drive.env.example` | config | 1 | created | — | — |

> 迁移由 boot 自动执行；B001 修复后，含 v1 数据的库重启即自愈回填再约束。

## Post-Run Bugs

| ID | Symptom | Classification | Found By | Status | Regression Test |
|----|---------|----------------|----------|--------|-----------------|
| B001 | 迁移 B 在含 v1 数据的库上崩溃（space_id NULL → NOT NULL 失败，backend crash-loop） | implementation | user-manual | fixed | `drive-space-type.spec.ts` 2 个 B001 用例（RED→GREEN） |

## Current Blocker
- 无。（F011 open：客户端 eslint 因环境缺 `@tanstack/eslint-plugin-query` 未跑——安装后 `cd apps/client && npx eslint src/features/drive` 即可。）

## Next Steps（如需继续）
1. **在真实库重启 backend**，确认迁移 B 自愈通过（日志无 migration 失败）→ 将 handoff Reliability 升 HIGH。
2. （可选）`pnpm --filter client build` 做一次生产构建确认。
3. （可选）补跑客户端 eslint 门禁（F011）。
4. git 提交（conventional）：`feat(drive): fold cloud drive into spaces (type:drive, space-scoped CASL)`。

## Known Risks / TODOs
- 迁移 B 的 `down()` 只还原 schema，不回滚已创建的空间（有意为之，数据安全优先）。
- 存量 12 个 server 测试套件失败为仓库既有 DI 债务（极简 spec 未提供依赖 token），与本次无关（已用 git stash 对照证明）。
- 客户端分享列表/撤销 UI 未做（v1 也没有；分享仅创建）。

## How to Resume
```bash
cd /home/wuxiufeng/repos/docmost
sean status cloud-drive
sean bug cloud-drive "..."            # 记录新 bug（test-first）
cd apps/server && npx jest database/ core/drive core/casl core/space
cd apps/client && npx vitest run
```
