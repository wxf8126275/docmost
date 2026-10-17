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
import {
  DriveFile,
  User,
  Workspace,
} from '@docmost/db/types/entity.types';
import { DriveService } from './services/drive.service';
import { DriveStorageService } from './services/drive-storage.service';
import DriveAbilityFactory from '../casl/abilities/drive-ability.factory';
import {
  DriveCaslAction,
  DriveCaslSubject,
} from '../casl/interfaces/drive-ability.type';
import {
  CreateFolderDto,
  CreateShareLinkDto,
  UpdateFileDto,
  UpdateFolderDto,
} from './dto/drive.dto';
import { DriveShareService } from './services/drive-share.service';
import { DriveQuotaService } from './services/drive-quota.service';
import { DriveVersionService } from './services/drive-version.service';

@Controller('drive')
export class DriveController {
  constructor(
    private readonly driveService: DriveService,
    private readonly driveStorageService: DriveStorageService,
    private readonly driveAbility: DriveAbilityFactory,
    private readonly driveShareService: DriveShareService,
    private readonly driveQuotaService: DriveQuotaService,
    private readonly driveVersionService: DriveVersionService,
  ) {}

  /**
   * Resolves the CASL ability for the current user against a drive. Personal
   * drives are owned by the user; shared drives are workspace-scoped. Throws
   * ForbiddenException when the action is not permitted.
   */
  private assertDriveAbility(
    user: User,
    driveType: 'personal' | 'shared',
    subject: 'folder' | 'file',
  ): void {
    const ownerId = driveType === 'personal' ? user.id : null;
    const ability = this.driveAbility.createForUser(user, {
      driveType,
      ownerId,
    });
    const subj =
      subject === 'folder' ? DriveCaslSubject.Folder : DriveCaslSubject.File;

    if (ability.cannot(DriveCaslAction.Manage, subj)) {
      throw new ForbiddenException();
    }
  }

  // ---- Folders ----

