import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueueJob } from '../../integrations/queue/constants';
import { PageVerificationService } from './services/page-verification.service';
import { PageVerificationRepo } from './repos/page-verification.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PageAccessService } from '../../core/page/page-access/page-access.service';

const page = { id: 'p1', spaceId: 's1', deletedAt: null } as any;
const user = { id: 'u1', role: 'member' } as any;

function buildRepo() {
  return {
    getByPageId: jest.fn(),
    getById: jest.fn(),
    insert: jest
      .fn()
      .mockResolvedValue({ id: 'pv1', pageId: 'p1', spaceId: 's1' }),
    update: jest.fn().mockResolvedValue({ id: 'pv1' }),
    deleteByPageId: jest.fn(),
    getUserRef: jest.fn().mockResolvedValue(null),
    getVerifierRefs: jest.fn().mockResolvedValue([]),
    getVerifierUserIds: jest.fn().mockResolvedValue([]),
    setVerifiers: jest.fn(),
    listVerifications: jest.fn(),
  } as unknown as PageVerificationRepo;
}

function buildPageRepo() {
  return {
    findById: jest.fn().mockResolvedValue(page),
  } as unknown as PageRepo;
}

function buildAccess(canEdit = true) {
  return {
    validateCanView: jest.fn().mockResolvedValue(undefined),
    validateCanEdit: canEdit
      ? jest.fn().mockResolvedValue(undefined)
      : jest.fn().mockRejectedValue(new ForbiddenException()),
  } as unknown as PageAccessService;
}

