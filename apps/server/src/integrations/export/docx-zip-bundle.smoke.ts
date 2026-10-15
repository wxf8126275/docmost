// Runtime smoke for word-export-zip-bundle: exercises the REAL editor-ext docx
// pipeline + real jszip by calling ExportService.exportPageToDocxZip directly.
// Jest cannot load the ESM docx/image-dimensions chain, so we validate here.
import { ExportService } from './export.service';
import JSZip from 'jszip';

const ATT_PDF_BYTES = Buffer.from([100, 101, 102, 103]);
const IMG_BYTES = Buffer.from([1, 2, 3, 4]);

async function main() {
  const db: any = {
    selectFrom: () => ({
      select: () => ({
        where: () => ({
          where: () => ({
            executeTakeFirst: async () => ({
              filePath: 'attachments/doc.pdf',
              fileName: 'doc.pdf',
              mimeType: 'application/pdf',
            }),
          }),
        }),
      }),
    }),
  };

  const storageService: any = {
    read: async (path: string) => {
      if (path.includes('doc.pdf')) return ATT_PDF_BYTES;
      if (path.includes('photo.png')) return IMG_BYTES;
      return Buffer.from([]);
    },
  };

  const service: any = new ExportService(
    {} as any,
    {} as any,
    db,
    storageService,
    {} as any,
    {} as any,
  );
  // Avoid hitting the real workspace/domain resolution.
  service.getWorkspaceBaseUrl = async () => 'https://x.test';

  const page: any = {
    id: 'smoke-zip',
    title: 'Smoke Zip Page',
    spaceId: 'space-1',
    workspaceId: 'ws-1',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'A page with attachments.' }],
        },
        {
          type: 'attachment',
          attrs: {
            url: '/files/att-pdf/doc.pdf',
            name: 'doc.pdf',
            mime: 'application/pdf',
            attachmentId: 'att-pdf',
          },
        },
        {
          type: 'image',
          attrs: { src: '/files/att-img/photo.png', attachmentId: 'att-img' },
        },
      ],
    },
  };

  const zipBuffer = await service.exportPageToDocxZip(page, 'user-1');
  const isZip = zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4b; // 'PK'
  console.log('zip bytes:', zipBuffer.length, 'is zip container:', isZip);

  const zip = await new JSZip().loadAsync(zipBuffer);
  const names = Object.keys(zip.files);
  console.log('zip entries:', names);

  const hasDocx = !!zip.files['document.docx'];
  const hasPdf = !!zip.files['attachments/doc.pdf'];
  const hasImg = !!zip.files['attachments/photo.png'];
  console.log('document.docx present:', hasDocx);
  console.log('attachments/doc.pdf present:', hasPdf);
  console.log('attachments/photo.png present (should be false):', hasImg);

  if (!isZip || !hasDocx || !hasPdf || hasImg) {
    console.log('SMOKE_FAIL');
    process.exit(1);
  }

  const bytes = await zip.files['attachments/doc.pdf'].async('nodebuffer');
  const bytesMatch = Buffer.from(bytes).equals(ATT_PDF_BYTES);
  console.log('pdf bytes match stored:', bytesMatch);

  require('fs').writeFileSync('/tmp/word-export-zip-bundle-smoke.zip', zipBuffer);
  console.log('wrote /tmp/word-export-zip-bundle-smoke.zip');
  console.log(bytesMatch ? 'SMOKE_OK' : 'SMOKE_FAIL');
  process.exit(bytesMatch ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
