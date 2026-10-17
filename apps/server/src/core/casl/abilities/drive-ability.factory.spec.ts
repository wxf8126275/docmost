import DriveAbilityFactory from './drive-ability.factory';
import {
  DriveCaslAction,
  DriveCaslSubject,
} from '../interfaces/drive-ability.type';
import { UserRole } from '../../../common/helpers/types/permission';
import { User } from '@docmost/db/types/entity.types';

function makeUser(role: UserRole, id = 'u1'): User {
  return { id, role } as unknown as User;
}

describe('DriveAbilityFactory', () => {
  let factory: DriveAbilityFactory;

  beforeEach(() => {
    factory = new DriveAbilityFactory();
  });

  it('grants the personal owner full manage over their own drive', () => {
    const ability = factory.createForUser(makeUser(UserRole.MEMBER, 'u1'), {
      driveType: 'personal',
      ownerId: 'u1',
    });

    expect(ability.can(DriveCaslAction.Manage, DriveCaslSubject.Folder)).toBe(
      true,
    );
    expect(ability.can(DriveCaslAction.Manage, DriveCaslSubject.File)).toBe(
      true,
    );
  });

  it('denies access to another user’s personal drive', () => {
    const ability = factory.createForUser(makeUser(UserRole.MEMBER, 'u2'), {
      driveType: 'personal',
      ownerId: 'u1',
    });

    expect(ability.can(DriveCaslAction.Manage, DriveCaslSubject.File)).toBe(
      false,
    );
    expect(ability.can(DriveCaslAction.Read, DriveCaslSubject.File)).toBe(false);
  });

  it('grants shared-drive manage to any workspace member', () => {
    for (const role of [UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER]) {
      const ability = factory.createForUser(makeUser(role, 'u1'), {
        driveType: 'shared',
      });
      expect(ability.can(DriveCaslAction.Manage, DriveCaslSubject.File)).toBe(
        true,
      );
    }
  });

  it('denies shared-drive access to unknown roles', () => {
    const ability = factory.createForUser(
      makeUser('unknown' as UserRole, 'u1'),
      { driveType: 'shared' },
    );

    expect(ability.can(DriveCaslAction.Manage, DriveCaslSubject.File)).toBe(
      false,
    );
  });
});
