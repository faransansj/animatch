/**
 * Type-safe message contracts for the ML Web Worker.
 *
 * Both the main thread (workerClient.ts) and the worker (ml.worker.ts)
 * share these types to eliminate `any` usage in postMessage calls.
 */

// ── Request types (main → worker) ─────────────────────────────────────────────

export interface InitClipRequest {
    type: 'INIT_CLIP';
    payload?: string; // optional model path override
}

export interface RunClipRequest {
    type: 'RUN_CLIP';
    payload: Float32Array;
}

export interface InitArcFaceRequest {
    type: 'INIT_ARCFACE';
    payload?: undefined;
}

export interface RunArcFaceRequest {
    type: 'RUN_ARCFACE';
    payload: Float32Array;
}

export interface ReleaseRequest {
    type: 'RELEASE';
    payload?: undefined;
}

export type WorkerRequest =
    | InitClipRequest
    | RunClipRequest
    | InitArcFaceRequest
    | RunArcFaceRequest
    | ReleaseRequest;

export type WorkerRequestType = WorkerRequest['type'];

// ── Response types (worker → main) ────────────────────────────────────────────

export interface WorkerSuccessResponse {
    id: number;
    type: string;
    success: true;
    payload?: unknown;
    error?: undefined;
}

export interface WorkerErrorResponse {
    id: number;
    type: 'ERROR' | string;
    success?: false;
    payload?: undefined;
    error: string;
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

// ── Envelope (message wrapper with id) ────────────────────────────────────────

export interface WorkerMessageEnvelope {
    id: number;
    type: WorkerRequestType;
    payload?: unknown;
}
