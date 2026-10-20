import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import SpaceHome from "@/pages/space/space-home";
import GlobalSidebar from "@/components/layouts/global/global-sidebar";
import AllSpacesList from "@/features/space/components/spaces-page/all-spaces-list";

// The space currently resolved by the slug query (mutated per test).
const spaceState = vi.hoisted(() => ({
  space: {
    id: "sp1",
    name: "Team Files",
    slug: "files",
    type: "drive",
  } as any,
}));

const driveFolders = [
  {
    id: "f1",
    workspaceId: "w1",
    spaceId: "sp1",
    parentId: null,
    name: "Project Docs",
    creatorId: "u1",
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
  },
];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("@/features/space/queries/space-query", () => ({
  useGetSpaceBySlugQuery: () => ({ data: spaceState.space }),
  prefetchSpace: vi.fn(),
}));

vi.mock("@/features/space/components/space-home-tabs.tsx", () => ({
  default: () => <div>space-home-tabs</div>,
}));

vi.mock("@/features/public-space/components/space-public-notice.tsx", () => ({
  default: () => null,
}));

vi.mock("@/features/drive/queries/drive-query", () => ({
  useDriveFoldersQuery: () => ({ data: driveFolders, isLoading: false }),
  useDriveFilesQuery: () => ({ data: [], isLoading: false }),
  useDriveQuotaQuery: () => ({ data: { usedBytes: 0, quota: null } }),
  useCreateFolderMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadFileMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteFolderMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteFileMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateFolderMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateFileMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateShareMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// --- GlobalSidebar deps ---
vi.mock("@/features/favorite/queries/favorite-query", () => ({
  useFavoritesQuery: () => ({ data: undefined, isPending: false }),
}));
vi.mock("@/ee/hooks/use-feature", () => ({
  useHasFeature: () => false,
}));
vi.mock("@/ee/hooks/use-upgrade-label", () => ({
  useUpgradeLabel: () => "Upgrade",
}));
vi.mock(
  "@/features/workspace/components/members/components/workspace-invite-form",
  () => ({ WorkspaceInviteForm: () => null }),
);
vi.mock("@/components/layouts/global/hooks/hooks/use-toggle-sidebar", () => ({
  useToggleSidebar: () => vi.fn(),
}));

// --- AllSpacesList deps ---
vi.mock("@/features/space/queries/space-watcher-query", () => ({
  useWatchedSpaceIds: () => new Set<string>(),
  useWatchSpaceMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUnwatchSpaceMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/features/favorite/components/star-button", () => ({
  default: () => null,
}));
vi.mock("@/features/space/components/settings-modal", () => ({
  default: () => null,
}));

Object.defineProperty(window, "matchMedia", {
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
      <MemoryRouter initialEntries={["/s/files"]}>
        <MantineProvider>{ui}</MantineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("drive space entry (Task 7: client-drive-nav)", () => {
  beforeEach(() => {
    spaceState.space = {
      id: "sp1",
      name: "Team Files",
      slug: "files",
      type: "drive",
    };
  });

  it("renders the drive browser as the content of a drive space", () => {
    renderWithProviders(<SpaceHome />);
    expect(screen.getByText("Project Docs")).toBeTruthy();
    // The category nav itself moved to the space sidebar (drive-category-sidebar
    // Tasks 2/3); here we assert the browser body rendered.
    expect(screen.getByLabelText("upload-dropzone")).toBeTruthy();
  });

  it("renders the classic overview (not the browser) for a page space", () => {
    spaceState.space = {
      id: "sp2",
      name: "Docs",
      slug: "docs",
      type: "page",
    };
    renderWithProviders(<SpaceHome />);
    expect(screen.getByText("space-home-tabs")).toBeTruthy();
    expect(screen.queryByText("Project Docs")).toBeNull();
  });

  it("sidebar no longer has a standalone Drive entry", () => {
    renderWithProviders(<GlobalSidebar />);
    expect(document.querySelector('a[href="/drive"]')).toBeNull();
    expect(document.querySelector('a[href="/spaces"]')).toBeTruthy();
  });
});

describe("AllSpacesList drive type", () => {
  const spaces = [
    {
      id: "sp1",
      name: "Docs Space",
      slug: "docs-space",
      description: "",
      type: "page",
      memberCount: 2,
      logo: null,
    },
    {
      id: "sp2",
      name: "Files Space",
      slug: "files-space",
      description: "",
      type: "drive",
      memberCount: 1,
      logo: null,
    },
  ];

  it("marks drive spaces with a type badge", () => {
    renderWithProviders(
      <AllSpacesList
        spaces={spaces}
        onSearch={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("space-type-drive")).toBeTruthy();
  });

  it("filters the list by page/drive type", () => {
    renderWithProviders(
      <AllSpacesList
        spaces={spaces}
        onSearch={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />,
    );

    // default: both visible
    expect(screen.getByText("Docs Space")).toBeTruthy();
    expect(screen.getByText("Files Space")).toBeTruthy();

    fireEvent.click(screen.getByText("Drive"));

    expect(screen.queryByText("Docs Space")).toBeNull();
    expect(screen.getByText("Files Space")).toBeTruthy();
  });
});
