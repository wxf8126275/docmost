import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Json } from '@docmost/db/types/db';

/**
 * Payloads mirror the fields `apps/client/src/ee/template/services/template-service.ts`
 * actually sends. The global `ValidationPipe({ whitelist: true })` strips any
 * field not declared here, so every frontend-sent property must be represented.
 */
export class ListTemplatesDto {
  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : value))
  @IsInt()
  @Min(1)
  limit?: number;
}

export class TemplateInfoDto {
  @IsString()
  templateId: string;
}

export class CreateTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  content?: Json;

  @IsOptional()
  @IsUUID()
  spaceId?: string;
}

export class UpdateTemplateDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  content?: Json;

  @IsOptional()
  @IsUUID()
  spaceId?: string;
}

export class DeleteTemplateDto {
  @IsString()
  templateId: string;
}

export class UseTemplateDto {
  @IsString()
  templateId: string;

  @IsUUID()
  spaceId: string;

  @IsOptional()
  @IsString()
  parentPageId?: string;
}
