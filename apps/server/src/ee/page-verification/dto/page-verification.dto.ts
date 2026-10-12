import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const VERIFICATION_TYPES = ['expiring', 'qms'] as const;
const EXPIRATION_MODES = ['period', 'fixed', 'indefinite'] as const;
const PERIOD_UNITS = ['day', 'week', 'month', 'year'] as const;

export class VerificationInfoDto {
  @IsString()
  pageId: string;
}

export class SetupVerificationDto {
  @IsString()
  pageId: string;

  @IsOptional()
  @IsIn(VERIFICATION_TYPES)
  type?: (typeof VERIFICATION_TYPES)[number];

  @IsOptional()
  @IsIn(EXPIRATION_MODES)
  mode?: (typeof EXPIRATION_MODES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  periodAmount?: number;

  @IsOptional()
  @IsIn(PERIOD_UNITS)
  periodUnit?: (typeof PERIOD_UNITS)[number];

  @IsOptional()
  @IsDateString()
  fixedExpiresAt?: string;

  @IsArray()
  @IsString({ each: true })
  verifierIds: string[];
}

export class UpdateVerificationDto {
  @IsString()
  pageId: string;

  @IsOptional()
  @IsIn(EXPIRATION_MODES)
  mode?: (typeof EXPIRATION_MODES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  periodAmount?: number;

  @IsOptional()
  @IsIn(PERIOD_UNITS)
  periodUnit?: (typeof PERIOD_UNITS)[number];

  @IsOptional()
  @IsDateString()
  fixedExpiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  verifierIds?: string[];
}

export class RemoveVerificationDto {
  @IsString()
  pageId: string;
}

export class VerifyPageDto {
  @IsString()
  pageId: string;
}

export class SubmitForApprovalDto {
  @IsString()
  pageId: string;
}

export class RejectApprovalDto {
  @IsString()
  pageId: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class MarkObsoleteDto {
  @IsString()
  pageId: string;
}

export class ListVerificationsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spaceIds?: string[];

  @IsOptional()
  @IsString()
  verifierId?: string;

  @IsOptional()
  @IsIn(VERIFICATION_TYPES)
  type?: (typeof VERIFICATION_TYPES)[number];

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  beforeCursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  query?: string;
}