  @UseGuards(JwtAuthGuard)
  @Get('folders')
  async listFolders(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Query('driveType') driveType: 'personal' | 'shared',
    @Query('parentId') parentId?: string,
  ) {
    this.assertDriveAbility(user, driveType, 'folder');
    const folders = await this.driveService.listFolders(
      user,
      workspace.id,
      driveType,
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
    @Body() dto: CreateFolderDto,
  ) {
    this.assertDriveAbility(user, dto.driveType, 'folder');
    const folder = await this.driveService.createFolder(user, workspace.id, {
      driveType: dto.driveType,
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
    @Param('folderId') folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    this.assertDriveAbility(user, dto.driveType, 'folder');

    if (dto.name != null) {
      await this.driveService.renameFolder(folderId, dto.name);
    }
    if (dto.parentId !== undefined) {
      await this.driveService.moveFolder(folderId, dto.parentId ?? null);
    }
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('folders/:folderId')
  async deleteFolder(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('folderId') folderId: string,
    @Query('driveType') driveType: 'personal' | 'shared',
  ) {
    this.assertDriveAbility(user, driveType, 'folder');
    await this.driveService.softDeleteFolder(folderId);
    return { success: true };
  }

  // ---- Files ----

  @UseGuards(JwtAuthGuard)
  @Get('files')
  async listFiles(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Query('driveType') driveType: 'personal' | 'shared',
    @Query('folderId') folderId?: string,
  ) {
    this.assertDriveAbility(user, driveType, 'file');
    const files = await this.driveService.listFiles(
      user,
      workspace.id,
      driveType,
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

    const driveType: 'personal' | 'shared' =
      file.fields?.driveType?.value ?? 'personal';
    const folderId: string | null = file.fields?.folderId?.value ?? null;

    this.assertDriveAbility(user, driveType, 'file');

    const filePath = this.driveStorageService.generateKey({
      workspaceId: workspace.id,
      driveType,
      ownerId: user.id,
      folderId,
      fileName: file.filename,
    });

    const { stream, getBytesRead } = createByteCountingStream(file.file);
    await this.driveStorageService.upload(filePath, stream);
    const fileSize = getBytesRead();
    this.driveStorageService.assertWithinLimit(fileSize);
    await this.driveQuotaService.ensureWithinQuota(
      workspace.id,
      driveType,
      user.id,
      fileSize,
    );

    const created = await this.driveService.createFile(user, workspace.id, {
      driveType,
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
    @Param('fileId') fileId: string,
    @Body() dto: UpdateFileDto,
  ) {
    this.assertDriveAbility(user, dto.driveType, 'file');

    if (dto.fileName != null) {
      await this.driveService.renameFile(fileId, dto.fileName);
    }
    if (dto.folderId !== undefined) {
      await this.driveService.moveFile(fileId, dto.folderId ?? null);
    }
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('files/:fileId')
  async deleteFile(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('fileId') fileId: string,
    @Query('driveType') driveType: 'personal' | 'shared',
  ) {
    this.assertDriveAbility(user, driveType, 'file');
    await this.driveService.softDeleteFile(fileId);
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
    @Param('fileId') fileId: string,
    @Query('driveType') driveType: 'personal' | 'shared',
  ) {
    this.assertDriveAbility(user, driveType, 'file');

    const file: DriveFile = await this.driveService.getFile(fileId);
    if (!file || file.workspaceId !== workspace.id) {
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

  // ---- Share links ----

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('quota')
  async getQuota(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Query('driveType') driveType: 'personal' | 'shared',
  ) {
    this.assertDriveAbility(user, driveType, 'file');
    const info = await this.driveQuotaService.getQuotaInfo(
      workspace.id,
      driveType,
      user.id,
    );
    return { usedBytes: info.usedBytes, quota: info.quota };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('files/:fileId/share')
  async createFileShare(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('fileId') fileId: string,
    @Body() dto: CreateShareLinkDto,
  ) {
    const file = await this.driveService.getFile(fileId);
    if (!file || file.workspaceId !== workspace.id) {
      throw new BadRequestException('File not found');
    }
    this.assertDriveAbility(
      user,
      file.driveType as 'personal' | 'shared',
      'file',
    );

    const share = await this.driveShareService.createFileShare({
      authUserId: user.id,
      workspaceId: workspace.id,
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

  /**
   * Public share resolver (no auth). Returns the share metadata and the shared
   * file's read-only info. Actual bytes require `download` permission via the
   * `/download` sibling route.
   */
  @HttpCode(HttpStatus.OK)
  @Get('shares/:token')
  async getShare(@Param('token') token: string) {
    const { share, file } = await this.driveShareService.resolveShare(token);
    return {
      share: {
        token: share.token,
        permission: share.permission,
        expiresAt: share.expiresAt,
      },
      file: {
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileExt: file.fileExt,
        mimeType: file.mimeType,
        type: file.type,
      },
    };
  }

  @Get('shares/:token/download')
  async downloadSharedFile(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Param('token') token: string,
  ) {
    const { share, file } = await this.driveShareService.resolveShare(token);

    if (share.permission !== 'download') {
      throw new ForbiddenException('This share link does not allow download');
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

  // ---- File versions ----

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('files/:fileId/versions')
  async listFileVersions(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('fileId') fileId: string,
  ) {
    const file = await this.driveService.getFile(fileId);
    if (!file || file.workspaceId !== workspace.id) {
      throw new BadRequestException('File not found');
    }
    this.assertDriveAbility(
      user,
      file.driveType as 'personal' | 'shared',
      'file',
    );

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
    @Param('fileId') fileId: string,
    @Param('versionId') versionId: string,
  ) {
    const file = await this.driveService.getFile(fileId);
    if (!file || file.workspaceId !== workspace.id) {
      throw new BadRequestException('File not found');
    }
    this.assertDriveAbility(
      user,
      file.driveType as 'personal' | 'shared',
      'file',
    );

    const updated = await this.driveVersionService.restoreVersion({
      fileId,
      versionId,
      workspaceId: workspace.id,
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

    const existing = await this.driveService.getFile(fileId);
    if (!existing || existing.workspaceId !== workspace.id) {
      throw new BadRequestException('File not found');
    }
    this.assertDriveAbility(
      user,
      existing.driveType as 'personal' | 'shared',
      'file',
    );

    const filePath = this.driveStorageService.generateKey({
      workspaceId: workspace.id,
      driveType: existing.driveType as 'personal' | 'shared',
      ownerId: user.id,
      folderId: existing.folderId,
      fileName: file.filename,
    });

    const { stream, getBytesRead } = createByteCountingStream(file.file);
    await this.driveStorageService.upload(filePath, stream);
    const fileSize = getBytesRead();
    this.driveStorageService.assertWithinLimit(fileSize);
    await this.driveQuotaService.ensureWithinQuota(
      workspace.id,
      existing.driveType as 'personal' | 'shared',
      user.id,
      fileSize,
    );

    // Snapshot the previous version, then point the file at the new upload.
    await this.driveVersionService.recordVersion({
      fileId,
      workspaceId: workspace.id,
      creatorId: user.id,
    });

    const updated = await this.driveService.updateFile(fileId, {
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
