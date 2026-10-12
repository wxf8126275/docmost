import { Module } from '@nestjs/common';
import { ApiKeyModule } from './api-key/api-key.module';
import { AuditModule } from './audit/audit.module';
import { SiemModule } from './siem/siem.module';
import { PageVerificationModule } from './page-verification/page-verification.module';

/**
 * Enterprise module aggregator. `AppModule` requires this file dynamically and
 * only registers it when present, so the OSS build (without enterprise code)
 * continues to boot without it.
 *
 * `AuditModule` is `@Global()` and provides the real `AUDIT_SERVICE` token that
 * many core services (User, Workspace, Page, ...) depend on. `AppModule` only
 * loads `NoopAuditModule` when no enterprise module is present, so we import the
 * real audit module here to keep the audit service available (and persisted) in
 * the enterprise build.
 */
@Module({
  imports: [AuditModule, ApiKeyModule, SiemModule, PageVerificationModule],
  exports: [ApiKeyModule],
})
export class EeModule {}
