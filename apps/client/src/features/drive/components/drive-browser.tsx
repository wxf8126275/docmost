import { useState } from "react";
import {
  ActionIcon,
  Box,
  Card,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconFile,
  IconFolder,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  useDeleteFileMutation,
  useDeleteFolderMutation,
  useDriveFilesQuery,
  useDriveFoldersQuery,
  useUpdateFileMutation,
  useUpdateFolderMutation,
} from "../queries/drive-query";
import { downloadFileUrl } from "../services/drive-service";
import { DriveType, IDriveFile, IDriveFolder } from "../types/drive.types";
import FileRowActions from "./file-row-actions";
import UploadDropzone from "./upload-dropzone";
import PreviewModal from "./preview-modal";
import ShareDialog from "./share-dialog";

interface DriveBrowserProps {
  driveType: DriveType;
  folderId: string | null;
  onFolderOpen: (folder: IDriveFolder) => void;
  view: "grid" | "list";
  search: string;
  onFilePreview?: (file: IDriveFile) => void;
}

export default function DriveBrowser({
  driveType,
  folderId,
  onFolderOpen,
  view,
  search,
  onFilePreview,
}: DriveBrowserProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const foldersQuery = useDriveFoldersQuery(driveType, folderId);
  const filesQuery = useDriveFilesQuery(driveType, folderId);
  const deleteFolderMut = useDeleteFolderMutation();
  const deleteFileMut = useDeleteFileMutation();
  const updateFolderMut = useUpdateFolderMutation();
  const updateFileMut = useUpdateFileMutation();

  const [renamingFolder, setRenamingFolder] = useState<IDriveFolder | null>(
    null,
  );
  const [renamingFile, setRenamingFile] = useState<IDriveFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewFile, setPreviewFile] = useState<IDriveFile | null>(null);
  const [sharingFile, setSharingFile] = useState<IDriveFile | null>(null);

  function invalidateLists() {
    queryClient.invalidateQueries({ queryKey: ["drive-folders"] });
    queryClient.invalidateQueries({ queryKey: ["drive-files"] });
  }

  const query = search.trim().toLowerCase();
  const folders = (foldersQuery.data ?? []).filter(
    (f) => !query || f.name.toLowerCase().includes(query),
  );
  const files = (filesQuery.data ?? []).filter(
    (f) => !query || f.fileName.toLowerCase().includes(query),
  );

  const isLoading = foldersQuery.isLoading || filesQuery.isLoading;

  function startRenameFolder(folder: IDriveFolder) {
    setRenamingFolder(folder);
    setRenameValue(folder.name);
  }

  function startRenameFile(file: IDriveFile) {
    setRenamingFile(file);
    setRenameValue(file.fileName);
  }

  function commitRename() {
    if (renamingFolder) {
      updateFolderMut.mutate({
        folderId: renamingFolder.id,
        input: { driveType, name: renameValue.trim() },
      });
      setRenamingFolder(null);
    }
    if (renamingFile) {
      updateFileMut.mutate({
        fileId: renamingFile.id,
        input: { driveType, fileName: renameValue.trim() },
      });
      setRenamingFile(null);
    }
    setRenameValue("");
  }

  function downloadFile(file: IDriveFile) {
    const anchor = document.createElement("a");
    anchor.href = downloadFileUrl(file.id);
    anchor.download = file.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <Box pos="relative">
      {isLoading && (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      )}

      {!isLoading && (
        <UploadDropzone
          driveType={driveType}
          folderId={folderId}
          onUploaded={invalidateLists}
        />
      )}

      {!isLoading && folders.length === 0 && files.length === 0 && (
        <Text c="dimmed" p="md">
          {t("This folder is empty")}
        </Text>
      )}

      {view === "grid" ? (
        <SimpleGrid cols={4} spacing="sm" verticalSpacing="sm">
          {folders.map((folder) => (
            <Card key={folder.id} withBorder padding="sm" radius="sm">
              <Group justify="space-between" wrap="nowrap">
                <Group
                  gap="xs"
                  style={{ cursor: "pointer" }}
                  onClick={() => onFolderOpen(folder)}
                >
                  <IconFolder size={20} />
                  <Text size="sm" lineClamp={1}>
                    {folder.name}
                  </Text>
                </Group>
                <Group gap={4}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={`rename-folder-${folder.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startRenameFolder(folder);
                    }}
                  >
                    <IconPencil size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    aria-label={`delete-folder-${folder.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolderMut.mutate({ folderId: folder.id, driveType });
                    }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
          {files.map((file) => (
            <Card key={file.id} withBorder padding="sm" radius="sm">
              <Group
                justify="space-between"
                wrap="nowrap"
                style={{ cursor: "pointer" }}
                onClick={() => onFilePreview?.(file)}
              >
                <Group gap="xs">
                  <IconFile size={20} />
                  <Text size="sm" lineClamp={1}>
                    {file.fileName}
                  </Text>
                </Group>
                <FileRowActions
                  fileId={file.id}
                  onDownload={() => downloadFile(file)}
                  onRename={() => startRenameFile(file)}
                  onShare={() => setSharingFile(file)}
                  onDelete={() =>
                    deleteFileMut.mutate({ fileId: file.id, driveType })
                  }
                />
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Stack gap={4}>
          {folders.map((folder) => (
            <Group
              key={folder.id}
              justify="space-between"
              wrap="nowrap"
              style={{ cursor: "pointer" }}
              onClick={() => onFolderOpen(folder)}
            >
              <Group gap="xs">
                <IconFolder size={18} />
                <Text size="sm">{folder.name}</Text>
              </Group>
              <Group gap={4}>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  aria-label={`rename-folder-${folder.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    startRenameFolder(folder);
                  }}
                >
                  <IconPencil size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label={`delete-folder-${folder.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolderMut.mutate({ folderId: folder.id, driveType });
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
          {files.map((file) => (
            <Group
              key={file.id}
              justify="space-between"
              wrap="nowrap"
              style={{ cursor: "pointer" }}
              onClick={() => onFilePreview?.(file)}
            >
              <Group gap="xs">
                <IconFile size={18} />
                <Text size="sm">{file.fileName}</Text>
              </Group>
              <FileRowActions
                fileId={file.id}
                onDownload={() => downloadFile(file)}
                onRename={() => startRenameFile(file)}
                onShare={() => setSharingFile(file)}
                onDelete={() =>
                  deleteFileMut.mutate({ fileId: file.id, driveType })
                }
              />
            </Group>
          ))}
        </Stack>
      )}

      <Modal
        opened={!!renamingFolder || !!renamingFile}
        onClose={() => {
          setRenamingFolder(null);
          setRenamingFile(null);
        }}
        title={t("Rename")}
      >
        <TextInput
          value={renameValue}
          onChange={(e) => setRenameValue(e.currentTarget.value)}
          aria-label="rename-input"
        />
        <Group justify="flex-end" mt="sm">
          <ActionIcon
            variant="filled"
            aria-label="confirm-rename"
            onClick={commitRename}
          >
            {t("Save")}
          </ActionIcon>
        </Group>
      </Modal>

      <PreviewModal
        file={previewFile}
        opened={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <ShareDialog
        fileId={sharingFile?.id ?? ""}
        driveType={driveType}
        opened={!!sharingFile}
        onClose={() => setSharingFile(null)}
      />
    </Box>
  );
}
