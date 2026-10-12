# 审计日志（Audit Logs）

## Problem
工作区设置里的「Audit logs & SIEM」菜单在自托管社区版被 `Feature.AUDIT_LOGS` 门禁禁用，且后台目前只有 `NoopAuditService`（吞掉所有 `auditService.log(...)`，不落库），前端依赖的 `POST /audit`、`POST /audit/retention`、`POST /audit/retention/update` 接口根本不存在。需要补齐真实后台接口（审计事件落库 + 列表/筛选/留存），并让菜单在社区版可点击，复用现有前端页面。

## Behaviors
- **真实审计服务**：实现 `ee/audit` 下的 `AuditService`（实现 `IAuditService`），将各业务处调用的 `auditService.log / logWithContext / logBatchWithContext` 持久化到 `audit_logs` 表；actorId / actorType / ipAddress / userAgent 取自 CLS 中的审计上下文（`AUDIT_CONTEXT_KEY`），由 `AuditContextMiddleware` + `AuditActorInterceptor` 在请求链路中写入。
- **列表接口** `POST /api/audit`：按工作区游标分页，支持 `event / resourceType / actorId / spaceId / startDate / endDate` 筛选，返回 `IPagination<IAuditLog>`（含 `actor`，联表 `users` 取 id/name/email/avatarUrl；`resource` 暂返回 null，前端已对 null 做兜底）。
- **留存接口** `POST /api/audit/retention`：读取 `workspaces.auditRetentionDays`；`POST /api/audit/retention/update`：更新该列（入参 `auditRetentionDays`）。
- **权限**：仅工作区 owner 可访问（与前端 `useUserRole().isOwner` 对齐）；非 owner 返回 403。
- **菜单可点击**：社区版将 `Feature.AUDIT_LOGS` 视为默认可用（同 workspace-api-keys 的做法，加入 `COMMUNITY_FEATURES`）。

## Acceptance Criteria
- 迁移创建 `audit_logs` 表（含 id/workspaceId/actorId/actorType/event/resourceType/resourceId/spaceId/changes/jsonb/metadata/jsonb/ipAddress/userAgent/createdAt 及相应索引）→ 迁移可运行成功（验证）。
- `POST /api/audit` 返回真实分页数据；owner 可访问、非 owner 403 → 单测覆盖。
- 一次 `auditService.log(...)`（如工作区更新）会在 `audit_logs` 写入对应记录 → service 单测覆盖。
- `POST /api/audit/retention` 与 `/retention/update` 正确读写 `workspaces.auditRetentionDays` → 单测覆盖。
- 设置侧边栏「Audit logs & SIEM」在社区版（owner + 自托管）变为可点击，刷新前端可见 → 手动验证。

## Context
- 技术栈：NestJS + Kysely(Postgres)；React(Mantine) + @tanstack/react-query。
- 相关功能：`workspace-api-keys`（同类 EE 占位 + 社区启用模式，可直接复用其迁移/模块注册套路）、`ai-chat`（前期已实现的后台模块）。
- 约束：审计数据含 actor IP，必须按 `workspaceId` 隔离；审计事件量大，写路径应轻量（批量/异步可接受）。按 `retentionDays` 清理旧日志本期不做，列为 Non-goal。
- Non-goals：SIEM 流式（`Feature.SIEM`，页面内独立 tab）不在本期范围；前端 `ee/audit` 页面不改动（仅复用）。
