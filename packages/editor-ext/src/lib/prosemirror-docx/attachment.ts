import { AlignmentType, ExternalHyperlink, ImageRun, TextRun } from 'docx';
import { imageDimensionsFromData } from 'image-dimensions';
import type { Node } from 'prosemirror-model';
import { DocxSerializerStateAsync } from './serializer';
import type { NodeSerializerAsync } from './serializer';
import {
  imageTypeFromMime,
  isImageMime,
  parseAttachmentRef,
} from './attachment-helpers';
import type { DocxAttachmentData } from './types';

/**
 * Embed raw image bytes as an ImageRun. Returns false when the bytes are not a
 * decodable image so the caller can fall back to a file/link representation.
 */
export function embedImageFromData(
  state: DocxSerializerStateAsync,
  data: Uint8Array,
  mimeType?: string,
  widthPercent = 100,
): boolean {
  const dimensions = imageDimensionsFromData(data);
  if (!dimensions) return false;

  const aspect = dimensions.height / dimensions.width;
  const width = state.maxImageWidth * (widthPercent / 100);
  state.current.push(
    new ImageRun({
      data,
      type: imageTypeFromMime(mimeType),
      transformation: { width, height: width * aspect },
    }),
  );
  state.addParagraphOptions({ alignment: AlignmentType.CENTER });
  return true;
}

/**
 * Render a non-image attachment. When a download URL is available we emit a
 * clickable hyperlink carrying the file name; otherwise we keep the name as a
 * plain labelled line.
 */
export function renderFileEmbed(
  state: DocxSerializerStateAsync,
  node: Node,
  attachment?: DocxAttachmentData,
): void {
  const ref = parseAttachmentRef(node);
  const name = attachment?.name || ref.name || 'attachment';

  if (attachment?.url) {
    state.current.push(
      new ExternalHyperlink({
        link: attachment.url,
        children: [new TextRun(name)],
      }),
    );
  } else {
    state.text(name);
  }
  state.closeBlock(node);
}

/**
 * Serialize an attachment/file node. Resolves the attachment via the export
 * resolver and embeds it:
 *  - image attachments -> ImageRun (self-contained in the .docx)
 *  - other files        -> link/name line (docx has no native file embedding)
 * Without a resolver, or on resolution failure, it degrades to the name-only
 * line so the export never breaks.
 */
export const renderAttachment: NodeSerializerAsync[string] = async (
  state,
  node,
) => {
  const ref = parseAttachmentRef(node);
  const getAttachment = state.options.getAttachment;

  let attachment: DocxAttachmentData | undefined;
  if (getAttachment && ref.src) {
    try {
      attachment = await getAttachment(ref.src);
    } catch {
      attachment = undefined;
    }
  }

  if (attachment && isImageMime(attachment.mimeType)) {
    if (embedImageFromData(state, attachment.data, attachment.mimeType)) {
      state.closeBlock(node);
      return;
    }
    // Invalid image bytes: fall through to the file/link branch.
  }

  if (attachment) {
    renderFileEmbed(state, node, attachment);
    return;
  }

  const label =
    (node.attrs?.name as string | undefined) || ref.src || 'attachment';
  state.text(label);
  state.closeBlock(node);
};
