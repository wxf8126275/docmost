import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './services/ai-chat.service';
import { AiChatRepo } from './repos/ai-chat.repo';
import { AiChatLlmClient } from './services/ai-chat-llm.client';
import { AiProviderService } from '../ai/services/ai-provider.service';
import { AiProviderRepo } from '../ai/repos/ai-provider.repo';
import { EncryptionModule } from '../../integrations/encryption/encryption.module';

@Module({
  imports: [EncryptionModule],
  controllers: [AiChatController],
  providers: [
    AiChatService,
    AiChatRepo,
    AiChatLlmClient,
    AiProviderService,
    AiProviderRepo,
  ],
  exports: [AiChatService],
})
export class AiChatModule {}
