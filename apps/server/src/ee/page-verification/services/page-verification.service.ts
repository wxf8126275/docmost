import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PageAccessService } from '../../../core/page/page-access/page-access.service';
import { QueueJob, QueueName } from '../../../integrations/queue/constants';
import {
  InsertablePageVerification,
  Page,
  UpdatablePageVerification,
  User,
} from '@docmost/db/types/entity.types';
import { PageVerificationRepo } from '../repos/page-verification.repo';
import {
  ListVerificationsDto,
  MarkObsoleteDto,
  RejectApprovalDto,
  RemoveVerificationDto,
  SetupVerificationDto,
  SubmitForApprovalDto,
  UpdateVerificationDto,
  VerificationInfoDto,
  VerifyPageDto,
} from '../dto/page-verification.dto';

export type VerificationType = 'expiring' | 'qms';
export type ExpirationMode = 'period' | 'fixed' | 'indefinite';
export type PeriodUnit = 'day' | 'week' | 'month' | 'year';

export interface IUserRefOut {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface IVerifierOut {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string;
}

export interface IPageVerificationPermissions {
  canVerify: boolean;
  canManage: boolean;
  canSubmitForApproval: boolean;
  canMarkObsolete: boolean;
}

export interface IPageVerificationInfoOut {
  id?: string;
  pageId?: string;
  type?: VerificationType;
  mode?: ExpirationMode | null;
  periodAmount?: number | null;
  periodUnit?: PeriodUnit | null;
  status: string;
  verifiedAt?: string | null;
  verifiedBy?: IUserRefOut | null;
  expiresAt?: string | null;
  requestedAt?: string | null;
  requestedBy?: IUserRefOut | null;
  rejectedAt?: string | null;
  rejectedBy?: IUserRefOut | null;
  rejectionComment?: string | null;
  verifiers?: IVerifierOut[];
  permissions: IPageVerificationPermissions;
}

export interface IVerificationListItemOut {
  id: string;
  pageId: string;
  spaceId: string;
  type: VerificationType;
  status: string;
  mode: ExpirationMode | null;
  periodAmount: number | null;
  periodUnit: PeriodUnit | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  pageTitle: string | null;
  pageSlugId: string;
  pageIcon: string | null;
  spaceName: string;
  spaceSlug: string;
  verifiers: IUserRefOut[];
}

function addPeriod(date: Date, amount: number, unit: PeriodUnit): Date {
  const d = new Date(date);
  switch (unit) {
    case 'day':
      d.setDate(d.getDate() + amount);
      break;
    case 'week':
      d.setDate(d.getDate() + amount * 7);
      break;
    case 'month':
      d.setMonth(d.getMonth() + amount);
      break;
    case 'year':
      d.setFullYear(d.getFullYear() + amount);
      break;
  }
  return d;
}

function computeExpiresAt(
  mode: ExpirationMode,
  periodAmount: number,
  periodUnit: PeriodUnit,
  fixedExpiresAt: string | undefined,
  now: Date,
): Date | null {
  if (mode === 'indefinite') return null;
  if (mode === 'fixed') return fixedExpiresAt ? new Date(fixedExpiresAt) : null;
  return addPeriod(now, periodAmount, periodUnit);
}

/**
 * Derive the display status from a stored verification record. An expiring
 * verification whose `expiresAt` has passed is reported as `expired` even if the
 * persisted status is still `verified`.
 */
function deriveStatus(record: {
  type: string;
  status: string | null;
  expiresAt: Date | string | null;
}): string {
  if (
    record.type === 'expiring' &&
    record.status === 'verified' &&
    record.expiresAt &&
    new Date(record.expiresAt) <= new Date()
  ) {
    return 'expired';
  }
  return record.status ?? 'none';
}

@Injectable()
export class PageVerificationService {
  constructor(
    private readonly repo: PageVerificationRepo,
    private readonly pageRepo: PageRepo,
    private readonly pageAccessService: PageAccessService,
    @InjectQueue(QueueName.NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  /**
   * Enqueue a notification job, swallowing failures so a broken queue never
   * breaks the originating API request.
   */
  private async enqueueNotification(
    job: QueueJob,
    data: Record<string, unknown>,
    jobId?: string,
  ): Promise<void> {
    try {
      await this.notificationQueue.add(job, data, {
        jobId,
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: 1000,
      });
    } catch (error) {
      // Intentionally non-fatal: the state change already succeeded.
    }
  }

  private async computePermissions(
    user: User,
    page: Page,
    verifierIds: string[],
    status: string,
  ): Promise<IPageVerificationPermissions> {
    let canManage = false;
    try {
      await this.pageAccessService.validateCanEdit(page, user);
      canManage = true;
    } catch {
      canManage = false;
    }
    const isVerifier = verifierIds.includes(user.id);
    return {
      canVerify: canManage || isVerifier,
      canManage,
      canSubmitForApproval: canManage || isVerifier,
      canMarkObsolete: canManage && status !== 'obsolete',
    };
  }

  private async resolvePage(pageId: string): Promise<Page> {
    const page = await this.pageRepo.findById(pageId);
    if (!page || page.deletedAt) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  async getVerificationInfo(
    user: User,
    dto: VerificationInfoDto,
  ): Promise<IPageVerificationInfoOut> {
    const page = await this.resolvePage(dto.pageId);
    await this.pageAccessService.validateCanView(page, user);

    const verification = await this.repo.getByPageId(dto.pageId);
    if (!verification) {
      const permissions = await this.computePermissions(
        user,
        page,
        [],
        'none',
      );
      return { status: 'none', permissions };
    }

    const [verifierRefs, verifierIds, verifiedBy, requestedBy, rejectedBy] =
      await Promise.all([
        this.repo.getVerifierRefs(verification.id),
        this.repo.getVerifierUserIds(verification.id),
        this.repo.getUserRef(verification.verifiedById),
        this.repo.getUserRef(verification.requestedById),
        this.repo.getUserRef(verification.rejectedById),
      ]);

    const permissions = await this.computePermissions(
      user,
      page,
      verifierIds,
      verification.status ?? 'none',
    );

    return {
      id: verification.id,
      pageId: verification.pageId,
      type: verification.type as VerificationType,
      mode: verification.mode as ExpirationMode | null,
      periodAmount: verification.periodAmount,
      periodUnit: verification.periodUnit as PeriodUnit | null,
      status: deriveStatus(verification),
      verifiedAt: verification.verifiedAt
        ? new Date(verification.verifiedAt).toISOString()
        : null,
      verifiedBy: verifiedBy
        ? { id: verifiedBy.id, name: verifiedBy.name, avatarUrl: verifiedBy.avatarUrl }
        : null,
      expiresAt: verification.expiresAt
        ? new Date(verification.expiresAt).toISOString()
        : null,
      requestedAt: verification.requestedAt
        ? new Date(verification.requestedAt).toISOString()
        : null,
      requestedBy: requestedBy
        ? { id: requestedBy.id, name: requestedBy.name, avatarUrl: requestedBy.avatarUrl }
        : null,
      rejectedAt: verification.rejectedAt
        ? new Date(verification.rejectedAt).toISOString()
        : null,
      rejectedBy: rejectedBy
        ? { id: rejectedBy.id, name: rejectedBy.name, avatarUrl: rejectedBy.avatarUrl }
        : null,
      rejectionComment: verification.rejectionComment,
      verifiers: verifierRefs,
      permissions,
    };
  }

  async setupVerification(
    user: User,
    workspaceId: string,
    dto: SetupVerificationDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId);
    await this.pageAccessService.validateCanEdit(page, user);

    const existing = await this.repo.getByPageId(dto.pageId);
    if (existing) {
      throw new BadRequestException(
        'Verification already exists for this page',
      );
    }

    const isQms = dto.type === 'qms';
    const now = new Date();
    const mode: ExpirationMode = isQms ? 'period' : (dto.mode ?? 'period');

    const insert: InsertablePageVerification = {
      pageId: dto.pageId,
      workspaceId,
      spaceId: page.spaceId,
      type: isQms ? 'qms' : 'expiring',
      status: isQms ? 'draft' : 'verified',
      mode: isQms ? null : mode,
      periodAmount: isQms ? null : mode === 'period' ? (dto.periodAmount ?? 1) : null,
      periodUnit: isQms ? null : mode === 'period' ? (dto.periodUnit ?? 'month') : null,
      verifiedAt: isQms ? null : now,
      verifiedById: isQms ? null : user.id,
      expiresAt: isQms
        ? null
        : computeExpiresAt(
            mode,
            dto.periodAmount ?? 1,
            dto.periodUnit ?? 'month',
            dto.fixedExpiresAt,
            now,
          ),
      requestedAt: null,
      requestedById: null,
      rejectedAt: null,
      rejectedById: null,
      rejectionComment: null,
      data: null,
      creatorId: user.id,
    };

    const verification = await this.repo.insert(insert);
    await this.repo.setVerifiers(
      verification.id,
      dto.verifierIds,
      user.id,
    );
  }

  async updateVerification(
    user: User,
    workspaceId: string,
    dto: UpdateVerificationDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId);
    const verification = await this.repo.getByPageId(dto.pageId);
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const verifierIds = await this.repo.getVerifierUserIds(verification.id);
    const permissions = await this.computePermissions(
      user,
      page,
      verifierIds,
      verification.status ?? 'none',
    );
    if (!permissions.canManage) {
      throw new ForbiddenException(
        'You do not have permission to manage this verification',
      );
    }

    // Expiration fields only apply to the recurring (expiring) workflow.
    if (verification.type !== 'qms' && dto.mode !== undefined) {
      const update: UpdatablePageVerification = {};
      update.mode = dto.mode;
      if (dto.mode === 'indefinite') {
        update.expiresAt = null;
      } else if (dto.mode === 'fixed') {
        if (dto.fixedExpiresAt !== undefined) {
          update.expiresAt = dto.fixedExpiresAt
            ? new Date(dto.fixedExpiresAt)
            : null;
        }
      } else {
        if (dto.periodAmount !== undefined) update.periodAmount = dto.periodAmount;
        if (dto.periodUnit !== undefined) update.periodUnit = dto.periodUnit;
        const amount = dto.periodAmount ?? verification.periodAmount ?? 1;
        const unit =
          (dto.periodUnit as PeriodUnit) ??
          (verification.periodUnit as PeriodUnit) ??
          'month';
        update.expiresAt = addPeriod(new Date(), amount, unit);
      }
      await this.repo.update(verification.id, update);
    }

    if (dto.verifierIds !== undefined) {
      await this.repo.setVerifiers(
        verification.id,
        dto.verifierIds,
        user.id,
      );
    }
  }

  async removeVerification(
    user: User,
    workspaceId: string,
    dto: RemoveVerificationDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId);
    await this.pageAccessService.validateCanEdit(page, user);

    const verification = await this.repo.getByPageId(dto.pageId);
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }
    await this.repo.deleteByPageId(dto.pageId);
  }

