import { SpaceService } from './space.service';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { SpaceType } from '@docmost/db/types/entity.types';

function makeService(overrides: Partial<SpaceRepo> = {}) {
  const repo = {
    slugExists: jest.fn().mockResolvedValue(false),
    insertSpace: jest.fn().mockResolvedValue({ id: 's1', type: 'page' }),
    getSpacesInWorkspace: jest.fn().mockResolvedValue({ data: [] }),
    ...overrides,
  } as unknown as SpaceRepo;

  const service = new SpaceService(
    repo,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  return { service, repo };
}

describe('SpaceService', () => {
  it('should be defined', () => {
    const { service } = makeService();
    expect(service).toBeDefined();
  });

  it('create() persists type when provided', async () => {
    const { service, repo } = makeService();
    const dto = { name: 'd', slug: 'd', type: 'drive' } as any;
    await service.create('u1', 'w1', dto);
    expect(repo.insertSpace).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'drive' }),
      undefined,
    );
  });

  it('create() defaults type to page when omitted', async () => {
    const { service, repo } = makeService();
    const dto = { name: 'd', slug: 'd' } as any;
    await service.create('u1', 'w1', dto);
    expect(repo.insertSpace).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'page' }),
      undefined,
    );
  });

  it('create() throws when slug exists', async () => {
    const { service } = makeService({
      slugExists: jest.fn().mockResolvedValue(true),
    });
    const dto = { name: 'd', slug: 'd' } as any;
    await expect(service.create('u1', 'w1', dto)).rejects.toThrow();
  });

  it('getWorkspaceSpaces forwards type filter to repo', async () => {
    const { service, repo } = makeService();
    await service.getWorkspaceSpaces(
      'w1',
      {} as any,
      'drive' as SpaceType,
    );
    expect(repo.getSpacesInWorkspace).toHaveBeenCalledWith(
      'w1',
      expect.anything(),
      'drive',
    );
  });

  it('getWorkspaceSpaces omits type filter when not provided', async () => {
    const { service, repo } = makeService();
    await service.getWorkspaceSpaces('w1', {} as any);
    expect(repo.getSpacesInWorkspace).toHaveBeenCalledWith(
      'w1',
      expect.anything(),
      undefined,
    );
  });
});
