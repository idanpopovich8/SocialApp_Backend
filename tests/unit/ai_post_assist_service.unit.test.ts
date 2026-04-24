import { generatePostAssist, __testing } from '../../src/services/ai_post_assist_service';

describe('ai_post_assist_service unit', () => {
  beforeEach(() => {
    __testing.clearStores();
    process.env.AI_MOCK_MODE = 'true';
    process.env.AI_RATE_LIMIT_PER_HOUR = '2';
    process.env.AI_CACHE_TTL_SECONDS = '600';
  });

  it('normalizes and returns mock response', async () => {
    const result = await generatePostAssist({
      userId: 'u1',
      draft: 'hello   world',
      intent: 'general',
      tone: 'friendly',
    });

    expect(result.originalText).toBe('hello   world');
    expect(typeof result.improvedText).toBe('string');
    expect(Array.isArray(result.hashtags)).toBe(true);
  });

  it('uses rate limiting per user', async () => {
    await generatePostAssist({
      userId: 'u-limit',
      draft: 'first valid draft for rate limit check',
    });
    await generatePostAssist({
      userId: 'u-limit',
      draft: 'second valid draft for rate limit check',
    });

    await expect(
      generatePostAssist({
        userId: 'u-limit',
        draft: 'third valid draft for rate limit check',
      }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('rejects overly long draft', async () => {
    await expect(
      generatePostAssist({
        userId: 'u1',
        draft: 'a'.repeat(5001),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
