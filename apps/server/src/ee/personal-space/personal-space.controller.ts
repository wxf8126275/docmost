import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PersonalSpaceService } from './personal-space.service';
import { CreatePersonalSpaceDto } from './personal-space.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace, Space } from '@docmost/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('personal-space')
export class PersonalSpaceController {
  constructor(
    private readonly personalSpaceService: PersonalSpaceService,
  ) {}

  @Post('info')
  getPersonalSpace(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<Space | null> {
    return this.personalSpaceService.getPersonalSpace(user, workspace.id);
  }

  @Post('create')
  createPersonalSpace(
    @Body() dto: CreatePersonalSpaceDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<Space> {
    return this.personalSpaceService.createPersonalSpace(
      user,
      workspace.id,
      dto,
    );
  }
}
