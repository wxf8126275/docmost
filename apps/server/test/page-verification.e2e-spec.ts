import { ValidationPipe, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ScheduleModule } from '@nestjs/schedule';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PageVerificationModule } from '../src/ee/page-verification/page-verification.module';
import { PageVerificationService } from '../src/ee/page-verification/services/page-verification.service';
import { PageVerificationSchedulerService } from '../src/ee/page-verification/page-verification-scheduler.service';
import { PageVerificationRepo } from '../src/ee/page-verification/repos/page-verification.repo';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

const USER = { id: 'u1', name: 'Tester' } as any;
const WORKSPACE = { id: 'w1', name: 'Workspace' } as any;

describe('PageVerification (e2e)', () => {
  let app: NestFastifyApplication;
  let service: any;

  beforeAll(async () => {
    service = {
      getVerificationInfo: jest.fn().mockResolvedValue({
        status: 'none',
        permissions: {},
      }),
      setupVerification: jest.fn().mockResolvedValue(undefined),
      updateVerification: jest.fn().mockResolvedValue(undefined),
      removeVerification: jest.fn().mockResolvedValue(undefined),
      verifyPage: jest.fn().mockResolvedValue(undefined),
      submitForApproval: jest.fn().mockResolvedValue(undefined),
      rejectApproval: jest.fn().mockResolvedValue(undefined),
      markObsolete: jest.fn().mockResolvedValue(undefined),
      listVerifications: jest
        .fn()
        .mockResolvedValue({ items: [], meta: { hasNextPage: false } }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot(), PageVerificationModule],
    })
      .overrideProvider(PageVerificationService)
      .useValue(service)
      .overrideProvider(PageVerificationRepo)
      .useValue({})
      .overrideProvider(PageVerificationSchedulerService)
      .useValue({})
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { user: USER, workspace: WORKSPACE };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.listen(0);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.getVerificationInfo.mockResolvedValue({
      status: 'none',
      permissions: {},
    });
    service.listVerifications.mockResolvedValue({
      items: [],
      meta: { hasNextPage: false },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('verification-info delegates to the service and returns its payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/pages/verification-info')
      .send({ pageId: 'p1' })
      .expect(200);
    expect(service.getVerificationInfo).toHaveBeenCalledWith(USER, {
      pageId: 'p1',
    });
    expect(res.body.status).toBe('none');
  });

  it('create-verification delegates with the resolved user/workspace', async () => {
    const body = {
      pageId: 'p1',
      type: 'expiring',
      mode: 'period',
      periodAmount: 30,
      periodUnit: 'day',
      verifierIds: ['u2'],
    };
    await request(app.getHttpServer())
      .post('/pages/create-verification')
      .send(body)
      .expect(200);
    expect(service.setupVerification).toHaveBeenCalledWith(
      USER,
      'w1',
      expect.objectContaining({ pageId: 'p1', verifierIds: ['u2'] }),
    );
  });

  it('update-verification delegates correctly', async () => {
    await request(app.getHttpServer())
      .post('/pages/update-verification')
      .send({ pageId: 'p1', mode: 'indefinite' })
      .expect(200);
    expect(service.updateVerification).toHaveBeenCalledWith(USER, 'w1', {
      pageId: 'p1',
      mode: 'indefinite',
    });
  });

  it('delete-verification delegates correctly', async () => {
    await request(app.getHttpServer())
      .post('/pages/delete-verification')
      .send({ pageId: 'p1' })
      .expect(200);
    expect(service.removeVerification).toHaveBeenCalledWith(USER, 'w1', {
      pageId: 'p1',
    });
  });

  it('verify delegates correctly', async () => {
    await request(app.getHttpServer())
      .post('/pages/verify')
      .send({ pageId: 'p1' })
      .expect(200);
    expect(service.verifyPage).toHaveBeenCalledWith(USER, 'w1', {
      pageId: 'p1',
    });
  });

  it('submit-for-approval delegates correctly', async () => {
    await request(app.getHttpServer())
      .post('/pages/submit-for-approval')
      .send({ pageId: 'p1' })
      .expect(200);
    expect(service.submitForApproval).toHaveBeenCalledWith(USER, 'w1', {
      pageId: 'p1',
    });
  });

  it('reject-approval delegates with the comment', async () => {
    await request(app.getHttpServer())
      .post('/pages/reject-approval')
      .send({ pageId: 'p1', comment: 'nope' })
      .expect(200);
    expect(service.rejectApproval).toHaveBeenCalledWith(USER, 'w1', {
      pageId: 'p1',
      comment: 'nope',
    });
  });

  it('mark-obsolete delegates correctly', async () => {
    await request(app.getHttpServer())
      .post('/pages/mark-obsolete')
      .send({ pageId: 'p1' })
      .expect(200);
    expect(service.markObsolete).toHaveBeenCalledWith(USER, 'w1', {
      pageId: 'p1',
    });
  });

  it('verifications delegates and returns the paginated payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/pages/verifications')
      .send({ limit: 50 })
      .expect(200);
    expect(service.listVerifications).toHaveBeenCalled();
    expect(res.body).toEqual({ items: [], meta: { hasNextPage: false } });
  });

  it('rejects an invalid body with 400 (validation pipe)', async () => {
    await request(app.getHttpServer())
      .post('/pages/verify')
      .send({})
      .expect(400);
  });

  it('propagates a NotFoundException from the service as 404', async () => {
    service.getVerificationInfo.mockRejectedValueOnce(new NotFoundException());
    await request(app.getHttpServer())
      .post('/pages/verification-info')
      .send({ pageId: 'missing' })
      .expect(404);
  });
});
