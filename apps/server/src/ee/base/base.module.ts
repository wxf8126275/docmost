import { Module } from '@nestjs/common';
import { BaseController } from './base.controller';
import { BaseService } from './base.service';
import { BaseWsService } from './realtime/base-ws.service';

@Module({
  controllers: [BaseController],
  providers: [BaseService, BaseWsService],
  exports: [BaseService, BaseWsService],
})
export class BaseModule {}
