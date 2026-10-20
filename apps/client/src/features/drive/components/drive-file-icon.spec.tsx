import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { MantineProvider } from "@mantine/core";
import DriveFileIcon, { getDriveFileType } from "./drive-file-icon";
import { IDriveFile } from "../types/drive.types";

function makeFile(over: Partial<IDriveFile>): IDriveFile {
  return {
    id: "f1",
    workspaceId: "w1",
    spaceId: "sp1",
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

const q = <T extends Element>(selector: string) =>
  document.querySelector<T>(selector);

// MantineProvider's color-scheme hook needs matchMedia (absent in jsdom).
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

const renderIcon = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("getDriveFileType", () => {
  it("maps office document extensions (case-insensitive)", () => {
    expect(getDriveFileType(makeFile({ fileExt: ".docx" }))).toBe("word");
    expect(getDriveFileType(makeFile({ fileExt: ".DOC" }))).toBe("word");
    expect(getDriveFileType(makeFile({ fileExt: ".xlsx" }))).toBe("excel");
    expect(getDriveFileType(makeFile({ fileExt: ".csv" }))).toBe("excel");
    expect(getDriveFileType(makeFile({ fileExt: ".pptx" }))).toBe(
      "powerpoint",
    );
    expect(getDriveFileType(makeFile({ fileExt: ".pdf" }))).toBe("pdf");
  });

  it("maps archives, code, text, audio, video and images", () => {
    expect(getDriveFileType(makeFile({ fileExt: ".zip" }))).toBe("archive");
    expect(getDriveFileType(makeFile({ fileExt: ".tsx" }))).toBe("code");
    expect(getDriveFileType(makeFile({ fileExt: ".md" }))).toBe("text");
    expect(getDriveFileType(makeFile({ fileExt: ".mp3" }))).toBe("audio");
    expect(getDriveFileType(makeFile({ fileExt: ".mp4" }))).toBe("video");
    expect(getDriveFileType(makeFile({ fileExt: ".png" }))).toBe("image");
  });

  it("falls back to the mime type, then unknown", () => {
    expect(
      getDriveFileType(makeFile({ fileExt: "", mimeType: "image/webp" })),
    ).toBe("image");
    expect(
      getDriveFileType(
        makeFile({ fileExt: ".xyz", mimeType: "application/pdf" }),
      ),
    ).toBe("pdf");
    expect(
      getDriveFileType(makeFile({ fileExt: ".xyz", mimeType: null })),
    ).toBe("unknown");
  });
});

describe("DriveFileIcon", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a real thumbnail for image files (space-scoped URL)", () => {
    renderIcon(
      <DriveFileIcon
        file={makeFile({
          id: "img1",
          fileName: "a.png",
          fileExt: ".png",
          mimeType: "image/png",
        })}
        spaceId="sp1"
      />,
    );
    const img = q<HTMLImageElement>("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toContain(
      "/api/spaces/sp1/drive/files/img1/download",
    );
    expect(q('[data-file-type="image"]')).toBeTruthy();
  });

  it("renders the word badge for .docx (no thumbnail)", () => {
    renderIcon(
      <DriveFileIcon
        file={makeFile({ fileName: "a.docx", fileExt: ".docx" })}
        spaceId="sp1"
      />,
    );
    expect(q('[data-file-type="word"]')).toBeTruthy();
    expect(q("img")).toBeNull();
  });

  it("renders the excel badge for .xlsx", () => {
    renderIcon(
      <DriveFileIcon
        file={makeFile({ fileName: "a.xlsx", fileExt: ".xlsx" })}
        spaceId="sp1"
      />,
    );
    expect(q('[data-file-type="excel"]')).toBeTruthy();
    expect(q("img")).toBeNull();
  });

  it("falls back to the photo icon when the thumbnail fails to load", async () => {
    renderIcon(
      <DriveFileIcon
        file={makeFile({
          id: "img1",
          fileName: "a.png",
          fileExt: ".png",
          mimeType: "image/png",
        })}
        spaceId="sp1"
      />,
    );
    fireEvent.error(q("img")!);
    await waitFor(() => {
      expect(q("img")).toBeNull();
    });
    // still identified as an image file (fallback icon, not "unknown")
    expect(q('[data-file-type="image"]')).toBeTruthy();
  });

  it("renders a generic icon for unknown types", () => {
    renderIcon(
      <DriveFileIcon
        file={makeFile({ fileName: "a.xyz", fileExt: ".xyz" })}
        spaceId="sp1"
      />,
    );
    expect(q('[data-file-type="unknown"]')).toBeTruthy();
    expect(q("img")).toBeNull();
  });
});
