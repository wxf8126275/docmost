import { ExportService } from './export.service';

// The docx conversion is delegated to @docmost/editor-ext, which transitively
// imports ESM-only `docx`/`image-dimensions`. Loading those under Jest (CJS)
// is unreliable. Additionally, importing the server's `collaboration.util`
// triggers `@tiptap/extension-unique-id` (ESM-only, no CJS `require` export)
// which also fails to load under Jest. We mock these modules and verify the
// service's own orchestration: ProseMirror extraction, title prepend, mention
// to link conversion, and the image resolver wiring (including graceful skip
// when an image cannot be resolved). The real conversion/schema are delegated
// to production-proven, upstream-tested libraries.
jest.mock('@docmost/editor-ext', () => ({
  htmlToMarkdown: jest.fn(),
  pageNodeToDocxBuffer: jest.fn(),
}));
// ESM-only dependency; only used by turnPageMentionsToLinks (spied away here).
jest.mock('@sindresorhus/slugify', () => ({
  __esModule: true,
  default: (s: string) => s,
}));
jest.mock('../../collaboration/collaboration.util', () => ({
  jsonToNode: jest.fn(),
  tiptapExtensions: [],
}));
jest.mock('../../common/helpers/prosemirror/utils', () => ({
  getProsemirrorContent: (content: any) => content,
  getAttachmentIds: () => [],
}));

const editorExt = jest.requireMock('@docmost/editor-ext');
const collaborationUtil = jest.requireMock('../../collaboration/collaboration.util');

const fakeNode = (json: any) => ({
  child: (i: number) => {
    const c = json.content?.[i];
    return {
      type: { name: c?.type },
      attrs: c?.attrs ?? {},
      get textContent() {
        return c?.content?.[0]?.text ?? '';
      },
    };
  },
});

