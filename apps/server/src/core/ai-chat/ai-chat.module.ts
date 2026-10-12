import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './services/ai-chat.service';
import { AiChatRepo } from './repos/ai-chat.repo';
import { AiChatLlmClient } from './services/ai-chat-llm.client';

@Module({
  controllers: [AiChatController],
  providers: [AiChatService, AiChatRepo, AiChatLlmClient],
  exports: [AiChatService],
})
export class AiChatModule {}
