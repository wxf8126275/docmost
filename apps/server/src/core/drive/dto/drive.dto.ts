import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class CreateShareLinkDto {
  @IsOptional()
  @IsIn(['read', 'download'])
  permission?: 'read' | 'download';

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  parentId?: string | null;
}

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  folderId?: string | null;
}
