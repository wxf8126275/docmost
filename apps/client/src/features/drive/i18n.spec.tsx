import { describe, it, expect } from "vitest";

/**
 * Every user-visible string in the drive UI must flow through i18next, so
 * every locale file has to ship the full key set. This spec guards that
 * contract across all 12 languages.
 */
const REQUIRED_KEYS = [
  // drive shell + folders/files
  "Drive",
  "New folder",
  "Upload",
  "Search",
  "Folder name",
  "Create",
  "This folder is empty",
  "Rename",
  "Save",
  "Root",
  // Weiyun-style category nav
  "Recent",
  "All",
  "Images",
  "Documents",
  "Videos",
  "Music",
  // quota
  "Storage",
  "Unlimited",
  // share dialog
  "Share",
  "Permission",
  "Read",
  "Download",
  "Expires",
  "Never",
  "1 hour",
  "1 day",
  "7 days",
  "Generate link",
  "Copy",
  // upload dropzone
  "Done",
  "Failed",
  "Drag files here or click to upload",
  // mutation notifications
  "Failed to create folder",
  "Failed to rename folder",
  "Failed to delete folder",
  "Failed to rename file",
  "Failed to delete file",
  "Failed to upload file",
  "Failed to create share",
  // space type labels
  "Page",
  "Space type",
  "Drive spaces store files instead of pages",
];

const localeModules = import.meta.glob(
  "../../../public/locales/*/translation.json",
  { eager: true, import: "default" },
) as Record<string, Record<string, string>>;

const localePaths = Object.keys(localeModules).sort();

const enPath = localePaths.find((p) => p.includes("/en-US/"))!;
const zhPath = localePaths.find((p) => p.includes("/zh-CN/"))!;

describe("drive i18n", () => {
  it("covers all 12 locales", () => {
    expect(localePaths.length).toBe(12);
  });

  it("ships every required drive key in every locale", () => {
    for (const path of localePaths) {
      const dict = localeModules[path];
      for (const key of REQUIRED_KEYS) {
        expect(
          typeof dict[key],
          `${path} is missing key "${key}"`,
        ).toBe("string");
        expect(dict[key].length, `${path} has empty key "${key}"`).toBeGreaterThan(0);
      }
    }
  });

  it("uses the canonical English labels in en-US", () => {
    const en = localeModules[enPath];
    expect(en["Drive"]).toBe("Drive");
    expect(en["Recent"]).toBe("Recent");
    expect(en["Images"]).toBe("Images");
    expect(en["Drag files here or click to upload"]).toBe(
      "Drag files here or click to upload",
    );
  });

  it("localizes the drive labels in zh-CN (no raw English keys)", () => {
    const zh = localeModules[zhPath];
    for (const key of REQUIRED_KEYS) {
      expect(zh[key], `zh-CN not localized for "${key}"`).not.toBe(key);
    }
    expect(zh["Drive"]).toBe("网盘");
    expect(zh["Recent"]).toBe("最近");
  });
});
