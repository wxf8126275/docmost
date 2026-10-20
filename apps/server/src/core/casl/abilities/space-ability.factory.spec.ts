import SpaceAbilityFactory from './space-ability.factory';
import { SpaceRole } from '../../../common/helpers/types/permission';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../interfaces/space-ability.type';

function makeFactory(role: SpaceRole) {
  const spaceMemberRepo = {
    getUserSpaceRoles: jest.fn().mockResolvedValue([{ role }]),
  } as any;
  return new SpaceAbilityFactory(spaceMemberRepo);
}

describe('SpaceAbilityFactory — Drive subject', () => {
  it('READER can Read Drive but cannot Manage Drive', async () => {
    const ability = await makeFactory(SpaceRole.READER).createForUser(
      { id: 'u1' } as any,
      's1',
    );
    expect(ability.can(SpaceCaslAction.Read, SpaceCaslSubject.Drive)).toBe(true);
    expect(ability.can(SpaceCaslAction.Manage, SpaceCaslSubject.Drive)).toBe(
      false,
    );
  });

  it('WRITER can Manage Drive (and Read)', async () => {
    const ability = await makeFactory(SpaceRole.WRITER).createForUser(
      { id: 'u1' } as any,
      's1',
    );
    expect(ability.can(SpaceCaslAction.Manage, SpaceCaslSubject.Drive)).toBe(
      true,
    );
    expect(ability.can(SpaceCaslAction.Read, SpaceCaslSubject.Drive)).toBe(true);
  });

  it('ADMIN can Manage Drive', async () => {
    const ability = await makeFactory(SpaceRole.ADMIN).createForUser(
      { id: 'u1' } as any,
      's1',
    );
    expect(ability.can(SpaceCaslAction.Manage, SpaceCaslSubject.Drive)).toBe(
      true,
    );
  });
});
