export enum DriveCaslAction {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export enum DriveCaslSubject {
  Folder = 'folder',
  File = 'file',
}

export type IDriveAbility =
  | [DriveCaslAction, DriveCaslSubject.Folder]
  | [DriveCaslAction, DriveCaslSubject.File];

/**
 * Context used to resolve a user's drive ability.
 * - `personal`: owned by a single user (`ownerId`); only that user may manage.
 * - `shared`: workspace-scoped; any workspace member (OWNER/ADMIN/MEMBER) may manage.
 */
export interface DriveContext {
  driveType: 'personal' | 'shared';
  ownerId?: string;
}
