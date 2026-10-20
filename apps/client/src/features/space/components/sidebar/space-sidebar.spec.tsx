import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import { SpaceSidebar } from "./space-sidebar";

// The space currently resolved by the slug query (mutated per test).
const spaceState = vi.hoisted(() => ({
  space: {
    id: "sp1",
    name: "Team Files",
    slug: "files",
    type: "drive",
  } as any,
}));

// Whether the mocked space ability grants Manage on pages.
const abilityState = vi.hoisted(() => ({ canManagePage: true }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/features/space/queries/space-query.ts", () => ({
  useGetSpaceBySlugQuery: () => ({ data: spaceState.space }),
}));

vi.mock("@/features/space/queries/space-watcher-query.ts", () => ({
  useSpaceWatchStatusQuery: () => ({ data: undefined }),
  useWatchSpaceMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUnwatchSpaceMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/features/page/tree/hooks/use-tree-mutation.ts", () => ({
  useTreeMutation: () => ({ handleCreate: vi.fn() }),
}));

vi.mock("@/features/space/components/settings-modal.tsx", () => ({
  default: () => null,
}));

vi.mock("@/features/page/tree/components/space-tree.tsx", () => ({
  default: () => <div>space-tree</div>,
}));

vi.mock("@/features/space/permissions/use-space-ability.ts", () => ({
  useSpaceAbility: () => ({
    can: (_action: string, subject: string) =>
      abilityState.canManagePage && subject === "page",
    cannot: (_action: string, subject: string) =>
      !(abilityState.canManagePage && subject === "page"),
  }),
}));

vi.mock("@/features/page/components/page-import-modal.tsx", () => ({
  default: () => null,
}));

vi.mock("@/features/favorite/queries/favorite-query", () => ({
  useFavoriteIds: () => new Set<string>(),
  useAddFavoriteMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveFavoriteMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/common/export-modal", () => ({
  default: () => null,
}));

vi.mock("./switch-space", () => ({
  SwitchSpace: () => <div>switch-space</div>,
}));

vi.mock("@/ee/hooks/use-feature", () => ({
  useHasFeature: () => false,
}));

vi.mock("@/ee/hooks/use-upgrade-label", () => ({
  useUpgradeLabel: () => "Upgrade",
}));

vi.mock("@/features/search/constants", () => ({
  searchSpotlight: { open: vi.fn() },
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
global.ResizeObserver = global.ResizeObserver ?? (ResizeObserverMock as any);

// Probes the live URL so tests can assert the category is written to the
// shared ?category= param.
function SearchProbe() {
  const [params] = useSearchParams();
  return <div data-testid="search-probe">{params.toString()}</div>;
}

const renderSidebar = (ui: ReactElement = <SpaceSidebar />) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/s/files"]}>
        <MantineProvider>
          {ui}
          <SearchProbe />
        </MantineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("SpaceSidebar drive categories", () => {
  beforeEach(() => {
    abilityState.canManagePage = true;
    spaceState.space = {
      id: "sp1",
      name: "Team Files",
      slug: "files",
      type: "drive",
    };
  });

  it("renders the category nav in place of the page tree for drive spaces", () => {
    renderSidebar();
    for (const category of [
      "recent",
      "all",
      "images",
      "documents",
      "videos",
      "music",
    ]) {
      expect(screen.getByLabelText(`category-${category}`)).toBeTruthy();
    }
    expect(screen.queryByText("space-tree")).toBeNull();
    expect(screen.queryByText("New page")).toBeNull();
  });

  it("writes the clicked category to the ?category= URL param", () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText("category-images"));
    expect(screen.getByTestId("search-probe").textContent).toContain(
      "category=images",
    );
  });

  it("keeps the page tree (and New page) for page spaces", () => {
    spaceState.space = {
      id: "sp2",
      name: "Docs",
      slug: "docs",
      type: "page",
    };
    renderSidebar();
    expect(screen.getByText("space-tree")).toBeTruthy();
    expect(screen.getByText("New page")).toBeTruthy();
    expect(screen.queryByLabelText("category-all")).toBeNull();
    expect(screen.queryByLabelText("category-images")).toBeNull();
  });

  it("treats a missing space type as a page space (legacy data)", () => {
    spaceState.space = { id: "sp3", name: "Legacy", slug: "legacy" };
    renderSidebar();
    expect(screen.getByText("space-tree")).toBeTruthy();
    expect(screen.queryByLabelText("category-all")).toBeNull();
  });
});
