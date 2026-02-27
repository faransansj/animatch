/**
 * Cloudflare Pages Middleware for:
 * 1. Dynamic OG meta tags for crawlers
 * 2. Security headers (CSP, HSTS, etc.) applied to every response
 *
 * Character data is loaded from D1 and cached in KV for 1 hour.
 * Falls back to passthrough if DB/KV unavailable.
 */

interface MiddlewareEnv {
  DB: D1Database;
  KV: KVNamespace;
}

interface CharacterOGData {
  name_en: string;
  anime_en: string;
}

const CRAWLER_UA = /bot|crawl|spider|preview|telegram|whatsapp|discord|slack|facebook|twitter|Twitterbot|Slackbot|Discordbot|facebookexternalhit|Facebot|LinkedInBot|Pinterest|Embedly|vkShare|LINE/i;

const KV_CACHE_KEY = 'og:character-data';
const KV_CACHE_TTL = 3600; // 1 hour

// ── Character data loader with KV cache ──────────────────────────────────────

/**
 * Load character OG data from KV cache, falling back to D1 query.
 * Returns a map of character ID → { name_en, anime_en }.
 */
async function getCharacterData(
  db: D1Database,
  kv: KVNamespace,
): Promise<Record<number, CharacterOGData> | null> {
  // 1. Try KV cache first
  try {
    const cached = await kv.get(KV_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Record<number, CharacterOGData>;
    }
  } catch {
    // Cache miss or parse error — continue to DB
  }

  // 2. Query D1
  try {
    const result = await db.prepare(
      `SELECT c.id, c.name_en, a.title_en AS anime_en
       FROM characters c
       JOIN animes a ON c.anime_id = a.id
       WHERE c.name_en IS NOT NULL AND a.title_en IS NOT NULL`
    ).all();

    if (!result.results || result.results.length === 0) {
      return null;
    }

    const data: Record<number, CharacterOGData> = {};
    for (const row of result.results) {
      data[row.id as number] = {
        name_en: row.name_en as string,
        anime_en: row.anime_en as string,
      };
    }

    // 3. Cache in KV (fire-and-forget)
    kv.put(KV_CACHE_KEY, JSON.stringify(data), { expirationTtl: KV_CACHE_TTL }).catch(() => { });

    return data;
  } catch {
    return null;
  }
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

/** Escape characters that could break HTML attribute injection */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Security headers applied to every response ───────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://browser.sentry-cdn.com https://us.i.posthog.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://pub-*.r2.dev https://animatch.midori-lab.com",
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://o*.ingest.sentry.io https://us.i.posthog.com https://api.telegram.org",
    "worker-src 'self' blob:",
    "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://browser.sentry-cdn.com",
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── Main middleware ──────────────────────────────────────────────────────────

export const onRequest: PagesFunction<MiddlewareEnv> = async (context) => {
  const url = new URL(context.request.url);
  const matchId = url.searchParams.get('match');
  const ua = context.request.headers.get('User-Agent') || '';

  // ── Crawler path: rewrite OG meta tags ───────────────────────────────────
  if (url.pathname === '/' && matchId && CRAWLER_UA.test(ua)) {
    const heroineId = parseInt(matchId, 10);
    if (!isNaN(heroineId)) {
      // Load character data from KV cache / D1
      const characterMap = await getCharacterData(context.env.DB, context.env.KV);
      const charData = characterMap?.[heroineId];

      if (charData) {
        const response = await context.next();
        let html = await response.text();

        const ogTitle = escapeHtml(`AniMatch - ${charData.name_en} (${charData.anime_en})`);
        const ogDesc = escapeHtml(`I matched with ${charData.name_en} from ${charData.anime_en} on AniMatch! Find your anime partner too.`);
        const ogImage = `${url.origin}/images/tarot/${heroineId}.webp`;
        const ogUrl = `${url.origin}/?match=${heroineId}`;

        html = html
          .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${ogTitle}">`)
          .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${ogDesc}">`)
          .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${ogImage}">`)
          .replace(/<title>[^<]*<\/title>/, `<title>${ogTitle}</title>`)
          .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${ogDesc}">`);

        if (!html.includes('og:url')) {
          html = html.replace('</head>', `  <meta property="og:url" content="${ogUrl}">\n</head>`);
        }

        const rewritten = new Response(html, { headers: response.headers });
        return applySecurityHeaders(rewritten);
      }
    }
  }

  // ── Normal path: pass through with security headers ───────────────────────
  const response = await context.next();
  return applySecurityHeaders(response);
};
