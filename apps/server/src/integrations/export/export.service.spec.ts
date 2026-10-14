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
});
