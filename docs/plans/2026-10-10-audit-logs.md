# Plan: 审计日志（Audit Logs）

Generated: 2026-10-10T21:45:00Z
Requirement: ../requirements/2026-10-10-audit-logs.md

## Task Summary

| # | Task | Depends On | Complexity | Parallel Safe |
|---|------|-----------|------------|---------------|
| 1 | audit-logs-migration | — | low | yes |
| 2 | audit-repo | 1 | medium | no |
| 3 | audit-service | 2 | medium | no |
| 4 | audit-controller | 3 | medium | no |
| 5 | audit-module-wiring | 3,4 | low | no |
| 6 | frontend-menu-enable | — | low | yes |

## Dependency Graph
Task 1 → Task 2 → Task 3 → Task 4 → Task 5
Task 6 (independent, frontend only)

## Task Details

### Task 1: audit-logs-migration (DB)
- **Creates**: `apps/server/src/database/migrations/20261010T220000-add-audit-logs-table.ts`
- **Modifies**: `apps/server/src/database/types/db.d.ts` (add `AuditLogs` interface)
- **Test**: `apps/server/src/database/migrations/20261010T220000-add-audit-logs-table.spec.ts`
- **Acceptance**: `up(db)` creates `auditLogs` table with columns id/workspaceId/actorId/actorType/event/resourceType/resourceId/spaceId/changes/jsonb/metadata/jsonb/ipAddress/userAgent/createdAt + 索引(workspaceId, event, resourceType, actorId, spaceId, createdAt)；断言迁移可运行（mock Kysely 验证 CREATE TABLE 调用）。

### Task 2: audit-repo (Service/DB)
- **Creates**: `apps/server/src/ee/audit/repos/audit.repo.ts`, `...audit.repo.spec.ts`
- **Modifies**: —
- **Test**: `apps/server/src/ee/audit/repos/audit.repo.spec.ts`
- **Acceptance**: `insertAuditLog(AuditLogData)` 写入一行；`listAuditLogs({workspaceId, filters, cursor, limit})` 按工作区隔离并应用 event/resourceType/actorId/spaceId/startDate/endDate 筛选，游标分页返回 `{items, nextCursor}`；`updateRetention(workspaceId, days)` 更新 `workspaces.auditRetentionDays`。

### Task 3: audit-service (Service)
- **Creates**: `apps/server/src/ee/audit/services/audit.service.ts`, `...audit.service.spec.ts`
- **Modifies**: —
- **Test**: `apps/server/src/ee/audit/services/audit.service.spec.ts`
- **Acceptance**: `log(payload)` 经 CLS 审计上下文（actorId/actorType/ipAddress/userAgent/workspaceId）写入 audit_logs；`logBatchWithContext` 批量写入；`updateRetention` 调用 repo；`setActorId/setActorType` 为兼容实现（上下文取自 CLS，故为 no-op 或更新 CLS）。

### Task 4: audit-controller (Controller + Permissions + DTO)
- **Creates**: `apps/server/src/ee/audit/audit.controller.ts`, `...audit.controller.spec.ts`, `apps/server/src/ee/audit/dto/audit.dto.ts`
- **Modifies**: —
- **Test**: `apps/server/src/ee/audit/audit.controller.spec.ts`
- **Acceptance**: `POST /audit` owner 200 返回 `IPagination<IAuditLog>`（含 actor 联表）；非 owner 403；筛选参数透传到 repo。`POST /audit/retention` 返回 `{retentionDays}`；`POST /audit/retention/update` 更新并返回 `{retentionDays}`。权限用 `JwtAuthGuard` + owner 校验（`user.role === UserRole.OWNER`）。

### Task 5: audit-module-wiring (Integration)
- **Creates**: `apps/server/src/ee/audit/audit.module.ts`
- **Modifies**: `apps/server/src/ee/ee.module.ts`（用 `AuditModule` 替换 `NoopAuditModule`，因 AuditModule 提供全局 `AUDIT_SERVICE`）
- **Test**: `apps/server/src/ee/audit/audit.module.spec.ts`（TestingModule 编译通过，AUDIT_SERVICE 可解析）
- **Acceptance**: 服务端启动后 `AUDIT_SERVICE` 由真实 AuditService 提供（不再 Noop）；`POST /audit` 路由注册。

### Task 6: frontend-menu-enable (Frontend)
- **Modifies**: `apps/client/src/ee/features.ts`（`COMMUNITY_FEATURES` 加入 `Feature.AUDIT_LOGS`）
- **Test**: —（前端构建验证；侧边栏「Audit logs & SIEM」对 owner+自托管可点击）
- **Acceptance**: `pnpm --filter client build` 通过；刷新后菜单可点击（owner 已具备，env 自托管已具备）。
