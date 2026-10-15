// The controller transitively imports ExportService, which loads ESM-only
// `docx`/`image-dimensions` via @docmost/editor-ext and tiptap via
// collaboration.util. Under Jest (CJS) those fail to load, so we mock them and
// verify the controller's own orchestration (response headers + which service
// method is invoked).
jest.mock('@docmost/editor-ext', () => ({
  htmlToMarkdown: jest.fn(),
  pageNodeToDocxBuffer: jest.fn(),
}));
jest.mock('@sindresorhus/slugify', () => ({
  __esModule: true,
  default: (s: string) => s,
}));
jest.mock('../../collaboration/collaboration.util', () => ({
  jsonToNode: jest.fn(),
  tiptapExtensions: [],
}));

import { ExportController } from './export.controller';

describe('ExportController.exportPageDocx', () => {
  let controller: ExportController;
  let exportService: { exportPageToDocxZip: jest.Mock; exportPageToDocx: jest.Mock };
  let pageRepo: { findById: jest.Mock };
  let pageAccessService: { validateCanView: jest.Mock };
  let res: any;

  const page = {
    id: 'p1',
    title: 'My Page',
    spaceId: 's1',
    deletedAt: null,
    content: {},
  };
  const user = { id: 'u1' } as any;

  beforeEach(() => {
    exportService = {
      exportPageToDocxZip: jest.fn().mockResolvedValue(Buffer.from('ZIP')),
      exportPageToDocx: jest.fn().mockResolvedValue(Buffer.from('DOCX')),
    };
    pageRepo = { findById: jest.fn().mockResolvedValue(page) };
    pageAccessService = {
      validateCanView: jest.fn().mockResolvedValue(undefined),
    };
    res = {
      headers: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    controller = new ExportController(
      exportService as any,
      pageRepo as any,
      {} as any,
      pageAccessService as any,
      {} as any,
    );
  });

  it('returns a zip (application/zip, .zip name) when bundleAttachments is not false', async () => {
    await controller.exportPageDocx({ pageId: 'p1' } as any, user, res);

    expect(exportService.exportPageToDocxZip).toHaveBeenCalled();
    const headersArg = res.headers.mock.calls[0][0];
    expect(headersArg['Content-Type']).toBe('application/zip');
    expect(headersArg['Content-Disposition']).toContain('.zip');
    expect(res.send).toHaveBeenCalledWith(Buffer.from('ZIP'));
  });

  it('returns a single docx when bundleAttachments is explicitly false', async () => {
    await controller.exportPageDocx(
      { pageId: 'p1', bundleAttachments: false } as any,
      user,
      res,
    );

    expect(exportService.exportPageToDocx).toHaveBeenCalled();
    expect(exportService.exportPageToDocxZip).not.toHaveBeenCalled();
    const headersArg = res.headers.mock.calls[0][0];
    expect(headersArg['Content-Type']).toContain('wordprocessingml');
    expect(headersArg['Content-Disposition']).toContain('.docx');
  });
});
