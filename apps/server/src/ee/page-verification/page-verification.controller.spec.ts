import { Test, TestingModule } from '@nestjs/testing';
import { PageVerificationController } from './page-verification.controller';
import { PageVerificationService } from './services/page-verification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('PageVerificationController', () => {
  let controller: PageVerificationController;
  let service: any;

  beforeEach(async () => {
    service = {
      getVerificationInfo: jest.fn().mockResolvedValue({ status: 'none' }),
      setupVerification: jest.fn().mockResolvedValue(undefined),
      updateVerification: jest.fn().mockResolvedValue(undefined),
      removeVerification: jest.fn().mockResolvedValue(undefined),
      verifyPage: jest.fn().mockResolvedValue(undefined),
      submitForApproval: jest.fn().mockResolvedValue(undefined),
      rejectApproval: jest.fn().mockResolvedValue(undefined),
      markObsolete: jest.fn().mockResolvedValue(undefined),
      listVerifications: jest
        .fn()
        .mockResolvedValue({ items: [], meta: {} }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageVerificationController],
      providers: [{ provide: PageVerificationService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PageVerificationController);
  });

  it('verification-info delegates to service.getVerificationInfo', async () => {
    const result = await controller.getVerificationInfo({ pageId: 'p1' }, {
      id: 'u1',
    } as any);
    expect(service.getVerificationInfo).toHaveBeenCalledWith(
      { id: 'u1' },
      { pageId: 'p1' },
    );
    expect(result.status).toBe('none');
  });

  it('create-verification delegates to setupVerification', async () => {
    await controller.setupVerification(
      { pageId: 'p1', verifierIds: ['u2'] },
      { id: 'u1' } as any,
      { id: 'w1' } as any,
    );
    expect(service.setupVerification).toHaveBeenCalledWith(
      { id: 'u1' },
      'w1',
      {
        pageId: 'p1',
        verifierIds: ['u2'],
      },
    );
  });

  it('verify delegates to verifyPage', async () => {
    await controller.verifyPage(
      { pageId: 'p1' },
      { id: 'u1' } as any,
      { id: 'w1' } as any,
    );
    expect(service.verifyPage).toHaveBeenCalledWith(
      { id: 'u1' },
      'w1',
      { pageId: 'p1' },
    );
  });

  it('verifications delegates to listVerifications', async () => {
    await controller.listVerifications(
      { limit: 50 },
      { id: 'w1' } as any,
    );
    expect(service.listVerifications).toHaveBeenCalledWith('w1', { limit: 50 });
  });

  it('mark-obsolete delegates to markObsolete', async () => {
    await controller.markObsolete(
      { pageId: 'p1' },
      { id: 'u1' } as any,
      { id: 'w1' } as any,
    );
    expect(service.markObsolete).toHaveBeenCalledWith({ id: 'u1' }, 'w1', {
      pageId: 'p1',
    });
  });
});
