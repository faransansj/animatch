import { useEffect } from 'react';
import { useMLStore } from '@/stores/mlStore';
import { initClipEngine } from '@/ml/clipEngine';
import { initFaceDetector } from '@/ml/faceDetector';
import { initArcFace } from '@/ml/arcFaceEngine';
import type { EmbeddingsData } from '@/types/character';

async function loadEmbeddings(): Promise<EmbeddingsData> {
  // Try gzip first
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const resp = await fetch('/embeddings.json.gz');
      if (resp.ok) {
        const ds = new DecompressionStream('gzip');
        const decompressed = resp.body!.pipeThrough(ds);
        const text = await new Response(decompressed).text();
        return JSON.parse(text);
      }
    } catch {
      // fallback
    }
  }
  const resp = await fetch('/embeddings.json');
  if (!resp.ok) throw new Error('Failed to load embeddings');
  return resp.json();
}

export function useMLEngine() {
  const { setEmbeddingsData, setClipReady, setClipProgress, setFaceDetectorReady, setArcFaceReady } = useMLStore();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Load embeddings
        setClipProgress(10);
        const data = await loadEmbeddings();
        if (cancelled) return;
        setEmbeddingsData(data);
        setClipProgress(30);

        // Initialize ONLY face detector on startup to save memory.
        // CLIP and ArcFace will be lazy-loaded in the Gacha sequence.
        const faceLoaded = await initFaceDetector();
        if (cancelled) return;

        if (faceLoaded) {
          setFaceDetectorReady(true);
        }
      } catch (err) {
        console.error('ML init failed:', err);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [setEmbeddingsData, setClipReady, setClipProgress, setFaceDetectorReady, setArcFaceReady]);
}
