import * as mammoth from 'mammoth';
import { DocxImportService } from './docx-import.service';
import { StorageService } from '../../integrations/storage/storage.service';

jest.mock('mammoth');

type ImageHandler = (image: {
  read: () => Promise<Buffer>;
  contentType?: string;
  src?: string;
}) => Promise<{ src: string }>;

describe('DocxImportService', () => {
  let service: DocxImportService;
  let storageService: { upload: jest.Mock };
  let insertValues: jest.Mock;

  const workspaceId = 'ws-1';
  const spaceId = 'sp-1';
  const pageId = 'pg-1';
  const userId = 'user-1';

  let capturedHandler: ImageHandler | null = null;

  beforeEach(() => {
    capturedHandler = null;
    storageService = { upload: jest.fn().mockResolvedValue(undefined) };

    insertValues = jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue(undefined),
    });
    const db = {
      insertInto: jest.fn().mockReturnValue({ values: insertValues }),
    };

    // mammoth.images.imgElement captures the handler the service registers.
    (mammoth.images as any) = {
      imgElement: jest.fn((handler: ImageHandler) => {
        capturedHandler = handler;
        return { __handler: handler };
      }),
    };

    // convertToHtml invokes the captured image handler and returns HTML
    // that references whatever src the handler produced.
    (mammoth.convertToHtml as unknown as jest.Mock) = jest
      .fn()
      .mockImplementation(async (_input, options) => {
        const converter = options.convertImage;
        const result = await converter.__handler({
          read: async () => Buffer.from('fake-image-bytes'),
          contentType: 'image/png',
          src: 'word/media/image1.png',
        });
        return { value: `<p>Hello</p><img src="${result.src}"/>` };
      });

    service = new DocxImportService(storageService as any, db as any);
  });

  it('converts DOCX to HTML via mammoth', async () => {
    const html = await service.convertDocxToHtml(
      Buffer.from('docx'),
      workspaceId,
      spaceId,
      pageId,
      userId,
    );

    expect(html).toContain('<p>Hello</p>');
  });

  it('extracts embedded images to storage and rewrites src to /api/files/...', async () => {
    const html = await service.convertDocxToHtml(
      Buffer.from('docx'),
      workspaceId,
      spaceId,
      pageId,
      userId,
    );

    expect(capturedHandler).not.toBeNull();
    expect(storageService.upload).toHaveBeenCalledTimes(1);

    const uploadPath = storageService.upload.mock.calls[0][0] as string;
    expect(uploadPath).toContain(`${workspaceId}/files/`);
    expect(storageService.upload.mock.calls[0][1]).toBeInstanceOf(Buffer);

    expect(insertValues).toHaveBeenCalledTimes(1);
    const row = insertValues.mock.calls[0][0];
    expect(row.workspaceId).toBe(workspaceId);
    expect(row.spaceId).toBe(spaceId);
    expect(row.pageId).toBe(pageId);
    expect(row.creatorId).toBe(userId);
    expect(row.type).toBe('file');
    expect(row.mimeType).toBe('image/png');

    expect(html).toContain(`/api/files/${row.id}/image1.png`);
    expect(html).not.toContain('data:image');
  });

  it('falls back to inline base64 src when storage upload fails', async () => {
    storageService.upload.mockRejectedValueOnce(new Error('storage down'));

    const html = await service.convertDocxToHtml(
      Buffer.from('docx'),
      workspaceId,
      spaceId,
      pageId,
      userId,
    );

    // No attachment row should be written on failure.
    expect(insertValues).not.toHaveBeenCalled();
    expect(html).toContain('data:image/png;base64,');
    expect(html).not.toContain('/api/files/');
  });
});
