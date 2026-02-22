export interface Env {
    OPENCLAW_API_URL: string;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
    ANIMATCH_SECRET: string;
}

/**
 * Secure Reporting Proxy for AniMatch.
 * Handles both Webhooks (Sentry) and Emails (GA4).
 */
export default {
    // Webhook handler (Sentry)
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === '/sentry-webhook' && request.method === 'POST') {
            const authHeader = request.headers.get('X-AniMatch-Secret');
            if (!env.ANIMATCH_SECRET || authHeader !== env.ANIMATCH_SECRET) {
                return new Response('Unauthorized', { status: 401 });
            }

            try {
                const body = await request.text();
                const event = JSON.parse(body);

                const scrubbedData = scrubPII(event);
                const report = await analyzeWithAI(scrubbedData, env, 'Error');
                await reportToTelegram(report, env);

                return new Response('OK', { status: 200 });
            } catch (err) {
                return new Response(`Error: ${err}`, { status: 500 });
            }
        }

        return new Response('AniMatch Proxy Active', { status: 200 });
    },

    // Email handler (GA4 Reports)
    async email(message: any, env: Env, ctx: any) {
        const subject = message.headers.get('subject') || 'No Subject';
        const rawBody = await readStream(message.raw);

        // Scrub PII from email body
        const scrubbedBody = scrubPII(rawBody);

        // Forward to AI for analytics summary
        const report = await analyzeWithAI({ subject, body: scrubbedBody }, env, 'Analytics');

        // Report to Telegram
        await reportToTelegram(report, env);
    }
};

async function readStream(stream: ReadableStream) {
    const reader = stream.getReader();
    let result = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += new TextDecoder().decode(value);
    }
    return result;
}

function scrubPII(data: any): any {
    const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const IP_REGEX = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    const SENSITIVE_KEYS = ['token', 'auth', 'key', 'password', 'secret', 'session', 'ip', 'email'];

    if (typeof data === 'string') {
        let scrubbed = data.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
        scrubbed = scrubbed.replace(IP_REGEX, '[IP_REDACTED]');
        return scrubbed;
    }

    if (Array.isArray(data)) {
        return data.map(item => scrubPII(item));
    }

    if (data !== null && typeof data === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(data)) {
            const isSensitiveKey = SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk));
            if (isSensitiveKey) {
                result[key] = '[VALUE_REDACTED]';
            } else {
                result[key] = scrubPII(value);
            }
        }
        return result;
    }

    return data;
}

async function analyzeWithAI(data: any, env: Env, type: 'Error' | 'Analytics'): Promise<string> {
    const context = type === 'Error' ? (data.message || JSON.stringify(data)) : data.body;
    const prompt = `
    [AniMatch ${type} Report]
    Data: ${context.slice(0, 2000)}
    Action: 위 내용을 분석하여 필요한 핵심 내용만 간추려 한국어로 텔레그램 보고서를 작성해 주세요.
  `;

    if (env.OPENCLAW_API_URL) {
        try {
            const resp = await fetch(env.OPENCLAW_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!resp.ok) {
                return `AI Analysis failed (HTTP ${resp.status}): ${await resp.text()}`;
            }

            const result = await resp.json() as { report?: string; response?: string };
            return result.report || result.response || 'AI Analysis returned empty result.';
        } catch (err: any) {
            return `AI Analysis failed (Fetch Error: ${err.message})`;
        }
    }
    return `[System] ${type} detected. AI Analysis endpoint missing.`;
}

async function reportToTelegram(message: string, env: Env) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: `📢 *AniMatch Report*\n\n${message}`,
            parse_mode: 'Markdown',
        }),
    });
}
