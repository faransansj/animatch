import { test, expect } from '@playwright/test';

test.describe('Result Screen Image Preloading', () => {
    test('character card image loads without 403 Forbidden', async ({ page }) => {
        let has403Error = false;

        // Monitor all network responses for 403 from anilist or our images
        page.on('response', response => {
            if (response.status() === 403 && response.request().resourceType() === 'image') {
                const url = response.url();
                // Ignore generic tracking pixels that might 403, focus on character images
                if (url.includes('s4.anilist.co') || url.match(/\.(png|jpe?g|webp)$/i)) {
                    console.error(`Blocked image request (403): ${url}`);
                    has403Error = true;
                }
            }
        });

        // 1. Go to homepage
        await page.goto('/');

        // 2. Click Start (Upload screen) - use the button class
        await page.locator('button[class*="ctaBtn"]').click();

        // Wait for the URL to change to /upload
        await page.waitForURL('**/upload');

        // 3. Upload a mock image
        const mockImageBase64 = 'iVBORw0KGgoAAAANSUhAAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        const buffer = Buffer.from(mockImageBase64, 'base64');

        // Set file directly to the hidden input by locating the precise input type="file"
        const fileInput = page.locator('input[type="file"]');
        // Ensure hidden input is selectable by playwright by removing 'hidden' if necessary or using force:true
        await fileInput.setInputFiles({
            name: 'mock.png',
            mimeType: 'image/png',
            buffer
        });

        // Check the consent checkbox required for analysis
        const checkbox = page.locator('input[type="checkbox"]');
        if (await checkbox.isVisible()) {
            await checkbox.check();
        }

        // Wait for the crop/preview to appear and then click analyze
        await page.locator('button[class*="analyzeBtn"]').click();

        // 4. Wait for Gacha screen to finish and navigate to Result screen
        // The ML sequence might take a few seconds
        await page.waitForURL('**/result', { timeout: 30000 });

        // 5. Verify the Result screen is loaded
        await expect(page.locator('div[class*="flipInner"]').first()).toBeVisible();

        // 6. Flip the card to trigger the backface display
        // First, let's make sure we haven't hit any 403s on load (due to preload tags)
        expect(has403Error).toBe(false);

        // Click to flip
        await page.locator('div[class*="flipInner"]').first().click();

        // Ensure it flipped
        await expect(page.locator('div[class*="isFlipped"]').first()).toBeVisible({ timeout: 2000 });

        // Wait a brief moment to ensure image render
        await page.waitForTimeout(1000);

        // Final check for 403 errors
        expect(has403Error).toBe(false);
    });
});
