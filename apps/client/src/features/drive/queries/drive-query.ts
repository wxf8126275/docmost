import {
  useMutation,
  useQuery,
  UseQueryResult,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import {
  createFolder,
  createShare,
  deleteFile,
  deleteFolder,
  getQuota,
  listFiles,
  listFolders,
  updateFile,
  updateFolder,
  uploadFile,
} from "@/features/drive/services/drive-service";
import {
  CreateFolderInput,
  CreateShareLinkInput,
  IDriveFile,
  IDriveFolder,
  IDriveQuota,
  IDriveShare,
  UpdateFileInput,
  UpdateFolderInput,
} from "@/features/drive/types/drive.types";
import type { AxiosProgressEvent } from "axios";

export function useDriveFoldersQuery(
  spaceId: string,
  parentId?: string | null,
): UseQueryResult<IDriveFolder[], Error> {
  return useQuery({
    queryKey: ["drive-folders", spaceId, parentId ?? "root"],
    queryFn: () => listFolders(spaceId, parentId),
    enabled: !!spaceId,
  });
}

export function useDriveFilesQuery(
  spaceId: string,
  folderId?: string | null,
): UseQueryResult<IDriveFile[], Error> {
  return useQuery({
    queryKey: ["drive-files", spaceId, folderId ?? "root"],
    queryFn: () => listFiles(spaceId, folderId),
    enabled: !!spaceId,
  });
}

export function useCreateFolderMutation() {
  const { t } = useTranslation();
  return useMutation<IDriveFolder, Error, CreateFolderInput>({
    mutationFn: (input) => createFolder(input),
    onError: () =>
      notifications.show({ message: t("Failed to create folder"), color: "red" }),
  });
}

export function useUpdateFolderMutation() {
  const { t } = useTranslation();
  return useMutation<void, Error, { folderId: string; input: UpdateFolderInput }>({
    mutationFn: ({ folderId, input }) => updateFolder(folderId, input),
    onError: () =>
      notifications.show({ message: t("Failed to rename folder"), color: "red" }),
  });
}

export function useDeleteFolderMutation() {
  const { t } = useTranslation();
  return useMutation<void, Error, { folderId: string; spaceId: string }>({
    mutationFn: ({ folderId, spaceId }) => deleteFolder(folderId, spaceId),
    onError: () =>
      notifications.show({ message: t("Failed to delete folder"), color: "red" }),
  });
}

export function useUpdateFileMutation() {
  const { t } = useTranslation();
  return useMutation<void, Error, { fileId: string; input: UpdateFileInput }>({
    mutationFn: ({ fileId, input }) => updateFile(fileId, input),
    onError: () =>
      notifications.show({ message: t("Failed to rename file"), color: "red" }),
  });
}

export function useDeleteFileMutation() {
  const { t } = useTranslation();
  return useMutation<void, Error, { fileId: string; spaceId: string }>({
    mutationFn: ({ fileId, spaceId }) => deleteFile(fileId, spaceId),
    onError: () =>
      notifications.show({ message: t("Failed to delete file"), color: "red" }),
  });
}

export function useUploadFileMutation() {
  const { t } = useTranslation();
  return useMutation<
    IDriveFile,
    Error,
    {
      file: File;
      spaceId: string;
      folderId?: string | null;
      onUploadProgress?: (event: AxiosProgressEvent) => void;
    }
  >({
    mutationFn: ({ file, spaceId, folderId, onUploadProgress }) =>
      uploadFile(file, spaceId, folderId, onUploadProgress),
    onError: () =>
      notifications.show({ message: t("Failed to upload file"), color: "red" }),
  });
}

export function useDriveQuotaQuery(
  spaceId: string,
): UseQueryResult<IDriveQuota, Error> {
  return useQuery({
    queryKey: ["drive-quota", spaceId],
    queryFn: () => getQuota(spaceId),
    enabled: !!spaceId,
  });
}

export function useCreateShareMutation() {
  const { t } = useTranslation();
  return useMutation<
    IDriveShare,
    Error,
    { fileId: string; spaceId: string; input: CreateShareLinkInput }
  >({
    mutationFn: ({ fileId, spaceId, input }) => createShare(spaceId, fileId, input),
    onError: () =>
      notifications.show({ message: t("Failed to create share"), color: "red" }),
  });
}
