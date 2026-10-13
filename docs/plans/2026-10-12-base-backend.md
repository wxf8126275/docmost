# Plan: Base Backend (Bases API)

Generated: 2026-10-12T00:00:00Z
Requirement: ../requirements/2026-10-12-base-backend.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | position util (fractional indexing) | — | low | yes |
| 2 | DTOs (whitelist-safe) | 1 | low | yes |
| 3 | BaseService (convert/info/CRUD/rows/views/export/filter-sort) | 2 | high | no |
| 4 | BaseController + BaseModule + realtime service | 3 | medium | no |
| 5 | Wire BaseModule into ee.module.ts | 4 | low | no |
| 6 | Service tests (convert + filter/sort) + run | 3 | medium | no |

## Dependency Graph
Task 1 → Task 2 → Task 3 → Task 4 → Task 5
Task 3 → Task 6

## Task Details

### Task 1: position util
- **Creates**: `apps/server/src/ee/base/position.util.ts`
- **Test**: `apps/server/src/ee/base/position.util.spec.ts`
- **Acceptance**: `generateKeyBetween` 产出严格介于 lower/upper 之间的 key（与前端 base62 顺序兼容）；null/null、null/b、a/null、a/b 用例正确。

### Task 2: DTOs
- **Creates**: `apps/server/src/ee/base/base.dto.ts`
- 声明全部前端下发字段（whitelist:true 要求），嵌套结构用 `@IsObject()`/`@IsArray()` 透传。

### Task 3: BaseService
- **Creates**: `apps/server/src/ee/base/base.service.ts`
- **Modifies**: —
- 覆盖：convert、info、createBase、updateBase、deleteBase、listBases、properties CRUD/reorder、rows CRUD/reorder/info/list（filter+sort JS 实现）、views CRUD/list、exportCsv。
- 依赖：`KyselyDB`、PageRepo、PageAccessService。

### Task 4: Controller + Module + realtime
- **Creates**: `base.controller.ts`, `base.module.ts`, `realtime/base-ws.service.ts`
- 路由对应 `base-service.ts` 的 21 个端点；`@Controller('bases')` + `JwtAuthGuard`。

### Task 5: Wire into ee.module.ts
- **Modifies**: `apps/server/src/ee/ee.module.ts`（imports 增加 `BaseModule`）。

### Task 6: Tests
- **Creates**: `apps/server/src/ee/base/base.service.spec.ts`
- 用 mocked `KyselyDB`/`PageRepo`/`PageAccessService` 验证 convert 创建默认属性/视图并返回 IBase；验证行级 filter/sort。
