import { Test } from '@nestjs/testing';
import { AiChatLlmClient, AI_CHAT_STREAM_TEXT_FN } from './ai-chat-llm.client';
import { EnvironmentService } from '../../../integrations/environment/environment.service';

function fakeAsyncIterable(...chunks: string[]): AsyncIterable<string> {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
}

describe('AiChatLlmClient', () => {
  function makeClient(streamTextFn: any) {
    const environmentService = {
      getOpenAiApiKey: () => 'test-key',
      getOpenAiApiUrl: () => undefined,
      getAiChatModel: () => 'gpt-4o-mini',
    } as any;
    return new AiChatLlmClient(environmentService, streamTextFn);
  }

  it('yields content chunks from the model stream', async () => {
    const streamTextFn = jest
      .fn()
      .mockReturnValue({ textStream: fakeAsyncIterable('Hello', ' world') });
    const client = makeClient(streamTextFn);

    const chunks: string[] = [];
    for await (const chunk of client.streamChat([
      { role: 'user', content: 'hi' } as any,
    ])) {
      if (chunk.type === 'content') chunks.push(chunk.text);
    }

    expect(chunks).toEqual(['Hello', ' world']);
  });

  it('emits an error chunk when the provider throws', async () => {
    const streamTextFn = jest.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    const client = makeClient(streamTextFn);

    const received: any[] = [];
    for await (const chunk of client.streamChat([
      { role: 'user', content: 'hi' } as any,
    ])) {
      received.push(chunk);
    }

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('error');
    expect(received[0].message).toBe('boom');
  });

  it('builds the provider model from environment config', async () => {
    const streamTextFn = jest
      .fn()
      .mockReturnValue({ textStream: fakeAsyncIterable('ok') });
    const client = makeClient(streamTextFn);

    const chunks: unknown[] = [];
    for await (const chunk of client.streamChat([
      { role: 'user', content: 'hi' } as any,
    ])) {
      chunks.push(chunk);
    }

    expect(streamTextFn).toHaveBeenCalledTimes(1);
    const params = streamTextFn.mock.calls[0][0];
    expect(params.model).toBeDefined();
    expect(params.temperature).toBe(0.7);
  });

  it('uses the provider override for the model when supplied', async () => {
    const streamTextFn = jest
      .fn()
      .mockReturnValue({ textStream: fakeAsyncIterable('ok') });
    const client = makeClient(streamTextFn);
    const provider = {
      driver: 'openai-compatible',
      apiKey: 'prov-key',
      baseUrl: 'https://prov/v1',
      completionModel: 'prov-model',
      embeddingModel: 'prov-embed',
    } as any;

    for await (const _chunk of client.streamChat(
      [{ role: 'user', content: 'hi' } as any],
      undefined,
      provider,
    )) {
      // drain
    }

    expect(streamTextFn).toHaveBeenCalledTimes(1);
    const params = streamTextFn.mock.calls[0][0];
    expect(params.model).toBe('prov-model');
  });

  it('is resolvable from the Nest DI container without an override (guards startup DI)', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AiChatLlmClient,
        {
          provide: EnvironmentService,
          useValue: {
            getOpenAiApiKey: () => 'test-key',
            getOpenAiApiUrl: () => undefined,
            getAiChatModel: () => 'gpt-4o-mini',
          },
        },
      ],
    }).compile();

    const client = module.get(AiChatLlmClient);
    expect(client).toBeDefined();
    // When the override token is absent, the stream fn must be undefined.
    expect((client as unknown as { injectedStreamTextFn?: unknown }).injectedStreamTextFn).toBeUndefined();
  });
});
