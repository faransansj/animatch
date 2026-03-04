import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/ml/**/*.ts', 'src/stores/**/*.ts'],
            exclude: ['src/**/__tests__/**', 'src/ml/ml.worker.ts', 'src/ml/workerClient.ts'],
        },
    },
});
