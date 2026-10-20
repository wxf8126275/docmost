import { useState } from "react";
import { Box } from "@mantine/core";
import {
  IconFileCode,
  IconFileExcel,
  IconFileMusic,
  IconFileText,
  IconFileTypePdf,
  IconFileTypePpt,
  IconFileUnknown,
  IconFileWord,
  IconFileZip,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react";
import { downloadFileUrl } from "../services/drive-service";
import { IDriveFile } from "../types/drive.types";

/**
 * File kinds the drive UI distinguishes visually. `image` is special: images
 * render a real thumbnail instead of an icon.
 */
export type DriveFileType =
  | "word"
  | "excel"
  | "powerpoint"
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "text"
  | "unknown";

const EXT_TYPE_MAP: Record<string, DriveFileType> = {
  // word processors
  doc: "word",
  docx: "word",
  rtf: "word",
  odt: "word",
  // spreadsheets
  xls: "excel",
  xlsx: "excel",
  csv: "excel",
  ods: "excel",
  // presentations
  ppt: "powerpoint",
  pptx: "powerpoint",
  odp: "powerpoint",
  // pdf
  pdf: "pdf",
  // archives
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  // code
  js: "code",
  ts: "code",
  tsx: "code",
  jsx: "code",
  json: "code",
  html: "code",
  css: "code",
  py: "code",
  java: "code",
  go: "code",
  rs: "code",
  sql: "code",
  sh: "code",
  // plain text
  txt: "text",
  md: "text",
  // audio
  mp3: "audio",
  wav: "audio",
  oga: "audio",
  m4a: "audio",
  aac: "audio",
  flac: "audio",
  opus: "audio",
  // video
  mp4: "video",
  webm: "video",
  ogg: "video",
  mov: "video",
  avi: "video",
  mkv: "video",
  m4v: "video",
  // images
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  avif: "image",
};

const TYPE_VISUALS: Record<
  Exclude<DriveFileType, "image">,
  { icon: typeof IconFileWord; color: string }
> = {
  word: { icon: IconFileWord, color: "#2B579A" },
  excel: { icon: IconFileExcel, color: "#217346" },
  powerpoint: { icon: IconFileTypePpt, color: "#D24726" },
  pdf: { icon: IconFileTypePdf, color: "#E74C3C" },
  video: { icon: IconVideo, color: "#7048e8" },
  audio: { icon: IconFileMusic, color: "#0ca678" },
  archive: { icon: IconFileZip, color: "#f08c00" },
  code: { icon: IconFileCode, color: "#495057" },
  text: { icon: IconFileText, color: "#495057" },
  unknown: { icon: IconFileUnknown, color: "#868e96" },
};

/**
 * Resolves a file's visual kind from its extension first (authoritative — the
 * server derives it from the uploaded filename) and its MIME type second.
 * Exported for direct unit testing.
 */
export function getDriveFileType(file: IDriveFile): DriveFileType {
  const ext = (file.fileExt ?? "").toLowerCase().replace(/^\./, "");
  const mapped = EXT_TYPE_MAP[ext];
  if (mapped) return mapped;

  const mime = file.mimeType ?? file.type ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/")) return "text";
  return "unknown";
}

interface DriveFileIconProps {
  file: IDriveFile;
  spaceId: string;
  /** Icon edge length in px; also the thumbnail box size. */
  size?: number;
}

/**
 * The single visual representation of a drive file: image files show a real
 * thumbnail (space-scoped download URL, same auth model as the preview modal)
 * and gracefully fall back to the photo icon if it fails to load; every other
 * kind shows its tabler type icon with a brand-inspired color.
 */
export default function DriveFileIcon({
  file,
  spaceId,
  size = 24,
}: DriveFileIconProps) {
  const type = getDriveFileType(file);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  if (type === "image" && !thumbnailFailed) {
    return (
      <Box
        data-file-type="image"
        w={size}
        h={size}
        style={{
          borderRadius: 4,
          overflow: "hidden",
          flexShrink: 0,
          lineHeight: 0,
        }}
      >
        <img
          src={downloadFileUrl(spaceId, file.id)}
          alt={file.fileName}
          loading="lazy"
          onError={() => setThumbnailFailed(true)}
          style={{
            objectFit: "cover",
            width: size,
            height: size,
            display: "block",
          }}
        />
      </Box>
    );
  }

  const visual =
    type === "image"
      ? { icon: IconPhoto, color: "#1098ad" }
      : TYPE_VISUALS[type];

  return (
    <Box
      data-file-type={type}
      style={{ display: "inline-flex", flexShrink: 0, lineHeight: 0 }}
    >
      <visual.icon size={size} color={visual.color} />
    </Box>
  );
}
