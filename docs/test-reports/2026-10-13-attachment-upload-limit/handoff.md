# Handoff: Attachment Upload Size Limit (`attachment-upload-limit`)

> 交接文档 — 任何 AI（或人）可据此无缝接手完成提交与端到端验证。

## 状态
- **Workflow**：`DONE`（`start → plan → run → review → handoff` 闭合）
- **任务**：3/3 完成（client-config-fallback / server-env-fallback / verify-limits）
- **测试**：14/14 通过（client vitest 8 + server jest 6），0 失败，1 次 fix 修复
- **评审**：5 维均 ≥70，**Verdict PASS**，1 个 low 发现 `F001`
- **提交**：**未提交**（`git status` 显示代码、测试、文档与 `.sean` 元数据均为 modified/untracked）

## 根因（一句话）
`FILE_UPLOAD_SIZE_LIMIT` 为空串 / `0` 时，`bytes("")`→`null`、`bytes("0")`→`0`，前端 `formatBytes(null/0)` 显示「0.0 KB」且 `file.size > 0` 使任何文件「超出」；后端 multer 上限同样异常。PDF 类型本身被允许，报错纯属上限解析为 0。

## 文件清单（已核对磁盘）
**修改**
- `apps/client/src/lib/config.ts` — `getFileUploadSizeLimit` / `getFileImportSizeLimit` 在 `bytes()` 解析为 `null`/`NaN`/`<=0` 时回退默认（50mb / 200mb）
- `apps/server/src/integrations/environment/environment.service.ts` — 同上两方法用 `bytes(val) > 0` 校验，非正即回退默认字符串

**新增（测试）**
- `apps/client/src/lib/config.spec.ts`（vitest，8 用例）
- `apps/server/src/integrations/environment/environment.service.spec.ts`（jest，6 用例）

**文档**
- `docs/requirements/2026-10-13-attachment-upload-limit.md`
- `docs/plans/2026-10-13-attachment-upload-limit.md`
- `docs/test-reports/2026-10-13-attachment-upload-limit/task-1-client.md`
- `docs/test-reports/2026-10-13-attachment-upload-limit/task-2-server.md`
- `docs/test-reports/2026-10-13-attachment-upload-limit/review.md`
- `docs/test-reports/2026-10-13-attachment-upload-limit/handoff.md`（本文件）

**未改动（满足「沿用现有前端」）**：`upload-pdf-action.tsx`、`upload-image/audio/video-action.tsx`、`page-import-modal.tsx`、`formatBytes`（`lib/utils.tsx`）、`attachment.controller.ts:99`。

## 当前阻塞 / 待办
1. **未提交** — 代码与文档均在工作树，需 `sean commit attachment-upload-limit`。
2. **F001（low）** — 客户端 `eslint` 因环境缺失 `@tanstack/eslint-plugin-query` 无法运行；未对真实「插入 PDF」页面路径做端到端验证。
   - 修复：`pnpm install`（或装该插件）后 `npx eslint src/lib/config.ts src/lib/config.spec.ts`
   - 手动验证：以 `FILE_UPLOAD_SIZE_LIMIT` 为空 / `0` / `100mb` 启动，进入页面插入 PDF/图片/音频/视频，确认空/`0` 不再报 "0.0 KB"，`100mb` 按 100MB 校验。

## 已知风险
- 写路径仅 mock/单元级验证；控制器薄委托、注入 `window.CONFIG` 与 multer 上限未做真实 DB/HTTP e2e。
- 默认 50MB 不变；本修复不引入新配置项，不影响其它上传/导入逻辑（反而顺带消除 image/audio/video 上传与 DOCX/PDF 导入的同源潜在 bug）。

## 接手下一步
1. （可选）安装客户端依赖并跑 `eslint` 关闭 F001。
2. `sean commit attachment-upload-limit`（拆分：`fix:` 代码+测试一个，`.sean` 元数据一个）。
3. 启动 dev 环境手动验证「插入 PDF」不再报 0.0 KB（关闭 F001 的手动部分）。

## 恢复命令
```bash
# 前端单测
pnpm --filter client exec vitest run src/lib/config.spec.ts
# 后端单测
pnpm --filter server jest environment.service.spec
# 后端类型/lint
cd apps/server && npx tsc --noEmit -p tsconfig.build.json && npx eslint src/integrations/environment/environment.service.ts src/integrations/environment/environment.service.spec.ts
# 前端类型
cd apps/client && npx tsc --noEmit -p tsconfig.json
# 工作流状态
sean status          # 或读取 docs/.sean/state.json
```

## 关联特性
- `recycle-bin`（DRAFT，仅需求+start 历史，未实现）— 与本次无关，保持独立。
- `personal-space` / `template` / `base-backend`（DONE，已提交）。
