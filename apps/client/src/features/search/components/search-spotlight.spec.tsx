import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { workspaceAtom } from '@/features/user/atoms/current-user-atom.ts';
import { searchSpotlight } from '../constants.ts';
import { SearchSpotlight } from './search-spotlight.tsx';

// Control the workspace returned by useAtomValue(workspaceAtom) without relying
// on jotai Provider initialValues (which is brittle across jotai versions).
let currentWorkspace: any = null;
vi.mock('jotai', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useAtomValue: (ref: any) =>
      ref === workspaceAtom ? currentWorkspace : actual.useAtomValue(ref),
  };
});

const hoisted = vi.hoisted(() => ({
  unifiedSearch: vi.fn(),
  aiMutate: vi.fn(),
  aiReset: vi.fn(),
  aiClearStreaming: vi.fn(),
  hintVectorCache: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('@/ee/hooks/use-feature', () => ({
  useHasFeature: () => true,
}));

vi.mock('@/lib/config.ts', () => ({
  getAiVectorDriver: () => 'pgvector',
}));

vi.mock('../hooks/use-unified-search.ts', () => ({
  useUnifiedSearch: (...args: any[]) => hoisted.unifiedSearch(...args),
}));

vi.mock('../../../ee/ai/hooks/use-ai-search.ts', () => ({
  useAiSearch: () => ({
    data: undefined,
    isPending: false,
    mutate: hoisted.aiMutate,
    reset: hoisted.aiReset,
    error: null,
    streamingAnswer: '',
    streamingSources: [],
    clearStreaming: hoisted.aiClearStreaming,
  }),
}));

vi.mock('../../../ee/ai/components/ai-search-result.tsx', () => ({
  AiSearchResult: () => null,
}));

vi.mock('../../../ee/ai/services/ai-search-service.ts', () => ({
  hintVectorCache: () => hoisted.hintVectorCache(),
}));

vi.mock('./search-spotlight-filters.tsx', () => ({
  SearchSpotlightFilters: ({ onAskClick }: any) => (
    <button data-testid="ai-toggle" onClick={onAskClick}>
      AI
    </button>
  ),
}));

vi.mock('./search-result-item.tsx', () => ({
  SearchResultItem: ({ result }: any) => (
    <div data-testid="result">{result.id}</div>
  ),
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

// jsdom lacks ResizeObserver, which Mantine's ScrollArea (used by the
// scrollable Spotlight) requires.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub;
window.ResizeObserver = ResizeObserverStub;

const renderWithProviders = (workspace: any) => {
  currentWorkspace = workspace;
  return render(
    <MantineProvider>
      <SearchSpotlight />
    </MantineProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.unifiedSearch.mockReturnValue({ data: [], isFetching: false });
});

describe('SearchSpotlight AI mode (pgvector)', () => {
  it('uses full-text search (aiSearch:false) by default', () => {
    renderWithProviders({ settings: { ai: { search: true } } });

    expect(hoisted.unifiedSearch).toHaveBeenCalled();
    const call = hoisted.unifiedSearch.mock.calls[0];
    expect(call[0].aiSearch).toBe(false);
    expect(call[1]).toBe(true); // enabled
  });

  it('switches to semantic search when AI mode is toggled with pgvector + ai.search', async () => {
    hoisted.unifiedSearch.mockReturnValue({
      data: [{ id: 'p1', title: 'Page One' }],
      isFetching: false,
    });
    renderWithProviders({ settings: { ai: { search: true } } });

    act(() => {
      searchSpotlight.open();
    });
    const toggle = await screen.findByTestId('ai-toggle');
    fireEvent.click(toggle);

    await waitFor(() => {
      const semanticCall = hoisted.unifiedSearch.mock.calls.find(
        (c) => c[0].aiSearch === true,
      );
      expect(semanticCall).toBeTruthy();
      expect(semanticCall?.[1]).toBe(true);
    });

    // turbopuffer AI mutation must NOT be triggered in pgvector mode
    expect(hoisted.aiMutate).not.toHaveBeenCalled();

    // semantic results are rendered via SearchResultItem
    expect((await screen.findByTestId('result')).textContent).toBe('p1');
  });

  it('does not enable semantic search when workspace ai.search is disabled', async () => {
    renderWithProviders({ settings: { ai: { search: false } } });

    act(() => {
      searchSpotlight.open();
    });
    const toggle = await screen.findByTestId('ai-toggle');
    fireEvent.click(toggle);

    await waitFor(() => {
      const semanticCall = hoisted.unifiedSearch.mock.calls.find(
        (c) => c[0].aiSearch === true,
      );
      expect(semanticCall).toBeUndefined();
    });
  });
});
