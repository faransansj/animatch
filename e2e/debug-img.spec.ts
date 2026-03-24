import { test, expect } from '@playwright/test';

test('debug image loading', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => logs.push(`CONSOLE [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => logs.push(`ERROR: ${err.message}`));

    // Go to root, wait for load
    await page.goto('/');
    await page.evaluate(() => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.referrerPolicy = 'no-referrer';
            img.onload = () => resolve('LOADED');
            img.onerror = (err) => resolve('ERROR loading image');
            img.src = 'https://s4.anilist.co/file/anilistcdn/character/large/b36828-j5ib0adAzGMx.png';
            document.body.appendChild(img);
        }).then(console.log);
    });

    console.log('--- BROWSER LOGS ---');
    console.log(logs.join('\n'));
});
