import { Module } from '@nestjs/common';
import { PersonalSpaceController } from './personal-space.controller';
import { PersonalSpaceService } from './personal-space.service';
import { SpaceModule } from '../../core/space/space.module';

@Module({
  controllers: [PersonalSpaceController],
  providers: [PersonalSpaceService],
  imports: [SpaceModule],
})
export class PersonalSpaceModule {}
