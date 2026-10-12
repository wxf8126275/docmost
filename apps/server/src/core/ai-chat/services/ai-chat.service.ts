import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ModelMessage } from 'ai';
import { AiChatRepo } from '../repos/ai-chat.repo';
import { AiChatLlmClient } from './ai-chat-llm.client';
import { AiChatStreamEvent, SendChatInput } from '../types/ai-chat.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { Json } from '@docmost/db/types/db';

@Injectable()
export class AiChatService {
  constructor(
    private readonly aiChatRepo: AiChatRepo,
    private readonly llmClient: AiChatLlmClient,
  ) {}

  async createChat(workspaceId: string, userId: string) {
    return this.aiChatRepo.createChat(workspaceId, userId);
  }

  async listChats(workspaceId: string, userId: string, pagination: PaginationOptions) {
    return this.aiChatRepo.listChats(workspaceId, userId, pagination);
  }

  async getChatInfo(chatId: string, workspaceId: string, userId: string) {
    const chat = await this.aiChatRepo.findById(chatId, workspaceId);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.creatorId !== userId) throw new ForbiddenException();
    const messages = await this.aiChatRepo.getChatMessages(chatId, workspaceId);
    return { chat, messages };
  }

  async deleteChat(chatId: string, workspaceId: string, userId: string) {
    const chat = await this.aiChatRepo.findById(chatId, workspaceId);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.creatorId !== userId) throw new ForbiddenException();
    await this.aiChatRepo.softDeleteChat(chatId, workspaceId, userId);
  }

  async renameChat(
    chatId: string,
    workspaceId: string,
    userId: string,
    title: string,
  ) {
    const chat = await this.aiChatRepo.findById(chatId, workspaceId);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.creatorId !== userId) throw new ForbiddenException();
    await this.aiChatRepo.updateChatTitle(chatId, title);
  }

  async searchChats(query: string, workspaceId: string, userId: string) {
    return this.aiChatRepo.searchChats(query, workspaceId, userId);
  }

  async sendMessage(
    input: SendChatInput,
    emit: (event: AiChatStreamEvent) => void,
  ): Promise<void> {
    let chatId = input.chatId;

    if (!chatId) {
      const chat = await this.aiChatRepo.createChat(
        input.workspaceId,
        input.userId,
      );
      chatId = chat.id;
      emit({ type: 'chat_created', chatId });
      const title = input.content.trim().slice(0, 80) || 'New chat';
      await this.aiChatRepo.updateChatTitle(chatId, title);
    } else {
      const chat = await this.aiChatRepo.findById(chatId, input.workspaceId);
      if (!chat || chat.creatorId !== input.userId) {
        emit({ type: 'error', message: 'Chat not found' });
        return;
      }
    }

    await this.aiChatRepo.insertMessage({
      chatId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: 'user',
      content: input.content,
      metadata: this.buildMetadata(input),
    });

    const history = await this.aiChatRepo.getChatMessages(
      chatId,
      input.workspaceId,
    );
    const messages: ModelMessage[] = history.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content ?? '',
    }));

    let assistantContent = '';
    for await (const chunk of this.llmClient.streamChat(messages)) {
      if (chunk.type === 'content') {
        assistantContent += chunk.text;
        emit({ type: 'content', text: chunk.text });
      } else {
        emit({ type: 'error', message: chunk.message });
        return;
      }
    }

    const assistantMessage = await this.aiChatRepo.insertMessage({
      chatId,
      workspaceId: input.workspaceId,
      userId: null,
      role: 'assistant',
      content: assistantContent || null,
    });

    emit({ type: 'done', messageId: assistantMessage.id });
  }

  private buildMetadata(input: SendChatInput): Json | null {
    const meta: Record<string, unknown> = {};
    if (input.mentionedPageIds?.length) {
      meta.mentionedPageIds = input.mentionedPageIds;
    }
    if (input.attachmentIds?.length) {
      meta.attachmentIds = input.attachmentIds;
    }
    return Object.keys(meta).length ? (meta as Json) : null;
  }
}
