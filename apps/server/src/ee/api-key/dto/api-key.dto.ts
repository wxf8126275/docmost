import { IsOptional, IsString } from 'class-validator';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class UpdateApiKeyDto {
  @IsString()
  apiKeyId: string;

  @IsString()
  name: string;
}

export class RevokeApiKeyDto {
  @IsString()
  apiKeyId: string;
}

export class ListApiKeysDto extends PaginationOptions {}
