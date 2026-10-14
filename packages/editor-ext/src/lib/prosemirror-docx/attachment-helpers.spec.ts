import {
  imageTypeFromMime,
  isImageMime,
  parseAttachmentRef,
} from './attachment-helpers';

describe('parseAttachmentRef', () => {
  it('extracts the id from an /api/files/<id>/<name> url', () => {
    const ref = parseAttachmentRef({
      attrs: { src: '/api/files/abc123/report.pdf', name: 'report.pdf' },
    });
    expect(ref.id).toBe('abc123');
    expect(ref.name).toBe('report.pdf');
    expect(ref.src).toBe('/api/files/abc123/report.pdf');
  });

  it('extracts the id from a bare /files/<id> url', () => {
    const ref = parseAttachmentRef({ attrs: { src: '/files/xyz789' } });
    expect(ref.id).toBe('xyz789');
  });

  it('falls back to attachmentId when no src is present', () => {
    const ref = parseAttachmentRef({ attrs: { attachmentId: 'id1', name: 'a.png' } });
    expect(ref.id).toBe('id1');
    expect(ref.name).toBe('a.png');
  });

  it('returns empty fields for a node without attachment attributes', () => {
    const ref = parseAttachmentRef({ attrs: {} });
    expect(ref.id).toBeUndefined();
    expect(ref.name).toBeUndefined();
  });
});

describe('isImageMime', () => {
  it('treats image/* as images', () => {
    expect(isImageMime('image/png')).toBe(true);
    expect(isImageMime('IMAGE/JPEG')).toBe(true);
  });

  it('treats non-image and missing mime as not images', () => {
    expect(isImageMime('application/pdf')).toBe(false);
    expect(isImageMime(undefined)).toBe(false);
  });
});

describe('imageTypeFromMime', () => {
  it('maps common subtypes to docx image types', () => {
    expect(imageTypeFromMime('image/jpeg')).toBe('jpg');
    expect(imageTypeFromMime('image/png')).toBe('png');
    expect(imageTypeFromMime('image/gif')).toBe('gif');
  });

  it('normalizes webp to png and defaults unknown/empty to png', () => {
    expect(imageTypeFromMime('image/webp')).toBe('png');
    expect(imageTypeFromMime(undefined)).toBe('png');
    expect(imageTypeFromMime('image/unknown')).toBe('png');
  });
});
