import { ActionIcon, Group, Table, Text, VisuallyHidden } from "@mantine/core";
import { IconFolder, IconPencil, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/lib";
import { DriveViewBaseProps } from "../types/drive.types";
import DriveFileIcon from "./drive-file-icon";
import FileRowActions from "./file-row-actions";

/** Locale date-time, or an empty string when the timestamp is missing/invalid. */
function formatModified(value: string): string {
  const date = new Date(value);
  return isNaN(date.getTime()) ? "" : date.toLocaleString();
}

/**
 * Weiyun-style list view: three data columns (name with the file-type icon or
 * image thumbnail / last-modified / size) plus a row-end actions column.
 */
export default function DriveListView({
  spaceId,
  folders,
  files,
  handlers,
}: DriveViewBaseProps) {
  const { t } = useTranslation();

  return (
    <Table highlightOnHover verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t("Name")}</Table.Th>
          <Table.Th>{t("Last modified")}</Table.Th>
          <Table.Th>{t("Size")}</Table.Th>
          <Table.Th w={140}>
            <VisuallyHidden>{t("Action")}</VisuallyHidden>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>

      <Table.Tbody>
        {folders.map((folder) => (
          <Table.Tr key={folder.id}>
            <Table.Td>
              <Group
                gap="xs"
                wrap="nowrap"
                style={{ cursor: "pointer" }}
                onClick={() => handlers.onFolderOpen(folder)}
              >
                <IconFolder size={18} />
                <Text size="sm" lineClamp={1}>
                  {folder.name}
                </Text>
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {formatModified(folder.updatedAt)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                —
              </Text>
            </Table.Td>
            <Table.Td>
              <Group gap={4} justify="flex-end" wrap="nowrap">
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
            </Table.Td>
          </Table.Tr>
        ))}

        {files.map((file) => (
          <Table.Tr key={file.id}>
            <Table.Td>
              <Group
                gap="xs"
                wrap="nowrap"
                style={{ cursor: "pointer" }}
                onClick={() => handlers.onFilePreview?.(file)}
              >
                <DriveFileIcon file={file} spaceId={spaceId} size={18} />
                <Text size="sm" lineClamp={1}>
                  {file.fileName}
                </Text>
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {formatModified(file.updatedAt)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {file.fileSize != null ? formatBytes(file.fileSize) : "—"}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group gap={4} justify="flex-end" wrap="nowrap">
                <FileRowActions
                  fileId={file.id}
                  onDownload={() => handlers.onDownloadFile(file)}
                  onRename={() => handlers.onRenameFile(file)}
                  onShare={() => handlers.onShareFile(file)}
                  onDelete={() => handlers.onDeleteFile(file)}
                />
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
