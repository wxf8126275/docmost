import api from "@/lib/api-client";
import type { AxiosProgressEvent } from "axios";
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
} from "../types/drive.types";

// JSON endpoints are wrapped by the server's TransformHttpResponseInterceptor
// into `{ data: <payload> }`, so we read `.data.*`. The multipart upload and the
// download stream bypass the interceptor (`@Res()` passthrough) and return the
// raw body / stream directly.

export async function listFolders(
  driveType: DriveType,
  parentId?: string | null,
): Promise<IDriveFolder[]> {
  const res = await api.get<{ folders: IDriveFolder[] }>("/drive/folders", {
    params: { driveType, parentId: parentId ?? null },
  });
  return res.data.folders;
}

export async function listFiles(
  driveType: DriveType,
  folderId?: string | null,
): Promise<IDriveFile[]> {
  const res = await api.get<{ files: IDriveFile[] }>("/drive/files", {
    params: { driveType, folderId: folderId ?? null },
  });
  return res.data.files;
}

export async function createFolder(
  input: CreateFolderInput,
): Promise<IDriveFolder> {
  const res = await api.post<{ folder: IDriveFolder }>("/drive/folders", input);
  return res.data.folder;
}

export async function updateFolder(
  folderId: string,
  input: UpdateFolderInput,
): Promise<void> {
  await api.patch(`/drive/folders/${folderId}`, input);
}

export async function deleteFolder(
  folderId: string,
  driveType: DriveType,
): Promise<void> {
  await api.delete(`/drive/folders/${folderId}`, { params: { driveType } });
}

export async function updateFile(
  fileId: string,
  input: UpdateFileInput,
): Promise<void> {
  await api.patch(`/drive/files/${fileId}`, input);
}

export async function deleteFile(
  fileId: string,
  driveType: DriveType,
): Promise<void> {
  await api.delete(`/drive/files/${fileId}`, { params: { driveType } });
}

export async function uploadFile(
  file: File,
  driveType: DriveType,
  folderId?: string | null,
  onUploadProgress?: (event: AxiosProgressEvent) => void,
): Promise<IDriveFile> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("driveType", driveType);
  if (folderId) {
    formData.append("folderId", folderId);
  }

  // `@Res()` passthrough on the server → raw created file, no `{ data }` wrapper.
  return (await api.post<IDriveFile>("/drive/files", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  })) as unknown as IDriveFile;
}

export function downloadFileUrl(fileId: string): string {
  return `/api/drive/files/${fileId}/download`;
}

export async function createShare(
  fileId: string,
  input: CreateShareLinkInput,
): Promise<IDriveShare> {
  const res = await api.post<{ share: IDriveShare }>(
    `/drive/files/${fileId}/share`,
    input,
  );
  return res.data.share;
}

export async function getQuota(driveType: DriveType): Promise<IDriveQuota> {
  const res = await api.get<IDriveQuota>("/drive/quota", {
    params: { driveType },
  });
  return res.data;
}
