import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UploadDropzone from "./upload-dropzone";

const mockUpload = vi.fn().mockResolvedValue({ id: "uploaded-1" });

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("@/features/drive/queries/drive-query", () => ({
  useUploadFileMutation: () => ({ mutateAsync: mockUpload, isPending: false }),
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

const renderWithProviders = (ui: ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );

describe("UploadDropzone", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a drop area with file and folder inputs", () => {
    renderWithProviders(<UploadDropzone spaceId="sp1" folderId={null} />);
    expect(screen.getByLabelText("upload-dropzone")).toBeTruthy();
    expect(screen.getByLabelText("drive-file-input")).toBeTruthy();
    expect(screen.getByLabelText("drive-folder-input")).toBeTruthy();
  });

  it("uploads each selected file via the upload service and shows progress", async () => {
    const f1 = new File(["a"], "a.png", { type: "image/png" });
    const f2 = new File(["b"], "b.pdf", { type: "application/pdf" });

    renderWithProviders(<UploadDropzone spaceId="sp1" folderId={null} />);
    const input = screen.getByLabelText("drive-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [f1, f2] } });

    // progress list renders each queued file name
    expect(await screen.findByText("a.png")).toBeTruthy();
    expect(screen.getByText("b.pdf")).toBeTruthy();

    // each file triggers a distinct upload call carrying the file + spaceId
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(2));
    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({ file: f1, spaceId: "sp1", folderId: null }),
    );
    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({ file: f2, spaceId: "sp1", folderId: null }),
    );
  });

  it("passes the active folderId to uploads", async () => {
    const f1 = new File(["a"], "c.png", { type: "image/png" });
    renderWithProviders(
      <UploadDropzone spaceId="sp1" folderId="folder-9" />,
    );
    const input = screen.getByLabelText("drive-file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [f1] } });

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        file: f1,
        spaceId: "sp1",
        folderId: "folder-9",
      }),
    );
  });
});
