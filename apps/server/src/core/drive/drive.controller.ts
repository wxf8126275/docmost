import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import * as path from 'path';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '../../common/interceptors/file.interceptor';
import { createByteCountingStream } from '../../common/helpers/utils';
import { DriveFile, User, Workspace } from '@docmost/db/types/entity.types';
import { DriveService } from './services/drive.service';
import { DriveStorageService } from './services/drive-storage.service';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import {
  CreateFolderDto,
  CreateShareLinkDto,
  UpdateFileDto,
  UpdateFolderDto,
} from './dto/drive.dto';
import { DriveShareService } from './services/drive-share.service';
import { DriveQuotaService } from './services/drive-quota.service';
import { DriveVersionService } from './services/drive-version.service';

/**
 * All Cloud Drive endpoints live inside a drive space:
 * `spaces/:spaceId/drive/*`. Authorization reuses the space CASL ability
 * (reader → Read Drive, writer/admin → Manage Drive), so membership and role
 * are the single source of truth — there is no separate drive ownership model.
 */
@Controller('spaces/:spaceId/drive')
export class DriveController {
  constructor(
    private readonly driveService: DriveService,
    private readonly driveStorageService: DriveStorageService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly spaceRepo: SpaceRepo,
    private readonly driveShareService: DriveShareService,
    private readonly driveQuotaService: DriveQuotaService,
    private readonly driveVersionService: DriveVersionService,
  ) {}

  /**
   * Resolves the target space and authorizes the requested action against the
   * user's space role. Non-drive spaces, unknown spaces, non-members and
   * insufficient roles all yield 403 (space existence is not leaked).
   */
  private async assertDriveAccess(
    user: User,
    workspaceId: string,
    spaceId: string,
    action: 'read' | 'manage',
  ): Promise<void> {
    const space = await this.spaceRepo.findById(spaceId, workspaceId);
    if (!space || space.type !== 'drive') {
      throw new ForbiddenException();
    }

    let ability;
    try {
      ability = await this.spaceAbility.createForUser(user, spaceId);
    } catch {
      throw new ForbiddenException();
    }

    const required =
      action === 'manage' ? SpaceCaslAction.Manage : SpaceCaslAction.Read;
    if (ability.cannot(required, SpaceCaslSubject.Drive)) {
      throw new ForbiddenException();
    }
  }

  // ---- Folders ----

  @UseGuards(JwtAuthGuard)
  @Get('folders')
  async listFolders(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Query('parentId') parentId?: string,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'read');
    const folders = await this.driveService.listFolders(
      user,
      workspace.id,
      spaceId,
      parentId ?? null,
    );
    return { folders };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('folders')
  async createFolder(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Body() dto: CreateFolderDto,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'manage');
    const folder = await this.driveService.createFolder(user, workspace.id, {
      spaceId,
      name: dto.name,
      parentId: dto.parentId ?? null,
    });
    return { folder };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('folders/:folderId')
  async updateFolder(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Param('folderId') folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'manage');

