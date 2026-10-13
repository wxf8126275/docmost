// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseExportError, buildExportFailureMessage } from "./export-error";

describe("parseExportError", () => {
  it("extracts message from a Blob error body (axios responseType: blob)", async () => {
    const blob = new Blob(['{"message":"Page not found"}'], {
      type: "application/json",
    });
    const err = { response: { data: blob } };
    expect(await parseExportError(err)).toBe("Page not found");
  });

  it("extracts message from a plain object error body", async () => {
    const err = { response: { data: { message: "Forbidden" } } };
    expect(await parseExportError(err)).toBe("Forbidden");
  });

  it("falls back to err.message when no response body message", async () => {
    const err = { message: "Network Error" };
    expect(await parseExportError(err)).toBe("Network Error");
  });

  it('falls back to generic "Export failed" when nothing useful', async () => {
    const blob = new Blob(["<html>Internal Server Error</html>"], {
      type: "text/html",
    });
    const err = { response: { data: blob } };
    expect(await parseExportError(err)).toBe("Export failed");
  });
});

describe("buildExportFailureMessage", () => {
  it("prefixes a real server message", async () => {
    const err = { response: { data: { message: "Page not found" } } };
    expect(await buildExportFailureMessage(err)).toBe(
      "Export failed: Page not found",
    );
  });

  it("uses generic when nothing useful", async () => {
    const err = {};
    expect(await buildExportFailureMessage(err)).toBe("Export failed");
  });

  it("never contains the literal undefined", async () => {
    const blob = new Blob(["{}"], { type: "application/json" });
    const err = { response: { data: blob } };
    const msg = await buildExportFailureMessage(err);
    expect(msg).not.toContain("undefined");
  });
});
