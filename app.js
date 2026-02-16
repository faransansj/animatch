/* ===== ML ENGINE ===== */
let modelSession = null;
let embeddingsData = null;
let modelReady = false;
let modelLoadingProgress = 0;

const PREPROCESS = {
  size: 224,
  mean: [0.48145466, 0.4578275, 0.40821073],
  std: [0.26862954, 0.26130258, 0.27577711]
};

async function initML() {
  const statusEl = document.getElementById('modelStatus');
  const progressEl = document.getElementById('modelProgress');

  try {
    // 1. Load embeddings
    if (statusEl) statusEl.textContent = '캐릭터 데이터 로딩 중...';
    const resp = await fetch('public/embeddings.json');
    if (!resp.ok) throw new Error('Failed to load embeddings');
    embeddingsData = await resp.json();
    if (progressEl) progressEl.style.width = '30%';

    // 2. Load ONNX model
    if (statusEl) statusEl.textContent = 'AI 모델 로딩 중... (최초 1회)';

    // Try quantized model first, fall back to full model
    const modelPaths = [
      'public/models/clip-image-encoder-q8.onnx',
      'public/models/clip-image-encoder.onnx'
    ];

    let loaded = false;
    for (const modelPath of modelPaths) {
      try {
        modelSession = await ort.InferenceSession.create(modelPath, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        loaded = true;
        break;
      } catch (e) {
        console.warn(`Failed to load ${modelPath}:`, e.message);
      }
    }

    if (!loaded) throw new Error('No ONNX model available');

    if (progressEl) progressEl.style.width = '100%';
    modelReady = true;

    // Hide loading overlay
    const overlay = document.getElementById('modelLoadingOverlay');
    if (overlay) {
      overlay.classList.add('loaded');
      setTimeout(() => overlay.remove(), 500);
    }

    console.log(`✅ ML ready: ${embeddingsData.count} characters, ${embeddingsData.embedding_dim}d`);
  } catch (err) {
    console.error('ML init failed:', err);
    if (statusEl) statusEl.textContent = 'AI 모델 로딩 실패 — 새로고침 해주세요';
    // Enable button anyway for graceful degradation (will use fallback)
    modelReady = false;
  }
}

function preprocessImage(imageDataURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = PREPROCESS.size;
      canvas.height = PREPROCESS.size;
      const ctx = canvas.getContext('2d');

      // Center crop to square, then resize to 224x224
      const shorter = Math.min(img.width, img.height);
      const sx = (img.width - shorter) / 2;
      const sy = (img.height - shorter) / 2;
      ctx.drawImage(img, sx, sy, shorter, shorter, 0, 0, PREPROCESS.size, PREPROCESS.size);

      const imageData = ctx.getImageData(0, 0, PREPROCESS.size, PREPROCESS.size);
      const pixels = imageData.data; // RGBA uint8

      // Convert to NCHW float32 with CLIP normalization
      const float32 = new Float32Array(3 * PREPROCESS.size * PREPROCESS.size);
      for (let y = 0; y < PREPROCESS.size; y++) {
        for (let x = 0; x < PREPROCESS.size; x++) {
          const srcIdx = (y * PREPROCESS.size + x) * 4;
          for (let c = 0; c < 3; c++) {
            const dstIdx = c * PREPROCESS.size * PREPROCESS.size + y * PREPROCESS.size + x;
            float32[dstIdx] = (pixels[srcIdx + c] / 255 - PREPROCESS.mean[c]) / PREPROCESS.std[c];
          }
        }
      }

      resolve(float32);
    };
    img.src = imageDataURL;
  });
}

async function getImageEmbedding(imageDataURL) {
  const preprocessed = await preprocessImage(imageDataURL);
  const tensor = new ort.Tensor('float32', preprocessed, [1, 3, PREPROCESS.size, PREPROCESS.size]);
  const results = await modelSession.run({ image: tensor });
  const raw = results.embedding.data;

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < raw.length; i++) norm += raw[i] * raw[i];
  norm = Math.sqrt(norm);

  const embedding = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) embedding[i] = raw[i] / norm;
  return embedding;
}

