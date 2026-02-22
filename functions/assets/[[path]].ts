export const onRequestGet: PagesFunction<{
    R2: R2Bucket;
}> = async (context) => {
    const { request, env, params } = context;

    // The path params from `functions/assets/[[path]].ts` is an array of segments.
    const pathArray = params.path;
    if (!pathArray || !Array.isArray(pathArray)) {
        return new Response('Not Found', { status: 404 });
    }

    // Determine the key inside the R2 bucket.
    const objectKey = pathArray.join('/');

    if (!objectKey) {
        return new Response('Not Found', { status: 404 });
    }

    const url = new URL(request.url);

    // Check if we have an if-none-match header
    const ifNoneMatch = request.headers.get('if-none-match');

    // Try to get headers first to process conditional requests efficiently
    const object = await env.R2.get(objectKey, {
        onlyIf: {
            etagDoesNotMatch: ifNoneMatch || undefined,
        }
    });

    if (object === null) {
        return new Response('Not Found', { status: 404 });
    }

    // The conditional request was matched (304 Not Modified)
    // When an Etag matches, R2 returns a regular R2Object without a body property.
    // We can type-narrow by checking if the body property exists.
    const hasBody = 'body' in object;

    if (hasBody) {
        // Determine content type based on extension
        let contentType = 'application/octet-stream';
        if (objectKey.endsWith('.webp')) contentType = 'image/webp';
        else if (objectKey.endsWith('.png')) contentType = 'image/png';
        else if (objectKey.endsWith('.json')) contentType = 'application/json';
        else if (objectKey.endsWith('.txt')) contentType = 'text/plain';

        const headers = new Headers();
        headers.set('ETag', object.httpEtag);
        headers.set('Content-Type', contentType);

        // Cache for 1 year (immutable assets since models change rarely, images rarely once generated)
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        // CORS for local development and edge access
        headers.set('Access-Control-Allow-Origin', '*');

        // Cast back to any here because TS typings for (R2ObjectBody | R2Object) might be strict on 'body'
        return new Response((object as any).body, { headers });
    } else {
        return new Response(null, { status: 304 });
    }
};
