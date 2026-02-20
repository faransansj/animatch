let workerInstance: Worker | null = null;
let messageIdCounter = 0;

const pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: Error) => void }>();

export function getWorker(): Worker {
    if (!workerInstance) {
        workerInstance = new Worker(new URL('./ml.worker.ts', import.meta.url), { type: 'module' });
        workerInstance.addEventListener('message', (e) => {
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

export function sendWorkerRequest<T>(type: string, payload?: any, transfer?: Transferable[]): Promise<T> {
    return new Promise((resolve, reject) => {
        const id = ++messageIdCounter;
        pendingRequests.set(id, { resolve, reject });
        const worker = getWorker();
        worker.postMessage({ id, type, payload }, transfer || []);
    });
}
