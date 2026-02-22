// Quick script to test the logic of scrubPII (copied from index.ts)
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

const testPayload = {
    message: "Error fetching user data",
    user_email: "test@example.com",
    request: {
        headers: {
            Authorization: "Bearer supersecrettoken",
            "X-Forwarded-For": "192.168.1.100"
        },
        body: "User email is admin@animatch.com and IP is 10.0.0.1"
    }
};

console.log(JSON.stringify(scrubPII(testPayload), null, 2));
