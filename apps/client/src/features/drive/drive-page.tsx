import { useRef, useState } from "react";
import {
  Box,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconCloud,
  IconFolderPlus,
  IconLayoutGrid,
  IconList,
  IconSearch,
  IconUpload,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  useCreateFolderMutation,
  useDriveQuotaQuery,
  useUploadFileMutation,
} from "./queries/drive-query";
import { DriveType, IDriveBreadcrumb, IDriveFolder } from "./types/drive.types";
import DriveBrowser from "./components/drive-browser";
import DriveBreadcrumb from "./components/breadcrumb";
import QuotaIndicator from "./components/quota-indicator";

export default function DrivePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createFolderMut = useCreateFolderMutation();
  const uploadFileMut = useUploadFileMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [driveType, setDriveType] = useState<DriveType>("personal");
  const quotaQuery = useDriveQuotaQuery(driveType);
  const [path, setPath] = useState<IDriveBreadcrumb[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const currentFolderId = path.length ? path[path.length - 1].id : null;

  function openFolder(folder: IDriveFolder) {
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearch("");
  }

  function navigateTo(index: number) {
    setPath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
  }

  function invalidateLists() {
    queryClient.invalidateQueries({ queryKey: ["drive-folders"] });
    queryClient.invalidateQueries({ queryKey: ["drive-files"] });
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    await createFolderMut.mutateAsync({
      driveType,
      name,
      parentId: currentFolderId,
    });
    setNewFolderOpen(false);
    setNewFolderName("");
    invalidateLists();
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadFileMut.mutateAsync({
        file,
        driveType,
        folderId: currentFolderId,
      });
    }
    invalidateLists();
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="md">
        <Title order={3}>
          <IconCloud size={22} style={{ verticalAlign: "middle" }} />{" "}
          {t("Drive")}
        </Title>
        <SegmentedControl
          value={driveType}
          onChange={(value) => setDriveType(value as DriveType)}
          data={[
            { label: t("Personal"), value: "personal" },
            { label: t("Shared"), value: "shared" },
          ]}
        />
      </Group>

      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Button
            leftSection={<IconFolderPlus size={16} />}
            variant="light"
            onClick={() => setNewFolderOpen(true)}
            aria-label="new-folder"
          >
            {t("New folder")}
          </Button>
          <QuotaIndicator
            usedBytes={quotaQuery.data?.usedBytes ?? 0}
            quota={quotaQuery.data?.quota ?? null}
          />
          <Button
            leftSection={<IconUpload size={16} />}
            variant="light"
            onClick={() => fileInputRef.current?.click()}
            aria-label="upload"
          >
            {t("Upload")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              void handleFilesSelected(e.currentTarget.files);
              e.currentTarget.value = "";
            }}
          />
        </Group>
        <Group gap="xs">
          <TextInput
            placeholder={t("Search")}
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            aria-label="drive-search"
          />
          <SegmentedControl
            value={view}
            onChange={(value) => setView(value as "grid" | "list")}
            aria-label="view-toggle"
            data={[
              {
                label: <IconLayoutGrid size={16} />,
                value: "grid",
              },
              { label: <IconList size={16} />, value: "list" },
            ]}
          />
        </Group>
      </Group>

      <Box mb="sm">
        <DriveBreadcrumb path={path} onNavigate={navigateTo} />
      </Box>

      <DriveBrowser
        driveType={driveType}
        folderId={currentFolderId}
        onFolderOpen={openFolder}
        view={view}
        search={search}
      />

      <Modal
        opened={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title={t("New folder")}
      >
        <Stack>
          <TextInput
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.currentTarget.value)}
            placeholder={t("Folder name")}
            aria-label="new-folder-name"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateFolder();
            }}
          />
          <Group justify="flex-end">
            <Button onClick={() => void handleCreateFolder()} aria-label="confirm-new-folder">
              {t("Create")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
