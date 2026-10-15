import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export const AI_PROVIDER_DRIVERS = [
  'openai',
  'openai-compatible',
  'gemini',
  'ollama',
] as const;

export type AiProviderDriver = (typeof AI_PROVIDER_DRIVERS)[number];

/** Provider config resolved for backend use; `apiKey` is the decrypted secret. */
export interface ResolvedAiProvider {
  driver: string;
  apiKey: string;
  baseUrl?: string;
  completionModel: string;
  embeddingModel?: string;
}

export class CreateAiProviderDto {
  @IsString()
  name: string;

  @IsIn(AI_PROVIDER_DRIVERS)
  driver: AiProviderDriver;

  @IsString()
  apiKey: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsString()
  completionModel: string;

  @IsOptional()
  @IsString()
  embeddingModel?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAiProviderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(AI_PROVIDER_DRIVERS)
  driver?: AiProviderDriver;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  completionModel?: string;

  @IsOptional()
  @IsString()
  embeddingModel?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AiProviderResponseDto {
  id: string;
  name: string;
  driver: string;
  baseUrl: string | null;
  completionModel: string;
  embeddingModel: string | null;
  isDefault: boolean;
  hasApiKey: boolean;
  createdAt: Date;
  updatedAt: Date;
}