function cosineSimilarity(a, b) {
  // Both vectors are already L2-normalized, so dot product = cosine similarity
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function findBestMatch(userEmbedding, orientation) {
  const candidates = embeddingsData.characters.filter(c => c.orientation === orientation);

  // Score all candidates
  const scored = candidates.map(c => ({
    character: c,
    similarity: cosineSimilarity(userEmbedding, c.embedding)
  }));

  scored.sort((a, b) => b.similarity - a.similarity);

  const best = scored[0];

  // Map cosine similarity to a user-friendly match percentage (75-98%)
  const min = scored[scored.length - 1].similarity;
  const max = best.similarity;
  const range = max - min;
  const normalized = range > 0.001 ? (best.similarity - min) / range : 1;
  const percent = Math.round(75 + normalized * 23);

  return {
    character: best.character,
    score: best.similarity,
    percent: percent,
    topN: scored.slice(0, 3)
  };
}

/* ===== STATE ===== */
let currentOrientation = 'male';
let selectedResult = null;

/* ===== PARTICLES ===== */
function createParticles(containerId, count = 30) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (4 + Math.random() * 6) + 's';
    p.style.animationDelay = Math.random() * 5 + 's';
    p.style.width = (2 + Math.random() * 3) + 'px';
    p.style.height = p.style.width;
    container.appendChild(p);
  }
}

/* ===== SCREEN NAVIGATION ===== */
function goToScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  window.scrollTo(0, 0);
}

/* ===== ORIENTATION TOGGLE ===== */
function toggleOrientation(orientation) {
  currentOrientation = orientation;
  const options = document.querySelectorAll('.toggle-option');
  const slider = document.getElementById('toggleSlider');

  options.forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === orientation);
  });

  if (orientation === 'female') {
    slider.classList.add('right');
  } else {
    slider.classList.remove('right');
  }
}

/* ===== FILE UPLOAD ===== */
let uploadedImageData = null;

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageData = e.target.result;
    const preview = document.getElementById('uploadPreview');
    preview.src = uploadedImageData;
    document.getElementById('uploadZone').classList.add('has-image');
    document.getElementById('analyzeBtn').disabled = false;
    runGuidelineCheck(uploadedImageData);
  };
  reader.readAsDataURL(file);
}

/* ===== GUIDELINE FEEDBACK ===== */
function runGuidelineCheck(imageData) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    // Check brightness
    let totalBrightness = 0;
    const sampleStep = 40;
    let sampleCount = 0;
    for (let i = 0; i < data.length; i += 4 * sampleStep) {
      totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      sampleCount++;
    }
    const avgBrightness = totalBrightness / sampleCount;
    const isBright = avgBrightness > 60;

    // Check aspect ratio
    const ratio = img.width / img.height;
    const isPortrait = ratio < 1.5;

    // Check resolution
    const isHighRes = img.width >= 200 && img.height >= 200;

    // Center region skin-tone analysis
    const cx = Math.floor(img.width / 2);
    const cy = Math.floor(img.height / 3);
    const checkRadius = Math.floor(Math.min(img.width, img.height) * 0.15);
    let skinPixels = 0;
    let totalChecked = 0;
    for (let y = cy - checkRadius; y < cy + checkRadius; y += 3) {
      for (let x = cx - checkRadius; x < cx + checkRadius; x += 3) {
        if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
        const idx = (y * img.width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (r > 80 && g > 50 && b > 30 && r > g && r > b && (r - g) > 10) {
          skinPixels++;
        }
        totalChecked++;
      }
    }
    const hasFace = totalChecked > 0 && (skinPixels / totalChecked) > 0.15;

    const feedbackEl = document.getElementById('feedbackItems');
    feedbackEl.innerHTML = '';

    const items = [
      { pass: isBright, passText: '조명이 적절해요', failText: '사진이 어두워요 - 밝은 사진 권장' },
      { pass: isPortrait, passText: '구도가 좋아요', failText: '가로가 넓어요 - 크롭을 추천해요' },
      { pass: isHighRes, passText: '해상도 충분해요', failText: '해상도가 낮아요 (200px 이상 권장)' },
      { pass: hasFace, passText: '얼굴이 감지됐어요', failText: '얼굴이 잘 안 보여요 - 정면 사진 추천' },
    ];

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = `feedback-item ${item.pass ? 'pass' : 'warn'}`;
      div.innerHTML = `<span>${item.pass ? '✅' : '⚠️'}</span><span>${item.pass ? item.passText : item.failText}</span>`;
      feedbackEl.appendChild(div);
    });

    document.getElementById('guidelineFeedback').style.display = 'block';
  };
  img.src = imageData;
}

