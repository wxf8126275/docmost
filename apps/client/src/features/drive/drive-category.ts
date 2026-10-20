import { DriveCategory } from "./types/drive.types";

/**
 * The single source of truth for the drive category URL contract
 * (`?category=recent|all|images|documents|videos|music`). Shared by the space
 * sidebar (writes the param) and the drive browser (reads it), so both stay in
 * sync without prop drilling or global state.
 */
export const DRIVE_CATEGORIES: DriveCategory[] = [
  "recent",
  "all",
  "images",
  "documents",
  "videos",
  "music",
];

/** Validates a raw URL param; unknown or missing values fall back to `all`. */
export function parseDriveCategory(value: string | null): DriveCategory {
  return DRIVE_CATEGORIES.includes(value as DriveCategory)
    ? (value as DriveCategory)
    : "all";
}
