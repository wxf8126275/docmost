# Space Direct Upload — 在空间内免建页面直接上传图片/语音/视频/文档

> 特性名归一化自用户描述「在空间增加可以直接上传图片、语音、视频，文档等，不用新增页面，然后在页面里上传附件」→ `space-direct-upload`。

## Problem（用户痛点）
当前所有附件（图片/音频/视频/PDF/通用文档）只能在**页面编辑器内**通过上传动作（`upload-image-action`、`upload-audio-action`、`upload-video-action`、`upload-pdf-action`、`upload-attachment-action`）上传，且底层 `uploadFile(file, pageId)` 强制依赖 `pageId`。用户想在空间层级**不创建新页面**就直接上传媒体/文档，形成可管理的空间资源，随后再在任意页面里插入这些已上传的附件。

## Behaviors（关键行为）
- 在空间 UI（空间首页 / 侧边栏）新增「直接上传」入口，支持拖拽与文件选择，接受图片、语音、视频、PDF 及通用文档。
- 上传时只需 `spaceId`（不要求 `pageId`），调用后端以空间维度创建附件记录。
- 上传成功后，在空间内展示已上传资源列表（缩略图 / 文件名 / 类型 / 大小 / 上传时间），并支持删除、复制引用链接。
- 在页面编辑器插入附件时，除现有的"本地选择上传"外，还能从「本空间已上传资源」中选择并插入（复用现有 `upload-*-action` 的插入能力）。
- 沿用既有上传大小 / 类型限制（`attachment-upload-limit` 已落地：默认 50MB、`FILE_UPLOAD_SIZE_LIMIT` 兜底）。

## Acceptance Criteria
- 在空间内不创建页面即可成功上传一张图片、一段音频、一段视频、一个 PDF、一个通用文档，且后端 `attachments` 记录 `spaceId` 非空、`pageId` 为空。 → 手动 / demo
- 上传大小超过 `FILE_UPLOAD_SIZE_LIMIT`（默认 50MB）时被拒绝并提示，与页面内上传一致。 → test（复用 limit 逻辑）
- 空间内资源列表正确展示上述已上传文件，删除后记录被软删除（`deletedAt`）。 → 手动
- 在页面编辑器内可从"本空间已上传资源"选择并成功插入附件，编辑器中可见嵌入节点。 → 手动 / demo
- 前端 `pnpm --filter client build` / eslint 通过；后端 `tsc` / eslint 通过。 → test
- 未授权用户（无该空间写权限 / CASL `attachment.create` 能力）无法上传。 → test（权限守卫）

## Context（技术上下文）
- 技术栈：pnpm + Nx monorepo；Server = NestJS 11 (Fastify) + Kysely/Postgres；Client = React 19 + Vite + Mantine。
- 存储层已就绪：`apps/server/src/database/types/db.d.ts` 的 `Attachments` 表同时含 `spaceId: string | null` 与 `pageId: string | null`（以及 `aiChatId`），空间级附件在 DB 层面本就支持，无需新增列。
- 现有上传链路：
  - 客户端：`apps/client/src/features/editor/components/{image,audio,video,pdf,attachment}/upload-*-action.tsx` 调 `@docmost/editor-ext` 的 `handleXxxUpload`，其 `onUpload` 调 `uploadFile(file, pageId)`（`apps/client/src/features/page/services/page-service.ts`）。
  - 校验：`getFileUploadSizeLimit()`（`apps/client/src/lib/config.ts`）与 `formatBytes`；类型白名单见 `attachment.constants.ts`（`.pdf` ∈ `inlineFileExtensions`）。
- 空间 UI 位置：`apps/client/src/features/space/components/`（含 `space-home-tabs.tsx`、`space-list.tsx`、`sidebar/`），是新增"直接上传"入口的自然落点。
- 权限：CASL abilities 定义于 `apps/server/src/core/`；附件创建需对应的 `attachment.create` 能力校验。
- 既有相关特性：`attachment-upload-limit`（DONE，大小/类型限制兜底）、各 `upload-*-action`（页面内上传，已落地）。

## Constraints（约束）
- **不重写**现有的页面内上传 UI（`upload-*-action` 系列），仅新增空间级入口与可选的"从空间资源插入"。
- 复用既有 `Attachments` 表与既有大小/类型限制，不新增存储列、不引入新配置项（上限沿用 `FILE_UPLOAD_SIZE_LIMIT`）。
- 保持默认 50MB 上限不变；遵循既有 `class-validator` DTO 与 CASL 授权约定。

## Non-goals（非目标）
- 不做空间资源的版本管理 / 在线预览编辑器（图片缩略图、音视频基础播放器可选，非必须）。
- 不改动现有页面内上传的业务流程与样式。
- 不做跨空间资源共享 / 全局媒体库（本期仅限"本空间"维度）。

## 待澄清（plan 阶段确认）
- 后端是**新增** `POST /spaces/:spaceId/attachments`（带 `spaceId` 参数）还是**扩展**现有 `attachment.controller` 让 `pageId` 可空、改传 `spaceId`？
- "从空间资源插入页面"是本期必须，还是仅做"空间内上传 + 列表 + 删除"（插入复用现有本地上传即可）？
- 空间资源列表的 UI 落点：独立 Tab（如 `space-home-tabs` 新增"资源"）还是侧边栏面板？
