import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Every field the frontend (`apps/client/src/ee/base/services/base-service.ts`)
 * sends must be declared here: the global `ValidationPipe` runs with
 * `whitelist: true`, so any undeclared property is silently stripped before it
 * reaches the service. Nested payloads (cells, typeOptions, filter, config,
 * sorts) are validated loosely as object/array and passed through untouched.
 */

const PROPERTY_TYPES = [
  'text',
  'number',
  'select',
  'status',
  'multiSelect',
  'date',
  'person',
  'file',
  'page',
  'checkbox',
  'url',
  'email',
  'createdAt',
  'lastEditedAt',
  'lastEditedBy',
  'formula',
  'longText',
] as const;

const VIEW_TYPES = ['table', 'kanban', 'calendar'] as const;

export class ConvertBaseDto {
  @IsString()
  pageId: string;

  @IsOptional()
  @IsIn(['kanban'])
  template?: 'kanban';
}

export class BaseInfoDto {
  @IsString()
  pageId: string;
}

export class CreateBaseDto {
  @IsString()
  name: string;

  @IsString()
  spaceId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  pageId?: string;
}

export class UpdateBaseDto {
  @IsString()
  pageId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class DeleteBaseDto {
  @IsString()
  pageId: string;
}

export class ListBasesDto {
  @IsString()
  spaceId: string;

  @IsOptional()
  @Type(() => String)
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

// --- Properties ---

export class CreatePropertyDto {
  @IsString()
  pageId: string;

  @IsString()
  name: string;

  @IsString()
  @IsIn(PROPERTY_TYPES as unknown as string[])
  type: string;

  @IsOptional()
  @IsObject()
  typeOptions?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class UpdatePropertyDto {
  @IsString()
  propertyId: string;

  @IsString()
  pageId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(PROPERTY_TYPES as unknown as string[])
  type?: string;

  @IsOptional()
  @IsObject()
  typeOptions?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class DeletePropertyDto {
  @IsString()
  propertyId: string;

  @IsString()
  pageId: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class ReorderPropertyDto {
  @IsString()
  propertyId: string;

  @IsString()
  pageId: string;

  @IsString()
  position: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

// --- Rows ---

export class CreateRowDto {
  @IsString()
  pageId: string;

  @IsOptional()
  @IsObject()
  cells?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  afterRowId?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class RowInfoDto {
  @IsString()
  rowId: string;

  @IsString()
  pageId: string;
}

export class UpdateRowDto {
  @IsString()
  rowId: string;

  @IsString()
  pageId: string;

  @IsObject()
  cells: Record<string, unknown>;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class DeleteRowDto {
  @IsString()
  rowId: string;

  @IsString()
  pageId: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class DeleteRowsDto {
  @IsString()
  pageId: string;

  @IsArray()
  @IsString({ each: true })
  rowIds: string[];

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class ReorderRowDto {
  @IsString()
  rowId: string;

  @IsString()
  pageId: string;

  @IsString()
  position: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class ListRowsDto {
  @IsString()
  pageId: string;

  @IsOptional()
  @Type(() => String)
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsObject()
  filter?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  sorts?: Record<string, unknown>[];
}

// --- Views ---

export class CreateViewDto {
  @IsString()
  pageId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsIn(VIEW_TYPES as unknown as string[])
  type?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateViewDto {
  @IsString()
  viewId: string;

  @IsString()
  pageId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(VIEW_TYPES as unknown as string[])
  type?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  position?: string;
}

export class DeleteViewDto {
  @IsString()
  viewId: string;

  @IsString()
  pageId: string;
}

export class ListViewsDto {
  @IsString()
  pageId: string;
}

export class ExportCsvDto {
  @IsString()
  pageId: string;

  @IsOptional()
  @IsObject()
  filter?: Record<string, unknown>;
}
