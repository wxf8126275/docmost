import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PublicSpaceModule } from '../public-space/public-space.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PublicSpaceModule, WorkspaceModule, AiModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
