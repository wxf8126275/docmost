import { ExternalHyperlink, ImageRun, TextRun } from 'docx';
import { embedImageFromData, renderFileEmbed } from './attachment';

// 1x1 transparent PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function makeState() {
  const current: unknown[] = [];
  return {
    current,
    maxImageWidth: 600,
    text: (t: string) => current.push(new TextRun(t)),
    addParagraphOptions: () => {},
    closeBlock: () => {},
  };
}

describe('embedImageFromData', () => {
  it('embeds a valid image and returns true', () => {
    const state = makeState() as any;
    const data = Uint8Array.from(Buffer.from(PNG_BASE64, 'base64'));
    const ok = embedImageFromData(state, data, 'image/png');
    expect(ok).toBe(true);
    expect(state.current[0]).toBeInstanceOf(ImageRun);
  });

  it('returns false for undecodable bytes (caller falls back)', () => {
    const state = makeState() as any;
    const ok = embedImageFromData(state, Uint8Array.from([1, 2, 3]), 'image/png');
    expect(ok).toBe(false);
    expect(state.current).toHaveLength(0);
  });
});

describe('renderFileEmbed', () => {
  it('emits a clickable hyperlink when a url is present', () => {
    const state = makeState() as any;
    renderFileEmbed(state, { attrs: { name: 'report.pdf' } } as any, {
      data: new Uint8Array(),
      name: 'report.pdf',
      url: 'https://x.test/api/files/1/report.pdf',
    });
    expect(state.current[0]).toBeInstanceOf(ExternalHyperlink);
  });

  it('falls back to a name-only line when no url is available', () => {
    const state = makeState() as any;
    renderFileEmbed(state, { attrs: { name: 'notes.txt' } } as any, {
      data: new Uint8Array(),
      name: 'notes.txt',
    });
    expect(state.current[0]).toBeInstanceOf(TextRun);
  });
});
