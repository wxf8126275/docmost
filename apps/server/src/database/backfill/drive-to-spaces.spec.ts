import {
  deterministicUuid,
  groupDriveUnits,
  buildSpaceRow,
  buildOperations,
} from './drive-to-spaces';

function row(over: Partial<any> = {}): any {
  return {
    workspaceId: 'ws1',
    driveType: 'personal',
    ownerId: 'A',
    id: 'x',
    kind: 'folder',
    ...over,
  };
}

describe('backfill drive -> spaces (planning logic)', () => {
  it('deterministicUuid is stable, distinct per key, and a valid uuid', () => {
    const a = deterministicUuid('k1');
    const b = deterministicUuid('k1');
    const c = deterministicUuid('k2');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('groups personal and shared rows into units', () => {
    const rows = [
      row({ id: 'f1' }),
      row({ id: 'f2', kind: 'file' }),
      row({ id: 'fi', kind: 'file' }),
      row({ id: 's1', driveType: 'shared', ownerId: null }),
    ];
    const units = groupDriveUnits(rows);
    expect(units).toHaveLength(2);
    const personal = units.find((u) => u.driveType === 'personal')!;
    const shared = units.find((u) => u.driveType === 'shared')!;
    expect(personal.folderIds).toEqual(['f1']);
    expect(personal.fileIds).toEqual(['f2', 'fi']);
    expect(personal.ownerId).toBe('A');
    expect(shared.folderIds).toEqual(['s1']);
    expect(shared.ownerId).toBeNull();
  });

  it('personal unit -> private drive space owned by user with admin member', () => {
    const units = groupDriveUnits([row({ id: 'f1' })]);
    const ops = buildOperations(units);
    const plan = ops[0];
    expect(plan.space.type).toBe('drive');
    expect(plan.space.visibility).toBe('private');
    expect(plan.space.creatorId).toBe('A');
    expect(plan.space.isPersonal).toBe(false);
    const member = plan.members.find((m) => m.userId === 'A');
    expect(member?.role).toBe('admin');
  });

  it('shared unit -> workspace-visible drive space with reader members', () => {
    const units = groupDriveUnits([
      row({ id: 's1', driveType: 'shared', ownerId: null }),
    ]);
    units[0].memberUserIds = ['U1', 'U2'];
    const ops = buildOperations(units);
    const plan = ops[0];
    expect(plan.space.visibility).toBe('workspace');
    expect(plan.space.creatorId).toBeNull();
    expect(plan.members).toHaveLength(2);
    expect(plan.members.every((m) => m.role === 'reader')).toBe(true);
  });

  it('idempotent: same unit key yields the same space id', () => {
    const id1 = deterministicUuid('drive-space:personal:ws1:A');
    const id2 = deterministicUuid('drive-space:personal:ws1:A');
    expect(id1).toBe(id2);
  });
});
