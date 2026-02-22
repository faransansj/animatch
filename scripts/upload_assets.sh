#!/usr/bin/env bash

# upload_assets.sh
# Safely uploads models and tarot images to the Cloudflare R2 `animatch-models` bucket.

set -e

BUCKET="animatch-models"

echo "==== Uploading ML Models to R2 ===="
npx wrangler r2 object put "${BUCKET}/models/clip-image-encoder-q8.onnx" --file public/models/clip-image-encoder-q8.onnx --content-type "application/octet-stream" || true
npx wrangler r2 object put "${BUCKET}/models/mobilefacenet-q8.onnx" --file public/models/mobilefacenet-q8.onnx --content-type "application/octet-stream" || true
# You can add Q4 models here if they exist

echo ""
echo "==== Uploading Tarot Images to R2 ===="
for f in public/images/tarot/*.webp; do
  if [ -e "$f" ]; then
    filename=$(basename "$f")
    echo "Uploading $filename..."
    npx wrangler r2 object put "${BUCKET}/images/tarot/${filename}" --file "$f" --content-type "image/webp"
  fi
done

echo ""
echo "==== Uploading Default OG Image to R2 ===="
if [ -e "public/images/og-default.webp" ]; then
    npx wrangler r2 object put "${BUCKET}/images/og-default.webp" --file public/images/og-default.webp --content-type "image/webp"
fi

echo ""
echo "✅ Finished uploading assets to R2 bucket: ${BUCKET}"
echo "You can now safely remove these files from the local 'public' fallback!"
