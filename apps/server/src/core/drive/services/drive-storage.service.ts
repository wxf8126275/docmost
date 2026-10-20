import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import * as bytes from 'bytes';
import { v7 as uuid7 } from 'uuid';
import * as path from 'path';
import { StorageService } from '../../../integrations/storage/storage.service';
import { EnvironmentService } from '../../../integrations/environment/environment.service';

export interface DriveStorageOptions {
  workspaceId: string;
  spaceId: string;
  folderId: string | null;
  fileName: string;
}

/**
 * Owns the S3 integration for the Cloud Drive feature: the canonical object key
 * prefix, the upload-size guard, and the read/upload delegation to StorageService.
 * The key layout is space-scoped:
 * `drive/{workspaceId}/{spaceId}/{folderId|root}/{uuid}{ext}`.
 */
@Injectable()
export class DriveStorageService {
  constructor(
    private readonly storageService: StorageService,
    private readonly environmentService: EnvironmentService,
  ) {}

  /** Raw FILE_UPLOAD_SIZE_LIMIT as configured (e.g. "50mb"). */
  getFileUploadSizeLimit(): string {
    return this.environmentService.getFileUploadSizeLimit();
  }

  /** Parsed FILE_UPLOAD_SIZE_LIMIT in bytes (0 when unset). */
  getMaxFileSize(): number {
    const raw = this.getFileUploadSizeLimit();
    return raw ? bytes(raw) : 0;
  }

  /** Builds the S3 key with the canonical space-scoped drive prefix. */
  generateKey(opts: DriveStorageOptions): string {
    const ext = path.extname(opts.fileName);
    return `drive/${opts.workspaceId}/${opts.spaceId}/${opts.folderId ?? 'root'}/${uuid7()}${ext}`;
  }

  /** Throws when the byte size exceeds the configured limit. */
  assertWithinLimit(fileSizeBytes: number): void {
    const max = this.getMaxFileSize();
    if (max > 0 && fileSizeBytes > max) {
      throw new BadRequestException(
        `File too large. Exceeds the ${this.getFileUploadSizeLimit()} limit`,
      );
    }
  }

  async upload(key: string, content: Buffer | Readable): Promise<void> {
    return this.storageService.upload(key, content);
  }

  async readStream(key: string) {
    return this.storageService.readStream(key);
  }
}
