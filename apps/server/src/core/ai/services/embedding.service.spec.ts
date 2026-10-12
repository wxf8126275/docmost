import { EmbeddingService } from './embedding.service';
import { chunkText } from '../embedding/chunk.util';

jest.mock('ai', () => ({
  embedMany: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(),
}));

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let environmentService: any;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { embedMany } = require('ai');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createOpenAI } = require('@ai-sdk/openai');

  beforeEach(() => {
    embedMany.mockReset();
    createOpenAI.mockReset();
    environmentService = {
      getOpenAiApiKey: jest.fn().mockReturnValue('test-key'),
      getOpenAiApiUrl: jest.fn().mockReturnValue('https://api.openai.com/v1'),
      getAiEmbeddingModel: jest.fn().mockReturnValue('text-embedding-3-small'),
      getAiEmbeddingDimension: jest.fn().mockReturnValue(1536),
    };
    const provider: any = { embedding: jest.fn().mockReturnValue({}) };
    createOpenAI.mockReturnValue(provider);
    embedMany.mockResolvedValue({
      embeddings: [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ],
    });
    service = new EmbeddingService(environmentService);
  });

  it('embed() returns one vector array per input text', async () => {
    const result = await service.embed(['hello world', 'foo bar']);
    expect(embedMany).toHaveBeenCalledTimes(1);
    expect(createOpenAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      baseURL: 'https://api.openai.com/v1',
    });
    expect(result).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
  });

  it('chunkText() returns a single chunk for short text', () => {
    const chunks = chunkText('short', { maxChunkChars: 2000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('short');
    expect(chunks[0].length).toBe(5);
  });

  it('chunkText() splits long text into overlapping chunks', () => {
    const long = 'a'.repeat(5000);
    const chunks = chunkText(long, { maxChunkChars: 1000, overlap: 200 });
    expect(chunks.length).toBeGreaterThan(1);
    // every chunk boundary respects maxChunkChars
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(1000);
    }
  });
});