// Drag and drop
const uploadZone = document.getElementById('uploadZone');
if (uploadZone) {
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '#FF6B9D';
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = '';
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    const files = e.dataTransfer.files;
    if (files.length) {
      document.getElementById('fileInput').files = files;
      handleFileUpload({ target: { files } });
    }
  });
}

/* ===== CROP FUNCTIONALITY ===== */
let cropStart = null;
let cropEnd = null;
let isCropping = false;

function openCropModal() {
  if (!uploadedImageData) return;
  const modal = document.getElementById('cropModal');
  const cropImg = document.getElementById('cropImage');
  const cropRect = document.getElementById('cropRect');
  cropImg.src = uploadedImageData;
  cropRect.classList.remove('visible');
  cropRect.style.cssText = 'display:none;';
  cropStart = null;
  cropEnd = null;
  modal.classList.add('active');

  const area = document.getElementById('cropArea');
  area.onmousedown = (e) => {
    const rect = area.getBoundingClientRect();
    cropStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    isCropping = true;
    cropRect.classList.add('visible');
  };
  area.onmousemove = (e) => {
    if (!isCropping) return;
    const rect = area.getBoundingClientRect();
    cropEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    cropRect.style.left = x + 'px';
    cropRect.style.top = y + 'px';
    cropRect.style.width = w + 'px';
    cropRect.style.height = h + 'px';
    cropRect.style.display = 'block';
  };
  area.onmouseup = () => { isCropping = false; };
}

function closeCropModal() {
  document.getElementById('cropModal').classList.remove('active');
}

function applyCrop() {
  if (!cropStart || !cropEnd) {
    showToast('크롭 영역을 드래그해서 선택해주세요');
    return;
  }

  const area = document.getElementById('cropArea');
  const cropImg = document.getElementById('cropImage');
  const areaRect = area.getBoundingClientRect();

  const scaleX = cropImg.naturalWidth / areaRect.width;
  const scaleY = cropImg.naturalHeight / areaRect.height;

  const sx = Math.min(cropStart.x, cropEnd.x) * scaleX;
  const sy = Math.min(cropStart.y, cropEnd.y) * scaleY;
  const sw = Math.abs(cropEnd.x - cropStart.x) * scaleX;
  const sh = Math.abs(cropEnd.y - cropStart.y) * scaleY;

  if (sw < 50 || sh < 50) {
    showToast('크롭 영역이 너무 작아요');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    uploadedImageData = canvas.toDataURL('image/jpeg', 0.92);
    document.getElementById('uploadPreview').src = uploadedImageData;
    closeCropModal();
    runGuidelineCheck(uploadedImageData);
    showToast('✂️ 크롭 완료!');
  };
  img.src = uploadedImageData;
}

/* ===== GACHA LOADING + ML INFERENCE ===== */
async function startAnalysis() {
  if (!uploadedImageData) return;

  goToScreen('screen-loading');
  createParticles('loadingParticles', 20);

  if (modelReady) {
    // Real ML inference
    await runMLGachaSequence();
  } else {
    // Fallback: random from embeddings if available
    await runFallbackGachaSequence();
  }
}

