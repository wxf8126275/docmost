import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { useHasFeature } from '@/ee/hooks/use-feature';
import EnableAiChat from '@/ee/ai-chat/components/enable-ai-chat';
import EnableGenerativeAi from '@/ee/ai/components/enable-generative-ai';
import EnableAiSearch from '@/ee/ai/components/enable-ai-search';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('@/features/workspace/services/workspace-service', () => ({
  updateWorkspace: vi.fn(),
}));

vi.mock('@/ee/hooks/use-upgrade-label', () => ({
  useUpgradeLabel: () => ({ upgradeLabel: '' }),
}));

// Mantine's color-scheme detection calls window.matchMedia, which jsdom lacks.
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

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

/**
 * After Feature.AI / Feature.AI_CONTROLS were added to COMMUNITY_FEATURES,
 * `useHasFeature` must return true even with an empty entitlement (self-hosted
 * community, no license). That makes the AI settings toggles interactive.
 */
describe('AI settings toggles are usable in community self-host (no license)', () => {
  it('useHasFeature(Feature.AI) returns true with an empty entitlement', () => {
    const { result } = renderHook(() => useHasFeature('ai'));
    expect(result.current).toBe(true);
  });

  it('useHasFeature(Feature.AI_CONTROLS) returns true with an empty entitlement', () => {
    const { result } = renderHook(() => useHasFeature('ai:controls'));
    expect(result.current).toBe(true);
  });

  it('EnableAiChat renders an enabled (non-disabled) switch', () => {
    const { container } = renderWithMantine(<EnableAiChat />);
    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).disabled).toBe(false);
  });

  it('EnableGenerativeAi renders an enabled (non-disabled) switch', () => {
    const { container } = renderWithMantine(<EnableGenerativeAi />);
    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).disabled).toBe(false);
  });

  it('EnableAiSearch renders an enabled (non-disabled) switch', () => {
    const { container } = renderWithMantine(<EnableAiSearch />);
    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).disabled).toBe(false);
  });
});
