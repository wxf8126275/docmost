import { WorkspaceService } from './workspace.service';
import { Feature } from '../../../common/features';

/**
 * `executeTx` is a module-level helper used to wrap the settings-persistence
 * block. We mock it so the real Kysely transaction machinery is never touched.
 */
jest.mock('@docmost/db/utils', () => ({
  executeTx: jest.fn(async (_db: unknown, fn: (trx: unknown) => Promise<unknown>) =>
    fn({}),
  ),
}));

const WS_ID = 'ws-1';

const makeDbMock = () => ({
  selectFrom: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        executeTakeFirst: jest.fn().mockResolvedValue({
          id: WS_ID,
          licenseKey: null,
          plan: null,
          trashRetentionDays: null,
        }),
      }),
    }),
  }),
});

describe('WorkspaceService — AI settings persistence', () => {
  let service: WorkspaceService;
  let workspaceRepo: any;
  let licenseCheckService: any;
  let environmentService: any;
  let auditService: any;
  let db: any;

  beforeEach(() => {
    workspaceRepo = {
      findById: jest.fn().mockResolvedValue({ id: WS_ID, settings: {} }),
      updateAiSettings: jest.fn().mockResolvedValue(undefined),
      updateWorkspace: jest.fn().mockResolvedValue(undefined),
    };
    licenseCheckService = { hasFeature: jest.fn().mockReturnValue(true) };
    environmentService = {
      isCloud: jest.fn().mockReturnValue(false),
      getAiVectorDriver: jest.fn().mockReturnValue('turbopuffer'),
      isBetaPublicSpaces: jest.fn().mockReturnValue(false),
    };
    auditService = { log: jest.fn() };
    db = makeDbMock();

    service = new WorkspaceService(
      workspaceRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      environmentService,
      {} as any,
      licenseCheckService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      db,
      {} as any,
      {} as any,
      {} as any,
      auditService,
      {} as any,
    );
  });

  it('persists the AI Chat toggle via updateAiSettings("chat")', async () => {
    await service.update(WS_ID, { aiChat: true } as any);

    expect(workspaceRepo.updateAiSettings).toHaveBeenCalledWith(
      WS_ID,
      'chat',
      true,
      expect.anything(),
    );
  });

  it('persists the AI Chat read-only toggle via updateAiSettings("chatReadOnly")', async () => {
    await service.update(WS_ID, { aiChatReadOnly: true } as any);

    expect(licenseCheckService.hasFeature).toHaveBeenCalledWith(
      null,
      Feature.AI_CONTROLS,
      null,
    );
    expect(workspaceRepo.updateAiSettings).toHaveBeenCalledWith(
      WS_ID,
      'chatReadOnly',
      true,
      expect.anything(),
    );
  });

  it('persists the workspace-knowledge-only toggle via updateAiSettings("chatWorkspaceKnowledgeOnly")', async () => {
    await service.update(WS_ID, { aiChatWorkspaceKnowledgeOnly: true } as any);

    expect(workspaceRepo.updateAiSettings).toHaveBeenCalledWith(
      WS_ID,
      'chatWorkspaceKnowledgeOnly',
      true,
      expect.anything(),
    );
  });

  it('does not call updateAiSettings when the AI Chat toggle is absent', async () => {
    await service.update(WS_ID, { name: 'Renamed' } as any);

    expect(workspaceRepo.updateAiSettings).not.toHaveBeenCalled();
  });
});
