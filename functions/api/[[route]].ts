import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>().basePath('/api');

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
    }>();

    await c.env.DB.prepare(
      `INSERT INTO analysis_logs (orientation, matched_character, matched_anime, similarity_score, confidence, dual_matching, language, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      body.orientation,
      body.matched_character,
      body.matched_anime,
      body.similarity_score,
      body.confidence,
      body.dual_matching ? 1 : 0,
      body.language,
      c.req.header('User-Agent') ?? '',
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

// GET /api/health
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env, context as unknown as ExecutionContext);
};
