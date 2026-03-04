import * as ort from 'onnxruntime-web';
import { PREPROCESS, MODEL_PATH } from './types';

// Web Worker context
const ctx = self as unknown as Worker;

const ARCFACE_SIZE = 112;

// Memory optimization for mobile Safari
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

let clipSession: ort.InferenceSession | null = null;
let arcfaceSession: ort.InferenceSession | null = null;

// ── Shared helpers ────────────────────────────────────────────────────────────

const SESSION_OPTIONS: ort.InferenceSession.SessionOptions = {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
    executionMode: 'sequential',
    enableCpuMemArena: true,
};

/** Create an ONNX InferenceSession, fetching the model as ArrayBuffer first (with dev-server fallback). */
async function createSession(modelPath: string): Promise<ort.InferenceSession> {
    try {
        const response = await fetch(modelPath, { cache: 'force-cache' });
        const arrayBuffer = await response.arrayBuffer();
        return await ort.InferenceSession.create(arrayBuffer, SESSION_OPTIONS);
    } catch {
        // Fallback for vite dev server (direct URL loading)
        return await ort.InferenceSession.create(modelPath, SESSION_OPTIONS);
    }
}

/** L2-normalize a Float32Array and return a new buffer (suitable for Transferable). */
function l2Normalize(raw: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < raw.length; i++) norm += raw[i]! * raw[i]!;
    norm = Math.sqrt(norm);

    const out = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw[i]! / norm;
    return out;
}

// ── Message handler ───────────────────────────────────────────────────────────

ctx.addEventListener('message', async (e) => {
    const { type, payload, id } = e.data;

    try {
        switch (type) {
            case 'INIT_CLIP': {
                if (!clipSession) {
                    const modelPath = (payload as string) || MODEL_PATH;
                    clipSession = await createSession(modelPath);
                }
                ctx.postMessage({ id, type: 'INIT_CLIP_DONE', success: true });
                break;
            }

            case 'RUN_CLIP': {
                if (!clipSession) throw new Error('CLIP session not initialized');
                const float32 = payload as Float32Array;
                const tensor = new ort.Tensor('float32', float32, [1, 3, PREPROCESS.size, PREPROCESS.size]);
                const results = await clipSession.run({ image: tensor });
                const embedding = l2Normalize(results['embedding']!.data as Float32Array);

                ctx.postMessage({ id, type: 'RUN_CLIP_DONE', payload: embedding }, [embedding.buffer]);
                break;
            }

            case 'INIT_ARCFACE':
                if (!arcfaceSession) {
                    arcfaceSession = await createSession('/assets/models/mobilefacenet-q8.onnx');
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
                const embedding = l2Normalize(results[outputName]!.data as Float32Array);

                ctx.postMessage({ id, type: 'RUN_ARCFACE_DONE', payload: embedding }, [embedding.buffer]);
                break;
            }

            case 'RELEASE':
                if (clipSession) { await clipSession.release(); }
                if (arcfaceSession) { await arcfaceSession.release(); }
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
