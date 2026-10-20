import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { MantineProvider } from "@mantine/core";
import DriveListView from "./drive-list-view";
import {
  DriveItemHandlers,
  IDriveFile,
  IDriveFolder,
} from "../types/drive.types";
import { formatBytes } from "@/lib";

const foldersFixture: IDriveFolder[] = [
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

const filesFixture: IDriveFile[] = [
  {
    id: "file1",
    workspaceId: "w1",
    spaceId: "sp1",
    folderId: null,
    fileName: "report.png",
    filePath: "p",
    fileSize: 123,
    fileExt: ".png",
    mimeType: "image/png",
    type: "image/png",
    creatorId: "u1",
    createdAt: "",
    updatedAt: "2026-01-01T00:00:00Z",
    deletedAt: null,
  },
];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

function makeHandlers(): DriveItemHandlers {
  return {
    onFolderOpen: vi.fn(),
    onFilePreview: vi.fn(),
    onRenameFolder: vi.fn(),
    onRenameFile: vi.fn(),
    onDeleteFolder: vi.fn(),
    onDeleteFile: vi.fn(),
    onShareFile: vi.fn(),
    onDownloadFile: vi.fn(),
  };
}

const renderView = (handlers: DriveItemHandlers) =>
  render(
    <MantineProvider>
      <DriveListView
        spaceId="sp1"
        folders={foldersFixture}
        files={filesFixture}
        handlers={handlers}
      />
    </MantineProvider>,
  );

describe("DriveListView", () => {
  let handlers: DriveItemHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = makeHandlers();
  });

  it("renders the three column headers", () => {
    renderView(handlers);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Last modified")).toBeTruthy();
    expect(screen.getByText("Size")).toBeTruthy();
  });

  it("renders folder and file rows", () => {
    renderView(handlers);
    expect(screen.getByText("Project Docs")).toBeTruthy();
    expect(screen.getByText("report.png")).toBeTruthy();
  });

  it("shows the formatted last-modified time for files", () => {
    renderView(handlers);
    const expected = new Date(
      filesFixture[0].updatedAt,
    ).toLocaleString();
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it("shows the formatted size for files and an em dash for folders", () => {
    renderView(handlers);
    expect(screen.getByText(formatBytes(123))).toBeTruthy();
    // the folder row's size cell is an em dash
    const cells = screen.getAllByText("—");
    expect(cells.length).toBe(1);
  });

  it("renders the file type icon (image thumbnail) in the name cell", () => {
    renderView(handlers);
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toContain(
      "/api/spaces/sp1/drive/files/file1/download",
    );
  });

  it("opens a folder when its row is clicked", () => {
    renderView(handlers);
    fireEvent.click(screen.getByText("Project Docs"));
    expect(handlers.onFolderOpen).toHaveBeenCalledWith(foldersFixture[0]);
  });

  it("previews a file when its row is clicked", () => {
    renderView(handlers);
    fireEvent.click(screen.getByText("report.png"));
    expect(handlers.onFilePreview).toHaveBeenCalledWith(filesFixture[0]);
  });

  it("wires folder actions without opening the folder", () => {
    renderView(handlers);
    fireEvent.click(screen.getByLabelText("rename-folder-f1"));
    fireEvent.click(screen.getByLabelText("delete-folder-f1"));
    expect(handlers.onRenameFolder).toHaveBeenCalledWith(foldersFixture[0]);
    expect(handlers.onDeleteFolder).toHaveBeenCalledWith(foldersFixture[0]);
    expect(handlers.onFolderOpen).not.toHaveBeenCalled();
  });

  it("wires file actions", () => {
    renderView(handlers);
    fireEvent.click(screen.getByLabelText("delete-file-file1"));
    fireEvent.click(screen.getByLabelText("download-file-file1"));
    expect(handlers.onDeleteFile).toHaveBeenCalledWith(filesFixture[0]);
    expect(handlers.onDownloadFile).toHaveBeenCalledWith(filesFixture[0]);
  });
});

// The list columns are user-visible text — every locale must ship the keys.
const localeModules = import.meta.glob(
  "../../../../public/locales/*/translation.json",
  { eager: true, import: "default" },
) as Record<string, Record<string, string>>;

describe("drive list view i18n", () => {
  it("ships Size and Last modified in all 12 locales", () => {
    expect(Object.keys(localeModules).length).toBe(12);
    for (const [path, dict] of Object.entries(localeModules)) {
      for (const key of ["Size", "Last modified"]) {
        expect(typeof dict[key], `${path} missing "${key}"`).toBe("string");
        expect(dict[key].length, `${path} empty "${key}"`).toBeGreaterThan(0);
      }
    }
  });
});
