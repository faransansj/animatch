import type { WorkerResponse, WorkerMessageEnvelope, WorkerRequestType } from './workerTypes';

let workerInstance: Worker | null = null;
let messageIdCounter = 0;

/** Default timeout for worker requests (30 seconds). Model init may take longer on slow devices. */
const DEFAULT_TIMEOUT_MS = 30_000;
/** Extended timeout for model initialization which downloads + compiles ONNX models. */
const INIT_TIMEOUT_MS = 120_000;

interface PendingRequest {
    resolve: (val: unknown) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

const pendingRequests = new Map<number, PendingRequest>();

/** Reject all pending requests — used when worker crashes or is terminated. */
function rejectAllPending(reason: string) {
    for (const [id, deferred] of pendingRequests) {
        clearTimeout(deferred.timer);
        deferred.reject(new Error(reason));
    }
    pendingRequests.clear();
}

export function getWorker(): Worker {
    if (!workerInstance) {
        workerInstance = new Worker(new URL('./ml.worker.ts', import.meta.url), { type: 'module' });

        workerInstance.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
            const { id, type, success, payload, error } = e.data;
            const deferred = pendingRequests.get(id);
            if (deferred) {
                clearTimeout(deferred.timer);
                pendingRequests.delete(id);
                if (error || success === false) {
                    deferred.reject(new Error(error || `Worker error: ${type}`));
                } else {
                    deferred.resolve(payload ?? success);
                }
            }
        });

        // Catch unrecoverable worker crashes (e.g. OOM, syntax errors in worker code)
        workerInstance.addEventListener('error', (e: ErrorEvent) => {
            console.error('[ML Worker] Unrecoverable error:', e.message);
            rejectAllPending(`Worker crashed: ${e.message || 'unknown error'}`);
            // Force re-creation on next getWorker() call
            workerInstance = null;
        });
    }
    return workerInstance;
}

export function terminateWorker() {
    if (workerInstance) {
        rejectAllPending('Worker terminated');
        workerInstance.terminate();
        workerInstance = null;
    }
}

/** Determine timeout based on message type — init operations get a longer window. */
function getTimeoutForType(type: WorkerRequestType): number {
    if (type === 'INIT_CLIP' || type === 'INIT_ARCFACE') return INIT_TIMEOUT_MS;
    return DEFAULT_TIMEOUT_MS;
}

export function sendWorkerRequest<T>(type: WorkerRequestType, payload?: unknown, transfer?: Transferable[]): Promise<T> {
    return new Promise((resolve, reject) => {
        const id = ++messageIdCounter;
        const timeoutMs = getTimeoutForType(type);

        const timer = setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                reject(new Error(`Worker request timed out after ${timeoutMs}ms (type: ${type})`));
            }
        }, timeoutMs);

        pendingRequests.set(id, { resolve: resolve as (val: unknown) => void, reject, timer });
        const worker = getWorker();
        const message: WorkerMessageEnvelope = { id, type, payload };
        worker.postMessage(message, transfer || []);
    });
}

