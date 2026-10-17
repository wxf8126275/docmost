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
    driveType: 'personal',
    ownerId: 'u1',
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
    driveType: 'personal',
    ownerId: 'u1',
    folderId: null,
    fileName: 'report.png',
    filePath: 'p',
    fileSize: 123,
    fileExt: '.png',
    mimeType: 'image/png',
    type: 'image/png',
    creatorId: 'u1',
    createdAt: '',
    updatedAt: '',
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

const renderWithProviders = (ui: ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <MantineProvider>{ui}</MantineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('DriveBrowser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders folders and files', () => {
    renderWithProviders(
      <DriveBrowser
        driveType="personal"
        folderId={null}
        onFolderOpen={vi.fn()}
        view="grid"
        search=""
      />,
    );
    expect(screen.getByText('Project Docs')).toBeTruthy();
    expect(screen.getByText('report.png')).toBeTruthy();
  });

  it('opens a folder when its card is clicked', () => {
    const onFolderOpen = vi.fn();
    renderWithProviders(
      <DriveBrowser
        driveType="personal"
        folderId={null}
        onFolderOpen={onFolderOpen}
        view="grid"
        search=""
      />,
    );
    fireEvent.click(screen.getByText('Project Docs'));
    expect(onFolderOpen).toHaveBeenCalledWith(foldersFixture[0]);
  });

  it('deletes a folder via the row action', () => {
    renderWithProviders(
      <DriveBrowser
        driveType="personal"
        folderId={null}
        onFolderOpen={vi.fn()}
        view="grid"
        search=""
      />,
    );
    fireEvent.click(
      screen.getByLabelText(`delete-folder-${foldersFixture[0].id}`),
    );
    expect(mockDeleteFolder).toHaveBeenCalledWith({
      folderId: foldersFixture[0].id,
      driveType: "personal",
    });
  });

  it('deletes a file via the row action', () => {
    renderWithProviders(
      <DriveBrowser
        driveType="personal"
        folderId={null}
        onFolderOpen={vi.fn()}
        view="grid"
        search=""
      />,
    );
    fireEvent.click(screen.getByLabelText(`delete-file-${filesFixture[0].id}`));
    expect(mockDeleteFile).toHaveBeenCalledWith({
      fileId: filesFixture[0].id,
      driveType: "personal",
    });
  });
});
