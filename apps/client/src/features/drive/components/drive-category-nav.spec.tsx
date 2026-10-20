import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { MantineProvider } from '@mantine/core';
import DriveCategoryNav from './drive-category-nav';
import { DriveCategory } from '../types/drive.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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
global.ResizeObserver = global.ResizeObserver ?? (ResizeObserverMock as any);

const renderWithProviders = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const ALL_CATEGORIES: DriveCategory[] = [
  'recent',
  'all',
  'images',
  'documents',
  'videos',
  'music',
];

describe('DriveCategoryNav', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders all six categories', () => {
    renderWithProviders(<DriveCategoryNav value="all" onChange={vi.fn()} />);
    for (const category of ALL_CATEGORIES) {
      expect(screen.getByLabelText(`category-${category}`)).toBeTruthy();
    }
  });

  it('marks only the active category', () => {
    renderWithProviders(<DriveCategoryNav value="images" onChange={vi.fn()} />);
    expect(
      screen.getByLabelText('category-images').getAttribute('data-active'),
    ).toBe('true');
    expect(
      screen.getByLabelText('category-all').getAttribute('data-active'),
    ).toBeNull();
  });

  it('calls onChange with the clicked category', () => {
    const onChange = vi.fn();
    renderWithProviders(<DriveCategoryNav value="all" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('category-documents'));
    expect(onChange).toHaveBeenCalledWith('documents');
  });

  it('calls onChange for the recent category', () => {
    const onChange = vi.fn();
    renderWithProviders(<DriveCategoryNav value="all" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('category-recent'));
    expect(onChange).toHaveBeenCalledWith('recent');
  });
});
