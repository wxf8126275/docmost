import { describe, it, expect, afterEach } from "vitest";
import bytes from "bytes";
import {
  getFileUploadSizeLimit,
  getFileImportSizeLimit,
} from "@/lib/config";

const ENV_KEYS = ["FILE_UPLOAD_SIZE_LIMIT", "FILE_IMPORT_SIZE_LIMIT"];

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("getFileUploadSizeLimit", () => {
  it("falls back to 50mb when the config is unset", () => {
    expect(getFileUploadSizeLimit()).toBe(bytes("50mb"));
  });

  it("falls back to 50mb when the config is an empty string", () => {
    process.env.FILE_UPLOAD_SIZE_LIMIT = "";
    expect(getFileUploadSizeLimit()).toBe(bytes("50mb"));
  });

  it("falls back to 50mb when the config is 0", () => {
    process.env.FILE_UPLOAD_SIZE_LIMIT = "0";
    expect(getFileUploadSizeLimit()).toBe(bytes("50mb"));
  });

  it("falls back to 50mb when the config is 0mb", () => {
    process.env.FILE_UPLOAD_SIZE_LIMIT = "0mb";
    expect(getFileUploadSizeLimit()).toBe(bytes("50mb"));
  });

  it("honors a valid config value", () => {
    process.env.FILE_UPLOAD_SIZE_LIMIT = "100mb";
    expect(getFileUploadSizeLimit()).toBe(bytes("100mb"));
  });
});

describe("getFileImportSizeLimit", () => {
  it("falls back to 200mb when unset", () => {
    expect(getFileImportSizeLimit()).toBe(bytes("200mb"));
  });

  it("falls back to 200mb when empty", () => {
    process.env.FILE_IMPORT_SIZE_LIMIT = "";
    expect(getFileImportSizeLimit()).toBe(bytes("200mb"));
  });

  it("honors a valid config value", () => {
    process.env.FILE_IMPORT_SIZE_LIMIT = "500mb";
    expect(getFileImportSizeLimit()).toBe(bytes("500mb"));
  });
});
