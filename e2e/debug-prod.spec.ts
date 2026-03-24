import { test, expect } from '@playwright/test';

test('debug image loading on prod', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => logs.push(`CONSOLE [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => logs.push(`ERROR: ${err.message}`));
    page.on('response', resp => {
        if (resp.url().includes('anilistcdn')) {
            logs.push(`NET: ${resp.url()} - ${resp.status()}`);
        }
    });

    // Use the actual prod origin to test the active deploy, not an old preview hash
    await page.goto('https://animatch-53d.pages.dev/');

    // Inject the exact same img loading logic into the prod page context
    await page.evaluate(() => {
        return new Promise((resolve) => {
            const preload = new Image();
            preload.crossOrigin = 'anonymous';
            preload.referrerPolicy = 'no-referrer';
            preload.onload = () => resolve('LOADED');
            preload.onerror = () => resolve('ERROR');
            preload.src = 'https://s4.anilist.co/file/anilistcdn/character/large/b36828-j5ib0adAzGMx.png';
        });
    }).then(res => logs.push(`EVAL RESULT: ${res}`));

    console.log('--- BROWSER LOGS ---');
    console.log(logs.join('\n'));
});
