import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '@docmost/db/types/entity.types';
import { UserRole } from '../../common/helpers/types/permission';
import { SiemService } from './services/siem.service';
import {
  ISiemDestinationInput,
  ITestSiemDestinationInput,
  IUpdateSiemDestinationInput,
} from './types/siem.types';

@Controller('siem')
@UseGuards(JwtAuthGuard)
export class SiemController {
  constructor(private readonly siemService: SiemService) {}

  private ensureOwner(user: User): void {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException(
        'Only workspace owners can manage SIEM destinations',
      );
    }
  }

  @Post('destinations')
  async list(@AuthUser() user: User, @AuthWorkspace() workspace: any) {
    this.ensureOwner(user);
    return this.siemService.list(workspace.id);
  }

  @Post('destinations/create')
  async create(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: any,
    @Body() dto: ISiemDestinationInput,
  ) {
    this.ensureOwner(user);
    return this.siemService.create(workspace.id, user.id, dto);
  }

  @Post('destinations/update')
  async update(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: any,
    @Body() dto: IUpdateSiemDestinationInput,
  ) {
    this.ensureOwner(user);
    return this.siemService.update(workspace.id, dto);
  }

  @Post('destinations/delete')
  async delete(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: any,
    @Body() dto: { destinationId: string },
  ) {
    this.ensureOwner(user);
    return this.siemService.remove(workspace.id, dto.destinationId);
  }

  @Post('destinations/test')
  async test(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: any,
    @Body() dto: ITestSiemDestinationInput,
  ) {
    this.ensureOwner(user);
    return this.siemService.test(workspace.id, dto);
  }

  @Post('destinations/retry')
  async retry(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: any,
    @Body() dto: { destinationId: string },
  ) {
    this.ensureOwner(user);
    return this.siemService.retry(workspace.id, dto.destinationId);
  }
}
