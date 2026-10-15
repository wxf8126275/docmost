import { Inject, Injectable, Optional } from '@nestjs/common';
import type { LanguageModel, ModelMessage } from 'ai';
import { EnvironmentService } from '../../../integrations/environment/environment.service';
import { ResolvedAiProvider } from '../../ai/dto/ai-provider.dto';

/**
 * Optional injection token for overriding the LLM streaming function in tests.
 * When absent, the real OpenAISDK is loaded lazily at call time.
 */
export const AI_CHAT_STREAM_TEXT_FN = Symbol('AI_CHAT_STREAM_TEXT_FN');

export type LlmStreamChunk =
  | { type: 'content'; text: string }
  | { type: 'error'; message: string };

export interface StreamTextFn {
  (params: {
    model: unknown;
    messages: ModelMessage[];
    temperature?: number;
  }): { textStream: AsyncIterable<string> };
}

/**
 * Thin wrapper around an OpenAI-compatible chat completion provider.
 *
 * The real `ai` / `@ai-sdk/openai` packages are loaded lazily via dynamic
 * import so the module can be imported (and unit-tested) in a CommonJS jest
 * environment without pulling in those ESM-only dependencies. A `streamTextFn`
 * can be injected to fully bypass the provider for tests.
 */
@Injectable()
export class AiChatLlmClient {
  constructor(
    private readonly environmentService: EnvironmentService,
    @Optional()
    @Inject(AI_CHAT_STREAM_TEXT_FN)
    private readonly injectedStreamTextFn?: StreamTextFn,
  ) {}

  async *streamChat(
    messages: ModelMessage[],
    model?: string,
    provider?: ResolvedAiProvider,
  ): AsyncGenerator<LlmStreamChunk> {
    try {
      if (this.injectedStreamTextFn) {
        yield* this.runStream(
          this.injectedStreamTextFn({
            model: (model ?? provider?.completionModel ?? this.environmentService.getAiChatModel() ?? 'gpt-4o-mini') as unknown,
            messages,
            temperature: 0.7,
          }),
        );
        return;
      }

      const { streamText } = await import('ai');
      const modelObject = await this.buildModel(model, provider);
      yield* this.runStream(
        streamText({
          model: modelObject,
          messages,
          temperature: 0.7,
        }) as unknown as { textStream: AsyncIterable<string> },
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'LLM stream failed';
      yield { type: 'error', message };
    }
  }

  private async *runStream(
    result: { textStream: AsyncIterable<string> },
  ): AsyncGenerator<LlmStreamChunk> {
    for await (const chunk of result.textStream) {
      if (typeof chunk === 'string' && chunk.length > 0) {
        yield { type: 'content', text: chunk };
      }
    }
  }

  private async buildModel(
    model?: string,
    provider?: ResolvedAiProvider,
  ): Promise<LanguageModel> {
    const { createOpenAI } = await import('@ai-sdk/openai');
    const apiKey = provider?.apiKey ?? this.environmentService.getOpenAiApiKey();
    const baseURL =
      provider?.baseUrl ?? this.environmentService.getOpenAiApiUrl();
    const openai = createOpenAI({
      apiKey: apiKey ?? 'missing',
      baseURL: baseURL || undefined,
    });
    return openai(
      model ??
        provider?.completionModel ??
        this.environmentService.getAiChatModel() ??
        'gpt-4o-mini',
    ) as unknown as LanguageModel;
  }
}
