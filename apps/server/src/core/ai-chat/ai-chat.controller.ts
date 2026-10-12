import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiChatService } from './services/ai-chat.service';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import {
  ChatIdDto,
  DeleteChatDto,
  RenameChatDto,
  SearchChatsDto,
  SendChatDto,
} from './dto/ai-chat.dto';
import { AiChatStreamEvent } from './types/ai-chat.types';
import { User, Workspace } from '@docmost/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('ai/chats')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @HttpCode(HttpStatus.OK)
  @Post('create')
  createChat(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.aiChatService.createChat(workspace.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post()
  listChats(
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.listChats(workspace.id, user.id, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  getChatInfo(
    @Body() dto: ChatIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.getChatInfo(dto.chatId, workspace.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  renameChat(
    @Body() dto: RenameChatDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.renameChat(
      dto.chatId,
      workspace.id,
      user.id,
      dto.title,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  deleteChat(
    @Body() dto: DeleteChatDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.deleteChat(dto.chatId, workspace.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('search')
  searchChats(
    @Body() dto: SearchChatsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.searchChats(dto.query, workspace.id, user.id);
  }

  @Post('send')
  async sendMessage(
    @Body() dto: SendChatDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Res() reply: FastifyReply,
  ) {
    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');

    const raw = reply.raw;
    const emit = (event: AiChatStreamEvent) => {
      raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      await this.aiChatService.sendMessage(
        {
          chatId: dto.chatId,
          workspaceId: workspace.id,
          userId: user.id,
          content: dto.content,
          mentionedPageIds: dto.mentionedPageIds,
          attachmentIds: dto.attachmentIds,
        },
        emit,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to send message';
      emit({ type: 'error', message });
    } finally {
      raw.end();
    }
  }
}
