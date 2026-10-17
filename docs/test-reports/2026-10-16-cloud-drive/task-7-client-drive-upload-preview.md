# Task 7 — client-drive-upload-preview

## Status: done
## Date: 2026-10-16

## What was done
增强 `apps/client/src/features/drive/` 的上传与预览体验。

- **新增 `components/upload-dropzone.tsx`**
  - 拖拽 / 点击 / 文件夹上传三合一拖放区（`onDrop` + 两个 hidden `<input>`：一个 `multiple`、一个 `webkitdirectory` 文件夹上传，后者通过 `ref.setAttribute('webkitdirectory','')` 设置以避免 React 属性类型问题）。
  - 选中文件逐个调用 `useUploadFileMutation().mutateAsync({ file, driveType, folderId, onUploadProgress })`；队列展示每个文件的进度条（上传中百分比 / 完成 / 失败）。
  - 上传完成回调 `onUploaded` 触发刷新。
- **新增 `components/preview-modal.tsx`**
  - 按 `fileExt` / `mimeType` 渲染：图片用 Mantine `Image`；音视频用原生 `<audio>`/`<video>`（`controls`）；其余类型显示 `IconFileText` + 文件名。
  - 注：Mantine v9.3.2 **不导出** `Audio` / `Video` 组件，故改用原生元素。
- **修改 `components/drive-browser.tsx`**
  - 顶部挂载 `UploadDropzone`（上传到当前 drive + 当前文件夹，完成后 `invalidateQueries(['drive-folders','drive-files'])`）。
  - 文件行点击触发 `onFilePreview?.(file)`（动作图标已 `stopPropagation`，不会误触发预览）。
  - 内置 `PreviewModal`（自行管理 `previewFile` 状态）。
- **修改 `services/drive-service.ts` / `queries/drive-query.ts`**：`uploadFile` 与上传 mutation 增加可选 `onUploadProgress: (event: AxiosProgressEvent) => void` 并透传到 `api.post` 配置（真实进度）。
- **修改 `components/drive-browser.spec.tsx`**：补充 `useUploadFileMutation` mock（drive-browser 现渲染 dropzone 依赖该 hook）。

## TDD
- RED：`upload-dropzone.spec.tsx` 首次运行失败（组件不存在）。另加 `preview-modal.spec.tsx`（声明外补充覆盖）。
- GREEN：
  - `upload-dropzone.spec.tsx` 3/3：渲染拖放区 + 文件/文件夹输入；选择多文件 → 各自调用上传 service 且携带 `file`/`driveType`/`folderId`，并显示进度列表；带 `folderId`/`driveType` 正确透传。
  - `preview-modal.spec.tsx` 4/4：图片（`img` + src 含 `/api/drive/files/:id/download`）、音频（`audio`）、视频（`video`）、未知类型（文档图标 + 文件名）。
  - 既有 `drive-browser.spec.tsx` 4/4 无回归。

## Test result
```
PASS src/features/drive/components/upload-dropzone.spec.tsx  (3 passed)
PASS src/features/drive/components/preview-modal.spec.tsx    (4 passed)
PASS src/features/drive/components/drive-browser.spec.tsx    (4 passed)
```
- 本任务新增/涉及测试共 11 项全绿（含 4 项既有回归）。
- `tsc --noEmit`（client）无 drive/App/sidebar 相关类型错误。
- ESLint 同前：项目 `eslint.config.mjs` 依赖缺失（环境问题），类型检查替代。

## Acceptance check
- [x] 多文件 / 文件夹上传成功（dropzone + 进度）。
- [x] 预览覆盖图片 / 音视频 / 文档图标。
- [x] 文件点击 → 预览模态；上传到当前文件夹。

## Notes / 偏离计划
- 计划的 `test_file` 仅 `upload-dropzone.spec.tsx`；额外新增 `preview-modal.spec.tsx` 以覆盖预览（声明外补充，不影响契约）。
- `PreviewModal` 直接内置到 `drive-browser`（而非页面层），由浏览器自管 `previewFile` 状态——更内聚；页面无需改动。
- 页面原有「Upload」按钮（单/多文件）保留，与 dropzone 并存，二者均可用。
