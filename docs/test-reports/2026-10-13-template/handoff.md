# Handoff: Template Backend (Templates API)

## Status
- Overall: **DONE**
- Tasks completed: 4 / 4
- Last updated: 2026-10-13T01:00:00Z

## What Was Done

| Task | Status | Summary |
|------|--------|---------|
| 1 `template-dtos` | done | 6 组 DTO（`ListTemplatesDto`/`TemplateInfoDto`/`CreateTemplateDto`/`UpdateTemplateDto`/`DeleteTemplateDto`/`UseTemplateDto`），字段与前端 `template-service.ts` 发送一致，使用 `class-validator` + `class-transformer`，配合全局 `ValidationPipe({whitelist:true})`。 |
| 2 `template-service` | done | `TemplateService`：list / info / create / update / delete / useTemplate；权限模型（admin 或 `allowMemberTemplates`）；复用 `TemplateRepo`、`SpaceMemberRepo`、`WorkspaceRepo`、`PageService`。含 15 个单测。 |
| 3 `template-controller-module` | done | `TemplateController`（`@Controller('templates')` + `@UseGuards(JwtAuthGuard)`，6 个 `@Post` 端点）与 `TemplateModule`（imports `PageModule`）。 |
| 4 `wire-ee-module` | done | 在 `EeModule.imports` 注册 `TemplateModule`，`/api/templates/*` 不再 404。 |

## File Inventory (verified on disk)

### Created
- `apps/server/src/ee/template/template.dto.ts` — 6 组请求 DTO。
- `apps/server/src/ee/template/template.service.ts` — 业务逻辑 + 权限。
- `apps/server/src/ee/template/template.service.spec.ts` — 15 个单测（全绿）。
- `apps/server/src/ee/template/template.controller.ts` — 6 个端点，薄委托。
- `apps/server/src/ee/template/template.module.ts` — 模块声明。

### Modified
- `apps/server/src/ee/ee.module.ts` — 新增 `import { TemplateModule }` 并在 `imports` 数组加入 `TemplateModule`。

### Tests
- `apps/server/src/ee/template/template.service.spec.ts` — 覆盖 list 委托、info（命中/缺失）、create（admin / 成员开启 / 成员禁用）、update（成员禁止 / admin 更新 / 缺失）、delete（成员禁止 / admin）、use（空间越权 / 带 content 建页 / content 为 null 建空页）。

### Docs
- `docs/requirements/2026-10-13-template.md`、`docs/plans/2026-10-13-template.md`
- `docs/test-reports/2026-10-13-template/task-2-service.md`（测试报告）
- `docs/test-reports/2026-10-13-template/review.md`（五维评审）
- `docs/test-reports/2026-10-13-template/handoff.md`（本文件）

## Current Blocker
无。发现 F001（medium）为交付边界验证缺口：未做真实 Postgres e2e 启动、未提交/过 CI，但不阻塞功能完成。

## Next Steps (for whoever takes over)
1. 启动 dev DB，端到端验证 6 个端点（前端模板列表/编辑/“用模板建页面”）。
2. 创建 conventional commit：
   ```
   feat(ee): implement template backend API

   Add controller, service, DTOs and module for the enterprise template
   feature, wiring it into EeModule. Reuses TemplateRepo, PageService,
   SpaceMemberRepo and WorkspaceRepo.

   Refs: docs/requirements/2026-10-13-template.md
   ```
3. 跑 `pnpm --filter server test:e2e` 关闭 F001（可选）。
4. 如需控制器级 e2e，可补 `template.controller.spec.ts`（当前由 service 单测覆盖）。

## Known Risks / TODOs
- `useTemplate` 与写路径仅以 mock 做单测；真实 DB/事务路径未运行时验证。
- 控制器为薄委托，无独立测试（业务逻辑已被 service 单测覆盖）。
- 权限模型沿用前端约定：`canCreateTemplate = isWorkspaceAdmin || allowMemberTemplates`；改/删仅 admin；`useTemplate` 要求目标 `spaceId ∈ accessibleSpaceIds`。

## How to Resume
```bash
cd /home/wuxiufeng/repos/docmost
sean status template        # 查看当前状态
sean review template        # 查看五维评审与发现
pnpm --filter server jest ee/template/template.service.spec.ts   # 跑单测
pnpm --filter server build  # 类型检查（注意 dist 清理可能被安全拦截，可用 tsc --noEmit -p tsconfig.build.json）
```
