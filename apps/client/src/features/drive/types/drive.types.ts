export interface IDriveFolder {
  id: string;
  workspaceId: string;
  spaceId: string;
  parentId: string | null;
  name: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface IDriveFile {
  id: string;
  workspaceId: string;
  spaceId: string;
  folderId: string | null;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  fileExt: string;
  mimeType: string | null;
  type: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface IDriveBreadcrumb {
  id: string;
  name: string;
}

/**
 * Left-nav categories (Tencent Weiyun style). `recent` = everything sorted by
 * last-modified desc; the typed categories filter files by extension/MIME.
 */
export type DriveCategory =
  | "recent"
  | "all"
  | "images"
  | "documents"
  | "videos"
  | "music";

export interface CreateFolderInput {
  spaceId: string;
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderInput {
  spaceId: string;
  name?: string;
  parentId?: string | null;
}

export interface UpdateFileInput {
  spaceId: string;
  fileName?: string;
  folderId?: string | null;
}

export interface CreateShareLinkInput {
  permission?: "read" | "download";
  expiresAt?: string | null;
}

export interface IDriveShare {
  token: string;
  permission: "read" | "download";
  expiresAt: string | null;
  fileId: string;
  createdAt: string;
}

export interface IDriveQuota {
  usedBytes: number;
  quota: number | null;
}
