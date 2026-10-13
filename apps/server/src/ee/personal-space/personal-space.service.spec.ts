import { Test } from '@nestjs/testing';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { SpaceService } from '../../core/space/services/space.service';
import { PersonalSpaceService } from './personal-space.service';
import { CreatePersonalSpaceDto } from './personal-space.dto';

describe('PersonalSpaceService', () => {
  let service: PersonalSpaceService;
  let spaceRepo: { findPersonalSpace: jest.Mock };
  let spaceService: { createSpace: jest.Mock };

  const user = { id: 'user-1' } as any;
  const workspaceId = 'ws-1';

  beforeEach(async () => {
    spaceRepo = { findPersonalSpace: jest.fn() };
    spaceService = { createSpace: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PersonalSpaceService,
        { provide: SpaceRepo, useValue: spaceRepo },
        { provide: SpaceService, useValue: spaceService },
      ],
    }).compile();

    service = moduleRef.get(PersonalSpaceService);
  });

  describe('getPersonalSpace', () => {
    it('returns null when no personal space exists', async () => {
      spaceRepo.findPersonalSpace.mockResolvedValue(undefined);

      const result = await service.getPersonalSpace(user, workspaceId);

      expect(result).toBeNull();
      expect(spaceRepo.findPersonalSpace).toHaveBeenCalledWith(
        'user-1',
        workspaceId,
      );
    });

    it('returns the personal space when it exists', async () => {
      const space = { id: 's1', slug: 'slug-1' };
      spaceRepo.findPersonalSpace.mockResolvedValue(space);

      expect(await service.getPersonalSpace(user, workspaceId)).toBe(space);
    });
  });

  describe('createPersonalSpace', () => {
    it('returns the existing personal space without creating', async () => {
      const existing = { id: 's1', slug: 'slug-1' };
      spaceRepo.findPersonalSpace.mockResolvedValue(existing);

      const result = await service.createPersonalSpace(user, workspaceId, {});

      expect(result).toBe(existing);
      expect(spaceService.createSpace).not.toHaveBeenCalled();
    });

    it('creates a personal space when none exists', async () => {
      spaceRepo.findPersonalSpace.mockResolvedValue(undefined);
      const created = { id: 's2', slug: 'created-slug' };
      spaceService.createSpace.mockResolvedValue(created);

      const result = await service.createPersonalSpace(user, workspaceId, {
        name: 'My Space',
      });

      expect(spaceService.createSpace).toHaveBeenCalledTimes(1);
      const [u, wsId, dto, trx, opts] = spaceService.createSpace.mock.calls[0];
      expect(u).toBe(user);
      expect(wsId).toBe(workspaceId);
      expect(dto.name).toBe('My Space');
      expect(dto.description).toBe('');
      expect(typeof dto.slug).toBe('string');
      expect(dto.slug.length).toBeGreaterThan(0);
      expect(trx).toBeUndefined();
      expect(opts).toEqual({ isPersonal: true });
      expect(result).toBe(created);
    });

    it('defaults the name to "Personal Space" when omitted', async () => {
      spaceRepo.findPersonalSpace.mockResolvedValue(undefined);
      spaceService.createSpace.mockResolvedValue({ id: 's3' });

      await service.createPersonalSpace(user, workspaceId, {});

      expect(spaceService.createSpace.mock.calls[0][2].name).toBe(
        'Personal Space',
      );
    });
  });
});
