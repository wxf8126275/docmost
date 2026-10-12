import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './services/api-key.service';
import { ApiKeyRepo } from './repos/api-key.repo';
import { TokenModule } from '../../core/auth/token.module';

@Module({
  imports: [TokenModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyRepo],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
