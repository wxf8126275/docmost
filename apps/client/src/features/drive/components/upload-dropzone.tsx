import { useEffect, useRef, useState } from "react";
import {
  Box,
  Group,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useUploadFileMutation } from "../queries/drive-query";

interface UploadItem {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  progress: number;
}

interface UploadDropzoneProps {
  spaceId: string;
  folderId: string | null;
  onUploaded?: () => void;
}

interface UploadProgressEvent {
  loaded: number;
  total?: number;
}

/**
 * Drag-and-drop / click / folder upload surface. Each selected file is uploaded
 * to the current drive + folder; the queue shows per-file progress and status.
 */
export default function UploadDropzone({
  spaceId,
  folderId,
  onUploaded,
}: UploadDropzoneProps) {
  const { t } = useTranslation();
  const uploadMut = useUploadFileMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // `webkitdirectory` is not in React's attribute typings; set it imperatively.
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
    }
  }, []);

  async function processFiles(files: File[]) {
    if (files.length === 0) return;
    const items: UploadItem[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      status: "uploading",
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...items]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const itemId = items[i].id;
      try {
        await uploadMut.mutateAsync({
          file,
          spaceId,
          folderId,
          onUploadProgress: (event: UploadProgressEvent) => {
            const pct = event.total
              ? Math.round((event.loaded / event.total) * 100)
              : 0;
            setQueue((prev) =>
              prev.map((it) =>
                it.id === itemId ? { ...it, progress: pct } : it,
              ),
            );
          },
        });
        setQueue((prev) =>
          prev.map((it) =>
            it.id === itemId ? { ...it, status: "done", progress: 100 } : it,
          ),
        );
      } catch {
        setQueue((prev) =>
          prev.map((it) =>
            it.id === itemId ? { ...it, status: "error" } : it,
          ),
        );
      }
    }
    onUploaded?.();
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    void processFiles(files);
    event.currentTarget.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    void processFiles(files);
  }

  return (
    <Box
      aria-label="upload-dropzone"
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: dragActive
          ? "2px dashed #228be6"
          : "2px dashed #ced4da",
        borderRadius: 8,
        padding: 16,
        textAlign: "center",
        cursor: "pointer",
      }}
    >
      <Group justify="center" gap="xs">
        <IconUpload size={20} />
        <Text size="sm">{t("Drag files here or click to upload")}</Text>
      </Group>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        aria-label="drive-file-input"
        onChange={handleInputChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        hidden
        aria-label="drive-folder-input"
        onChange={handleInputChange}
      />

      {queue.length > 0 && (
        <Stack
          gap={4}
          mt="sm"
          onClick={(event) => event.stopPropagation()}
        >
          {queue.map((item) => (
            <Box key={item.id}>
              <Group justify="space-between">
                <Text size="xs" lineClamp={1}>
                  {item.name}
                </Text>
                <Text
                  size="xs"
                  c={
                    item.status === "error"
                      ? "red"
                      : item.status === "done"
                        ? "teal"
                        : "dimmed"
                  }
                >
                  {item.status === "done"
                    ? t("Done")
                    : item.status === "error"
                      ? t("Failed")
                      : `${item.progress}%`}
                </Text>
              </Group>
              <Progress
                value={item.progress}
                color={item.status === "error" ? "red" : "blue"}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
