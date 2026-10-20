import { Module } from '@nestjs/common';
import { DriveController } from './drive.controller';
import { DrivePublicShareController } from './drive-public-share.controller';
import { DriveService } from './services/drive.service';
import { DriveStorageService } from './services/drive-storage.service';
import { DriveShareService } from './services/drive-share.service';
import { DriveQuotaService } from './services/drive-quota.service';
import { DriveVersionService } from './services/drive-version.service';
import { DriveFolderRepo } from '../../database/repos/drive/drive-folder.repo';
import { DriveFileRepo } from '../../database/repos/drive/drive-file.repo';
import { DriveShareRepo } from '../../database/repos/drive/drive-share.repo';
import { DriveFileVersionRepo } from '../../database/repos/drive/drive-file-version.repo';
import { StorageModule } from '../../integrations/storage/storage.module';

// SpaceAbilityFactory and SpaceRepo come from the global CaslModule /
// DatabaseModule — the standalone DriveAbilityFactory has been removed.
@Module({
  imports: [StorageModule],
  controllers: [DriveController, DrivePublicShareController],
  providers: [
    DriveService,
    DriveStorageService,
    DriveShareService,
    DriveQuotaService,
    DriveVersionService,
    DriveFolderRepo,
    DriveFileRepo,
    DriveShareRepo,
    DriveFileVersionRepo,
  ],
})
export class DriveModule {}
