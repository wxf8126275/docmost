import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ApiKeyRepo, ApiKeyWithCreator } from '../repos/api-key.repo';
import { TokenService } from '../../../core/auth/services/token.service';
import { ApiKey, User, Workspace } from '@docmost/db/types/entity.types';
import { JwtApiKeyPayload, JwtType } from '../../../core/auth/dto/jwt-payload';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { CursorPaginationResult } from '@docmost/db/pagination/cursor-pagination';
import { IApiKey } from '../types/api-key.types';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly apiKeyRepo: ApiKeyRepo,
    private readonly tokenService: TokenService,
  ) {}

  async createApiKey(
    workspaceId: string,
    userId: string,
    name: string,
    expiresAt?: string,
  ): Promise<IApiKey> {
    const apiKeyId = randomUUID();
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
    const token = await this.tokenService.generateApiToken({
      apiKeyId,
      user: { id: userId, workspaceId } as unknown as User,
      workspaceId,
      expiresIn: expiresAtDate ? this.secondsUntil(expiresAtDate) : undefined,
    });
    const keyHash = createHash('sha256').update(token).digest('hex');
    const keyPrefix = token.slice(0, 12);

    const row = await this.apiKeyRepo.createApiKey(
      workspaceId,
      userId,
      name,
      keyHash,
      keyPrefix,
      expiresAtDate,
    );
    return this.toIApiKey(row, keyPrefix, token);
  }

  async listApiKeys(
    workspaceId: string,
    pagination: PaginationOptions,
  ): Promise<CursorPaginationResult<IApiKey>> {
    const result = await this.apiKeyRepo.listApiKeys(workspaceId, pagination);
    return {
      items: result.items.map((item) => this.toIApiKey(item, item.keyPrefix)),
      meta: result.meta,
    };
  }

  async updateApiKey(
    apiKeyId: string,
    workspaceId: string,
    name: string,
  ): Promise<IApiKey> {
    const row = await this.apiKeyRepo.updateName(apiKeyId, workspaceId, name);
    return this.toIApiKey(row, row.keyPrefix);
  }

  async revokeApiKey(apiKeyId: string, workspaceId: string): Promise<IApiKey> {
    const row = await this.apiKeyRepo.revoke(apiKeyId, workspaceId);
    return this.toIApiKey(row, row.keyPrefix);
  }

  async validateApiKey(payload: JwtApiKeyPayload): Promise<{
    user: User;
    workspace: Workspace;
    authType: JwtType;
  }> {
    const key = await this.apiKeyRepo.findById(
      payload.apiKeyId,
      payload.workspaceId,
    );
    if (!key || key.deletedAt) {
      throw new UnauthorizedException('API key has been revoked or not found');
    }
    if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('API key has expired');
    }
    return {
      user: { id: payload.sub } as User,
      workspace: { id: payload.workspaceId } as Workspace,
      authType: JwtType.API_KEY,
    };
  }

  private toIApiKey(
    row: ApiKeyWithCreator | ApiKey,
    keyPrefix: string,
    token?: string,
  ): IApiKey {
    const creatorName = 'creatorName' in row ? row.creatorName : null;
    const creatorAvatarUrl =
      'creatorAvatarUrl' in row ? row.creatorAvatarUrl : null;

    return {
      id: row.id,
      name: row.name ?? '',
      token,
      creatorId: row.creatorId,
      workspaceId: row.workspaceId,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      creator: {
        id: row.creatorId,
        name: creatorName ?? '',
        avatarUrl: creatorAvatarUrl,
      },
    };
  }

  private secondsUntil(date: Date): number {
    return Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000));
  }
}
