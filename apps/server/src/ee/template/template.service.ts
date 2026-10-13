import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TemplateRepo } from '@docmost/db/repos/template/template.repo';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { PageService } from '../../core/page/services/page.service';
import {
  InsertableTemplate,
  Page,
  Template,
  UpdatableTemplate,
  User,
} from '@docmost/db/types/entity.types';
import { UserRole } from '../../common/helpers/types/permission';
import {
  CreateTemplateDto,
  DeleteTemplateDto,
  ListTemplatesDto,
  TemplateInfoDto,
  UpdateTemplateDto,
  UseTemplateDto,
} from './template.dto';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

@Injectable()
export class TemplateService {
  constructor(
    private readonly templateRepo: TemplateRepo,
    private readonly spaceMemberRepo: SpaceMemberRepo,
    private readonly workspaceRepo: WorkspaceRepo,
    private readonly pageService: PageService,
  ) {}

  /**
   * Lists templates visible to the user: global templates (spaceId is null) plus
   * templates scoped to spaces the user belongs to. Filtered by `accessibleSpaceIds`.
   */
  async listTemplates(
    user: User,
    workspaceId: string,
    dto: ListTemplatesDto,
  ) {
    const accessibleSpaceIds = await this.spaceMemberRepo.getUserSpaceIds(
      user.id,
    );

    const pagination: PaginationOptions = {
      limit: dto.limit ?? 20,
      cursor: dto.cursor,
      query: '',
      adminView: false,
    };

    return this.templateRepo.findTemplates(
      workspaceId,
      accessibleSpaceIds,
      pagination,
      { spaceId: dto.spaceId },
    );
  }

  async getTemplate(
    user: User,
    workspaceId: string,
    dto: TemplateInfoDto,
  ): Promise<Template> {
    const template = await this.templateRepo.findById(dto.templateId, workspaceId, {
      includeContent: true,
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async createTemplate(
    user: User,
    workspaceId: string,
    dto: CreateTemplateDto,
  ): Promise<Template> {
    await this.assertCanManageTemplates(user, workspaceId);

    const insertable: InsertableTemplate = {
      title: dto.title?.trim() || 'Untitled template',
      description: dto.description,
      icon: dto.icon,
      content: dto.content,
      spaceId: dto.spaceId,
      workspaceId,
      creatorId: user.id,
      lastUpdatedById: user.id,
    };

    const { id } = await this.templateRepo.insertTemplate(insertable);
    return this.templateRepo.findById(id, workspaceId);
  }

  async updateTemplate(
    user: User,
    workspaceId: string,
    dto: UpdateTemplateDto,
  ): Promise<Template> {
    await this.assertCanManageTemplates(user, workspaceId);

    const existing = await this.templateRepo.findById(dto.templateId, workspaceId);
    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    const updatable: UpdatableTemplate = { lastUpdatedById: user.id };
    if (dto.title !== undefined) updatable.title = dto.title;
    if (dto.description !== undefined) updatable.description = dto.description;
    if (dto.icon !== undefined) updatable.icon = dto.icon;
    if (dto.content !== undefined) updatable.content = dto.content;
    if (dto.spaceId !== undefined) updatable.spaceId = dto.spaceId;

    await this.templateRepo.updateTemplate(updatable, dto.templateId, workspaceId);
    return this.templateRepo.findById(dto.templateId, workspaceId, {
      includeContent: true,
    });
  }

  async deleteTemplate(
    user: User,
    workspaceId: string,
    dto: DeleteTemplateDto,
  ): Promise<void> {
    await this.assertCanManageTemplates(user, workspaceId);

    const existing = await this.templateRepo.findById(dto.templateId, workspaceId);
    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    await this.templateRepo.deleteTemplate(dto.templateId, workspaceId);
  }

  /**
   * Instantiates a real page from a template in the target space. The user must
   * belong to that space; the template content is passed through PageService so
   * ydoc / textContent / position are derived the same way as normal page creation.
   */
  async useTemplate(
    user: User,
    workspaceId: string,
    dto: UseTemplateDto,
  ): Promise<Page> {
    const accessibleSpaceIds = await this.spaceMemberRepo.getUserSpaceIds(
      user.id,
    );

    if (!accessibleSpaceIds.includes(dto.spaceId)) {
      throw new ForbiddenException(
        'You do not have access to the selected space',
      );
    }

    const template = await this.templateRepo.findById(dto.templateId, workspaceId, {
      includeContent: true,
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const content = template.content;

    return this.pageService.create(user.id, workspaceId, {
      title: template.title,
      icon: template.icon,
      spaceId: dto.spaceId,
      parentPageId: dto.parentPageId,
      ...(content != null && typeof content === 'object'
        ? { content, format: 'json' as const }
        : {}),
    });
  }

  /**
   * Only workspace owners/admins may create/update/delete templates unless the
   * workspace enables `settings.templates.allowMemberTemplates`.
   */
  private async assertCanManageTemplates(
    user: User,
    workspaceId: string,
  ): Promise<void> {
    if (user.role === UserRole.OWNER || user.role === UserRole.ADMIN) {
      return;
    }

    const workspace = await this.workspaceRepo.findById(workspaceId);
    const settings = (workspace?.settings ?? {}) as {
      templates?: { allowMemberTemplates?: boolean };
    };

    if (settings.templates?.allowMemberTemplates !== true) {
      throw new ForbiddenException(
        'Only workspace admins can manage templates in this workspace',
      );
    }
  }
}
