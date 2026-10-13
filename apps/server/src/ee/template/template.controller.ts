import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Page, Template } from '@docmost/db/types/entity.types';
import { TemplateService } from './template.service';
import {
  CreateTemplateDto,
  DeleteTemplateDto,
  ListTemplatesDto,
  TemplateInfoDto,
  UpdateTemplateDto,
  UseTemplateDto,
} from './template.dto';

/**
 * Template endpoints consumed by the enterprise template UI
 * (`apps/client/src/ee/template`). All routes are mounted under the global
 * `api` prefix by NestJS, yielding `/api/templates/*`.
 */
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  listTemplates(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: { id: string },
    @Body() dto: ListTemplatesDto,
  ) {
    return this.templateService.listTemplates(user, workspace.id, dto);
  }

  @Post('info')
  @HttpCode(HttpStatus.OK)
  getTemplate(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: { id: string },
    @Body() dto: TemplateInfoDto,
  ): Promise<Template> {
    return this.templateService.getTemplate(user, workspace.id, dto);
  }

  @Post('create')
  @HttpCode(HttpStatus.OK)
  createTemplate(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: { id: string },
    @Body() dto: CreateTemplateDto,
  ): Promise<Template> {
    return this.templateService.createTemplate(user, workspace.id, dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  updateTemplate(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: { id: string },
    @Body() dto: UpdateTemplateDto,
  ): Promise<Template> {
    return this.templateService.updateTemplate(user, workspace.id, dto);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  deleteTemplate(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: { id: string },
    @Body() dto: DeleteTemplateDto,
  ): Promise<void> {
    return this.templateService.deleteTemplate(user, workspace.id, dto);
  }

  @Post('use')
  @HttpCode(HttpStatus.OK)
  useTemplate(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: { id: string },
    @Body() dto: UseTemplateDto,
  ): Promise<Page> {
    return this.templateService.useTemplate(user, workspace.id, dto);
  }
}
