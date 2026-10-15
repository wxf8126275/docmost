import { Injectable } from '@nestjs/common';
import { AiProviderRepo, CreateAiProviderInput } from '../repos/ai-provider.repo';
import { EncryptionService } from '../../../integrations/encryption/encryption.service';
import { EnvironmentService } from '../../../integrations/environment/environment.service';
import { AiProvider } from '@docmost/db/types/entity.types';
import {
  AiProviderResponseDto,
  CreateAiProviderDto,
  ResolvedAiProvider,
  UpdateAiProviderDto,
} from '../dto/ai-provider.dto';

/**
 * Manages workspace AI providers. API keys are encrypted at rest via
 * `EncryptionService`; responses never expose the plaintext key. The default
 * provider is what the backend uses to call models (see `getActiveProviderConfig`),
 * falling back to environment variables when no default provider is configured.
 */
@Injectable()
export class AiProviderService {
  constructor(
    private readonly aiProviderRepo: AiProviderRepo,
    private readonly encryptionService: EncryptionService,
    private readonly environmentService: EnvironmentService,
  ) {}

  async createProvider(
    workspaceId: string,
    dto: CreateAiProviderDto,
  ): Promise<AiProviderResponseDto> {
    const created = await this.aiProviderRepo.createProvider(workspaceId, {
      name: dto.name,
      driver: dto.driver,
      apiKeyEncrypted: dto.apiKey ? this.encryptionService.encrypt(dto.apiKey) : null,
      baseUrl: dto.baseUrl,
      completionModel: dto.completionModel,
      embeddingModel: dto.embeddingModel,
      isDefault: dto.isDefault,
    });

    if (dto.isDefault) {
      await this.aiProviderRepo.setDefault(workspaceId, created.id);
    }

    return this.toResponse(created);
  }

  async updateProvider(
    workspaceId: string,
    id: string,
    dto: UpdateAiProviderDto,
  ): Promise<AiProviderResponseDto> {
    const patch: Partial<CreateAiProviderInput> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.driver !== undefined) patch.driver = dto.driver;
    if (dto.baseUrl !== undefined) patch.baseUrl = dto.baseUrl;
    if (dto.completionModel !== undefined) patch.completionModel = dto.completionModel;
    if (dto.embeddingModel !== undefined) patch.embeddingModel = dto.embeddingModel;
    if (dto.apiKey !== undefined && dto.apiKey !== '') {
      patch.apiKeyEncrypted = this.encryptionService.encrypt(dto.apiKey);
    }

    const updated = await this.aiProviderRepo.updateProvider(id, workspaceId, patch);

    if (dto.isDefault) {
      await this.aiProviderRepo.setDefault(workspaceId, id);
      updated.isDefault = true;
    }

    return this.toResponse(updated);
  }

  async listProviders(workspaceId: string): Promise<AiProviderResponseDto[]> {
    const rows = await this.aiProviderRepo.listByWorkspace(workspaceId);
    return rows.map((row) => this.toResponse(row));
  }

  async deleteProvider(workspaceId: string, id: string): Promise<void> {
    await this.aiProviderRepo.deleteProvider(id, workspaceId);
  }

  /**
   * Resolves the provider config the backend should use for a workspace. When a
   * default provider exists its (decrypted) config wins; otherwise we fall back
   * to the server environment variables so behavior is unchanged without a
   * configured provider.
   */
  async getActiveProviderConfig(
    workspaceId: string,
  ): Promise<ResolvedAiProvider> {
    const provider = await this.aiProviderRepo.findDefault(workspaceId);

    if (provider) {
      return {
        driver: provider.driver,
        apiKey: provider.apiKeyEncrypted
          ? this.encryptionService.decrypt(provider.apiKeyEncrypted)
          : '',
        baseUrl: provider.baseUrl ?? undefined,
        completionModel: provider.completionModel,
        embeddingModel: provider.embeddingModel ?? undefined,
      };
    }

    return {
      driver: this.environmentService.getAiDriver() ?? 'openai',
      apiKey: this.environmentService.getOpenAiApiKey() ?? '',
      baseUrl: this.environmentService.getOpenAiApiUrl() ?? undefined,
      completionModel:
        this.environmentService.getAiChatModel() ?? 'gpt-4o-mini',
      embeddingModel:
        this.environmentService.getAiEmbeddingModel() ??
        'text-embedding-3-small',
    };
  }

  private toResponse(provider: AiProvider): AiProviderResponseDto {
    return {
      id: provider.id,
      name: provider.name,
      driver: provider.driver,
      baseUrl: provider.baseUrl,
      completionModel: provider.completionModel,
      embeddingModel: provider.embeddingModel,
      isDefault: provider.isDefault,
      hasApiKey: Boolean(provider.apiKeyEncrypted),
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}
