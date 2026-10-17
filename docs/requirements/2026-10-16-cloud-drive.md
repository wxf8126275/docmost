# Cloud Drive — 独立云盘（个人私有盘 + 团队共享盘）

> 特性名演化：原 `space-direct-upload`（在空间直接上传素材）经产品讨论后，确定为**独立云盘模块**，与「空间/在线文档」平级，故重命名为 `cloud-drive`（本需求取代 `space-direct-upload`）。

## Problem（用户痛点）
用户有大量**不归属任何页面的组织资产**（如团队照片、音视频、文档），当前 docmost 的附件系统只能挂在页面/空间维度、扁平无文件夹、无"盘"的概念，无法像云盘一样集中管理、浏览与分享。用户需要：
- 类云盘的集中文件管理（文件夹、上传、预览、分享、配额、版本）。
- **既要个人私有盘，又要团队共享盘**。
- （后续）Word / 电子表格在线编辑。

将以上能力混进"空间（在线文档）"会模糊产品心智；正确做法是做成**顶层独立云盘模块**，空间保持文档纯粹性。

## 范围（分阶段）
### Phase 1 — 云盘核心（MVP，必须交付）
- 顶层「云盘」导航，独立于空间（与 Spaces 平级）。
- **双盘模型**：个人私有盘（仅本人）+ 团队共享盘（按角色/成员可见）。
- 文件夹树：创建 / 重命名 / 移动 / 删除 + 面包屑导航。
- 多文件拖拽上传（含进度）+ 单文件上传；文件夹上传可后续。
- 文件列表 / 网格视图，按名称 / 时间 / 类型排序与搜索。
- 预览：图片缩略图、音视频在线播放、文档图标（**非** Office 在线编辑）。
- 基础操作：重命名、移动到其他文件夹、删除（软删）、下载。
- 权限：CASL `driveFile.*` / `driveFolder.*` 能力；个人盘仅本人，共享盘按角色。
- 存储：复用现有 S3 集成（`integrations/storage`）。

### Phase 2 — 协作增强
- 分享链接：生成可访问链接，带权限（只读 / 可下载）与有效期。
- 配额与用量：工作区 / 个人存储配额统计与超限限制。
- 文件版本历史：覆盖上传生成新版本，可回溯下载。

### Phase 3 — 在线办公（独立 epic，不阻塞核心交付）
- Word(`.docx`) / 电子表格(`.xlsx`) 在线编辑，需集成 **OnlyOffice** 或 **Collabora/CODE**（独立服务、格式双向转换、协同光标、回调保存）。与盘本身（存储 + 文件夹 + 分享）是不同技术线，作为独立后续功能规划。

## Behaviors（关键行为）
- 进入「云盘」可见个人盘与共享盘入口；默认进入个人盘。
- 在任一盘内：建文件夹、上传（拖拽/选择）、点击文件预览（图片/音视频/图标）、对文件/文件夹执行重命名/移动/删除/下载。
- 共享盘内成员按 CASL 能力受限（如只读成员不可删/上传）。
- 上传沿用既有大小限制（默认 50MB，`FILE_UPLOAD_SIZE_LIMIT` 兜底，见 `attachment-upload-limit`）。

## Acceptance Criteria
**Phase 1**
- 顶层「云盘」可进入，分别展示个人盘与共享盘。 → 手动/demo
- 在盘内创建/重命名/移动/删除文件夹成功，面包屑正确。 → 手动
- 多文件拖拽上传成功，进度可见；后端记录 `folderId` 非空（盘根时为空）、`pageId/spaceId` 为空（纯盘文件）。 → test + 手动
- 图片缩略、音视频播放、文档图标预览正常。 → 手动
- 重命名/移动/删除/下载正确；删除为软删（`deletedAt`）。 → test + 手动
- 无权限成员（CASL）无法在共享盘上传/删除。 → test（权限守卫）
- 前端 `build`/eslint、后端 `tsc`/eslint 通过。 → test

**Phase 2**
- 生成分享链接，带权限/有效期，匿名/受限访问按设定生效。 → test + 手动
- 配额统计准确，超限被拒。 → test
- 文件覆盖上传产生版本，可回溯历史版本。 → test + 手动

**Phase 3**（独立 epic，本需求仅占位）
- `.docx`/`.xlsx` 可在浏览器内打开并编辑、保存回盘。 → 后续

## Context（技术上下文）
- 技术栈：pnpm + Nx monorepo；Server = NestJS 11 (Fastify) + Kysely/Postgres；Client = React 19 + Vite + Mantine。
- 存储后端：S3 经 `apps/server/src/integrations/storage`（现有附件上传已用），云盘直接复用，不另起存储。
- 现有 `Attachments` 表（`apps/server/src/database/types/db.d.ts`）含 `spaceId/pageId/aiChatId`（均可空），但**无文件夹层级、无"盘类型"**。Plan 阶段定：扩展 `Attachments`（加 `folderId`/`parentId` + `driveType` 标记）或新建 `DriveFiles` / `DriveFolders` 表。
- 客户端导航：参考 `apps/client/src/features/space/`、`home` 的路由/布局，新增 `/drive` 顶层路由与布局。
- 权限：CASL abilities 在 `apps/server/src/core/`；需新增盘相关能力。
- 预览：图片缩略、`<audio>`/`<video>` 播放器、文档图标复用现有组件/模式。
- 在线编辑（Phase 3）：需 OnlyOffice/Collabora 独立服务，与 docmost 自有 Tiptap 编辑器无关。
- 既有相关特性：`attachment-upload-limit`（DONE，大小/类型限制兜底，云盘上传应复用）。

## Constraints（约束）
- 云盘为**顶层独立模块**，不混入空间（在线文档）心智；空间功能保持纯粹。
- 复用 S3 与既有上传/存储基础设施，不另起存储系统。
- 遵循 CASL 授权与 `class-validator` DTO 约定，不信任原始请求体。
- 默认上传上限沿用现有 `FILE_UPLOAD_SIZE_LIMIT` 思路，不引入冲突配置。

## Non-goals（非目标）
- Phase 1 **不含** Office 在线编辑（独立 epic，见 Phase 3）。
- 不含跨工作区共享（仅工作区内）。
- 不含盘内文件实时多人协同（Phase 3 的 Office 协同由办公套件提供）。
- 不重写现有页面内附件上传（`upload-*-action` 系列保持独立）。

## 待澄清（plan 阶段确认）
- 共享盘归属：绑定到某个空间，还是工作区级共享盘（一个全局共享盘）？
- 数据模型：扩展 `Attachments` 还是新建 `Drive` 表？
- Phase 1 是否包含文件夹上传 / 批量操作（移动/删）？
- 配额默认值与超限行为（Phase 2 细化）。
- 个人盘与共享盘是否共用同一套文件夹/文件表（仅以 `ownerType`/`driveType` 区分）。
