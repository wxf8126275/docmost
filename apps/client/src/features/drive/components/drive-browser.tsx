import { useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { parseDriveCategory } from "../drive-category";
import { DriveCategory, IDriveFile, IDriveFolder } from "../types/drive.types";
import FileRowActions from "./file-row-actions";
import UploadDropzone from "./upload-dropzone";
import PreviewModal from "./preview-modal";
import ShareDialog from "./share-dialog";

interface DriveBrowserProps {
  spaceId: string;
  folderId: string | null;
  onFolderOpen: (folder: IDriveFolder) => void;
  view: "grid" | "list";
  search: string;
  onFilePreview?: (file: IDriveFile) => void;
}

const CATEGORY_EXTS: Record<string, string[]> = {
  images: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"],
  documents: [
    ".pdf", ".doc", ".docx", ".txt", ".md", ".rtf", ".odt",
    ".xls", ".xlsx", ".ods", ".csv", ".ppt", ".pptx", ".odp",
  ],
  videos: [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv", ".m4v"],
  music: [".mp3", ".wav", ".oga", ".m4a", ".aac", ".flac", ".opus"],
};

const DOCUMENT_MIMES = [
  "application/pdf",
  "application/json",
  "application/rtf",
  "application/msword",
];

function matchesCategory(file: IDriveFile, category: DriveCategory): boolean {
  if (category === "all" || category === "recent") return true;
  const ext = (file.fileExt ?? "").toLowerCase();
  const mime = file.mimeType ?? file.type ?? "";
  const exts = CATEGORY_EXTS[category] ?? [];

  if (exts.includes(ext)) return true;

  switch (category) {
    case "images":
      return mime.startsWith("image/");
    case "videos":
      return mime.startsWith("video/");
    case "music":
      return mime.startsWith("audio/");
    case "documents":
      return (
        mime.startsWith("text/") ||
        DOCUMENT_MIMES.includes(mime) ||
        mime.includes("word") ||
        mime.includes("excel") ||
        mime.includes("powerpoint") ||
        mime.includes("opendocument")
      );
    default:
      return false;
  }
}

function lastModified(file: { updatedAt: string; createdAt: string }): number {
  return new Date(file.updatedAt || file.createdAt).getTime();
}

export default function DriveBrowser({
  spaceId,
  folderId,
  onFolderOpen,
  view,
  search,
  onFilePreview,
}: DriveBrowserProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const foldersQuery = useDriveFoldersQuery(spaceId, folderId);
  const filesQuery = useDriveFilesQuery(spaceId, folderId);
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
  const [searchParams] = useSearchParams();
  const category = parseDriveCategory(searchParams.get("category"));

  function invalidateLists() {
    queryClient.invalidateQueries({ queryKey: ["drive-folders"] });
    queryClient.invalidateQueries({ queryKey: ["drive-files"] });
  }

  const query = search.trim().toLowerCase();

  let folders = (foldersQuery.data ?? []).filter(
    (f) => !query || f.name.toLowerCase().includes(query),
  );
  let files = (filesQuery.data ?? []).filter(
    (f) => !query || f.fileName.toLowerCase().includes(query),
  );

  // Typed categories show only matching files; `recent` sorts everything by
  // last-modified desc (Weiyun-style category nav).
  if (category !== "all" && category !== "recent") {
    folders = [];
    files = files.filter((f) => matchesCategory(f, category));
  } else if (category === "recent") {
    folders = [...folders].sort(
      (a, b) => lastModified(b) - lastModified(a),
    );
    files = [...files].sort((a, b) => lastModified(b) - lastModified(a));
  }

  const isLoading = foldersQuery.isLoading || filesQuery.isLoading;
  const isEmpty = folders.length === 0 && files.length === 0;

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
        input: { spaceId, name: renameValue.trim() },
      });
      setRenamingFolder(null);
    }
    if (renamingFile) {
      updateFileMut.mutate({
        fileId: renamingFile.id,
        input: { spaceId, fileName: renameValue.trim() },
      });
      setRenamingFile(null);
    }
    setRenameValue("");
  }

  function downloadFile(file: IDriveFile) {
    const anchor = document.createElement("a");
    anchor.href = downloadFileUrl(spaceId, file.id);
    anchor.download = file.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <Box>
      {isLoading && (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        )}

        {!isLoading && (
          <UploadDropzone
            spaceId={spaceId}
            folderId={folderId}
            onUploaded={invalidateLists}
          />
        )}

        {!isLoading && isEmpty && (
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
                        deleteFolderMut.mutate({ folderId: folder.id, spaceId });
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
                      deleteFileMut.mutate({ fileId: file.id, spaceId })
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
                      deleteFolderMut.mutate({ folderId: folder.id, spaceId });
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
                    deleteFileMut.mutate({ fileId: file.id, spaceId })
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
          spaceId={spaceId}
          opened={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />

        <ShareDialog
          fileId={sharingFile?.id ?? ""}
          spaceId={spaceId}
          opened={!!sharingFile}
          onClose={() => setSharingFile(null)}
        />
    </Box>
  );
}
