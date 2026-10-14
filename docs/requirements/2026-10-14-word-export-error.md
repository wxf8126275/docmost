# Word(docx) 导出功能实现

- 创建时间：2026-10-14
- 来源：`sean start 导入页面，类型为 word 的时候，报错 Export failed: Cannot read properties of undefined (reading 'toLowerCase')，沿用前端页面，请帮忙解决这个错误`
- 决策：用户选择 **B — 真能导出 Word**（实现服务端 `/docx-export` 路由 + 页面内容→docx 生成），而非仅消除前端崩溃。

## 1. 问题

用户从页面导出 Word(docx) 时失败，前端报 `Export failed: Cannot read properties of undefined (reading 'toLowerCase')`。

根因链：
1. 服务端**根本没有 `/docx-export` 路由**（docx 导出属 EE 能力，社区版缺失；`export.controller.ts` 的 `pages/export` 对 Docx 直接 `return` 跳过）。
2. 因此 docx 导出请求 `POST /api/docx-export` 返回 **404**，且因前端以 `responseType:"blob"` 请求，响应体被 axios 存为 Blob。
3. 前端响应拦截器 `case 404` 裸调用 `error.response.data.message.toLowerCase()` → `Blob.message` 为 `undefined` → 抛 `Cannot read properties of undefined (reading 'toLowerCase')`，把真实的 404 掩盖成误导性崩溃文本。

## 2. 行为（用户选择 B）

- **服务端新增 `POST /api/docx-export`**：入参 `{ pageId }`，返回 `.docx` 文件（Blob），带
  `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document` 与
  `Content-Disposition: attachment; filename="<标题>.docx"`。
- 导出内容：页面 ProseMirror 内容 → 经 `@docmost/editor-ext` 的 `pageNodeToDocxBuffer(node, getImageBuffer)` 转 docx；页面标题前置为 H1，`@page` mention 通过 `turnPageMentionsToLinks` 转为链接。
- 图片 best-effort：通过 `DocxImageResolver` 从存储读取附件字节嵌入；无法解析时**跳过**（序列化器已捕获，不崩溃）。
- 权限/校验：沿用 `pageAccessService.validateCanView`；页面不存在返回 404。
- 防御（defense-in-depth）：前端拦截器 `case 404` 对 blob 错误体做存在性+类型防护，避免任何 blob 错误再触发同类崩溃（原报错文本不再出现）。

## 3. 验收标准

- 单页 docx 导出返回合法 `.docx`（ZIP 头 `PK`）→ 服务端 Jest 单测：构造含 heading/paragraph 的页面内容，断言返回 `Buffer` 以 `PK` 开头。
- 导出含图片的页面不崩溃（图片解析失败跳过）→ 单测覆盖 resolver 抛错路径。
- 前端 `exportPageToDocx` 走通：收到 blob + `content-disposition`，文件名正确，浏览器下载 `.docx`（需运行环境/EE 许可手动验证）。
- 拦截器对任意 blob 错误体不再抛 `undefined.toLowerCase()` → 沿用上一方案单测。
- `tsc --noEmit`（server + client）干净。

## 4. 上下文

- Tech stack：pnpm + Nx monorepo；server NestJS/Fastify；client React/Vite。
- **已有基础设施（关键）**：
  - `@docmost/editor-ext` 已导出 `pageNodeToDocxBuffer(doc: Node, getImageBuffer: DocxImageResolver): Promise<Buffer>` 与 `DocxImageResolver`（见 `packages/editor-ext/src/lib/prosemirror-docx/`）；其 `renderImage` 在图片解析失败时自动跳过。
  - `docx` 库已安装；`image-dimensions` 已安装。
  - 导出管线已能把页面内容转 ProseMirror JSON（`getProsemirrorContent`）与 Node（`jsonToNode`），均在 `export.service.ts` 已 import。
- 前端 `exportPageToDocx` 已实现（`apps/client/src/features/page/services/page-service.ts`），仅缺后端路由；`api-client.ts` 已把 `/api/docx-export` 列入 `exemptEndpoints`（保留响应头）。
- Constraints：遵循"沿用前端页面"（前端改动极小，仅拦截器防护）；服务端复用现有导出/权限模式。
- Non-goals：不做 space 批量 docx 导出（仅单页）；图片嵌入 best-effort；EE 许可门控不在本任务范围（路由直接可用，便于社区环境验证；上游 EE 会在前端 `useHasFeature(DOCX_EXPORT)` 隐藏入口，本任务不重复加服务端许可墙）。
