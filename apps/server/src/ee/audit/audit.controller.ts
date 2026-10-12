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
import { AuditService } from './services/audit.service';
import {
  ListAuditLogsDto,
  UpdateAuditRetentionDto,
} from './dto/audit.dto';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  async listAuditLogs(
    @Body() dto: ListAuditLogsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: any,
  ) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException(
        'Only workspace owners can view audit logs',
      );
    }
    return this.auditService.listAuditLogs(workspace.id, dto);
  }

  @Post('retention')
  async getRetention(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: any,
  ) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException();
    }
    const retentionDays = await this.auditService.getRetention(workspace.id);
    return { retentionDays };
  }

  @Post('retention/update')
  async updateRetention(
    @Body() dto: UpdateAuditRetentionDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: any,
  ) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException();
    }
    await this.auditService.updateRetention(
      workspace.id,
      dto.auditRetentionDays,
    );
    return { retentionDays: dto.auditRetentionDays };
  }
}
