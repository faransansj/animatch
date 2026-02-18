interface Env {
  R2: R2Bucket;
}

const CONTENT_TYPES: Record<string, string> = {
  '.onnx': 'application/octet-stream',
  '.json': 'application/json',
  '.gz': 'application/gzip',
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const path = (context.params.path as string[]).join('/');
  const object = await context.env.R2.get(path);

  if (!object) {
    return new Response('Model not found', { status: 404 });
  }

  const ext = '.' + (path.split('.').pop() ?? '');
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';

  return new Response(object.body, {
    headers: {
      'Content-Type': contentType,
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': object.httpEtag,
    },
  });
};
