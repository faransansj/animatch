import * as ort from 'onnxruntime-web';
import { PREPROCESS, MODEL_PATH } from './types';

// Web Worker context
const ctx: Worker = self as any;

const ARCFACE_SIZE = 112;

// Memory optimization for mobile Safari
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

let clipSession: ort.InferenceSession | null = null;
let arcfaceSession: ort.InferenceSession | null = null;

ctx.addEventListener('message', async (e) => {
    const { type, payload, id } = e.data;

    try {
        switch (type) {
            case 'INIT_CLIP':
                if (!clipSession) {
                    clipSession = await ort.InferenceSession.create(MODEL_PATH, {
                        executionProviders: ['wasm'],
                        graphOptimizationLevel: 'all',
                        executionMode: 'sequential',
                        enableCpuMemArena: true,
                    });
                }
                ctx.postMessage({ id, type: 'INIT_CLIP_DONE', success: true });
                break;

            case 'RUN_CLIP': {
                if (!clipSession) throw new Error('CLIP session not initialized');
                const float32 = payload as Float32Array;
                const tensor = new ort.Tensor('float32', float32, [1, 3, PREPROCESS.size, PREPROCESS.size]);
                const results = await clipSession.run({ image: tensor });
                const raw = results['embedding']!.data as Float32Array;

                // L2 normalize
                let norm = 0;
                for (let i = 0; i < raw.length; i++) norm += raw[i]! * raw[i]!;
                norm = Math.sqrt(norm);

                const embedding = new Float32Array(raw.length);
                for (let i = 0; i < raw.length; i++) embedding[i] = raw[i]! / norm;

                // Transfer buffer back
                ctx.postMessage({ id, type: 'RUN_CLIP_DONE', payload: embedding }, [embedding.buffer]);
                break;
            }

            case 'INIT_ARCFACE':
                if (!arcfaceSession) {
                    arcfaceSession = await ort.InferenceSession.create('/models/mobilefacenet-q8.onnx', {
                        executionProviders: ['wasm'],
                        graphOptimizationLevel: 'all',
                        executionMode: 'sequential',
                        enableCpuMemArena: true,
                    });
                }
                ctx.postMessage({ id, type: 'INIT_ARCFACE_DONE', success: true });
                break;

            case 'RUN_ARCFACE': {
                if (!arcfaceSession) throw new Error('ArcFace session not initialized');
                const float32 = payload as Float32Array;
                const inputName = arcfaceSession.inputNames[0]!;
                const tensor = new ort.Tensor('float32', float32, [1, 3, ARCFACE_SIZE, ARCFACE_SIZE]);
                const results = await arcfaceSession.run({ [inputName]: tensor });
                const outputName = arcfaceSession.outputNames[0]!;
                const raw = results[outputName]!.data as Float32Array;

                // L2 normalize
                let norm = 0;
                for (let i = 0; i < raw.length; i++) norm += raw[i]! * raw[i]!;
                norm = Math.sqrt(norm);

                const embedding = new Float32Array(raw.length);
                for (let i = 0; i < raw.length; i++) embedding[i] = raw[i]! / norm;

                // Transfer buffer back
                ctx.postMessage({ id, type: 'RUN_ARCFACE_DONE', payload: embedding }, [embedding.buffer]);
                break;
            }

            case 'RELEASE':
                clipSession = null;
                arcfaceSession = null;
                ctx.postMessage({ id, type: 'RELEASE_DONE', success: true });
                break;

            default:
                console.warn(`Unknown worker message type: ${type}`);
        }
    } catch (error) {
        ctx.postMessage({ id, type: 'ERROR', error: (error as Error).message });
    }
});
