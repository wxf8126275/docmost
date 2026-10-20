import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ShareDialog from './share-dialog';
import QuotaIndicator from './quota-indicator';
import { formatBytes } from '@/lib';

const mockCreateShare = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/drive/queries/drive-query', () => ({
  useCreateShareMutation: () => ({
    mutateAsync: mockCreateShare,
    isPending: false,
  }),
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

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// Mantine's SegmentedControl / FloatingIndicator rely on ResizeObserver.
global.ResizeObserver = global.ResizeObserver ?? (ResizeObserverMock as any);

const renderWithProviders = (ui: ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <MantineProvider>{ui}</MantineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('ShareDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows permission and expiry options', () => {
    renderWithProviders(
      <ShareDialog
        fileId="file1"
        spaceId="sp1"
        opened={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('Download')).toBeTruthy();
    expect(screen.getByText('Never')).toBeTruthy();
    expect(screen.getByText('1 day')).toBeTruthy();
  });

  it('generates a share link and displays it', async () => {
    mockCreateShare.mockResolvedValue({
      token: 'tok-123',
      permission: 'read',
      expiresAt: null,
      fileId: 'file1',
      createdAt: '',
    });

    renderWithProviders(
      <ShareDialog
        fileId="file1"
        spaceId="sp1"
        opened={true}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('generate-link'));

    const linkInput = (await screen.findByLabelText(
      'share-link',
    )) as HTMLInputElement;
    // Public share URLs keep the token-gated /api/drive/shares/:token contract.
    expect(linkInput.value).toContain('/api/drive/shares/tok-123');
    expect(mockCreateShare).toHaveBeenCalledWith({
      fileId: 'file1',
      spaceId: 'sp1',
      input: expect.objectContaining({ permission: 'read' }),
    });
  });
});

describe('QuotaIndicator', () => {
  it('shows used and total when a quota is configured', () => {
    renderWithProviders(<QuotaIndicator usedBytes={1024} quota={2048} />);
    expect(
      screen.getByText(`${formatBytes(1024)} / ${formatBytes(2048)}`),
    ).toBeTruthy();
  });

  it('shows unlimited when no quota is configured', () => {
    renderWithProviders(<QuotaIndicator usedBytes={0} quota={null} />);
    expect(screen.getByText('Unlimited')).toBeTruthy();
  });
});
