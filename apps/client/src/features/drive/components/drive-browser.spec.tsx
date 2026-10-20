import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import DriveBrowser from './drive-browser';
import { IDriveFile, IDriveFolder } from '../types/drive.types';

const foldersFixture: IDriveFolder[] = [
  {
    id: 'f1',
    workspaceId: 'w1',
    spaceId: 'sp1',
    parentId: null,
    name: 'Project Docs',
    creatorId: 'u1',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
  },
];

const filesFixture: IDriveFile[] = [
  {
    id: 'file1',
    workspaceId: 'w1',
    spaceId: 'sp1',
    folderId: null,
    fileName: 'report.png',
    filePath: 'p',
    fileSize: 123,
    fileExt: '.png',
    mimeType: 'image/png',
    type: 'image/png',
    creatorId: 'u1',
    createdAt: '',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
  },
  {
    id: 'file2',
    workspaceId: 'w1',
    spaceId: 'sp1',
    folderId: null,
    fileName: 'notes.pdf',
    filePath: 'p',
    fileSize: 456,
    fileExt: '.pdf',
    mimeType: 'application/pdf',
    type: 'application/pdf',
    creatorId: 'u1',
    createdAt: '',
    updatedAt: '2026-02-01T00:00:00Z',
    deletedAt: null,
  },
];

const mockDeleteFolder = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('@/features/drive/queries/drive-query', () => ({
  useDriveFoldersQuery: () => ({
    data: foldersFixture,
    isLoading: false,
    isError: false,
  }),
  useDriveFilesQuery: () => ({
    data: filesFixture,
    isLoading: false,
    isError: false,
  }),
  useDeleteFolderMutation: () => ({ mutate: mockDeleteFolder, isPending: false }),
  useDeleteFileMutation: () => ({ mutate: mockDeleteFile, isPending: false }),
  useUpdateFolderMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateFileMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUploadFileMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateShareMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

// The category is URL-driven (?category=...), so the browser must be rendered
// inside a router positioned at the entry under test.
const renderWithProviders = (ui: ReactElement, initialEntries?: string[]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={initialEntries ?? ['/s/files']}>
        <MantineProvider>{ui}</MantineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const renderBrowser = (initialEntries?: string[]) =>
  renderWithProviders(
    <DriveBrowser
      spaceId="sp1"
      folderId={null}
      onFolderOpen={vi.fn()}
      view="grid"
      search=""
    />,
    initialEntries,
  );

describe('DriveBrowser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders folders and files scoped to the space', () => {
    renderBrowser();
    expect(screen.getByText('Project Docs')).toBeTruthy();
    expect(screen.getByText('report.png')).toBeTruthy();
  });

  it('opens a folder when its card is clicked', () => {
    const onFolderOpen = vi.fn();
    renderWithProviders(
      <DriveBrowser
        spaceId="sp1"
        folderId={null}
        onFolderOpen={onFolderOpen}
        view="grid"
        search=""
      />,
    );
    fireEvent.click(screen.getByText('Project Docs'));
    expect(onFolderOpen).toHaveBeenCalledWith(foldersFixture[0]);
  });

  it('deletes a folder with the space scope', () => {
    renderBrowser();
    fireEvent.click(
      screen.getByLabelText(`delete-folder-${foldersFixture[0].id}`),
    );
    expect(mockDeleteFolder).toHaveBeenCalledWith({
      folderId: foldersFixture[0].id,
      spaceId: 'sp1',
    });
  });

  it('deletes a file with the space scope', () => {
    renderBrowser();
    fireEvent.click(screen.getByLabelText(`delete-file-${filesFixture[0].id}`));
    expect(mockDeleteFile).toHaveBeenCalledWith({
      fileId: filesFixture[0].id,
      spaceId: 'sp1',
    });
  });

  // --- category is URL-driven (moved out of the browser in Task 2) ---

  it('images category shows only image files (folders hidden)', () => {
    renderBrowser(['/s/files?category=images']);
    expect(screen.getByText('report.png')).toBeTruthy();
    expect(screen.queryByText('notes.pdf')).toBeNull();
    expect(screen.queryByText('Project Docs')).toBeNull();
  });

  it('documents category shows only document files', () => {
    renderBrowser(['/s/files?category=documents']);
    expect(screen.getByText('notes.pdf')).toBeTruthy();
    expect(screen.queryByText('report.png')).toBeNull();
  });

  it('recent category sorts files by last-modified desc', () => {
    renderBrowser(['/s/files?category=recent']);
    const names = screen
      .getAllByText(/\.(png|pdf)$/)
      .map((node) => node.textContent);
    expect(names).toEqual(['notes.pdf', 'report.png']);
  });

  it('falls back to all when the category param is invalid', () => {
    renderBrowser(['/s/files?category=bogus']);
    expect(screen.getByText('report.png')).toBeTruthy();
    expect(screen.getByText('notes.pdf')).toBeTruthy();
    expect(screen.getByText('Project Docs')).toBeTruthy();
  });

  it('defaults to all when the category param is missing', () => {
    renderBrowser(['/s/files']);
    expect(screen.getByText('report.png')).toBeTruthy();
    expect(screen.getByText('notes.pdf')).toBeTruthy();
    expect(screen.getByText('Project Docs')).toBeTruthy();
  });

  it('does not render the category nav itself (it lives in the sidebar)', () => {
    renderBrowser();
    expect(screen.queryByLabelText('category-images')).toBeNull();
    expect(screen.queryByLabelText('category-all')).toBeNull();
  });
});
