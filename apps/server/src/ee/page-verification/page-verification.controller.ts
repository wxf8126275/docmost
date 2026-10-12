import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PageVerificationService } from './services/page-verification.service';
import {
  ListVerificationsDto,
  MarkObsoleteDto,
  RejectApprovalDto,
  RemoveVerificationDto,
  SetupVerificationDto,
  SubmitForApprovalDto,
  UpdateVerificationDto,
  VerificationInfoDto,
  VerifyPageDto,
} from './dto/page-verification.dto';

@Controller('pages')
@UseGuards(JwtAuthGuard)
export class PageVerificationController {
  constructor(private readonly service: PageVerificationService) {}

  @HttpCode(HttpStatus.OK)
  @Post('verification-info')
  getVerificationInfo(
    @Body() dto: VerificationInfoDto,
    @AuthUser() user: User,
  ) {
    return this.service.getVerificationInfo(user, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create-verification')
  setupVerification(
    @Body() dto: SetupVerificationDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.service.setupVerification(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update-verification')
  updateVerification(
    @Body() dto: UpdateVerificationDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.service.updateVerification(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete-verification')
  removeVerification(
    @Body() dto: RemoveVerificationDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.service.removeVerification(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify')
  verifyPage(
    @Body() dto: VerifyPageDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.service.verifyPage(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('submit-for-approval')
  submitForApproval(
    @Body() dto: SubmitForApprovalDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.service.submitForApproval(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reject-approval')
  rejectApproval(
    @Body() dto: RejectApprovalDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.service.rejectApproval(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('mark-obsolete')
  markObsolete(
    @Body() dto: MarkObsoleteDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.service.markObsolete(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verifications')
  listVerifications(
    @Body() dto: ListVerificationsDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.service.listVerifications(workspace.id, dto);
  }
}
