import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TemplateService } from './template.service';
import { TemplateRepo } from '@docmost/db/repos/template/template.repo';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { PageService } from '../../core/page/services/page.service';
import { UserRole } from '../../common/helpers/types/permission';

describe('TemplateService', () => {
  let service: TemplateService;
  let templateRepo: any;
  let spaceMemberRepo: any;
  let workspaceRepo: any;
  let pageService: any;

  const member = { id: 'user-1', role: UserRole.MEMBER } as any;
  const admin = { id: 'user-2', role: UserRole.ADMIN } as any;
  const workspaceId = 'ws-1';

  beforeEach(async () => {
    templateRepo = {
      findTemplates: jest.fn(),
      findById: jest.fn(),
      insertTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    };
    spaceMemberRepo = {
      getUserSpaceIds: jest.fn().mockResolvedValue(['space-1']),
    };
    workspaceRepo = { findById: jest.fn() };
    pageService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: TemplateRepo, useValue: templateRepo },
        { provide: SpaceMemberRepo, useValue: spaceMemberRepo },
        { provide: WorkspaceRepo, useValue: workspaceRepo },
        { provide: PageService, useValue: pageService },
      ],
    }).compile();

    service = module.get(TemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listTemplates', () => {
    it('returns repo result using the user accessible space ids', async () => {
      const result = { items: [], meta: { hasNextPage: false } };
      templateRepo.findTemplates.mockResolvedValue(result);

      const res = await service.listTemplates(member, workspaceId, {
        limit: 10,
      });

      expect(spaceMemberRepo.getUserSpaceIds).toHaveBeenCalledWith('user-1');
      expect(templateRepo.findTemplates).toHaveBeenCalledWith(
        workspaceId,
        ['space-1'],
        expect.objectContaining({ limit: 10 }),
        { spaceId: undefined },
      );
      expect(res).toBe(result);
    });
  });

  describe('getTemplate', () => {
    it('returns template with content when found', async () => {
      const tpl = { id: 't1', content: { type: 'doc' } };
      templateRepo.findById.mockResolvedValue(tpl);

      const res = await service.getTemplate(member, workspaceId, {
        templateId: 't1',
      });

      expect(templateRepo.findById).toHaveBeenCalledWith('t1', workspaceId, {
        includeContent: true,
      });
      expect(res).toBe(tpl);
    });

    it('throws NotFoundException when missing', async () => {
      templateRepo.findById.mockResolvedValue(undefined);
      await expect(
        service.getTemplate(member, workspaceId, { templateId: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createTemplate', () => {
    it('allows workspace admin', async () => {
      templateRepo.insertTemplate.mockResolvedValue({ id: 't1' });
      templateRepo.findById.mockResolvedValue({ id: 't1', title: 'T' });

      const res = await service.createTemplate(admin, workspaceId, {
        title: 'T',
      });

      expect(res.title).toBe('T');
      expect(templateRepo.insertTemplate).toHaveBeenCalled();
      const inserted = templateRepo.insertTemplate.mock.calls[0][0];
      expect(inserted.workspaceId).toBe(workspaceId);
      expect(inserted.creatorId).toBe('user-2');
    });

    it('allows member when allowMemberTemplates is enabled', async () => {
      workspaceRepo.findById.mockResolvedValue({
        settings: { templates: { allowMemberTemplates: true } },
      });
      templateRepo.insertTemplate.mockResolvedValue({ id: 't1' });
      templateRepo.findById.mockResolvedValue({ id: 't1' });

      await expect(
        service.createTemplate(member, workspaceId, { title: 'T' }),
      ).resolves.toBeDefined();
    });

    it('forbids member when allowMemberTemplates is disabled', async () => {
      workspaceRepo.findById.mockResolvedValue({
        settings: { templates: { allowMemberTemplates: false } },
      });

      await expect(
        service.createTemplate(member, workspaceId, { title: 'T' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateTemplate', () => {
    it('forbids member', async () => {
      workspaceRepo.findById.mockResolvedValue({ settings: {} });
      await expect(
        service.updateTemplate(member, workspaceId, {
          templateId: 't1',
          title: 'x',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('updates allowed fields for admin', async () => {
      workspaceRepo.findById.mockResolvedValue({ settings: {} });
      templateRepo.findById
        .mockResolvedValueOnce({ id: 't1' })
        .mockResolvedValueOnce({ id: 't1', title: 'x' });

      const res = await service.updateTemplate(admin, workspaceId, {
        templateId: 't1',
        title: 'x',
      });

      expect(res.title).toBe('x');
      expect(templateRepo.updateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'x', lastUpdatedById: 'user-2' }),
        't1',
        workspaceId,
      );
    });

    it('throws NotFoundException when template missing', async () => {
      workspaceRepo.findById.mockResolvedValue({ settings: {} });
      templateRepo.findById.mockResolvedValue(undefined);
      await expect(
        service.updateTemplate(admin, workspaceId, {
          templateId: 't1',
          title: 'x',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteTemplate', () => {
    it('forbids member', async () => {
      workspaceRepo.findById.mockResolvedValue({ settings: {} });
      await expect(
        service.deleteTemplate(member, workspaceId, { templateId: 't1' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deletes for admin', async () => {
      workspaceRepo.findById.mockResolvedValue({ settings: {} });
      templateRepo.findById.mockResolvedValue({ id: 't1' });
      templateRepo.deleteTemplate.mockResolvedValue(undefined);

      await service.deleteTemplate(admin, workspaceId, { templateId: 't1' });

      expect(templateRepo.deleteTemplate).toHaveBeenCalledWith(
        't1',
        workspaceId,
      );
    });
  });

  describe('useTemplate', () => {
    it('forbids target space outside accessible spaces', async () => {
      await expect(
        service.useTemplate(member, workspaceId, {
          templateId: 't1',
          spaceId: 'space-2',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates a page from template content for an accessible space', async () => {
      templateRepo.findById.mockResolvedValue({
        id: 't1',
        title: 'T',
        icon: 'i',
        content: { type: 'doc' },
      });
      pageService.create.mockResolvedValue({ id: 'p1', slugId: 's1' });

      const res = await service.useTemplate(member, workspaceId, {
        templateId: 't1',
        spaceId: 'space-1',
      });

      expect(pageService.create).toHaveBeenCalledWith(
        'user-1',
        workspaceId,
        {
          title: 'T',
          icon: 'i',
          spaceId: 'space-1',
          parentPageId: undefined,
          content: { type: 'doc' },
          format: 'json',
        },
      );
      expect(res).toEqual({ id: 'p1', slugId: 's1' });
    });

    it('creates an empty page when template content is null', async () => {
      templateRepo.findById.mockResolvedValue({
        id: 't1',
        title: 'T',
        content: null,
      });
      pageService.create.mockResolvedValue({ id: 'p1' });

      await service.useTemplate(member, workspaceId, {
        templateId: 't1',
        spaceId: 'space-1',
      });

      expect(pageService.create).toHaveBeenCalledWith(
        'user-1',
        workspaceId,
        {
          title: 'T',
          icon: undefined,
          spaceId: 'space-1',
          parentPageId: undefined,
        },
      );
    });
  });
});
