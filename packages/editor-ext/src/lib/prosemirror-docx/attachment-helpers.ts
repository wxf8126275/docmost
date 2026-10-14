import type { ImageType } from './serializer';

export interface AttachmentRef {
  id?: string;
  name?: string;
  src?: string;
}

// Matches both `/files/<id>` and `/api/files/<id>/<name>` attachment URLs.
const FILE_ID_RE = /\/files\/([^/?]+)/;

/**
 * Extract the attachment id, display name, and source URL from a media node's
 * attributes. The id is what the export resolver uses to look the file up.
 */
export function parseAttachmentRef(node: {
  attrs?: Record<string, unknown> | null;
}): AttachmentRef {
  const attrs = node?.attrs ?? {};
  const src = (attrs.src ?? attrs.url ?? attrs.attachmentId) as
    | string
    | undefined;
  const name = attrs.name as string | undefined;

  let id: string | undefined;
  if (typeof src === 'string') {
    const match = src.match(FILE_ID_RE);
    if (match) id = match[1];
  }
  if (!id && typeof attrs.attachmentId === 'string') {
    id = attrs.attachmentId;
  }

  return { id, name, src };
}

export function isImageMime(mimeType?: string): boolean {
  return !!mimeType && mimeType.toLowerCase().startsWith('image/');
}

const IMAGE_TYPE_BY_SUBTYPE: Record<string, ImageType> = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  gif: 'gif',
  bmp: 'bmp',
  webp: 'png',
};

export function imageTypeFromMime(mimeType?: string): ImageType {
  const subtype = (mimeType?.split('/')[1] ?? 'png').toLowerCase();
  return IMAGE_TYPE_BY_SUBTYPE[subtype] ?? 'png';
}
