# Cloud Drive v2 — 网盘作为「空间」的新类型（取代独立云盘设计）

> 本需求取代 `2026-10-16-cloud-drive.md`（独立顶层云盘模块设计，已 DONE，11/11 task 完成）。
> **架构变更**：网盘不再是与「空间 / 在线文档」平级的顶层模块，而是**空间（Space）的一种新类型 `drive`**；原有空间隐式为 `page` 类型。
> 已实现的 v1 网盘功能需按新模型调整，并补充**多语言（i18n）**支持。

## Problem（用户痛点 + 调整动机）

原 v1 设计把云盘做成与空间平级的独立顶层模块，导致：

- **用户心智分裂**：文件资产与文档资产分处两处导航（`/spaces` 与 `/drive`），体验割裂。
- **权限 / 成员 / 共享模型重复**：v1 自造了一套 `driveType(personal/shared)` + `ownerId` 的权限模型，与空间成熟的成员 / 角色 / CASL 模型重叠，维护双份。
- **无法复用空间治理基础设施**：分享、配额、版本、审计、回收站等能力无法复用空间已有的协作与治理机制。

正确做法：**把「网盘」定义为空间的一种类型（`type: drive`）**，与 `type: page`（原有在线文档空间）平级共存于同一空间体系。打开一个 drive 空间即进入类云盘的文件管理；原有 page 空间行为完全不变。同时，所有新增 / 改造的 UI 文案必须支持多语言（i18n）。

## 范围（分阶段，基于已实现的 v1 调整）

### Phase 1 — 空间类型化 + 网盘核心（必须交付）

- **数据模型（核心改造）**
  - `spaces` 表新增 `type` 列，取值 `page`（默认，向后兼容现有空间）与 `drive`。
  - `drive_folders` / `drive_files` 改造：用 `spaceId` 取代 `driveType` + `ownerId`，使网盘归属到一个 `drive` 类型空间；根文件夹 = `spaceId` 非空且 `parentId IS NULL`；文件归属 `spaceId` + `folderId(可空)`。
  - **网盘空间 = `type: drive` 的普通空间，不再区分个人盘 / 共享盘**。成员权限完全由空间角色（reader / writer / admin）管理——用户通过空间成员与角色控制谁能查看 / 上传 / 删除文件。删除独立的 `driveType` 概念与"个人盘"概念。
- **导航（核心改造）**：取消独立顶层 `/drive`（个人 / 共享）入口；网盘作为 `drive` 类型空间出现在空间列表 / 侧边栏（用图标 + 类型区分）。打开 drive 空间进入文件夹浏览器而非页面树。
- **文件夹树、上传、预览、基础操作（重命名 / 移动 / 删除(软删) / 下载）**：沿用 v1 已实现能力，但接口与 UI 改为 **space 作用域**。
- **权限（核心改造）**：复用空间 CASL 能力（`space-ability.factory`），drive 空间成员按角色（reader/writer/admin）受限；废弃独立的 `drive-ability.factory`（或仅保留 thin 适配层）。
- **i18n（核心改造）**：所有新增 / 改造的 UI 文案走 `useTranslation` + `apps/client/public/locales/<lang>.json`，至少覆盖 `en-US` 与 `zh-CN`，其余 10 种语言按需补齐。

### Phase 2 — 协作增强（沿用 v1，改为 space 作用域）

- 分享链接、配额 / 用量、文件版本历史：从 v1 的 `/drive/*` 端点迁移为 space 作用域端点（如 `/spaces/:spaceId/drive/...`），数据表（`drive_shares`、`drive_file_versions`）加 `spaceId` 关联。

### Phase 3 — 在线办公（独立 epic，不变）

- `.docx` / `.xlsx` 在线编辑：集成 OnlyOffice 或 Collabora/CODE（独立服务、格式双向转换、协同、回调保存）。作为 `cloud-drive-office-edit` 独立需求 / 计划跟进。

## Behaviors（关键行为）

- 用户可在空间列表 / 侧边栏看到两类空间：**页面空间（page）** 与 **网盘（drive）**，以图标 / 类型标签区分。
- 点击网盘空间 → 进入该空间的文件夹浏览器（面包屑、网格 / 列表切换、按名称 / 时间 / 类型排序与搜索）。
- 在网盘空间内：建文件夹、拖拽 / 选择上传（含进度）、预览（图片缩略 / 音视频播放 / 文档图标）、重命名 / 移动 / 删除(软删) / 下载，行为与 v1 一致但**作用域是该空间**。
- 网盘空间成员权限由空间角色决定（reader 不可上传 / 删除，writer/admin 可）。
- 网盘空间（drive）由空间成员与角色管理权限：reader 仅可浏览 / 下载，writer / admin 可上传 / 移动 / 删除；无"个人盘 / 共享盘"之分。
- 所有用户可见文案随当前语言切换（i18n）。

## Acceptance Criteria

**Phase 1**

- 迁移后 `spaces` 含 `type` 列；存量空间默认 `page`（不破坏现有行为）。 → test（迁移 spec）
- `drive_folders` / `drive_files` 含 `spaceId`、不再以 `driveType`/`ownerId` 作为归属主键（或已弃用）；根文件夹 / 文件正确归属到 drive 空间。 → test + 手动
- 空间列表 / 侧边栏同时展示 page 与 drive 类型；打开 drive 空间进入文件夹浏览器。 → 手动 + 前端 test
- 在 drive 空间内建 / 改 / 移 / 删文件夹与文件成功，作用域正确（不会串到别的 space）。 → test + 手动
- drive 空间成员按角色受限（reader 上传 / 删除返回 403）。 → test（权限守卫，复用空间能力）
- 全部新增 / 改造 UI 文案经 `t()` 并由 en-US / zh-CN 资源覆盖（无硬编码裸文本）。 → 前端 test / lint
- 前端 `build`/eslint、后端 `tsc`/eslint 通过。 → test

