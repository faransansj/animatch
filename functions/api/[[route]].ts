import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';

// ── Environment Bindings ──────────────────────────────────────────────────────

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  REPORTING_PROXY_URL?: string;
  ANIMATCH_SECRET?: string;
  ALLOWED_ORIGIN?: string;
}

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// ── CORS middleware ───────────────────────────────────────────────────────────

const DEFAULT_ORIGIN = 'https://animatch.midori-lab.com';

app.use('*', cors({
  origin: (origin, c) => {
    const allowed = (c as any).env?.ALLOWED_ORIGIN ?? DEFAULT_ORIGIN;
    if (!origin || origin === allowed || origin.startsWith('http://localhost')) {
      return origin ?? allowed;
    }
    return '';
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,
}));

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const MAX_STR = 200;

const AnalyticsLogSchema = z.object({
  orientation: z.enum(['male', 'female']),
  matched_character: z.string().min(1).max(MAX_STR),
  matched_anime: z.string().min(1).max(MAX_STR),
  similarity_score: z.number().min(0).max(1),
  confidence: z.string().min(1).max(MAX_STR),
  dual_matching: z.boolean(),
  language: z.string().min(1).max(MAX_STR),
  ab_variant: z.string().max(50).optional().default(''),
});

const FeedbackSchema = z.object({
  orientation: z.enum(['male', 'female']),
  matched_character: z.string().min(1).max(MAX_STR),
  matched_anime: z.string().min(1).max(MAX_STR),
  similarity_score: z.number().min(0).max(1).optional(),
  ab_variant: z.string().max(50).optional().default(''),
  rating: z.enum(['up', 'down']),
});

type AnalyticsLog = z.infer<typeof AnalyticsLogSchema>;
type Feedback = z.infer<typeof FeedbackSchema>;

/** Parse and validate JSON body with Zod. Returns parsed data or a 400 Response. */
async function parseBody<T>(c: { req: { json: () => Promise<unknown> }; json: (data: unknown, status: number) => Response }, schema: z.ZodType<T>): Promise<T | Response> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    return c.json({ error: 'Validation failed', details: fieldErrors }, 400);
  }
  return result.data;
}

// ── Global Error Handler ──────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error(`[Hono Error] ${err.message}`, err.stack);

  const proxyUrl = c.env.REPORTING_PROXY_URL;
  if (proxyUrl) {
    const reportPromise = fetch(proxyUrl + '/sentry-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AniMatch-Secret': c.env.ANIMATCH_SECRET ?? '',
      },
      body: JSON.stringify({
        level: 'error',
        message: err.message,
        stack: err.stack,
        path: c.req.path,
      }),
    }).catch(() => { });

    c.executionCtx.waitUntil(reportPromise);
  }

  return c.json({ error: 'Internal Server Error' }, 500);
});

// ── Rate limiting middleware ──────────────────────────────────────────────────
// Sliding-window approach: stores JSON {count, windowStart} in KV.

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_SEC = 60;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

async function checkRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  const key = `rl:${ip}`;
  const now = Date.now();
  const raw = await kv.get(key);

  let entry: RateLimitEntry = { count: 0, windowStart: now };

  if (raw) {
    try {
      entry = JSON.parse(raw) as RateLimitEntry;
    } catch {
      entry = { count: 0, windowStart: now };
    }
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_SEC * 1000) {
      entry = { count: 0, windowStart: now };
    }
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count += 1;
  const elapsed = Math.floor((now - entry.windowStart) / 1000);
  const ttl = Math.max(RATE_LIMIT_WINDOW_SEC - elapsed + 5, 10);
  await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });
  return true;
}

const rateLimitMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  if (!await checkRateLimit(c.env.KV, ip)) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  await next();
});

// ── POST /api/analytics/log ──────────────────────────────────────────────────

app.post('/analytics/log', rateLimitMiddleware, async (c) => {
  const parsed = await parseBody(c, AnalyticsLogSchema);
  if (parsed instanceof Response) return parsed;
  const body = parsed as AnalyticsLog;

  try {
    await c.env.DB.prepare(
      `INSERT INTO analysis_logs (orientation, matched_character, matched_anime, similarity_score, confidence, dual_matching, language, user_agent, ab_variant, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      body.orientation,
      body.matched_character,
      body.matched_anime,
      body.similarity_score,
      body.confidence,
      body.dual_matching ? 1 : 0,
      body.language,
      (c.req.header('User-Agent') ?? '').slice(0, 500),
      body.ab_variant,
    ).run();

    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'Failed to log' }, 500);
  }
});

// ── GET /api/analytics/trending ──────────────────────────────────────────────

app.get('/analytics/trending', rateLimitMiddleware, async (c) => {
  try {
    const result = await c.env.DB.prepare(
      `SELECT matched_character, matched_anime, COUNT(*) as count, ROUND(AVG(similarity_score), 2) as avg_score
       FROM analysis_logs
       WHERE created_at > datetime('now', '-7 days')
       GROUP BY matched_character, matched_anime
       ORDER BY count DESC
       LIMIT 10`
    ).all();

    return c.json({ trending: result.results });
  } catch {
    return c.json({ error: 'Failed to fetch trending' }, 500);
  }
});

// ── GET /api/analytics/ab-report ─────────────────────────────────────────────

app.get('/analytics/ab-report', rateLimitMiddleware, async (c) => {
  try {
    const result = await c.env.DB.prepare(
      `SELECT
         ab_variant,
         COUNT(*) as match_count,
         ROUND(AVG(similarity_score), 4) as avg_score,
         ROUND(AVG(CASE WHEN confidence = 'high' THEN 1.0 WHEN confidence = 'medium' THEN 0.5 ELSE 0.0 END), 4) as avg_confidence,
         SUM(CASE WHEN confidence = 'high' THEN 1 ELSE 0 END) as high_count,
         SUM(CASE WHEN confidence = 'medium' THEN 1 ELSE 0 END) as medium_count,
         SUM(CASE WHEN confidence = 'low' THEN 1 ELSE 0 END) as low_count
       FROM analysis_logs
       WHERE created_at > datetime('now', '-7 days')
         AND ab_variant != ''
       GROUP BY ab_variant
       ORDER BY match_count DESC`
    ).all();

    return c.json({ variants: result.results });
  } catch {
    return c.json({ error: 'Failed to fetch AB report' }, 500);
  }
});

// ── POST /api/analytics/feedback ─────────────────────────────────────────────

app.post('/analytics/feedback', rateLimitMiddleware, async (c) => {
  const parsed = await parseBody(c, FeedbackSchema);
  if (parsed instanceof Response) return parsed;
  const body = parsed as Feedback;

  try {
    await c.env.DB.prepare(
      `INSERT INTO match_feedback (orientation, matched_character, matched_anime, similarity_score, ab_variant, rating, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      body.orientation,
      body.matched_character,
      body.matched_anime,
      body.similarity_score ?? null,
      body.ab_variant,
      body.rating,
    ).run();

    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'Failed to record feedback' }, 500);
  }
});

// ── GET /api/health ──────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env, context as unknown as ExecutionContext);
};
