# Bugs: Cloud Drive — 独立云盘

## B001 — DriveController DI 失败：DriveModule 漏注册 DriveAbilityFactory

- **Symptom**: 后端启动时报 `UnknownDependenciesException`：
  `Nest can't resolve dependencies of the DriveController (DriveService,
  DriveStorageService, ?, DriveShareService, DriveQuotaService,
  DriveVersionService). Please make sure that the argument DriveAbilityFactory
  at index [2] is available in the DriveModule module.`
- **Classification**: implementation
- **Found by**: production（本地启动 backend 时引导失败，未走到任何测试路径）
- **Root cause**: `DriveController` 通过构造器注入了 `DriveAbilityFactory`
  （`drive.controller.ts:53`），但 `drive.module.ts` 的 `providers` 数组遗漏了它。
  单元测试用 `new DriveController(...)` 手搓依赖、完全不走 Nest DI，因此掩盖了该装配缺陷。
- **Fix**: 在 `apps/server/src/core/drive/drive.module.ts` 中将 `DriveAbilityFactory`
  加入 `providers`（它已是 `@Injectable()` 且无构造依赖）。
- **Regression test**: `apps/server/src/core/drive/drive.controller.spec.ts`
  新增 `describe('DriveModule wiring')` —— 断言 `Reflect.getMetadata('providers',
  DriveModule)` 包含 `DriveAbilityFactory`，直接锁定该装配不变式。
- **Status**: fixed（controller spec 11/11 通过；server `tsc --noEmit` 0 错误）
- **Lesson**: 对 Nest 控制器做单元测试时，若直接 `new Controller(...)` 注入 mock，
  **无法捕获模块级 DI 装配错误**。涉及模块 provider 注册/guard/拦截器的改动，
  应补一条"编译真实模块 / 断言 providers 包含依赖"的回归测试；理想情况下跑一次
  `test:e2e` 或最小 `Test.createTestingModule({ imports: [XModule] }).compile()`
  来验证引导。这正是 handoff「Known Risks」中预警的"DI 未端到端验证"。
