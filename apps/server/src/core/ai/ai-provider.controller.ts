import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { AiProviderService } from './services/ai-provider.service';
import {
  CreateAiProviderDto,
  UpdateAiProviderDto,
} from './dto/ai-provider.dto';

/**
 * CRUD API for workspace AI providers. Provider management is a workspace
 * settings capability, so it is gated by the CASL `Manage/Settings` ability
 * (effectively admin/owner) — matching how the client already hides the UI from
 * non-admins.
 */
@UseGuards(JwtAuthGuard)
@Controller('ai-providers')
export class AiProviderController {
  constructor(
    private readonly aiProviderService: AiProviderService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  async listProviders(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertManage(user, workspace);
    return this.aiProviderService.listProviders(workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async createProvider(
    @Body() dto: CreateAiProviderDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertManage(user, workspace);
    return this.aiProviderService.createProvider(workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateProvider(
    @Body() dto: UpdateAiProviderDto & { id: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertManage(user, workspace);
    const { id, ...patch } = dto;
    return this.aiProviderService.updateProvider(workspace.id, id, patch);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteProvider(
    @Body() dto: { id: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertManage(user, workspace);
    return this.aiProviderService.deleteProvider(workspace.id, dto.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('set-default')
  async setDefault(
    @Body() dto: { id: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertManage(user, workspace);
    return this.aiProviderService.updateProvider(workspace.id, dto.id, {
      isDefault: true,
    });
  }

  private assertManage(user: User, workspace: Workspace): void {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
  }
}
