import { OnModuleDestroy } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueName, QueueJob } from '../../../integrations/queue/constants/queue.constants';
import { SiemService } from '../services/siem.service';

@Processor(QueueName.SIEM_QUEUE)
export class SiemProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = console;

  constructor(private readonly siemService: SiemService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === QueueJob.SIEM_DELIVER) {
      const { workspaceId, event } = job.data as {
        workspaceId: string;
        event: any;
      };
      await this.siemService.deliverAuditLog(workspaceId, event);
    }
  }

  @OnWorkerEvent('failed')
  onError(job: Job) {
    this.logger.error?.(`SIEM delivery job failed: ${job.failedReason}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