  async verifyPage(
    user: User,
    workspaceId: string,
    dto: VerifyPageDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId);
    const verification = await this.repo.getByPageId(dto.pageId);
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const verifierIds = await this.repo.getVerifierUserIds(verification.id);
    const permissions = await this.computePermissions(
      user,
      page,
      verifierIds,
      verification.status ?? 'none',
    );
    if (!permissions.canVerify) {
      throw new ForbiddenException(
        'You do not have permission to verify this page',
      );
    }

    const now = new Date();
    let update: UpdatablePageVerification;
    if (verification.type === 'qms') {
      // Approval of a document in the qms workflow.
      update = {
        status: 'approved',
        verifiedAt: now,
        verifiedById: user.id,
      };
    } else {
      const mode = (verification.mode as ExpirationMode) ?? 'period';
      let expiresAt: Date | null = null;
      if (mode === 'period') {
        expiresAt = addPeriod(
          now,
          verification.periodAmount ?? 1,
          (verification.periodUnit as PeriodUnit) ?? 'month',
        );
      } else if (mode === 'fixed') {
        expiresAt = verification.expiresAt
          ? new Date(verification.expiresAt)
          : null;
      }
      update = {
        status: 'verified',
        verifiedAt: now,
        verifiedById: user.id,
        expiresAt,
      };
    }
    await this.repo.update(verification.id, update);

