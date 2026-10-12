import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './services/audit.service';
import { AuditRepo } from './repos/audit.repo';
import { AUDIT_SERVICE } from '../../integrations/audit/audit.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    AuditRepo,
    AuditService,
    { provide: AUDIT_SERVICE, useExisting: AuditService },
  ],
  exports: [AUDIT_SERVICE, AuditService],
})
export class AuditModule {}
