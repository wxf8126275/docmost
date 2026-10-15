import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import ProviderSettings from '@/ee/ai/components/provider-settings';
import * as providerService from '@/ee/ai/services/ai-provider-service';

vi.mock('@/ee/ai/services/ai-provider-service', () => ({
  listAiProviders: vi.fn(),
  createAiProvider: vi.fn(),
  updateAiProvider: vi.fn(),
  deleteAiProvider: vi.fn(),
  setDefaultAiProvider: vi.fn(),
}));

vi.mock('@/ee/hooks/use-feature', () => ({ useHasFeature: () => true }));
vi.mock('@/ee/hooks/use-upgrade-label', () => ({ useUpgradeLabel: () => ({ upgradeLabel: '' }) }));

// Mantine needs matchMedia and ResizeObserver in jsdom.
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

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverMock;

const renderWithProviders = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <MantineProvider>
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>
      </MantineProvider>
    </MemoryRouter>,
  );
};

const sampleProviders = [
  {
    id: 'p1',
    name: 'OpenAI',
    driver: 'openai',
    baseUrl: null,
    completionModel: 'gpt-4o',
    embeddingModel: null,
    isDefault: true,
    hasApiKey: true,
    createdAt: '',
    updatedAt: '',
  },
];

describe('ProviderSettings', () => {
  beforeEach(() => {
    vi.mocked(providerService.listAiProviders).mockResolvedValue(sampleProviders as any);
    vi.mocked(providerService.createAiProvider).mockResolvedValue({} as any);
  });

  it('lists configured providers', async () => {
    renderWithProviders(<ProviderSettings />);
    expect(await screen.findByText('OpenAI')).toBeTruthy();
    expect(screen.getByText('gpt-4o')).toBeTruthy();
  });

  it('opens the create modal with form fields when Add provider is clicked', async () => {
    renderWithProviders(<ProviderSettings />);
    await screen.findByText('OpenAI');
    fireEvent.click(screen.getByText('Add provider'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Completion model')).toBeTruthy();
    expect(within(dialog).getByText('Driver')).toBeTruthy();
    expect(within(dialog).getByText('API key')).toBeTruthy();
  });

  it('blocks submission (no API call) when required fields are empty', async () => {
    renderWithProviders(<ProviderSettings />);
    await screen.findByText('OpenAI');
    fireEvent.click(screen.getByText('Add provider'));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByText('Save'));

    await waitFor(() => {
      expect(providerService.createAiProvider).not.toHaveBeenCalled();
    });
  });
});
