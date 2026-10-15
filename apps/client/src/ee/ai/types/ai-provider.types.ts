export type AiProviderDriver =
  | "openai"
  | "openai-compatible"
  | "gemini"
  | "ollama";

/**
 * Provider as returned by the API. The plaintext API key is never returned; the
 * `hasApiKey` flag indicates whether one is stored.
 */
export interface AiProvider {
  id: string;
  name: string;
  driver: AiProviderDriver;
  baseUrl: string | null;
  completionModel: string;
  embeddingModel: string | null;
  isDefault: boolean;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiProviderInput {
  name: string;
  driver: AiProviderDriver;
  apiKey: string;
  baseUrl?: string;
  completionModel: string;
  embeddingModel?: string;
  isDefault?: boolean;
}

export interface UpdateAiProviderInput {
  name?: string;
  driver?: AiProviderDriver;
  apiKey?: string;
  baseUrl?: string;
  completionModel?: string;
  embeddingModel?: string;
  isDefault?: boolean;
}
