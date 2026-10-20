import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { MantineProvider } from "@mantine/core";
import DriveGridView from "./drive-grid-view";
import {
  DriveItemHandlers,
  IDriveFile,
  IDriveFolder,
} from "../types/drive.types";

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
    updatedAt: "",
    deletedAt: null,
  },
  {
    id: "file2",
    workspaceId: "w1",
    spaceId: "sp1",
    folderId: null,
    fileName: "notes.docx",
    filePath: "p",
    fileSize: 456,
    fileExt: ".docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    type: null,
    creatorId: "u1",
    createdAt: "",
    updatedAt: "",
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
      <DriveGridView
        spaceId="sp1"
        folders={foldersFixture}
        files={filesFixture}
        handlers={handlers}
      />
    </MantineProvider>,
  );

const q = <T extends Element>(selector: string) =>
  document.querySelector<T>(selector);

describe("DriveGridView", () => {
  let handlers: DriveItemHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = makeHandlers();
  });

  it("renders folder and file tiles", () => {
    renderView(handlers);
    expect(screen.getByText("Project Docs")).toBeTruthy();
    expect(screen.getByText("report.png")).toBeTruthy();
    expect(screen.getByText("notes.docx")).toBeTruthy();
  });

  it("renders a real thumbnail for image files", () => {
    renderView(handlers);
    const img = q<HTMLImageElement>("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toContain(
      "/api/spaces/sp1/drive/files/file1/download",
    );
  });

  it("renders the word badge for .docx files", () => {
    renderView(handlers);
    expect(q('[data-file-type="word"]')).toBeTruthy();
  });

  it("opens a folder when its tile is clicked", () => {
    renderView(handlers);
    fireEvent.click(screen.getByText("Project Docs"));
    expect(handlers.onFolderOpen).toHaveBeenCalledWith(foldersFixture[0]);
  });

  it("previews a file when its tile is clicked", () => {
    renderView(handlers);
    fireEvent.click(screen.getByText("notes.docx"));
    expect(handlers.onFilePreview).toHaveBeenCalledWith(filesFixture[1]);
  });

  it("wires per-file actions (download / rename / share / delete)", () => {
    renderView(handlers);
    fireEvent.click(screen.getByLabelText("download-file-file1"));
    fireEvent.click(screen.getByLabelText("rename-file-file1"));
    fireEvent.click(screen.getByLabelText("share-file-file1"));
    fireEvent.click(screen.getByLabelText("delete-file-file1"));

    expect(handlers.onDownloadFile).toHaveBeenCalledWith(filesFixture[0]);
    expect(handlers.onRenameFile).toHaveBeenCalledWith(filesFixture[0]);
    expect(handlers.onShareFile).toHaveBeenCalledWith(filesFixture[0]);
    expect(handlers.onDeleteFile).toHaveBeenCalledWith(filesFixture[0]);
  });

  it("wires folder actions without opening the folder", () => {
    renderView(handlers);
    fireEvent.click(screen.getByLabelText("rename-folder-f1"));
    fireEvent.click(screen.getByLabelText("delete-folder-f1"));

    expect(handlers.onRenameFolder).toHaveBeenCalledWith(foldersFixture[0]);
    expect(handlers.onDeleteFolder).toHaveBeenCalledWith(foldersFixture[0]);
    expect(handlers.onFolderOpen).not.toHaveBeenCalled();
  });
});
