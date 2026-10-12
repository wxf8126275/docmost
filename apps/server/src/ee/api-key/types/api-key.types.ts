import { User } from '@docmost/db/types/entity.types';

/**
 * API key as returned to the frontend. `token` is only present on the
 * create response (the plaintext is shown exactly once).
 */
export interface IApiKey {
  id: string;
  name: string;
  token?: string;
  creatorId: string;
  workspaceId: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  creator: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export interface CreateApiKeyInput {
  name: string;
  expiresAt?: string;
}

export interface UpdateApiKeyInput {
  apiKeyId: string;
  name: string;
}

export interface RevokeApiKeyInput {
  apiKeyId: string;
}
