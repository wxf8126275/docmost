import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class ListAuditLogsDto {
  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class UpdateAuditRetentionDto {
  @IsNumber()
  auditRetentionDays: number;
}
