import { Global, Module } from '@nestjs/common';
import { SiemController } from './siem.controller';
import { SiemService } from './services/siem.service';
import { SiemRepo } from './repos/siem.repo';
import { SiemProcessor } from './processors/siem.processor';

@Global()
@Module({
  controllers: [SiemController],
  providers: [SiemRepo, SiemService, SiemProcessor],
  exports: [SiemService],
})
export class SiemModule {}
