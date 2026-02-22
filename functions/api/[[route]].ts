import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// Global Error Handler
app.onError((err, c) => {
  console.error(`[Hono Error] ${err.message}`);

  // Forward to secure proxy if configured
  // Non-blocking fire-and-forget
  const proxyUrl = 'https://animatch-reporting-proxy.midori.workers.dev/sentry-webhook'; // Placeholder
  fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'error',
      message: err.message,
      stack: err.stack,
      path: c.req.path,
    }),
  }).catch(() => { });

  return c.json({ error: 'Internal Server Error' }, 500);
});

// Rate limiting middleware
async function checkRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  const key = `rl:${ip}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= 30) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 60 });
  return true;
}

// POST /api/analytics/log
app.post('/analytics/log', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  if (!await checkRateLimit(c.env.KV, ip)) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  try {
    const body = await c.req.json<{
      orientation: string;
      matched_character: string;
      matched_anime: string;
      similarity_score: number;
      confidence: string;
      dual_matching: boolean;
      language: string;
      ab_variant?: string;
    }>();

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
      c.req.header('User-Agent') ?? '',
      body.ab_variant ?? '',
    ).run();

    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'Failed to log' }, 500);
  }
});

// GET /api/analytics/trending
app.get('/analytics/trending', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  if (!await checkRateLimit(c.env.KV, ip)) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

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

// GET /api/analytics/ab-report
app.get('/analytics/ab-report', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  if (!await checkRateLimit(c.env.KV, ip)) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

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

// POST /api/analytics/feedback
app.post('/analytics/feedback', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  if (!await checkRateLimit(c.env.KV, ip)) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  try {
    const body = await c.req.json<{
      orientation: string;
      matched_character: string;
      matched_anime: string;
      similarity_score: number;
      ab_variant: string;
      rating: 'up' | 'down';
    }>();

    await c.env.DB.prepare(
      `INSERT INTO match_feedback (orientation, matched_character, matched_anime, similarity_score, ab_variant, rating, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      body.orientation,
      body.matched_character,
      body.matched_anime,
      body.similarity_score,
      body.ab_variant,
      body.rating
    ).run();

    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'Failed to record feedback' }, 500);
  }
});

// GET /api/health
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env, context as unknown as ExecutionContext);
};
