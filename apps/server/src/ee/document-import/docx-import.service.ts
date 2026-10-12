import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { StorageService } from '../../integrations/storage/storage.service';
import * as mammoth from 'mammoth';
import { v7 } from 'uuid';
import { getAttachmentFolderPath } from '../../core/attachment/attachment.utils';
import { AttachmentType } from '../../core/attachment/attachment.constants';
import { sanitizeFileName } from '../../common/helpers';

/**
 * Enterprise-grade DOCX import. Converts a Word document to HTML via mammoth and
 * extracts every embedded image to object storage so images persist as
 * first-class attachments served from `/api/files/...`. This stands in for the
 * licensed EE document-import module that the community build previously
 * required, so the existing "Import pages" UI works without an enterprise key.
 */
@Injectable()
export class DocxImportService {
  private readonly logger = new Logger(DocxImportService.name);

  constructor(
    private readonly storageService: StorageService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  /**
   * Convert a DOCX buffer to HTML. Embedded images are uploaded to storage and
   * their `src` rewritten to the `/api/files/...` serving path. If an image
   * upload fails, it degrades to an inline base64 data URI so the image still
   * renders rather than breaking the import.
   */
  async convertDocxToHtml(
    fileBuffer: Buffer,
    workspaceId: string,
    spaceId: string,
    pageId: string,
    userId: string,
  ): Promise<string> {
    const { value } = await mammoth.convertToHtml(
      { buffer: fileBuffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const buffer = await image.read();
          const contentType = image.contentType ?? 'image/png';
          const ext = extFromMime(contentType);
          const attachmentId = v7();
          const originalSrc = (image as any).src as string | undefined;
          const originalName = originalSrc
            ? originalSrc.split('/').pop() ?? 'image'
            : 'image';
          const baseName =
            sanitizeFileName(originalName.replace(/\.[^.]+$/, '')) || 'image';
          const fileNameWithExt = `${baseName}${ext}`;
          const storageFilePath = `${getAttachmentFolderPath(
            AttachmentType.File,
            workspaceId,
          )}/${attachmentId}/${fileNameWithExt}`;
          const apiFilePath = `/api/files/${attachmentId}/${fileNameWithExt}`;

          try {
            await this.storageService.upload(storageFilePath, buffer);

            await this.db
              .insertInto('attachments')
              .values({
                id: attachmentId,
                filePath: storageFilePath,
                fileName: fileNameWithExt,
                fileSize: buffer.length,
                mimeType: contentType,
                type: AttachmentType.File,
                fileExt: ext.toLowerCase(),
                creatorId: userId,
                workspaceId,
                pageId,
                spaceId,
              })
              .execute();
          } catch (err) {
            this.logger.error('Failed to upload DOCX image to storage', err);
            // Degrade gracefully: inline the image so it still renders.
            return {
              src: `data:${contentType};base64,${buffer.toString('base64')}`,
            };
          }

          return { src: apiFilePath };
        }),
      },
    );

    return value;
  }
}

function extFromMime(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/gif':
      return '.gif';
    case 'image/bmp':
      return '.bmp';
    case 'image/tiff':
      return '.tiff';
    case 'image/svg+xml':
      return '.svg';
    case 'image/x-emf':
    case 'image/emf':
      return '.emf';
    case 'image/x-wmf':
    case 'image/wmf':
      return '.wmf';
    default:
      return '.png';
  }
}
