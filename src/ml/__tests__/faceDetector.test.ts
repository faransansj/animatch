import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectFaces, initFaceDetector } from '@/ml/faceDetector';

const mocks = vi.hoisted(() => ({
  detect: vi.fn<(input?: unknown) => { detections: unknown[] }>(() => ({ detections: [] })),
  createFromOptions: vi.fn(),
}));

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: vi.fn().mockResolvedValue({}) },
  FaceDetector: {
    createFromOptions: mocks.createFromOptions,
  },
}));

beforeEach(() => {
  mocks.detect.mockReset().mockReturnValue({ detections: [] });
  mocks.createFromOptions.mockResolvedValue({ detect: mocks.detect });
});

describe('detectFaces', () => {
  it('does not rescale coordinates for an image processed at its natural size', async () => {
    await initFaceDetector(1);
    mocks.detect.mockReturnValue({
      detections: [{
        boundingBox: { originX: 10, originY: 20, width: 30, height: 40 },
        categories: [{ score: 0.9 }],
      }],
    });
    const image = document.createElement('img');
    Object.defineProperties(image, {
      naturalWidth: { value: 800 },
      naturalHeight: { value: 600 },
      width: { value: 400 },
      height: { value: 300 },
    });

    expect(detectFaces(image)).toEqual([{
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      confidence: 0.9,
    }]);
  });

  it('rescales coordinates after downsampling a large image', async () => {
    await initFaceDetector(1);
    mocks.detect.mockReturnValue({
      detections: [{
        boundingBox: { originX: 10, originY: 20, width: 30, height: 40 },
        categories: [{ score: 0.9 }],
      }],
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never);
    const image = document.createElement('img');
    Object.defineProperties(image, {
      naturalWidth: { value: 1600 },
      naturalHeight: { value: 800 },
    });

    expect(detectFaces(image)[0]).toMatchObject({
      x: 15.625,
      y: 31.25,
      width: 46.875,
      height: 62.5,
    });
  });
});
