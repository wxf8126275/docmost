# Task 2 — drive-abilities

## Status: done
## Date: 2026-10-16

## What was done
- `core/casl/interfaces/drive-ability.type.ts`：`DriveCaslAction`(manage/create/read/update/delete)、`DriveCaslSubject`(folder/file)、`IDriveAbility`、`DriveContext`(driveType + ownerId)。
- `core/casl/abilities/drive-ability.factory.ts`：`DriveAbilityFactory.createForUser(user, ctx)`。
  - 个人盘(`personal`)：`ownerId === user.id` → `Manage` 文件夹/文件；否则空能力（拒绝）。
  - 共享盘(`shared`)：工作区成员(OWNER/ADMIN/MEMBER) → `Manage`；其他角色空能力。
- 说明：计划里提到的 `abilities/index.ts` 实际不存在，能力类按现有惯例（`space-ability.factory`）直接 import，**无文件需修改**。

## TDD
- RED：spec 引用未创建的工厂/接口 → TS2307。
- GREEN：实现后 4 用例通过。
- 纯逻辑、无 DB 依赖（`user.role` 取自 User 实体，与 workspace 工厂一致）。

## Test result
```
PASS src/core/casl/abilities/drive-ability.factory.spec.ts
  ✓ grants the personal owner full manage over their own drive
  ✓ denies access to another user’s personal drive
  ✓ grants shared-drive manage to any workspace member
  ✓ denies shared-drive access to unknown roles
Tests: 4 passed
```

## Acceptance check
- [x] 能力与角色映射正确（个人仅本人；共享盘成员可管）。
- [x] 越权（他人个人盘 / 未知角色共享盘）被拒。

## Notes
- 共享盘暂按"工作区成员即可管"实现；若后续需要只读共享盘，可在 `DriveContext` 增加 `readOnly` 并扩展 `buildSharedReaderAbility`。
