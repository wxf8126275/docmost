# Handoff: Base Backend (Bases API)

## Status
- Overall: DONE
- Tasks completed: 6 / 6
- Last updated: 2026-10-12T01:00:00Z

## What Was Done

补齐了此前完全缺失的 Bases 后端模块，使前端「Get started」里的 **Base** / **Kanban** 按钮（调用 `POST /api/bases/convert`）不再 404，并能创建 Base、加载并编辑。

| Task | Status | Summary |
|------|--------|---------|
| 1 | done | `position.util.ts` — 与前端 `fractional-indexing-jittered` 兼容的 base62 位置生成 |
| 2 | done | `base.dto.ts` — 全字段 DTO（whitelist 安全） |
| 3 | done | `base.service.ts` — convert/info/create/update/delete/list、properties/rows/views CRUD、export-csv、服务端 filter/sort 引擎 |
| 4 | done | `base.controller.ts` + `base.module.ts` + `realtime/base-ws.service.ts` |
| 5 | done | 在 `ee.module.ts` 注册 `BaseModule` |
| 6 | done | 单测：position / filter-sort / convert 流程，共 18 例全绿 |

## File Inventory (verified on disk)

### Created
- `apps/server/src/ee/base/position.util.ts` — 位置生成
- `apps/server/src/ee/base/position.util.spec.ts`
- `apps/server/src/ee/base/base.dto.ts` — 全部端点 DTO
- `apps/server/src/ee/base/base.service.ts` — 业务逻辑
- `apps/server/src/ee/base/base-filter.util.ts` — 过滤/排序引擎（已抽取，便于测试）
- `apps/server/src/ee/base/base-filter.util.spec.ts`
- `apps/server/src/ee/base/base.service.spec.ts`
- `apps/server/src/ee/base/base.controller.ts` — 21 个端点
- `apps/server/src/ee/base/base.module.ts`
- `apps/server/src/ee/base/realtime/base-ws.service.ts` — 满足 `ws/base-realtime.bridge.ts` 契约

### Modified
- `apps/server/src/ee/ee.module.ts` — imports 增加 `BaseModule`

### Tests
- `apps/server/src/ee/base/*.spec.ts` — 18 passed

## 验证
- `pnpm --filter @docmost/server exec tsc --noEmit` → 0 错误（全量类型检查通过）
- `npx jest ee/base --runInBand` → 3 suites / 18 tests passed
- 路由前缀为 `api`，控制器 `@Controller('bases')` 对应 `/api/bases/*`，与前端 `base-service.ts` 调用路径一致。

## Current Blocker (if any)
- 无阻塞。以下为已知限制（非阻塞，见下方 Known Risks）。

## Next Steps (for whoever takes over)
1. 在真实 Postgres 上手动验证 convert → info → rows/views 链路（当前单测用 mock DB，未跑真实 SQL）。
2. 完善非目标项（见下）。
3. 若需要真实多人实时协作，实现 `realtime/base-ws.service.ts` 的 `handleInbound`（目前为 no-op，客户端靠乐观更新兜底）。

## Known Risks / TODOs
- **实时协作**：`BaseWsService` 仅满足桥接契约，`handleInbound`/`handleDisconnect` 为 no-op。多端同步依赖前端乐观更新。
- **公式求值**：服务端仅持久化公式定义，单元格值在客户端（`@docmost/base-formula/client`）计算。
- **后台类型转换 job**（`pendingType` 异步链路）未实现，`updateProperty` 为同步直接改类型。
- **行级筛选/排序**为 JS best-effort 实现；relation 类 operator（`any`/`none`/`all`）与日期区间预设（`isWithin`）暂作透传（视为无约束）。
- **带视图 sort/filter 的分页**为近似：默认按 position 做 keyset 分页；当启用 sort/filter 时退化为单页返回（一次性取回），超大数据集下分页不精确。
- **`createBase` 新建页面**：直接 `PageRepo.insertPage`，未创建 watcher/事件联动（与原 `PageService.createPage` 相比）。

## How to Resume
```bash
cd apps/server
npx jest ee/base --runInBand        # 跑单测
npx tsc --noEmit                    # 类型检查
# 起本地服务后，前端「Get started」点 Base/Kanban 验证
```
