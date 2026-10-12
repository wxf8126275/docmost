import { MODULE_METADATA } from '@nestjs/common/constants';
import { PageVerificationModule } from './page-verification.module';
import { PageVerificationController } from './page-verification.controller';
import { PageVerificationService } from './services/page-verification.service';
import { PageVerificationRepo } from './repos/page-verification.repo';

describe('PageVerificationModule', () => {
  it('declares the controller, service and repo', () => {
    const providers: any[] =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, PageVerificationModule) ?? [];
    const controllers: any[] =
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, PageVerificationModule) ?? [];

    expect(controllers).toContain(PageVerificationController);
    expect(providers).toContain(PageVerificationService);
    expect(providers).toContain(PageVerificationRepo);
    expect(providers).toContain(PageVerificationService);
  });
});