    if (dto.name != null) {
      await this.driveService.renameFolder(spaceId, folderId, dto.name);
    }
    if (dto.parentId !== undefined) {
      await this.driveService.moveFolder(spaceId, folderId, dto.parentId ?? null);
    }
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('folders/:folderId')
  async deleteFolder(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Param('folderId') folderId: string,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'manage');
    await this.driveService.softDeleteFolder(spaceId, folderId);
    return { success: true };
  }

  // ---- Files ----

  @UseGuards(JwtAuthGuard)
  @Get('files')
  async listFiles(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Query('folderId') folderId?: string,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'read');
    const files = await this.driveService.listFiles(
      user,
      workspace.id,
      spaceId,
      folderId ?? null,
    );
    return { files };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('files')
  @UseInterceptors(FileInterceptor)
  async uploadFile(
    @Req() req: any,
    @Res() res: FastifyReply,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
  ) {
    const maxFileSize = this.driveStorageService.getMaxFileSize();

    let file: any = null;
    try {
      file = await req.file({
        limits: { fileSize: maxFileSize, fields: 5, files: 1 },
      });
    } catch (err: any) {
      if (err?.statusCode === 413) {
        throw new BadRequestException(
          `File too large. Exceeds the ${this.driveStorageService.getFileUploadSizeLimit()} limit`,
        );
      }
    }

    if (!file) {
      throw new BadRequestException('Failed to upload file');
    }

    const folderId: string | null = file.fields?.folderId?.value ?? null;

    await this.assertDriveAccess(user, workspace.id, spaceId, 'manage');

    const filePath = this.driveStorageService.generateKey({
      workspaceId: workspace.id,
      spaceId,
      folderId,
      fileName: file.filename,
    });

    const { stream, getBytesRead } = createByteCountingStream(file.file);
    await this.driveStorageService.upload(filePath, stream);
    const fileSize = getBytesRead();
    this.driveStorageService.assertWithinLimit(fileSize);
    await this.driveQuotaService.ensureWithinQuota(spaceId, fileSize);

    const created = await this.driveService.createFile(user, workspace.id, {
      spaceId,
      folderId,
      fileName: file.filename,
      filePath,
      fileExt: path.extname(file.filename),
      fileSize,
      mimeType: file.mimetype ?? null,
      type: file.mimetype ?? null,
    });

    return res.send({ ...created });
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('files/:fileId')
  async updateFile(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Param('fileId') fileId: string,
    @Body() dto: UpdateFileDto,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'manage');

    if (dto.fileName != null) {
      await this.driveService.renameFile(spaceId, fileId, dto.fileName);
    }
    if (dto.folderId !== undefined) {
      await this.driveService.moveFile(spaceId, fileId, dto.folderId ?? null);
    }
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('files/:fileId')
  async deleteFile(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Param('fileId') fileId: string,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'manage');
    await this.driveService.softDeleteFile(spaceId, fileId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('files/:fileId/download')
  async downloadFile(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Param('fileId') fileId: string,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'read');

    const file: DriveFile = await this.driveService.getFile(fileId, spaceId);
    if (!file || file.workspaceId !== workspace.id || file.spaceId !== spaceId) {
      throw new BadRequestException('File not found');
    }

    try {
      const fileStream = await this.driveStorageService.readStream(file.filePath);
      res.headers({
        'Content-Type': file.mimeType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
        'Cache-Control': 'private, max-age=3600',
      });
      return res.send(fileStream);
    } catch (err) {
      throw new BadRequestException('File not found');
    }
  }

  // ---- Quota ----

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('quota')
  async getQuota(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'read');
    const info = await this.driveQuotaService.getQuotaInfo(spaceId);
    return { usedBytes: info.usedBytes, quota: info.quota };
  }

  // ---- Share links ----

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('files/:fileId/share')
  async createFileShare(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Param('fileId') fileId: string,
    @Body() dto: CreateShareLinkDto,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'manage');

    const file = await this.driveService.getFile(fileId, spaceId);
    if (!file || file.workspaceId !== workspace.id || file.spaceId !== spaceId) {
      throw new BadRequestException('File not found');
    }

    const share = await this.driveShareService.createFileShare({
      authUserId: user.id,
      workspaceId: workspace.id,
      spaceId,
      fileId,
      permission: dto.permission ?? 'read',
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    return {
      share: {
        token: share.token,
        permission: share.permission,
        expiresAt: share.expiresAt,
        fileId: share.fileId,
        createdAt: share.createdAt,
      },
    };
  }

  // ---- File versions ----

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('files/:fileId/versions')
  async listFileVersions(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Param('fileId') fileId: string,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'read');

    const file = await this.driveService.getFile(fileId, spaceId);
    if (!file || file.workspaceId !== workspace.id || file.spaceId !== spaceId) {
      throw new BadRequestException('File not found');
    }

    const versions = await this.driveVersionService.listVersions(fileId);
    return {
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        fileName: v.fileName,
        fileSize: v.fileSize,
        fileExt: v.fileExt,
        mimeType: v.mimeType,
        createdAt: v.createdAt,
      })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('files/:fileId/versions/:versionId/restore')
  async restoreFileVersion(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Param('fileId') fileId: string,
    @Param('versionId') versionId: string,
  ) {
    await this.assertDriveAccess(user, workspace.id, spaceId, 'manage');

    const file = await this.driveService.getFile(fileId, spaceId);
    if (!file || file.workspaceId !== workspace.id || file.spaceId !== spaceId) {
      throw new BadRequestException('File not found');
    }

    const updated = await this.driveVersionService.restoreVersion({
      fileId,
      versionId,
      workspaceId: workspace.id,
      spaceId,
    });
    return { file: updated };
  }

  /**
   * Upload a new version of an existing file. The previous content is snapshotted
   * into `drive_file_versions` before the live row is updated to the new upload.
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('files/:fileId/versions')
  @UseInterceptors(FileInterceptor)
  async uploadFileVersion(
    @Req() req: any,
    @Res() res: FastifyReply,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('spaceId') spaceId: string,
    @Param('fileId') fileId: string,
  ) {
    const maxFileSize = this.driveStorageService.getMaxFileSize();

    let file: any = null;
    try {
      file = await req.file({
        limits: { fileSize: maxFileSize, fields: 5, files: 1 },
      });
    } catch (err: any) {
      if (err?.statusCode === 413) {
        throw new BadRequestException(
          `File too large. Exceeds the ${this.driveStorageService.getFileUploadSizeLimit()} limit`,
        );
      }
    }

    if (!file) {
      throw new BadRequestException('Failed to upload file');
    }

    await this.assertDriveAccess(user, workspace.id, spaceId, 'manage');

    const existing = await this.driveService.getFile(fileId, spaceId);
    if (
      !existing ||
      existing.workspaceId !== workspace.id ||
      existing.spaceId !== spaceId
    ) {
      throw new BadRequestException('File not found');
    }

    const filePath = this.driveStorageService.generateKey({
      workspaceId: workspace.id,
      spaceId,
      folderId: existing.folderId,
      fileName: file.filename,
    });

    const { stream, getBytesRead } = createByteCountingStream(file.file);
    await this.driveStorageService.upload(filePath, stream);
    const fileSize = getBytesRead();
    this.driveStorageService.assertWithinLimit(fileSize);
    await this.driveQuotaService.ensureWithinQuota(spaceId, fileSize);

    // Snapshot the previous version, then point the file at the new upload.
    await this.driveVersionService.recordVersion({
      fileId,
      workspaceId: workspace.id,
      spaceId,
      creatorId: user.id,
    });

    const updated = await this.driveService.updateFile(spaceId, fileId, {
      filePath,
      fileName: file.filename,
      fileExt: path.extname(file.filename),
      fileSize,
      mimeType: file.mimetype ?? null,
      type: file.mimetype ?? null,
    });

    return res.send({ ...updated });
  }
}