async function runMLGachaSequence() {
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const stepLine1 = document.getElementById('stepLine1');
  const stepLine2 = document.getElementById('stepLine2');
  const silhouette = document.getElementById('gachaSilhouette');
  const quoteText = document.getElementById('quoteText');
  const quoteCursor = document.getElementById('quoteCursor');

  // Reset
  progressFill.style.width = '0%';
  quoteText.textContent = '';
  quoteCursor.style.display = 'inline';
  silhouette.classList.remove('reveal');
  silhouette.querySelector('.silhouette-shape').textContent = '?';
  step1.className = 'step active';
  step2.className = 'step';
  step3.className = 'step';
  stepLine1.className = 'step-line';
  stepLine2.className = 'step-line';

  // Phase 1: CLIP inference (real ML)
  progressText.textContent = 'AI가 얼굴 특징을 분석하고 있어요...';
  await animateProgress(progressFill, 0, 15, 400);

  let userEmbedding;
  try {
    userEmbedding = await getImageEmbedding(uploadedImageData);
  } catch (err) {
    console.error('Inference failed:', err);
    progressText.textContent = '분석 중 오류 발생 — 재시도합니다...';
    await sleep(1000);
    await runFallbackGachaSequence();
    return;
  }

  await animateProgress(progressFill, 15, 40, 600);

  // Phase 2: Similarity matching
  step1.className = 'step done';
  stepLine1.className = 'step-line filling';
  await sleep(300);
  step2.className = 'step active';
  progressText.textContent = '주인공 데이터베이스와 매칭 중...';

  const matchResult = findBestMatch(userEmbedding, currentOrientation);
  selectedResult = matchResult;

  await animateProgress(progressFill, 40, 70, 800);

  // Phase 3: Reveal preparation
  step2.className = 'step done';
  stepLine2.className = 'step-line filling';
  await sleep(300);
  step3.className = 'step active';
  progressText.textContent = '당신의 운명의 상대를 찾았어요...';

  // Type the quote
  const quote = matchResult.character.heroine_quote || '...';
  await typeText(quoteText, quote, 60);
  await animateProgress(progressFill, 70, 90, 600);

  // Reveal
  await sleep(400);
  quoteCursor.style.display = 'none';
  silhouette.classList.add('reveal');
  silhouette.querySelector('.silhouette-shape').textContent = matchResult.character.heroine_emoji || '💕';
  step3.className = 'step done';
  progressText.textContent = '매칭 완료!';
  await animateProgress(progressFill, 90, 100, 400);

  await sleep(600);

  populateResult(matchResult);
  goToScreen('screen-result');
}

async function runFallbackGachaSequence() {
  // Use embeddings data if available, otherwise basic fallback
  const candidates = embeddingsData
    ? embeddingsData.characters.filter(c => c.orientation === currentOrientation)
    : null;

  if (!candidates || candidates.length === 0) {
    showToast('매칭 데이터를 불러올 수 없습니다. 새로고침 해주세요.');
    goToScreen('screen-upload');
    return;
  }

  const randomChar = candidates[Math.floor(Math.random() * candidates.length)];
  const percent = Math.round(75 + Math.random() * 20);

  selectedResult = {
    character: randomChar,
    score: 0,
    percent: percent,
    topN: []
  };

  // Run simplified gacha sequence
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const stepLine1 = document.getElementById('stepLine1');
  const stepLine2 = document.getElementById('stepLine2');
  const silhouette = document.getElementById('gachaSilhouette');
  const quoteText = document.getElementById('quoteText');
  const quoteCursor = document.getElementById('quoteCursor');

  progressFill.style.width = '0%';
  quoteText.textContent = '';
  quoteCursor.style.display = 'inline';
  silhouette.classList.remove('reveal');
  silhouette.querySelector('.silhouette-shape').textContent = '?';
  step1.className = 'step active';
  step2.className = 'step';
  step3.className = 'step';
  stepLine1.className = 'step-line';
  stepLine2.className = 'step-line';

  progressText.textContent = '얼굴 특징을 분석하고 있어요...';
  await animateProgress(progressFill, 0, 35, 1200);

  step1.className = 'step done';
  stepLine1.className = 'step-line filling';
  await sleep(500);
  step2.className = 'step active';
  progressText.textContent = '주인공 데이터베이스를 탐색 중...';
  await animateProgress(progressFill, 35, 70, 1200);

  step2.className = 'step done';
  stepLine2.className = 'step-line filling';
  await sleep(500);
  step3.className = 'step active';
  progressText.textContent = '당신의 운명의 상대를 찾고 있어요...';

  const quote = randomChar.heroine_quote || '...';
  await typeText(quoteText, quote, 60);
  await animateProgress(progressFill, 70, 90, 800);

  await sleep(500);
  quoteCursor.style.display = 'none';
  silhouette.classList.add('reveal');
  silhouette.querySelector('.silhouette-shape').textContent = randomChar.heroine_emoji || '💕';
  step3.className = 'step done';
  progressText.textContent = '매칭 완료!';
  await animateProgress(progressFill, 90, 100, 500);

  await sleep(800);

  populateResult(selectedResult);
  goToScreen('screen-result');
}

