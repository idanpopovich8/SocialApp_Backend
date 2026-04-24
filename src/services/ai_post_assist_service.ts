import OpenAI from 'openai';
import crypto from 'crypto';
import createError from 'http-errors';

export interface PostAssistInput {
  userId: string;
  draft: string;
  intent?: 'help-request' | 'offer-help' | 'general';
  tone?: 'friendly' | 'formal' | 'short';
}

export interface PostAssistOutput {
  originalText: string;
  improvedText: string;
  summary: string;
  hashtags: string[];
  category: 'help-request' | 'offer-help' | 'general';
  improvementNotes: string[];
}

type RateEntry = { count: number; resetAt: number };
type CacheEntry = { value: PostAssistOutput; expiresAt: number };

const rateStore = new Map<string, RateEntry>();
const cacheStore = new Map<string, CacheEntry>();

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_RATE_LIMIT = 20;
const DEFAULT_CACHE_TTL_SECONDS = 600;

const normalize = (
  input: PostAssistInput,
  raw: Partial<PostAssistOutput>,
): PostAssistOutput => {
  const category = raw.category || input.intent || 'general';
  const safeCategory =
    category === 'help-request' || category === 'offer-help'
      ? category
      : 'general';

  return {
    originalText: input.draft,
    improvedText: (raw.improvedText || input.draft).trim(),
    summary: (raw.summary || input.draft.slice(0, 140)).trim(),
    hashtags: Array.isArray(raw.hashtags)
      ? raw.hashtags
          .filter((tag) => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [],
    category: safeCategory,
    improvementNotes: Array.isArray(raw.improvementNotes)
      ? raw.improvementNotes
          .filter((note) => typeof note === 'string')
          .map((note) => note.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [],
  };
};

const hashKey = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const enforceRateLimit = (userId: string) => {
  const now = Date.now();
  const maxRequests = Number(
    process.env.AI_RATE_LIMIT_PER_HOUR || DEFAULT_RATE_LIMIT,
  );
  const key = `rate:${userId}`;
  const existing = rateStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + HOUR_MS });
    return;
  }

  if (existing.count >= maxRequests) {
    throw createError(429, 'AI request limit reached. Please try again later.');
  }

  existing.count += 1;
  rateStore.set(key, existing);
};

const getFromCache = (cacheKey: string): PostAssistOutput | null => {
  const entry = cacheStore.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(cacheKey);
    return null;
  }
  return entry.value;
};

const setCache = (cacheKey: string, value: PostAssistOutput) => {
  const ttlSeconds = Number(
    process.env.AI_CACHE_TTL_SECONDS || DEFAULT_CACHE_TTL_SECONDS,
  );
  cacheStore.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const buildPrompt = (input: PostAssistInput): string => {
  return [
    'You are an assistant that improves social-community posts.',
    'Return only JSON with keys: improvedText, summary, hashtags, category, improvementNotes.',
    'Keep meaning and factual details.',
    'Use same language as input draft.',
    `Intent hint: ${input.intent || 'general'}.`,
    `Tone hint: ${input.tone || 'friendly'}.`,
    `Draft:\n${input.draft}`,
  ].join('\n');
};

const mockAssist = (input: PostAssistInput): PostAssistOutput => {
  const improved = input.draft.trim().replace(/\s+/g, ' ');
  return normalize(input, {
    improvedText: improved,
    summary: improved.slice(0, 120),
    hashtags: ['#community', '#help'],
    category: input.intent || 'general',
    improvementNotes: ['Clarified wording', 'Improved readability'],
  });
};

export const generatePostAssist = async (
  input: PostAssistInput,
): Promise<PostAssistOutput> => {
  enforceRateLimit(input.userId);
  const cacheKey = hashKey(
    `${input.userId}:${input.draft}:${input.intent || ''}:${input.tone || ''}`,
  );
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  if (process.env.AI_MOCK_MODE === 'true') {
    const mocked = mockAssist(input);
    setCache(cacheKey, mocked);
    return mocked;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw createError(500, 'OPENAI_API_KEY is missing');
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You improve posts for a community app. Return strict JSON only with required keys.',
      },
      {
        role: 'user',
        content: buildPrompt(input),
      },
    ],
  });

  const rawText = completion.choices[0]?.message?.content;
  if (!rawText) {
    throw createError(502, 'AI did not return content');
  }

  let parsed: Partial<PostAssistOutput> = {};
  try {
    parsed = JSON.parse(rawText) as Partial<PostAssistOutput>;
  } catch {
    throw createError(502, 'AI response parsing failed');
  }

  const normalized = normalize(input, parsed);
  setCache(cacheKey, normalized);
  return normalized;
};
