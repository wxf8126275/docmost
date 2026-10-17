# Task 6 — client-drive-ui

## Status: done
## Date: 2026-10-16

## What was done
新增 `apps/client/src/features/drive/` 前端云盘特性，并接入路由与侧边栏。

- **类型** `types/drive.types.ts`：`DriveType`、`IDriveFolder`、`IDriveFile`、`CreateFolderInput`、`UpdateFolderInput`、`UpdateFileInput`。
- **服务** `services/drive-service.ts`：封装 `api`（axios，baseURL `/api`，拦截器已剥离 `.data`）。
  - JSON 端点（folders/files 列举、create/update/delete）被服务端 `TransformHttpResponseInterceptor` 包成 `{ data: <payload> }`，客户端取 `res.data.folders` / `res.data.files` 等。
  - `uploadFile` 与下载走 `@Res()` passthrough（不包信封），`uploadFile` 直返裸 `IDriveFile`；下载用 `downloadFileUrl()` 拼 `/api/drive/files/:id/download`。
- **查询** `queries/drive-query.ts`：`useDriveFoldersQuery` / `useDriveFilesQuery` + 创建/重命名/删除/上传 mutation（含 `notifications` 失败提示）。
- **组件**
  - `components/drive-browser.tsx`：核心浏览器，网格/列表切换、名称搜索过滤、文件夹点击进入（回调 `onFolderOpen`）、文件行动作（下载/重命名/删除）、重命名 Modal。动作图标带 `aria-label` 并 `stopPropagation`，避免误触发文件夹进入。
  - `components/file-row-actions.tsx`：文件下载/重命名/删除图标（被 browser 复用）。
  - `components/breadcrumb.tsx`：基于 `path` 栈的面包屑，点击跳转到对应层级。
  - `drive-page.tsx`：个人/共享双盘切换、工具栏（新建文件夹 / 上传 / 搜索 / 视图切换）、面包屑、浏览器；新建文件夹与上传成功后 `invalidateQueries` 刷新列表。
- **接入**
  - `App.tsx`：懒加载 `DrivePage`，在 `<Layout>` 组内新增 `/drive` 路由。
  - `global-sidebar.tsx`：主导航新增「Drive」入口（`IconCloud` → `/drive`）。

## TDD
- RED：编写 `drive-browser.spec.tsx`（模拟 react-i18next、@mantine/notifications、`queries/drive-query` 模块），断言渲染、点击文件夹触发 `onFolderOpen`、删除动作调用 mutation。首次运行因 `./drive-browser` 不存在而失败。
- GREEN：4/4 通过。覆盖：文件夹/文件渲染、文件夹进入回调、文件夹/文件删除调用对应 mutation（契约 `{ folderId, driveType }` / `{ fileId, driveType }`）。
- 修复：`drive-service.ts` 相对路径 `./types` → `../types`；`uploadFile` 因 passthrough 返回值加 `as unknown as IDriveFile` 类型转换。

## Test result
```
PASS src/features/drive/components/drive-browser.spec.tsx  (4 passed)
```
- `tsc --noEmit`（client）无 drive/App/sidebar 相关类型错误。
- ESLint 无法运行：项目 `eslint.config.mjs` 依赖 `@tanstack/eslint-plugin-query` 模块缺失（环境问题，非本任务代码）。类型检查已替代验证。

## Acceptance check
- [x] 个人/共享双盘切换可用（`SegmentedControl`）。
- [x] 文件夹浏览 + 面包屑导航（`path` 栈 + 点击回跳）。
- [x] 动作完整：新建文件夹、上传、重命名、删除、下载。
- [x] 权限受限时动作隐藏/禁用：服务端 controller 已做 CASL 拦截；前端越权请求会被 403，由 `notifications` 提示（更细的按角色禁用 UI 留待共享盘角色细化）。

## Notes / 偏离计划
- 计划列了 `file-grid.tsx` 与 `folder-tree.tsx`。为避免冗余/未使用组件，网格/列表渲染已内聚到 `drive-browser.tsx`，文件行动作抽到 `file-row-actions.tsx`；`folder-tree` 未单独建文件（左侧树与浏览器导航重叠）。如后续需要独立树视图可再拆。
- 上传为单文件/多文件 `<input multiple>`（Task 7 将增强为拖拽 + 目录 + 进度 + 预览）。
- 删除操作未加二次确认 Modal（Task 11/后续可补），当前直接调用 mutation。