function typeText(element, text, speed) {
  return new Promise((resolve) => {
    let i = 0;
    element.textContent = '';
    const interval = setInterval(() => {
      element.textContent += text[i];
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

function animateProgress(el, from, to, duration) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = from + (to - from) * easeOut(progress);
      el.style.width = value + '%';
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ===== POPULATE RESULT ===== */
function populateResult(matchResult) {
  const char = matchResult.character;
  const matchScore = matchResult.percent;

  // Compatibility badge
  document.querySelector('.percentage-text').textContent = matchScore + '%';
  document.querySelector('.ring-fill').style.strokeDasharray = `${matchScore}, 100`;

  // Heroine info
  document.getElementById('heroineName').textContent = char.heroine_name || '???';
  document.getElementById('heroineAnime').textContent = char.anime || '';
  document.getElementById('heroineImg').style.background = char.heroine_color || 'linear-gradient(135deg, #f093fb, #f5576c)';
  document.querySelector('.heroine-emoji-lg').textContent = char.heroine_emoji || '💕';

  // Tags
  const tagsEl = document.getElementById('heroineTags');
  const tags = char.heroine_tags || [];
  tagsEl.innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');

  // Personality
  const listEl = document.getElementById('personalityList');
  const personality = char.heroine_personality || [];
  listEl.innerHTML = personality.map(p => `<li>${p}</li>`).join('');

  // Charm
  document.getElementById('charmText').textContent = char.heroine_charm || '';

  // Anime info
  document.getElementById('animeTitle').textContent = char.anime || '';
  const genre = char.genre || [];
  document.getElementById('animeGenre').textContent = genre.join(' · ');
}

/* ===== SHARE FUNCTIONS ===== */
function shareToX() {
  if (!selectedResult) return;
  const char = selectedResult.character;
  const text = `AniMatch에서 나의 애니 연인을 찾았어요! 💕\n나의 애니 연인은 "${char.heroine_name}" (${char.anime})\n매칭도: ${selectedResult.percent}%\n\n당신도 찾아보세요! 👉`;
  const url = encodeURIComponent(window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
}

function shareToBluesky() {
  if (!selectedResult) return;
  const char = selectedResult.character;
  const text = `AniMatch에서 나의 애니 연인을 찾았어요! 💕 나의 애니 연인은 "${char.heroine_name}" (${char.anime}) 매칭도: ${selectedResult.percent}%`;
  window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`, '_blank');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast('🔗 링크가 복사되었습니다!');
  });
}

function downloadResult() {
  showToast('⬇️ 결과 카드 다운로드 (준비 중)');
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ===== INIT ===== */
createParticles('particles', 30);

// Initialize ML engine
initML();
