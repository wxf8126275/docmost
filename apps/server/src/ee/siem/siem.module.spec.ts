import { MODULE_METADATA } from '@nestjs/common/constants';
import { SiemModule } from './siem.module';
import { SiemController } from './siem.controller';
import { SiemService } from './services/siem.service';
import { SiemRepo } from './repos/siem.repo';
import { SiemProcessor } from './processors/siem.processor';

describe('SiemModule', () => {
  it('declares controller, service, repo and processor', () => {
    const providers: any[] =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, SiemModule) ?? [];
    const controllers: any[] =
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, SiemModule) ?? [];

    expect(controllers).toContain(SiemController);
    expect(providers).toContain(SiemService);
    expect(providers).toContain(SiemRepo);
    expect(providers).toContain(SiemProcessor);
  });
});
