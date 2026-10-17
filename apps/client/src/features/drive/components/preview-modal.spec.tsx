import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { MantineProvider } from "@mantine/core";
import PreviewModal from "./preview-modal";
import { IDriveFile } from "../types/drive.types";

function makeFile(over: Partial<IDriveFile>): IDriveFile {
  return {
    id: "f1",
    workspaceId: "w1",
    driveType: "personal",
    ownerId: "u1",
    folderId: null,
    fileName: "file",
    filePath: "p",
    fileSize: 1,
    fileExt: ".bin",
    mimeType: null,
    type: null,
    creatorId: "u1",
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    ...over,
  };
}

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

// Mantine renders Modal content into a Portal on document.body, so query the
// whole document rather than the render container.
const q = <T extends Element>(selector: string) =>
  document.querySelector<T>(selector);

const renderWithProviders = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("PreviewModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders an image preview", async () => {
    const file = makeFile({
      id: "img1",
      fileName: "a.png",
      fileExt: ".png",
      mimeType: "image/png",
    });
    renderWithProviders(<PreviewModal file={file} opened onClose={vi.fn()} />);
    const img = q<HTMLImageElement>("img");
    expect(img).toBeTruthy();
    await waitFor(() => {
      expect(img?.getAttribute("src")).toContain(
        "/api/drive/files/img1/download",
      );
    });
  });

  it("renders an audio preview", () => {
    const file = makeFile({
      id: "aud1",
      fileName: "a.mp3",
      fileExt: ".mp3",
      mimeType: "audio/mpeg",
    });
    renderWithProviders(<PreviewModal file={file} opened onClose={vi.fn()} />);
    expect(q("audio")).toBeTruthy();
    expect(q("video")).toBeNull();
    expect(q("img")).toBeNull();
  });

  it("renders a video preview", () => {
    const file = makeFile({
      id: "vid1",
      fileName: "a.mp4",
      fileExt: ".mp4",
      mimeType: "video/mp4",
    });
    renderWithProviders(<PreviewModal file={file} opened onClose={vi.fn()} />);
    expect(q("video")).toBeTruthy();
  });

  it("renders a document icon for unsupported types", () => {
    const file = makeFile({
      id: "doc1",
      fileName: "a.pdf",
      fileExt: ".pdf",
      mimeType: "application/pdf",
    });
    renderWithProviders(<PreviewModal file={file} opened onClose={vi.fn()} />);
    expect(q("img")).toBeNull();
    expect(q("audio")).toBeNull();
    expect(q("video")).toBeNull();
    expect(screen.getAllByText("a.pdf").length).toBeGreaterThan(0);
  });
});
