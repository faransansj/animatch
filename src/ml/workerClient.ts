import type { WorkerResponse, WorkerMessageEnvelope, WorkerRequestType } from './workerTypes';

let workerInstance: Worker | null = null;
let messageIdCounter = 0;

const pendingRequests = new Map<number, { resolve: (val: unknown) => void; reject: (err: Error) => void }>();

export function getWorker(): Worker {
    if (!workerInstance) {
        workerInstance = new Worker(new URL('./ml.worker.ts', import.meta.url), { type: 'module' });
        workerInstance.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
            const { id, type, success, payload, error } = e.data;
            const deferred = pendingRequests.get(id);
            if (deferred) {
                pendingRequests.delete(id);
                if (error || success === false) {
                    deferred.reject(new Error(error || `Worker error: ${type}`));
                } else {
                    deferred.resolve(payload ?? success);
                }
            }
        });
    }
    return workerInstance;
}

export function terminateWorker() {
    if (workerInstance) {
        workerInstance.terminate();
        workerInstance = null;
    }
}

export function sendWorkerRequest<T>(type: WorkerRequestType, payload?: unknown, transfer?: Transferable[]): Promise<T> {
    return new Promise((resolve, reject) => {
        const id = ++messageIdCounter;
        pendingRequests.set(id, { resolve: resolve as (val: unknown) => void, reject });
        const worker = getWorker();
        const message: WorkerMessageEnvelope = { id, type, payload };
        worker.postMessage(message, transfer || []);
    });
}

