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
import WorkspaceAbilityFactory from '../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../core/casl/interfaces/workspace-ability.type';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { ApiKeyService } from './services/api-key.service';
import {
  CreateApiKeyDto,
  RevokeApiKeyDto,
  UpdateApiKeyDto,
} from './dto/api-key.dto';

@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeyController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  listApiKeys(
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertManage(user, workspace);
    return this.apiKeyService.listApiKeys(workspace.id, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  createApiKey(
    @Body() dto: CreateApiKeyDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertManage(user, workspace);
    return this.apiKeyService.createApiKey(
      workspace.id,
      user.id,
      dto.name,
      dto.expiresAt,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  updateApiKey(
    @Body() dto: UpdateApiKeyDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertManage(user, workspace);
    return this.apiKeyService.updateApiKey(
      dto.apiKeyId,
      workspace.id,
      dto.name,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('revoke')
  revokeApiKey(
    @Body() dto: RevokeApiKeyDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertManage(user, workspace);
    return this.apiKeyService.revokeApiKey(dto.apiKeyId, workspace.id);
  }

  private assertManage(user: User, workspace: Workspace): void {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.API)) {
      throw new ForbiddenException();
    }
  }
}
