import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueJob, QueueName } from '../../integrations/queue/constants';

const RECONCILE_INTERVAL_MS = 60 * 60 * 1000; // hourly
const EXPIRING_SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Periodically scans expiring page verifications and enqueues notification jobs
 * for records that are about to expire or have already expired. Consumed by
 * `NotificationProcessor` (VERIFICATION_RECONCILE job), which calls `reconcile()`.
 */
@Injectable()
export class PageVerificationSchedulerService {
  private readonly logger = new Logger(
    PageVerificationSchedulerService.name,
  );

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    @InjectQueue(QueueName.NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  @Interval('verification-reconcile', RECONCILE_INTERVAL_MS)
  async enqueueReconcile(): Promise<void> {
    try {
      await this.notificationQueue.add(
        QueueJob.VERIFICATION_RECONCILE,
        {},
        {
          jobId: 'verification-reconcile',
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: 1000,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue verification reconcile job: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  async reconcile(): Promise<void> {
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + EXPIRING_SOON_WINDOW_MS);

      const expiringSoon = await this.db
        .selectFrom('pageVerifications')
        .select(['id'])
        .where('type', '=', 'expiring')
        .where('status', '=', 'verified')
        .where('expiresAt', '>=', now)
        .where('expiresAt', '<=', soon)
        .execute();

      for (const row of expiringSoon) {
        await this.notificationQueue.add(
          QueueJob.PAGE_VERIFICATION_EXPIRING,
          { verificationId: row.id },
          {
            jobId: `verification-expiring-${row.id}`,
            attempts: 3,
            removeOnComplete: true,
          },
        );
      }

      const expired = await this.db
        .selectFrom('pageVerifications')
        .select(['id'])
        .where('type', '=', 'expiring')
        .where('status', '=', 'verified')
        .where('expiresAt', '<=', now)
        .execute();

      for (const row of expired) {
        await this.notificationQueue.add(
          QueueJob.PAGE_VERIFICATION_EXPIRED,
          { verificationId: row.id },
          {
            jobId: `verification-expired-${row.id}`,
            attempts: 3,
            removeOnComplete: true,
          },
        );
      }
    } catch (error) {
      this.logger.error(
        `Verification reconcile failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }
}
