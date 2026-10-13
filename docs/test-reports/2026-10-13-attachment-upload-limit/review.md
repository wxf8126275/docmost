# Review: Attachment Upload Size Limit (`attachment-upload-limit`)

## File Quality
| File | Func≤40 | File≤400 | 无 any/object 类型 | 错误处理 | 干净 |
|------|--------|---------|-------------------|----------|------|
| `apps/client/src/lib/config.ts` | ✓ | ✓ 117 | ✓ | ✓（`bytes` 解析兜底） | ✓ |
| `apps/server/src/integrations/environment/environment.service.ts` | ✓ | ✓ | ✓ | ✓（`bytes` 校验兜底） | ✓ |
| `apps/client/src/lib/config.spec.ts` | — | ✓ | ✓ | n/a | ✓ |
| `apps/server/src/integrations/environment/environment.service.spec.ts` | — | ✓ | ✓ | n/a | ✓ |

源码（非测试）**0** 处 `any`/`object` 类型、`TODO`/`FIXME`/`HACK`/`XXX`。

## Test Quality
- 14 个测试全部**行为级断言**，覆盖 未设 / 空串 / `"0"` / `"0mb"` / 正常值 各态。
- **真实 RED→GREEN**：初版服务端仅排除空串/空白，`"0"` 用例失败（暴露 `bytes("0")=0` 仍触发 "0.0 KB"）；改为 `bytes(val) > 0` 校验后转绿。

## 五维评估
| 维度 | Evidence | Score |
|------|----------|-------|
| Task Understanding | exercised | 90 |
| Controlled Execution | exercised | 90 |
| Change Validation | outcome-supported | 90 |
| Reliable Delivery | wired | 75 |
| Learning Capture | present | 70 |

## Findings
| ID | 维度 | 严重度 | 证据 | 修复 | 验证 | 状态 |
|----|------|--------|------|------|------|------|
| F001 | reliable-delivery | low | 客户端 `eslint` 因环境缺失 `@tanstack/eslint-plugin-query` 无法运行；未对真实「插入 PDF」页面路径做端到端验证 | 安装客户端依赖后跑 eslint；用 `FILE_UPLOAD_SIZE_LIMIT` 空/`0`/`100mb` 手动验证插入 PDF | `npx eslint src/lib/config.ts src/lib/config.spec.ts`; 手动插入 | open |

## Verdict
**PASS**（1 个 low，0 阻塞）。3/3 任务完成、14/14 测试通过、服务端 `tsc`/`eslint` 干净、客户端 `tsc` 干净、约定合规；未触及既有上传 UI（满足「沿用现有前端」）。

## 备注
- 客户端 `eslint` 受阻为环境依赖问题（`@tanstack/eslint-plugin-query` 未安装），非代码缺陷；vitest 与 `tsc` 均已通过，改动自包含且低风险。
- 同一修复顺带消除 image/audio/video 上传与 DOCX/PDF 导入的同源潜在 bug。