describe('PageVerificationService', () => {
  let service: PageVerificationService;
  let repo: any;
  let pageRepo: any;
  let access: any;
  let queue: any;

  beforeEach(() => {
    repo = buildRepo();
    pageRepo = buildPageRepo();
    access = buildAccess(true);
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new PageVerificationService(repo, pageRepo, access, queue);
  });

  it('getVerificationInfo returns status none when no record exists', async () => {
    repo.getByPageId.mockResolvedValue(undefined);
    const result = await service.getVerificationInfo(user, { pageId: 'p1' });
    expect(result.status).toBe('none');
    expect(result.permissions.canManage).toBe(true);
  });

  it('setupVerification (expiring) verifies immediately', async () => {
    repo.getByPageId.mockResolvedValue(undefined);
    await service.setupVerification(user, 'w1', {
      pageId: 'p1',
      type: 'expiring',
      mode: 'period',
      periodAmount: 30,
      periodUnit: 'day',
      verifierIds: ['u2'],
    });
    expect(repo.insert).toHaveBeenCalledTimes(1);
    const inserted = repo.insert.mock.calls[0][0];
    expect(inserted.status).toBe('verified');
    expect(inserted.type).toBe('expiring');
    expect(inserted.expiresAt).toBeInstanceOf(Date);
    expect(inserted.verifiedById).toBe('u1');
    expect(repo.setVerifiers).toHaveBeenCalledWith('pv1', ['u2'], 'u1');
  });

  it('setupVerification (qms) starts as draft', async () => {
    repo.getByPageId.mockResolvedValue(undefined);
    await service.setupVerification(user, 'w1', {
      pageId: 'p1',
      type: 'qms',
      verifierIds: ['u2'],
    });
    const inserted = repo.insert.mock.calls[0][0];
    expect(inserted.status).toBe('draft');
    expect(inserted.type).toBe('qms');
    expect(inserted.verifiedAt).toBeNull();
  });

  it('setupVerification rejects when one already exists', async () => {
    repo.getByPageId.mockResolvedValue({ id: 'pv0' });
    await expect(
      service.setupVerification(user, 'w1', {
        pageId: 'p1',
        type: 'expiring',
        verifierIds: ['u2'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verifyPage approves a qms document', async () => {
    repo.getByPageId.mockResolvedValue({
      id: 'pv1',
      type: 'qms',
      status: 'in_approval',
    });
    await service.verifyPage(user, 'w1', { pageId: 'p1' });
    expect(repo.update).toHaveBeenCalledWith('pv1', {
      status: 'approved',
      verifiedAt: expect.any(Date),
      verifiedById: 'u1',
    });
    expect(queue.add).toHaveBeenCalledWith(
      QueueJob.PAGE_VERIFIED_NOTIFICATION,
      expect.objectContaining({ actorId: 'u1', verifierIds: [] }),
      expect.any(Object),
    );
  });

  it('verifyPage re-verifies an expiring page and recomputes expiry', async () => {
    repo.getByPageId.mockResolvedValue({
      id: 'pv1',
      type: 'expiring',
      status: 'verified',
      mode: 'period',
      periodAmount: 7,
      periodUnit: 'day',
    });
    await service.verifyPage(user, 'w1', { pageId: 'p1' });
    const update = repo.update.mock.calls[0][1];
    expect(update.status).toBe('verified');
    expect(update.expiresAt).toBeInstanceOf(Date);
  });

  it('verifyPage is forbidden for non-verifier non-manager', async () => {
    const noAccess = buildAccess(false);
    service = new PageVerificationService(repo, pageRepo, noAccess, queue);
    repo.getByPageId.mockResolvedValue({
      id: 'pv1',
      type: 'qms',
      status: 'in_approval',
    });
    repo.getVerifierUserIds.mockResolvedValue(['u2']);
    await expect(
      service.verifyPage(user, 'w1', { pageId: 'p1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('submitForApproval moves qms to in_approval', async () => {
    repo.getByPageId.mockResolvedValue({ id: 'pv1', type: 'qms', status: 'draft' });
    await service.submitForApproval(user, 'w1', { pageId: 'p1' });
    expect(repo.update).toHaveBeenCalledWith('pv1', {
      status: 'in_approval',
      requestedAt: expect.any(Date),
      requestedById: 'u1',
    });
    expect(queue.add).toHaveBeenCalledWith(
      QueueJob.PAGE_APPROVAL_REQUESTED_NOTIFICATION,
      expect.objectContaining({ actorId: 'u1', verifierIds: [] }),
      expect.any(Object),
    );
  });

  it('rejectApproval returns qms to draft with comment', async () => {
    repo.getByPageId.mockResolvedValue({ id: 'pv1', type: 'qms', status: 'in_approval' });
    await service.rejectApproval(user, 'w1', { pageId: 'p1', comment: 'nope' });
    const update = repo.update.mock.calls[0][1];
    expect(update.status).toBe('draft');
    expect(update.rejectionComment).toBe('nope');
    expect(update.rejectedById).toBe('u1');
    expect(queue.add).toHaveBeenCalledWith(
      QueueJob.PAGE_APPROVAL_REJECTED_NOTIFICATION,
      expect.objectContaining({ actorId: 'u1', comment: 'nope' }),
      expect.any(Object),
    );
  });

  it('markObsolete sets status obsolete', async () => {
    repo.getByPageId.mockResolvedValue({ id: 'pv1', type: 'qms', status: 'approved' });
    await service.markObsolete(user, 'w1', { pageId: 'p1' });
    expect(repo.update).toHaveBeenCalledWith('pv1', { status: 'obsolete' });
  });

  it('removeVerification deletes the record', async () => {
    repo.getByPageId.mockResolvedValue({ id: 'pv1' });
    await service.removeVerification(user, 'w1', { pageId: 'p1' });
    expect(repo.deleteByPageId).toHaveBeenCalledWith('p1');
  });

  it('updateVerification rejects non-managers', async () => {
    const noAccess = buildAccess(false);
    service = new PageVerificationService(repo, pageRepo, noAccess, queue);
    repo.getByPageId.mockResolvedValue({ id: 'pv1', type: 'expiring', status: 'verified' });
    await expect(
      service.updateVerification(user, 'w1', { pageId: 'p1', verifierIds: ['u3'] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('listVerifications derives expired status for past expiry', async () => {
    repo.listVerifications.mockResolvedValue({
      items: [
        {
          id: 'pv1',
          pageId: 'p1',
          spaceId: 's1',
          type: 'expiring',
          status: 'verified',
          mode: 'period',
          periodAmount: 1,
          periodUnit: 'day',
          verifiedAt: new Date(),
          expiresAt: new Date('2000-01-01'),
          createdAt: new Date(),
          pageTitle: 'Page',
          pageSlugId: 'slug',
          pageIcon: null,
          spaceName: 'Space',
          spaceSlug: 'space',
          verifiers: [{ id: 'u2', name: 'V', avatarUrl: null }],
        },
      ],
      meta: { hasNextPage: false },
    });
    const result = await service.listVerifications('w1', { limit: 50 });
    expect(result.items[0].status).toBe('expired');
    expect(result.items[0].verifiers[0]).toEqual({
      id: 'u2',
      name: 'V',
      avatarUrl: null,
    });
  });

  it('throws NotFound when target page is missing', async () => {
    pageRepo.findById.mockResolvedValue(null);
    await expect(
      service.getVerificationInfo(user, { pageId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