**Phase 2 / 3**：同 v1 验收，端点与数据改为 space 作用域。

## Context（技术上下文）

- 技术栈：pnpm + Nx monorepo；Server = NestJS 11 (Fastify) + Kysely/Postgres；Client = React 19 + Vite + Mantine + react-i18next（locale 在 `apps/client/public/locales/<lang>/`，已含 12 语言含 `zh-CN`）。
- 现有 `Spaces` 表（`apps/server/src/database/types/db.d.ts`）无 `type` 列；现有 `DriveFolders` / `DriveFiles` 使用 `driveType` / `ownerId`，**与 `Spaces` 无关** —— 这正是 v2 要改造的核心。
- 已实现的 v1 代码（待调整）：
  - Server：迁移 `20261016T090000-drive.ts`、`20261017T000000-drive-shares.ts`、`20261017T010000-drive-file-versions.ts`；`core/drive/services/drive.service.ts`、`drive-storage.service.ts`；`core/casl/abilities/drive-ability.factory.ts`；`core/drive/drive.controller.ts`、`drive.module.ts`、`dto/drive.dto.ts`；`core/drive/services/drive-share.service.ts`、`drive-quota.service.ts`、`drive-version.service.ts`。
  - Client：`features/drive/`（drive-page.tsx、components[11]、queries、services、types）；独立 `/drive` 路由与导航（`App.tsx`、全局侧边栏）。
- 权限：v2 复用 `core/casl/abilities/space-ability.factory.ts`，drive 空间直接用空间能力，避免双模型。
- 存储：复用 S3（`integrations/storage`），key 前缀改为含 `spaceId`（如 `drive/{workspaceId}/{spaceId}/{folderId?}/{uuid}`）。
- i18n：客户端已全局启用 `react-i18next`（`src/i18n.ts`，http-backend 加载 `/public/locales`）；新增 key 只需在对应语言 json 增加，组件用 `t('key')`。
- 既有相关特性：`attachment-upload-limit`（DONE，大小 / 类型限制兜底，网盘上传应复用）。**不再有"个人网盘"概念**（`personal-space` 仅用于页面类空间，不用于 drive）。

## Constraints（约束）

- **向后兼容**：存量 page 空间行为不变；迁移必须安全（默认 `type='page'`、回填 drive 数据到 `spaceId`）。
- **不重复造权限 / 成员 / 共享模型**：drive 复用空间体系，废弃独立 `driveType`/`ownerId` 与独立 drive 能力工厂（或最小适配）。
- 复用 S3 与既有上传 / 存储 / 大小限制（`FILE_UPLOAD_SIZE_LIMIT`）基础设施。
- 遵循 CASL 授权与 `class-validator` DTO 约定，不信任原始请求体。
- **所有用户可见文案必须 i18n**（en-US 为 fallback，至少补齐 zh-CN）。

## Non-goals（非目标）

- Phase 3 Office 在线编辑（独立 epic）。
- 跨工作区共享。
- 重写页面内附件上传（`upload-*-action` 系列保持独立）。
- 不影响 page 类型空间的既有功能与数据。

## Artifacts (expected)

> 需求文档只声明**需要什么类型**的产物，不声明具体路径。具体路径由 `sean plan` 决定，索引写入 `docs/artifacts/<date>-cloud-drive.md`。

- **Database**：
  - 迁移：给 `spaces` 加 `type` 列（默认 `page`）；给 `drive_folders` / `drive_files` / `drive_shares` / `drive_file_versions` 加 `spaceId`；回填（将 v1 的 personal/shared + ownerId 映射为对应 drive 空间）；弃用 / 删除 `driveType` / `ownerId`（分步）。
- **Batch**：一次性数据回填 / 迁移脚本（若线上已存在 v1 drive 数据，将其归并到新建的 drive 空间并写 `spaceId`）；以及必要的双写 / 校验脚本。
- **Config**：若新增 drive 相关配置项（如 `DRIVE_STORAGE_QUOTA` 已有，沿用），补充 `.env` 模板说明（写 `config/`）。

## 澄清结论（已确认）

- **无个人网盘**：drive 即 `type:drive` 的普通空间，无 personal/shared 之分；权限完全由空间成员角色（reader/writer/admin）管理。不自动创建个人盘，用户手动创建 drive 空间并配置成员。
- **无生产 v1 数据**：生产环境不存在 v1 drive 数据；batch 回填脚本仅作为幂等安全网保留，一般无需执行。
- **权限**：完全删除 `drive-ability.factory`，复用空间 CASL（reader→Read Drive，writer/admin→Manage Drive）。
- **网盘内导航（参考腾讯微云）**：drive 空间内左侧提供分类：`最近`、`全部`、`图片`、`文档`、`视频`、`音乐` 等；按文件类型 / MIME / 扩展名过滤，`最近` = 按修改 / 创建时间倒序。
- **Phase 2**：分享 / 配额 / 版本本轮一并实施（控制器路由整体迁移使然）。
