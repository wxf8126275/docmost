import { Module } from '@nestjs/common';
import { PageVerificationController } from './page-verification.controller';
import { PageVerificationService } from './services/page-verification.service';
import { PageVerificationRepo } from './repos/page-verification.repo';
import { PageVerificationSchedulerService } from './page-verification-scheduler.service';

@Module({
  controllers: [PageVerificationController],
  providers: [
    PageVerificationService,
    PageVerificationRepo,
    PageVerificationSchedulerService,
  ],
  exports: [PageVerificationService],
})
export class PageVerificationModule {}
