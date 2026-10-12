import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { StorageService } from '../../integrations/storage/storage.service';
import { processPdfWithImages } from '@docmost/pdf-inspector';
import { markdownToHtml } from '@docmost/editor-ext';
import { v7 } from 'uuid';
import { getAttachmentFolderPath } from '../../core/attachment/attachment.utils';
import { AttachmentType } from '../../core/attachment/attachment.constants';

/**
 * Enterprise-grade PDF import that yields an **editable** DocMost page. Uses
 * `@docmost/pdf-inspector` (native Rust) to extract the PDF's Markdown plus the
 * raw image bytes for each page. The text becomes normal editable rich content
 * (headings, paragraphs, lists), and extracted images are uploaded to object
 * storage and served from `/api/files/...` — so the imported page can be edited
 * inline, which is the priority over pixel-perfect layout fidelity.
 */
@Injectable()
export class PdfImportService {
  private readonly logger = new Logger(PdfImportService.name);

  constructor(
    private readonly storageService: StorageService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  /**
   * Convert a PDF buffer to HTML. `processPdfWithImages` returns Markdown with
   * `![image](pdf-image://N)` placeholders; we upload each image to storage,
   * rewrite the placeholder to `/api/files/...`, then convert the Markdown to
   * HTML (the result is an editable page once turned into ProseMirror JSON). On
   * image-upload failure the placeholder falls back to an inline base64 data URI
   * so the image still renders.
   */
  async convertPdfToHtml(
    fileBuffer: Buffer,
    workspaceId: string,
    spaceId: string,
    pageId: string,
    userId: string,
  ): Promise<string> {
    const result = processPdfWithImages(fileBuffer);
    const markdown = result.markdown ?? '';

    const imageUrls: string[] = [];
    for (let i = 0; i < result.images.length; i++) {
      const img = result.images[i];
      const ext = img.format === 'Jpeg' ? '.jpg' : '.png';
      const mimeType = img.format === 'Jpeg' ? 'image/jpeg' : 'image/png';
      const attachmentId = v7();
      const fileNameWithExt = `pdf-image-${i}${ext}`;
      const storageFilePath = `${getAttachmentFolderPath(
        AttachmentType.File,
        workspaceId,
      )}/${attachmentId}/${fileNameWithExt}`;
      const apiFilePath = `/api/files/${attachmentId}/${fileNameWithExt}`;

      try {
        await this.storageService.upload(storageFilePath, img.data);

        await this.db
          .insertInto('attachments')
          .values({
            id: attachmentId,
            filePath: storageFilePath,
            fileName: fileNameWithExt,
            fileSize: img.data.length,
            mimeType: mimeType,
            type: AttachmentType.File,
            fileExt: ext.toLowerCase(),
            creatorId: userId,
            workspaceId,
            pageId,
            spaceId,
          })
          .execute();

        imageUrls[i] = apiFilePath;
      } catch (err) {
        this.logger.error('Failed to upload PDF image to storage', err);
        // Degrade gracefully: inline the image so it still renders.
        imageUrls[i] = `data:${mimeType};base64,${img.data.toString('base64')}`;
      }
    }

    let markdownWithUrls = markdown;
    for (let i = 0; i < imageUrls.length; i++) {
      markdownWithUrls = markdownWithUrls
        .split(`pdf-image://${i}`)
        .join(imageUrls[i]);
    }

    return markdownToHtml(markdownWithUrls);
  }
}
