import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DriveStorageService } from './services/drive-storage.service';
import { DriveShareService } from './services/drive-share.service';

/**
 * Public (unauthenticated) share-link resolver. The share token itself is the
 * capability, so these routes are intentionally space-agnostic and live
 * outside the `spaces/:spaceId/drive` scope (preserving the v1 public URL
 * contract `/drive/shares/:token`).
 */
@Controller('drive')
export class DrivePublicShareController {
  constructor(
    private readonly driveShareService: DriveShareService,
    private readonly driveStorageService: DriveStorageService,
  ) {}

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
}
