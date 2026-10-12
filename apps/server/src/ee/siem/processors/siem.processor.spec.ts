import { SiemProcessor } from './siem.processor';
import { SiemService } from '../services/siem.service';
import { QueueJob } from '../../../integrations/queue/constants/queue.constants';

describe('SiemProcessor', () => {
  it('delivers audit log on SIEM_DELIVER job', async () => {
    const siemService = {
      deliverAuditLog: jest.fn().mockResolvedValue(undefined),
    } as unknown as SiemService;
    const processor = new SiemProcessor(siemService);

    const event = { id: 'e1', workspaceId: 'w1' };
    await processor.process({
      name: QueueJob.SIEM_DELIVER,
      data: { workspaceId: 'w1', event },
    } as any);

    expect(siemService.deliverAuditLog).toHaveBeenCalledWith('w1', event);
  });

  it('ignores unknown job names', async () => {
    const siemService = {
      deliverAuditLog: jest.fn(),
    } as unknown as SiemService;
    const processor = new SiemProcessor(siemService);
    await processor.process({ name: 'other', data: {} } as any);
    expect(siemService.deliverAuditLog).not.toHaveBeenCalled();
  });
});
