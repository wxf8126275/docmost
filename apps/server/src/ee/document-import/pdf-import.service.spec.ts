import { execFileSync } from 'child_process';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as pdfInspector from '@docmost/pdf-inspector';
import { markdownToHtml } from '@docmost/editor-ext';
import { PdfImportService } from './pdf-import.service';
import { StorageService } from '../../integrations/storage/storage.service';

jest.mock(
  '@docmost/pdf-inspector',
  () => ({ processPdfWithImages: jest.fn() }),
  { virtual: true },
);
jest.mock(
  '@docmost/editor-ext',
  () => ({ markdownToHtml: jest.fn() }),
  { virtual: true },
);

describe('PdfImportService', () => {
  let service: PdfImportService;
  let storageService: { upload: jest.Mock };
  let insertValues: jest.Mock;

  const workspaceId = 'ws-1';
  const spaceId = 'sp-1';
  const pageId = 'pg-1';
  const userId = 'user-1';

  const imageBytes = Buffer.from('fake-pdf-image');

  // A real, renderable PDF so the current rasterization-first path actually
  // activates (a fake buffer would fail pdftoppm and fall back to text, hiding
  // the regression). Generated via ghostscript (present on the host).
  let realPdfBuffer: Buffer;

  beforeAll(() => {
    const dir = fs.mkdtempSync(join(tmpdir(), 'pdf-spec-'));
    const pdfPath = join(dir, 'input.pdf');
    execFileSync('gs', [
      '-q',
      '-sDEVICE=pdfwrite',
      '-o',
      pdfPath,
      '-c',
      '/Helvetica findfont 12 scalefont setfont 72 720 moveto (Document Title) show 72 700 moveto (Some body text.) show showpage',
    ]);
    realPdfBuffer = fs.readFileSync(pdfPath);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    storageService = { upload: jest.fn().mockResolvedValue(undefined) };
    insertValues = jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue(undefined),
    });
    const db = {
      insertInto: jest.fn().mockReturnValue({ values: insertValues }),
    };
    service = new PdfImportService(storageService as any, db as any);

    (markdownToHtml as unknown as jest.Mock) = jest
      .fn()
      .mockImplementation((md: string) => Promise.resolve(`<div>${md}</div>`));
    (pdfInspector.processPdfWithImages as unknown as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        markdown:
          '# Document Title\n\n![image](pdf-image://0)\n\nSome body text.',
        images: [
          {
            page: 1,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            format: 'Jpeg',
            data: imageBytes,
          },
        ],
      });
  });

  it('converts PDF markdown to an editable HTML page with extracted images', async () => {
    const html = await service.convertPdfToHtml(
      realPdfBuffer,
      workspaceId,
      spaceId,
      pageId,
      userId,
    );

    // Editable text content is present (not a rasterized image page).
    expect(html).toContain('Document Title');
    expect(html).toContain('Some body text.');
    // No per-page rasterized image.
    expect(html).not.toContain('page-1.png');

    // Extracted PDF image is uploaded to storage + served via /api/files/...
    expect(storageService.upload).toHaveBeenCalledTimes(1);
    const uploadPath = storageService.upload.mock.calls[0][0] as string;
    expect(uploadPath).toContain(`${workspaceId}/files/`);

    expect(insertValues).toHaveBeenCalledTimes(1);
    const row = insertValues.mock.calls[0][0];
    expect(row.workspaceId).toBe(workspaceId);
    expect(row.pageId).toBe(pageId);
    expect(row.mimeType).toBe('image/jpeg');

    expect(html).toContain(`/api/files/${row.id}/pdf-image-0.jpg`);
    expect(html).not.toContain('pdf-image://');
  });

  it('falls back to inline base64 src when image upload fails', async () => {
    storageService.upload.mockRejectedValueOnce(new Error('storage down'));

    const html = await service.convertPdfToHtml(
      realPdfBuffer,
      workspaceId,
      spaceId,
      pageId,
      userId,
    );

    expect(insertValues).not.toHaveBeenCalled();
    expect(html).toContain('data:image/jpeg;base64,');
    expect(html).not.toContain('pdf-image://');
    expect(html).not.toContain('/api/files/');
  });
});
