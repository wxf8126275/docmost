import { ActionIcon, Group } from "@mantine/core";
import { IconDownload, IconPencil, IconShare, IconTrash } from "@tabler/icons-react";

interface FileRowActionsProps {
  fileId: string;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
  onShare?: () => void;
}

/**
 * Per-file action icons. Each stops propagation so clicking an action inside a
 * clickable row (e.g. a folder card) does not trigger the row's navigation.
 */
export default function FileRowActions({
  fileId,
  onDownload,
  onRename,
  onDelete,
  onShare,
}: FileRowActionsProps) {
  return (
    <Group gap={4}>
      {onShare && (
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label={`share-file-${fileId}`}
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
        >
          <IconShare size={14} />
        </ActionIcon>
      )}
      <ActionIcon
        variant="subtle"
        size="sm"
        aria-label={`download-file-${fileId}`}
        onClick={(e) => {
          e.stopPropagation();
          onDownload();
        }}
      >
        <IconDownload size={14} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        size="sm"
        aria-label={`rename-file-${fileId}`}
        onClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
      >
        <IconPencil size={14} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="red"
        size="sm"
        aria-label={`delete-file-${fileId}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <IconTrash size={14} />
      </ActionIcon>
    </Group>
  );
}