    await this.enqueueNotification(QueueJob.PAGE_VERIFIED_NOTIFICATION, {
      pageId: dto.pageId,
      spaceId: verification.spaceId,
      workspaceId,
      actorId: user.id,
      verifierIds,
    });
  }

  async submitForApproval(
    user: User,
    workspaceId: string,
    dto: SubmitForApprovalDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId);
    const verification = await this.repo.getByPageId(dto.pageId);
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const verifierIds = await this.repo.getVerifierUserIds(verification.id);
    const permissions = await this.computePermissions(
      user,
      page,
      verifierIds,
      verification.status ?? 'none',
    );
    if (!permissions.canSubmitForApproval) {
      throw new ForbiddenException(
        'You do not have permission to submit this page for approval',
      );
    }

    const now = new Date();
    await this.repo.update(verification.id, {
      status: 'in_approval',
      requestedAt: now,
      requestedById: user.id,
    });

    await this.enqueueNotification(
      QueueJob.PAGE_APPROVAL_REQUESTED_NOTIFICATION,
      {
        pageId: dto.pageId,
        spaceId: verification.spaceId,
        workspaceId,
        actorId: user.id,
        verifierIds,
      },
    );
  }

  async rejectApproval(
    user: User,
    workspaceId: string,
    dto: RejectApprovalDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId);
    const verification = await this.repo.getByPageId(dto.pageId);
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const verifierIds = await this.repo.getVerifierUserIds(verification.id);
    const permissions = await this.computePermissions(
      user,
      page,
      verifierIds,
      verification.status ?? 'none',
    );
    if (!permissions.canVerify) {
      throw new ForbiddenException(
        'You do not have permission to reject this approval',
      );
    }

    const now = new Date();
    await this.repo.update(verification.id, {
      status: 'draft',
      rejectedAt: now,
      rejectedById: user.id,
      rejectionComment: dto.comment ?? null,
    });

    await this.enqueueNotification(
      QueueJob.PAGE_APPROVAL_REJECTED_NOTIFICATION,
      {
        pageId: dto.pageId,
        spaceId: verification.spaceId,
        workspaceId,
        actorId: user.id,
        requestedById: verification.requestedById,
        comment: dto.comment ?? null,
      },
    );
  }

  async markObsolete(
    user: User,
    workspaceId: string,
    dto: MarkObsoleteDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId);
    await this.pageAccessService.validateCanEdit(page, user);

    const verification = await this.repo.getByPageId(dto.pageId);
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }
    await this.repo.update(verification.id, { status: 'obsolete' });
  }

  async listVerifications(
    workspaceId: string,
    dto: ListVerificationsDto,
  ): Promise<{ items: IVerificationListItemOut[]; meta: any }> {
    const result = await this.repo.listVerifications(
      workspaceId,
      {
        limit: dto.limit ?? 50,
        cursor: dto.cursor,
        beforeCursor: dto.beforeCursor,
        query: '',
        adminView: false,
      },
      {
        spaceIds: dto.spaceIds,
        verifierId: dto.verifierId,
        type: dto.type,
        query: dto.query,
      },
    );

    const items = result.items.map((row) => ({
      id: row.id,
      pageId: row.pageId,
      spaceId: row.spaceId,
      type: row.type,
      status: deriveStatus(row),
      mode: row.mode,
      periodAmount: row.periodAmount,
      periodUnit: row.periodUnit,
      verifiedAt: row.verifiedAt ? new Date(row.verifiedAt).toISOString() : null,
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      pageTitle: row.pageTitle,
      pageSlugId: row.pageSlugId,
      pageIcon: row.pageIcon,
      spaceName: row.spaceName,
      spaceSlug: row.spaceSlug,
      verifiers: (row.verifiers ?? []).map((v: any) => ({
        id: v.id,
        name: v.name,
        avatarUrl: v.avatarUrl,
      })),
    }));

    return { items, meta: result.meta };
  }
}
