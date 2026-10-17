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
  DriveType,
  IDriveFile,
  IDriveFolder,
  IDriveQuota,
  IDriveShare,
  UpdateFileInput,
  UpdateFolderInput,
} from "@/features/drive/types/drive.types";
import type { AxiosProgressEvent } from "axios";

export function useDriveFoldersQuery(
  driveType: DriveType,
  parentId?: string | null,
): UseQueryResult<IDriveFolder[], Error> {
  return useQuery({
    queryKey: ["drive-folders", driveType, parentId ?? "root"],
    queryFn: () => listFolders(driveType, parentId),
  });
}

export function useDriveFilesQuery(
  driveType: DriveType,
  folderId?: string | null,
): UseQueryResult<IDriveFile[], Error> {
  return useQuery({
    queryKey: ["drive-files", driveType, folderId ?? "root"],
    queryFn: () => listFiles(driveType, folderId),
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
  return useMutation<void, Error, { folderId: string; driveType: DriveType }>({
    mutationFn: ({ folderId, driveType }) => deleteFolder(folderId, driveType),
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
  return useMutation<void, Error, { fileId: string; driveType: DriveType }>({
    mutationFn: ({ fileId, driveType }) => deleteFile(fileId, driveType),
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
      driveType: DriveType;
      folderId?: string | null;
      onUploadProgress?: (event: AxiosProgressEvent) => void;
    }
  >({
    mutationFn: ({ file, driveType, folderId, onUploadProgress }) =>
      uploadFile(file, driveType, folderId, onUploadProgress),
    onError: () =>
      notifications.show({ message: t("Failed to upload file"), color: "red" }),
  });
}

export function useDriveQuotaQuery(
  driveType: DriveType,
): UseQueryResult<IDriveQuota, Error> {
  return useQuery({
    queryKey: ["drive-quota", driveType],
    queryFn: () => getQuota(driveType),
  });
}

export function useCreateShareMutation() {
  const { t } = useTranslation();
  return useMutation<
    IDriveShare,
    Error,
    { fileId: string; driveType: DriveType; input: CreateShareLinkInput }
  >({
    mutationFn: ({ fileId, input }) => createShare(fileId, input),
    onError: () =>
      notifications.show({ message: t("Failed to create share"), color: "red" }),
  });
}
