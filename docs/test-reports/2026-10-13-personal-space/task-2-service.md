# Task 2 — personal-space-service

**Status:** done · **Tests:** 5 passed / 5 · **Fix cycles:** 0 · **Complexity:** high

## What was built
- `personal-space.service.ts`: `PersonalSpaceService`
  - `getPersonalSpace(user, workspaceId)` → `spaceRepo.findPersonalSpace(user.id, workspaceId)` 或 `null`
  - `createPersonalSpace(user, workspaceId, dto)` → 幂等：已有则直接返回；否则 `spaceService.createSpace(user, workspaceId, { name, description:'', slug: generateSlugId() }, undefined, { isPersonal: true })`
- `personal-space.service.spec.ts`: Nest `Test.createTestingModule` 手动 mock `SpaceRepo` / `SpaceService`

## Tests (all behavioural)
| # | Case | Asserts |
|---|------|---------|
| 1 | `getPersonalSpace` 无个人空间 | 返回 `null`，且 `findPersonalSpace` 用 `(user.id, workspaceId)` 调用 |
| 2 | `getPersonalSpace` 已存在 | 原样返回该 space |
| 3 | `createPersonalSpace` 已存在 | 返回 existing，**不调用** `spaceService.createSpace` |
| 4 | `createPersonalSpace` 不存在 | `createSpace` 被调用 1 次；断言 `user`/`workspaceId`/`dto.name='My Space'`/`dto.description=''`/`dto.slug` 为字符串非空/`trx=undefined`/`opts={isPersonal:true}`；返回 created |
| 5 | `createPersonalSpace` 缺省 name | `dto.name` 默认 `'Personal Space'` |

## RED → GREEN
初版因 `../../../common` 相对路径多写一级（应为 `../../common`），导致 tsc 报 `TS2307` 且 jest 编译失败（suite failed to run）。修正为 `../../common` 后：
- `jest ee/personal-space/personal-space.service.spec.ts` → **5/5 PASS**
- `tsc --noEmit -p tsconfig.build.json` → clean
- `eslint src/ee/personal-space src/ee/ee.module.ts` → clean

## Repo/Service reuse
未重复实现空间创建/查询逻辑：复用 `SpaceService.createSpace`（成员加入、审计、`spaces.isPersonal` 写入、slug 唯一校验）与 `SpaceRepo.findPersonalSpace`。
