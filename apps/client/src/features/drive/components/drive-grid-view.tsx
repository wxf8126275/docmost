import {
  ActionIcon,
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconFolder, IconPencil, IconTrash } from "@tabler/icons-react";
import { DriveViewBaseProps } from "../types/drive.types";
import DriveFileIcon from "./drive-file-icon";
import FileRowActions from "./file-row-actions";

/**
 * Thumbnail (tile) view of a drive folder: image files show real thumbnails,
 * every other file shows its large type icon, folders show the folder icon;
 * the name sits below and item actions below that. Weiyun-style browsing.
 */
export default function DriveGridView({
  spaceId,
  folders,
  files,
  handlers,
}: DriveViewBaseProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm" verticalSpacing="sm">
      {folders.map((folder) => (
        <Card key={folder.id} withBorder padding="sm" radius="sm">
          <Stack align="center" gap="xs">
            <Box
              ta="center"
              style={{ cursor: "pointer", width: "100%" }}
              onClick={() => handlers.onFolderOpen(folder)}
            >
              <IconFolder
                size={48}
                stroke={1.5}
                color="var(--mantine-color-blue-6)"
              />
              <Text size="sm" lineClamp={1}>
                {folder.name}
              </Text>
            </Box>
            <Group gap={4}>
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={`rename-folder-${folder.id}`}
                onClick={() => handlers.onRenameFolder(folder)}
              >
                <IconPencil size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                aria-label={`delete-folder-${folder.id}`}
                onClick={() => handlers.onDeleteFolder(folder)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Stack>
        </Card>
      ))}

      {files.map((file) => (
        <Card key={file.id} withBorder padding="sm" radius="sm">
          <Stack align="center" gap="xs">
            <Box
              ta="center"
              style={{ cursor: "pointer", width: "100%" }}
              onClick={() => handlers.onFilePreview?.(file)}
            >
              <DriveFileIcon file={file} spaceId={spaceId} size={48} />
              <Text size="sm" lineClamp={1}>
                {file.fileName}
              </Text>
            </Box>
            <FileRowActions
              fileId={file.id}
              onDownload={() => handlers.onDownloadFile(file)}
              onRename={() => handlers.onRenameFile(file)}
              onShare={() => handlers.onShareFile(file)}
              onDelete={() => handlers.onDeleteFile(file)}
            />
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}
