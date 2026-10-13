# Task 3 — verify-export

## Objective
汇总验证：单测 + 类型检查 + 全局确认无旧拼接。

## Validation
- `export-error.spec.ts`：**7/7 passed** ✅。
- 客户端 `tsc --noEmit -p tsconfig.json`：干净（exit 0）✅。
- 客户端 `eslint` 变更文件：因环境缺失 `@tanstack/eslint-plugin-query` 未能运行（F001，非代码缺陷）。
- 全局搜索 `err.response?.data.message`：`export-modal.tsx` 已无该旧写法（符合要求）；其余命中位于 auth/复制/移动/导入弹窗，均不使用 blob，不在范围。

## 修复效果
- 后端返回任意非 2xx 错误时，前端现在能显示真实服务器消息（如 `Export failed: Page not found`）或干净的 `Export failed`，**不再出现字面 `undefined`**。
- docx 导出 `/docx-export` 服务端缺失路由（404）也会被本修复正确显示，而非 `undefined`（属 follow-up，不在本次修复代码内）。

## 未覆盖
- 触发失败的底层 HTTP 错误（403/400/404/500）未在实际环境复现（无 dev DB/网络）；本修复将其暴露，真实原因需经 Network 面板 / 服务端日志确认。
