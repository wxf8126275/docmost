import { Group, Image, Modal, Text } from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import { IDriveFile } from "../types/drive.types";
import { downloadFileUrl } from "../services/drive-service";

interface PreviewModalProps {
  file: IDriveFile | null;
  opened: boolean;
  onClose: () => void;
}

const IMAGE_EXTS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".avif",
];
const VIDEO_EXTS = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
const AUDIO_EXTS = [".mp3", ".wav", ".oga", ".m4a", ".aac", ".flac"];

/**
 * Renders an inline preview for a drive file: image thumbnail, audio/video
 * player, or a generic document icon when the type is not directly previewable.
 */
export default function PreviewModal({
  file,
  opened,
  onClose,
}: PreviewModalProps) {
  function renderPreview() {
    if (!file) return null;
    const ext = file.fileExt.toLowerCase();
    const url = downloadFileUrl(file.id);

    if (IMAGE_EXTS.includes(ext)) {
      return (
        <Image src={url} alt={file.fileName} fit="contain" mah={480} />
      );
    }
    if (VIDEO_EXTS.includes(ext)) {
      return (
        <video src={url} controls style={{ width: "100%" }} />
      );
    }
    if (AUDIO_EXTS.includes(ext)) {
      return (
        <audio src={url} controls style={{ width: "100%" }} />
      );
    }
    return (
      <Group justify="center" p="xl" gap="xs">
        <IconFileText size={64} />
        <Text>{file.fileName}</Text>
      </Group>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={file?.fileName ?? ""}
      size="lg"
    >
      {renderPreview()}
    </Modal>
  );
}
