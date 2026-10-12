import { Injectable } from '@nestjs/common';
import { EnvironmentService } from '../../../integrations/environment/environment.service';

/**
 * Generates text embeddings for semantic search via an OpenAI-compatible
 * embedding model. The real `ai` / `@ai-sdk/openai` packages are loaded lazily
 * via dynamic import so the module can be imported (and unit-tested) in a
 * CommonJS jest environment without pulling in those ESM-only dependencies.
 *
 * Note: only the OpenAI-compatible driver is supported for embeddings in this
 * implementation (gemini/ollama embedding is out of scope).
 */
@Injectable()
export class EmbeddingService {
  constructor(private readonly environmentService: EnvironmentService) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) {
      return [];
    }

    const { embedMany } = await import('ai');
    const { createOpenAI } = await import('@ai-sdk/openai');

    const apiKey = this.environmentService.getOpenAiApiKey();
    const baseURL = this.environmentService.getOpenAiApiUrl();
    const openai = createOpenAI({
      apiKey: apiKey ?? 'missing',
      baseURL: baseURL || undefined,
    });

    const modelName =
      this.environmentService.getAiEmbeddingModel() ?? 'text-embedding-3-small';
    const model = openai.embedding(modelName);

    const { embeddings } = await embedMany({
      model: model as never,
      values: texts,
    });

    return embeddings as number[][];
  }
}
