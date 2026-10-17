export type DriveType = "personal" | "shared";

export interface IDriveFolder {
  id: string;
  workspaceId: string;
  driveType: DriveType;
  ownerId: string | null;
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
  driveType: DriveType;
  ownerId: string | null;
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

export interface CreateFolderInput {
  driveType: DriveType;
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderInput {
  driveType: DriveType;
  name?: string;
  parentId?: string | null;
}

export interface UpdateFileInput {
  driveType: DriveType;
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
