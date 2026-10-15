import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import AiSettings from '@/ee/ai/pages/ai-settings';
import { Feature, COMMUNITY_FEATURES } from '@/ee/features';

const { adminState } = vi.hoisted(() => ({ adminState: { isAdmin: true } }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('jotai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jotai')>();
  return {
    ...actual,
    useAtomValue: () => ({ id: 'w1', settings: { ai: {} } }),
  };
});

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('@/ee/hooks/use-feature', () => ({
  useHasFeature: () => true,
}));

vi.mock('@/features/user/atoms/current-user-atom.ts', () => ({
  useAtomValue: () => ({ id: 'w1', settings: { ai: {} } }),
  workspaceAtom: {},
}));

vi.mock('@/hooks/use-user-role.tsx', () => ({
  default: () => ({ isAdmin: adminState.isAdmin }),
}));

vi.mock('@/ee/ai-chat/components/enable-ai-chat.tsx', () => ({
  default: () => <div>EnableAiChat</div>,
}));
vi.mock('@/ee/ai/components/enable-generative-ai.tsx', () => ({
  default: () => <div>EnableGenerativeAi</div>,
}));
vi.mock('@/ee/ai/components/enable-ai-search.tsx', () => ({
  default: () => <div>EnableAiSearch</div>,
}));
vi.mock('@/ee/ai-chat/components/ai-chat-read-only.tsx', () => ({
  default: () => <div>AiChatReadOnly</div>,
}));
vi.mock('@/ee/ai-chat/components/ai-chat-workspace-knowledge-only.tsx', () => ({
  default: () => <div>AiChatWorkspaceKnowledgeOnly</div>,
}));
vi.mock('@/ee/ai/components/mcp-settings.tsx', () => ({
  default: () => <div>McpSettings</div>,
}));
vi.mock('@/ee/ai/components/provider-settings.tsx', () => ({
  default: () => <div>ProviderSettings</div>,
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MantineProvider>
        <AiSettings />
      </MantineProvider>
    </MemoryRouter>,
  );

describe('AiSettings providers tab', () => {
  beforeEach(() => {
    adminState.isAdmin = true;
  });

  it('exposes AI_PROVIDERS as a community feature', () => {
    expect(Feature.AI_PROVIDERS).toBe('ai:providers');
    expect(COMMUNITY_FEATURES).toContain(Feature.AI_PROVIDERS);
  });

  it('renders a Providers tab alongside AI and MCP', () => {
    renderPage('/settings/ai/providers');
    expect(screen.getByText('Providers')).toBeTruthy();
    expect(screen.getByText('AI')).toBeTruthy();
    expect(screen.getByText('MCP')).toBeTruthy();
  });

  it('renders the provider settings panel for the providers route', () => {
    renderPage('/settings/ai/providers');
    expect(screen.getByText('ProviderSettings')).toBeTruthy();
  });

  it('does not render the page for non-admins', () => {
    adminState.isAdmin = false;
    renderPage('/settings/ai');
    expect(screen.queryByText('AI')).toBeNull();
  });
});