describe('ExportService.exportPageToDocx', () => {
  let service: ExportService;
  let storageService: { read: jest.Mock };
  let domainService: { getUrl: jest.Mock };
  let db: { selectFrom: jest.Mock };
  let dbRow: any;

  const makeService = () => {
    const s = new ExportService(
      {} as any,
      {} as any,
      db as any,
      storageService as any,
      {} as any,
      domainService as any,
    );
    jest
      .spyOn(s, 'turnPageMentionsToLinks')
      .mockImplementation(async (json: any) => json);
    return s;
  };

  beforeEach(() => {
    dbRow = { hostname: 'test' };
    const leaf: any = {};
    leaf.executeTakeFirst = jest.fn().mockImplementation(async () => dbRow);
    leaf.where = jest.fn().mockReturnValue(leaf);
    leaf.select = jest.fn().mockReturnValue(leaf);
    db = { selectFrom: jest.fn().mockReturnValue(leaf) };
    storageService = { read: jest.fn() };
    domainService = {
      getUrl: jest.fn().mockReturnValue('https://test.docmost.dev'),
    };
    editorExt.pageNodeToDocxBuffer.mockReset();
    collaborationUtil.jsonToNode.mockReset();
  });

  it('returns the docx buffer with the page title prepended as an H1 heading', async () => {
    const docxBuffer = Buffer.from('PK\x03\x04 mock docx');
    editorExt.pageNodeToDocxBuffer.mockResolvedValue(docxBuffer);
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );

    const service = makeService();
    const page: any = {
      id: 'page-1',
      title: 'My Great Page',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Body text' }] },
        ],
      },
    };

    const result = await (service as any).exportPageToDocx(page, 'user-1');

    expect(result).toBe(docxBuffer);
    // Title prepend: jsonToNode received a doc whose first child is the heading.
    const jsonArg = collaborationUtil.jsonToNode.mock.calls[0][0];
    expect(jsonArg.content[0].type).toBe('heading');
    expect(jsonArg.content[0].content[0].text).toBe('My Great Page');
    const [node, getImageBuffer] = editorExt.pageNodeToDocxBuffer.mock.calls[0];
    expect(node.child(0).type.name).toBe('heading');
    expect(typeof getImageBuffer).toBe('function');
  });

  it('resolves image buffers from storage for image nodes', async () => {
    const docxBuffer = Buffer.from('PK\x03\x04');
    editorExt.pageNodeToDocxBuffer.mockImplementation(
      async (node: any, getImageBuffer: any) => {
        const image = node.child(0);
        expect(image.type.name).toBe('image');
        const buffer = await getImageBuffer(image.attrs.src);
        expect(buffer).toEqual(new Uint8Array([1, 2, 3]));
        return docxBuffer;
      },
    );
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );

    dbRow = { filePath: 'attachments/photo.png' };
    storageService.read.mockResolvedValue(Buffer.from([1, 2, 3]));

    const service = makeService();
    const page: any = {
      id: 'page-2',
      title: '',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [{ type: 'image', attrs: { src: '/files/att-1/photo.png' } }],
      },
    };

    const result = await (service as any).exportPageToDocx(page, 'user-1');
    expect(result).toBe(docxBuffer);
    expect(storageService.read).toHaveBeenCalledWith('attachments/photo.png');
  });

  it('throws from the resolver for unresolved images so the serializer skips them', async () => {
    const docxBuffer = Buffer.from('PK\x03\x04');
    editorExt.pageNodeToDocxBuffer.mockImplementation(
      async (node: any, getImageBuffer: any) => {
        const image = node.child(0);
        expect(image.type.name).toBe('image');
        await expect(getImageBuffer(image.attrs.src)).rejects.toThrow();
        return docxBuffer;
      },
    );
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );

    // No attachment row -> resolver returns undefined -> getImageBuffer throws.
    dbRow = undefined;

    const service = makeService();
    const page: any = {
      id: 'page-3',
      title: '',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [
          { type: 'image', attrs: { src: '/files/missing/photo.png' } },
        ],
      },
    };

    const result = await (service as any).exportPageToDocx(page, 'user-1');
    expect(result).toBe(docxBuffer);
  });

  it('resolves attachment bytes + mime for an attachment node (image embed path)', async () => {
    const docxBuffer = Buffer.from('PK\x03\x04');
    editorExt.pageNodeToDocxBuffer.mockImplementation(
      async (node: any, _getImageBuffer: any, getAttachment: any) => {
        const att = node.child(0);
        expect(att.type.name).toBe('attachment');
        const resolved = await getAttachment(att.attrs.src);
        expect(resolved.data).toEqual(new Uint8Array([9, 9, 9]));
        expect(resolved.name).toBe('photo.png');
        expect(resolved.mimeType).toBe('image/png');
        expect(resolved.url).toContain('/api/files/att-img/photo.png');
        return docxBuffer;
      },
    );
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );
    dbRow = {
      filePath: 'attachments/photo.png',
      fileName: 'photo.png',
      mimeType: 'image/png',
    };
    storageService.read.mockResolvedValue(Buffer.from([9, 9, 9]));

    const service = makeService();
    const page: any = {
      id: 'page-4',
      title: '',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [
          {
            type: 'attachment',
            attrs: { src: '/files/att-img/photo.png', name: 'photo.png' },
          },
        ],
      },
    };

    const result = await (service as any).exportPageToDocx(page, 'user-1');
    expect(result).toBe(docxBuffer);
    expect(storageService.read).toHaveBeenCalledWith('attachments/photo.png');
  });

  it('resolves a non-image (pdf) attachment with its mime type and download url', async () => {
    const docxBuffer = Buffer.from('PK\x03\x04');
    editorExt.pageNodeToDocxBuffer.mockImplementation(
      async (node: any, _getImageBuffer: any, getAttachment: any) => {
        const resolved = await getAttachment(node.child(0).attrs.src);
        expect(resolved.mimeType).toBe('application/pdf');
        expect(resolved.url).toBe(
          'https://test.docmost.dev/api/files/att-pdf/doc.pdf',
        );
        return docxBuffer;
      },
    );
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );
    dbRow = {
      filePath: 'attachments/doc.pdf',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
    };
    storageService.read.mockResolvedValue(Buffer.from([1]));

    const service = makeService();
    const page: any = {
      id: 'page-5',
      title: '',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [
          {
            type: 'attachment',
            attrs: { src: '/files/att-pdf/doc.pdf', name: 'doc.pdf' },
          },
        ],
      },
    };

    const result = await (service as any).exportPageToDocx(page, 'user-1');
    expect(result).toBe(docxBuffer);
  });

  it('derives mime from the file extension when the table has none', async () => {
    const docxBuffer = Buffer.from('PK\x03\x04');
    editorExt.pageNodeToDocxBuffer.mockImplementation(
      async (node: any, _getImageBuffer: any, getAttachment: any) => {
        const resolved = await getAttachment(node.child(0).attrs.src);
        expect(resolved.mimeType).toBe('image/png');
        return docxBuffer;
      },
    );
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );
    dbRow = {
      filePath: 'attachments/photo.PNG',
      fileName: 'photo.PNG',
      mimeType: null,
    };
    storageService.read.mockResolvedValue(Buffer.from([2, 2]));

    const service = makeService();
    const page: any = {
      id: 'page-6',
      title: '',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [
          {
            type: 'attachment',
            attrs: { src: '/files/att-ext/photo.PNG', name: 'photo.PNG' },
          },
        ],
      },
    };

    const result = await (service as any).exportPageToDocx(page, 'user-1');
    expect(result).toBe(docxBuffer);
  });

  it('returns undefined for an unresolved attachment so the export still succeeds', async () => {
    const docxBuffer = Buffer.from('PK\x03\x04');
    editorExt.pageNodeToDocxBuffer.mockImplementation(
      async (node: any, _getImageBuffer: any, getAttachment: any) => {
        const resolved = await getAttachment(node.child(0).attrs.src);
        expect(resolved).toBeUndefined();
        return docxBuffer;
      },
    );
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );
    dbRow = undefined; // no attachment row -> resolveDocxAttachment returns undefined

    const service = makeService();
    const page: any = {
      id: 'page-7',
      title: '',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [
          {
            type: 'attachment',
            attrs: { src: '/files/missing/x.png', name: 'x.png' },
          },
        ],
      },
    };

    const result = await (service as any).exportPageToDocx(page, 'user-1');
    expect(result).toBe(docxBuffer);
  });

  const loadZip = async (buf: Buffer) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const JSZip = require('jszip');
    return new JSZip().loadAsync(buf);
  };

  it('bundles a referenced pdf into the zip and points the docx link at the relative path', async () => {
    const docxBuffer = Buffer.from('PK docx bytes');
    editorExt.pageNodeToDocxBuffer.mockImplementation(
      async (node: any, _img: any, getAttachment: any) => {
        // A heading may be prepended at index 0; locate the attachment node.
        let attNode = node.child(0);
        if (attNode?.type?.name !== 'attachment') {
          attNode = node.child(1);
        }
        const resolved = await getAttachment(attNode.attrs.src);
        // In zip-bundle mode the attachment URL must be the relative path.
        expect(resolved.url).toBe('attachments/doc.pdf');
        return docxBuffer;
      },
    );
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );
    dbRow = {
      filePath: 'attachments/doc.pdf',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
    };
    storageService.read.mockResolvedValue(Buffer.from([7, 7, 7]));

    const service = makeService();
    const page: any = {
      id: 'page-zip-1',
      title: 'Zip Page',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [
          {
            type: 'attachment',
            attrs: { src: '/files/att-pdf/doc.pdf', name: 'doc.pdf' },
          },
        ],
      },
    };

    const zipBuffer = await (service as any).exportPageToDocxZip(page, 'user-1');
    expect(Buffer.isBuffer(zipBuffer)).toBe(true);

    const zip = await loadZip(zipBuffer);
    expect(zip.files['document.docx']).toBeTruthy();
    expect(zip.files['attachments/doc.pdf']).toBeTruthy();
    const bytes = await zip.files['attachments/doc.pdf'].async('nodebuffer');
    expect(Buffer.from(bytes)).toEqual(Buffer.from([7, 7, 7]));
  });

  it('does not re-bundle image attachments (they are embedded in the docx)', async () => {
    const docxBuffer = Buffer.from('PK docx');
    editorExt.pageNodeToDocxBuffer.mockResolvedValue(docxBuffer);
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );
    dbRow = {
      filePath: 'attachments/photo.png',
      fileName: 'photo.png',
      mimeType: 'image/png',
    };
    storageService.read.mockResolvedValue(Buffer.from([1, 2]));

    const service = makeService();
    const page: any = {
      id: 'page-zip-2',
      title: 'Img',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [
          { type: 'image', attrs: { src: '/files/att-img/photo.png' } },
        ],
      },
    };

    const zipBuffer = await (service as any).exportPageToDocxZip(page, 'user-1');
    const zip = await loadZip(zipBuffer);
    expect(zip.files['document.docx']).toBeTruthy();
    // Image is embedded inside document.docx, not duplicated in attachments/.
    expect(zip.files['attachments/photo.png']).toBeFalsy();
  });

  it('dedupes attachment file names that collide in the zip', async () => {
    const docxBuffer = Buffer.from('PK docx');
    editorExt.pageNodeToDocxBuffer.mockResolvedValue(docxBuffer);
    collaborationUtil.jsonToNode.mockImplementation((json: any) =>
      fakeNode(json),
    );
    dbRow = {
      filePath: 'attachments/report.pdf',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
    };
    storageService.read.mockResolvedValue(Buffer.from([3, 3]));

    const service = makeService();
    const page: any = {
      id: 'page-zip-3',
      title: '',
      spaceId: 'space-1',
      workspaceId: 'ws-1',
      content: {
        type: 'doc',
        content: [
          {
            type: 'attachment',
            attrs: { src: '/files/a1/report.pdf', name: 'report.pdf' },
          },
          {
            type: 'attachment',
            attrs: { src: '/files/a2/report.pdf', name: 'report.pdf' },
          },
        ],
      },
    };

    const zipBuffer = await (service as any).exportPageToDocxZip(page, 'user-1');
    const zip = await loadZip(zipBuffer);
    expect(zip.files['attachments/report.pdf']).toBeTruthy();
    expect(zip.files['attachments/report (1).pdf']).toBeTruthy();
  });
});


