# 工作区设置 · API 密钥模块后台接口（workspace-api-keys）

## 问题
工作区设置里的「API 密钥」（API management）模块目前**只有前端页面与数据库表/实体类型**，后端接口整体缺失：
- 前端：`apps/client/src/ee/api-key/`（页面、组件、service、queries 均已就绪），调用
  `POST /api/api-keys`（列表）、`/api/api-keys/create`、`/api/api-keys/update`、`/api/api-keys/revoke`。
- 数据库：`api_keys` 表已通过迁移 `20250912T101500-api-keys.ts` 建好，但**缺少存储密钥哈希的列**。
- 后端：`apps/server/src/ee/api-key/` 目录为空；`jwt.strategy.ts` 已用
  `require('../../../ee/api-key/api-key.service')` 预留动态加载（失败时静默跳过），因此当前接口 404。

目标：补齐后台接口，使现有前端页面可真正创建 / 列表 / 改名 / 吊销 API 密钥；并复用现有前端页面，不新增 UI。

## 行为
- **创建密钥**：后端生成一次性明文 token（如 `docmost_` + 随机串），仅创建响应返回一次；
  以 SHA-256 哈希存储，并保存一个前缀（token 前若干字符）供界面展示识别。
- **列表**：按工作区分页（游标分页）返回密钥，含创建人信息（`creator`）；不含明文 token。
- **改名**：仅改 `name`。
- **吊销**：软删除（置 `deleted_at`），吊销后 token 失效。
- **鉴权**：接口需登录且为工作区管理员；`jwt.strategy` 通过 `ApiKeyService.validateApiKey(payload)`
  用密钥换取用户/工作区身份（供 API 调用鉴权）。
- **密钥校验**：根据传入 token 哈希查找，校验工作区、未过期、未吊销。

## 验收标准
- 迁移新增 `key_hash`、`key_prefix` 列 → 由迁移文件 + 实体类型变更验证。
- `POST /api/api-keys/create` 返回带 `token` 的 `IApiKey`，且库中只存哈希 → 单元/集成测试断言。
- `POST /api/api-keys`（列表）按工作区返回分页数据，结构与 `IPagination<IApiKey>` 一致 → 测试断言。
- `POST /api/api-keys/update` / `/revoke` 正常生效（改名、软删） → 测试断言。
- `validateApiKey` 对有效 token 返回身份、对无效/过期/吊销 token 拒绝 → 测试断言。
- 现有前端页面（无需改动）在配好后台后可正常增删改查 → 手动 demo 验证。

## 上下文
- 技术栈：NestJS 后端（`apps/server`）、React/Vite 前端（`apps/client`，`ee` 页面）。
- 关联功能：`ai-chat`（已完成）；本模块与 AI 无关，是 Docmost 自有 API 访问密钥。
- 约束：
  - 复用现有 `ee/api-key` 前端页面，不得改动前端。
  - 后端置于 `apps/server/src/ee/api-key/`，对齐 `jwt.strategy` 的动态 require 路径，并注册进 `AppModule`。
  - 密钥明文绝不落库，只存哈希。
  - 前端页面受企业版 `Feature.API_KEYS` 许可控制（许可问题由用户处理，不在本功能范围）。
- 非目标：
  - 不新增前端 UI。
  - 不改动 `api_keys` 表以外的既有表结构（除本次补列）。
  - 不涉及 AI 提供方密钥（那是另一回事，本模块是 Docmost API 访问密钥）。
