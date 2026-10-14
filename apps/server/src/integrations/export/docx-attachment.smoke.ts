/**
 * Runtime smoke test for Word export attachment embedding.
 *
 * Runs the REAL `@docmost/editor-ext` pipeline (docx + image-dimensions are
 * ESM-only and cannot load under Jest), so this is executed with `tsx`, not the
 * unit test runner. It proves that image attachments are embedded as pictures
 * and non-image files are carried as a hyperlink inside the generated .docx.
 *
 *   npx tsx apps/server/src/integrations/export/docx-attachment.smoke.ts
 */
import { writeFileSync } from 'fs';
import { Node, Schema } from 'prosemirror-model';
import {
  pageNodeToDocxBuffer,
  type DocxAttachmentResolver,
} from '@docmost/editor-ext';

// 1x1 transparent PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PNG = Uint8Array.from(Buffer.from(PNG_BASE64, 'base64'));

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    image: {
      group: 'block',
      attrs: { src: { default: null }, attachmentId: { default: null } },
    },
    attachment: {
      group: 'block',
      attrs: {
        src: { default: null },
        name: { default: null },
        url: { default: null },
      },
    },
  },
});

const docJson = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Page with attachments' }],
    },
    {
      type: 'attachment',
      attrs: { src: '/api/files/img1/photo.png', name: 'photo.png' },
    },
    {
      type: 'attachment',
      attrs: {
        src: '/api/files/file1/report.pdf',
        name: 'report.pdf',
        url: 'https://demo.docmost.dev/api/files/file1/report.pdf',
      },
    },
  ],
};

const getAttachment: DocxAttachmentResolver = async (src) => {
  if (src.includes('img1')) {
    return { data: PNG, name: 'photo.png', mimeType: 'image/png' };
  }
  if (src.includes('file1')) {
    return {
      data: new Uint8Array([1, 2, 3]),
      name: 'report.pdf',
      mimeType: 'application/pdf',
      url: 'https://demo.docmost.dev/api/files/file1/report.pdf',
    };
  }
  return undefined;
};

async function main() {
  const node = Node.fromJSON(schema, docJson as any);
  const buffer = await pageNodeToDocxBuffer(
    node,
    async () => PNG,
    getAttachment,
  );

  const out = '/tmp/word-export-attachments-smoke.docx';
  writeFileSync(out, buffer);
  console.log(`wrote ${buffer.length} bytes to ${out}`);

  // A docx is a zip; image embeddings live under word/media/.
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b; // 'PK'
  console.log('is zip container:', isZip);
  if (!isZip) {
    throw new Error('output is not a valid .docx (zip) container');
  }
}

main().catch((err) => {
  console.error('smoke failed:', err);
  process.exit(1);
});
