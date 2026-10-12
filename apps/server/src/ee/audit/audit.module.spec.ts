import { MODULE_METADATA } from '@nestjs/common/constants';
import { AuditModule } from './audit.module';
import { AuditController } from './audit.controller';
import { AuditService } from './services/audit.service';
import { AuditRepo } from './repos/audit.repo';
import { AUDIT_SERVICE } from '../../integrations/audit/audit.service';

describe('AuditModule', () => {
  it('declares the audit controller, service, repo and AUDIT_SERVICE token', () => {
    const providers: any[] =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuditModule) ?? [];
    const controllers: any[] =
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AuditModule) ?? [];

    expect(controllers).toContain(AuditController);
    expect(providers).toContain(AuditService);
    expect(providers).toContain(AuditRepo);
    expect(
      providers.some(
        (p) =>
          p &&
          typeof p === 'object' &&
          p.provide === AUDIT_SERVICE &&
          p.useExisting === AuditService,
      ),
    ).toBe(true);
  });
});
