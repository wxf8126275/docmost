import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { PageModule } from '../../core/page/page.module';

/**
 * Enterprise template module. `TemplateService` depends on `PageService` (to
 * instantiate pages from templates), so `PageModule` is imported here; the
 * remaining repositories (`TemplateRepo`, `SpaceMemberRepo`, `WorkspaceRepo`)
 * are provided by the global `DatabaseModule`.
 */
@Module({
  imports: [PageModule],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
