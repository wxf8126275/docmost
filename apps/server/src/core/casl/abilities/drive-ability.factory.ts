import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { User } from '@docmost/db/types/entity.types';
import { UserRole } from '../../../common/helpers/types/permission';
import {
  DriveCaslAction,
  DriveCaslSubject,
  DriveContext,
  IDriveAbility,
} from '../interfaces/drive-ability.type';

/**
 * Resolves CASL abilities for the Cloud Drive feature. Personal drives are owned
 * by a single user; shared drives are workspace-scoped and granted to any
 * workspace member. `manage` is used so it covers create/read/update/delete.
 */
@Injectable()
export default class DriveAbilityFactory {
  createForUser(
    user: User,
    ctx: DriveContext,
  ): MongoAbility<IDriveAbility> {
    if (ctx.driveType === 'personal') {
      if (!ctx.ownerId || ctx.ownerId !== user.id) {
        return buildNoDriveAbility();
      }
      return buildPersonalOwnerAbility();
    }

    switch (user.role) {
      case UserRole.OWNER:
      case UserRole.ADMIN:
      case UserRole.MEMBER:
        return buildSharedManageAbility();
      default:
        return buildNoDriveAbility();
    }
  }
}

function buildPersonalOwnerAbility() {
  const { can, build } = new AbilityBuilder<MongoAbility<IDriveAbility>>(
    createMongoAbility,
  );
  can(DriveCaslAction.Manage, DriveCaslSubject.Folder);
  can(DriveCaslAction.Manage, DriveCaslSubject.File);
  return build();
}

function buildSharedManageAbility() {
  const { can, build } = new AbilityBuilder<MongoAbility<IDriveAbility>>(
    createMongoAbility,
  );
  can(DriveCaslAction.Manage, DriveCaslSubject.Folder);
  can(DriveCaslAction.Manage, DriveCaslSubject.File);
  return build();
}

function buildNoDriveAbility() {
  const { build } = new AbilityBuilder<MongoAbility<IDriveAbility>>(
    createMongoAbility,
  );
  return build();
}
