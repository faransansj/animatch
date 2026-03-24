import { test, expect } from '@playwright/test';

test('debug image loading with actual img tag', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => logs.push(`CONSOLE [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => logs.push(`ERROR: ${err.message}`));

    // Go to root, wait for load
    await page.goto('/');
    await page.evaluate(() => {
        return new Promise((resolve) => {
            // Step 1: preload with new Image
            const preload = new Image();
            preload.crossOrigin = 'anonymous';
            preload.referrerPolicy = 'no-referrer';
            preload.onload = () => {
                console.log('Preload LOADED. Adding img tag to DOM...');

                // Step 2: render img tag like React does
                const img = document.createElement('img');
                img.src = 'https://s4.anilist.co/file/anilistcdn/character/large/b36828-j5ib0adAzGMx.png';
                img.crossOrigin = 'anonymous';
                img.referrerPolicy = 'no-referrer';
                img.onload = () => {
                    console.log('IMG Tag LOADED!');
                    resolve('DONE');
                };
                img.onerror = () => {
                    console.log('IMG Tag ERROR!');
                    resolve('ERROR');
                };
                document.body.appendChild(img);
            };
            preload.onerror = () => {
                console.log('Preload ERROR!');
                resolve('ERROR');
            };
            preload.src = 'https://s4.anilist.co/file/anilistcdn/character/large/b36828-j5ib0adAzGMx.png';
        });
    });

    console.log('--- BROWSER LOGS ---');
    console.log(logs.join('\n'));
});
