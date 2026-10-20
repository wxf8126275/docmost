import api from "@/lib/api-client";
import type { AxiosProgressEvent } from "axios";
import {
  CreateFolderInput,
  CreateShareLinkInput,
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
// raw body / stream directly. All endpoints are scoped to a drive space:
// `/spaces/:spaceId/drive/...`.

export async function listFolders(
  spaceId: string,
  parentId?: string | null,
): Promise<IDriveFolder[]> {
  const res = await api.get<{ folders: IDriveFolder[] }>(
    `/spaces/${spaceId}/drive/folders`,
    { params: { parentId: parentId ?? null } },
  );
  return res.data.folders;
}

export async function listFiles(
  spaceId: string,
  folderId?: string | null,
): Promise<IDriveFile[]> {
  const res = await api.get<{ files: IDriveFile[] }>(
    `/spaces/${spaceId}/drive/files`,
    { params: { folderId: folderId ?? null } },
  );
  return res.data.files;
}

export async function createFolder(
  input: CreateFolderInput,
): Promise<IDriveFolder> {
  const res = await api.post<{ folder: IDriveFolder }>(
    `/spaces/${input.spaceId}/drive/folders`,
    input,
  );
  return res.data.folder;
}

export async function updateFolder(
  folderId: string,
  input: UpdateFolderInput,
): Promise<void> {
  await api.patch(`/spaces/${input.spaceId}/drive/folders/${folderId}`, input);
}

export async function deleteFolder(
  folderId: string,
  spaceId: string,
): Promise<void> {
  await api.delete(`/spaces/${spaceId}/drive/folders/${folderId}`);
}

export async function updateFile(
  fileId: string,
  input: UpdateFileInput,
): Promise<void> {
  await api.patch(`/spaces/${input.spaceId}/drive/files/${fileId}`, input);
}

export async function deleteFile(
  fileId: string,
  spaceId: string,
): Promise<void> {
  await api.delete(`/spaces/${spaceId}/drive/files/${fileId}`);
}

export async function uploadFile(
  file: File,
  spaceId: string,
  folderId?: string | null,
  onUploadProgress?: (event: AxiosProgressEvent) => void,
): Promise<IDriveFile> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("spaceId", spaceId);
  if (folderId) {
    formData.append("folderId", folderId);
  }

  // `@Res()` passthrough on the server → raw created file, no `{ data }` wrapper.
  return (await api.post<IDriveFile>(
    `/spaces/${spaceId}/drive/files`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    },
  )) as unknown as IDriveFile;
}

export function downloadFileUrl(spaceId: string, fileId: string): string {
  return `/api/spaces/${spaceId}/drive/files/${fileId}/download`;
}

export async function createShare(
  spaceId: string,
  fileId: string,
  input: CreateShareLinkInput,
): Promise<IDriveShare> {
  const res = await api.post<{ share: IDriveShare }>(
    `/spaces/${spaceId}/drive/files/${fileId}/share`,
    input,
  );
  return res.data.share;
}

export async function getQuota(spaceId: string): Promise<IDriveQuota> {
  const res = await api.get<IDriveQuota>(`/spaces/${spaceId}/drive/quota`);
  return res.data;
}
