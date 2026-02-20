import { getTarotImageUrl } from './tarot';

interface ResultCardOptions {
  characterName: string;
  animeName: string;
  percent: number;
  heroineId: number;
  heroineEmoji: string;
  heroineColor: string;
  lang: 'ko' | 'en';
}

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const W = isMobile ? 720 : 1080;
const H = isMobile ? 900 : 1350;
const S = W / 1080; // scale factor for coordinates/fonts

function parseGradientColors(css: string): [string, string] {
  const m = css.match(/#[0-9a-fA-F]{6}/g);
  return m && m.length >= 2 ? [m[0] as string, m[1] as string] : ['#1a1040', '#0F172A'];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export async function generateResultCard(options: ResultCardOptions): Promise<Blob> {
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Background gradient
  const [c1, c2] = parseGradientColors(options.heroineColor);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, c1);
  bg.addColorStop(1, c2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dark overlay for readability
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.fillRect(0, 0, W, H);

  // 2. Tarot image (or emoji fallback)
  const imgW = Math.round(660 * S);
  const imgH = Math.round(880 * S);
  const imgX = (W - imgW) / 2;
  const imgY = Math.round(50 * S);

  try {
    const img = await loadImage(getTarotImageUrl(options.heroineId));
    // Rounded clip
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, Math.round(24 * S));
    ctx.clip();
    // Cover fit
    const scale = Math.max(imgW / img.width, imgH / img.height);
    const sw = img.width * scale;
    const sh = img.height * scale;
    ctx.drawImage(img, imgX - (sw - imgW) / 2, imgY - (sh - imgH) / 2, sw, sh);
    ctx.restore();

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, Math.round(24 * S));
    ctx.stroke();
  } catch {
    // Emoji fallback
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    roundRect(ctx, imgX, imgY, imgW, imgH, Math.round(24 * S));
    ctx.font = `${Math.round(200 * S)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(options.heroineEmoji || '💖', W / 2, imgY + imgH / 2);
  }

  // 3. Character name
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F1F5F9';
  ctx.font = `bold ${Math.round(48 * S)}px "Pretendard Variable", "Outfit", sans-serif`;
  ctx.fillText(options.characterName, W / 2, Math.round(990 * S));

  // 4. Anime title
  ctx.fillStyle = '#94A3B8';
  ctx.font = `${Math.round(28 * S)}px "Pretendard Variable", "Outfit", sans-serif`;
  ctx.fillText(options.animeName, W / 2, Math.round(1035 * S));

  // 5. Match percentage bar
  const barW = Math.round(600 * S);
  const barH = Math.round(28 * S);
  const barX = (W - barW) / 2;
  const barY = Math.round(1075 * S);
  // Bar background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  roundRect(ctx, barX, barY, barW, barH, Math.round(14 * S));
  // Bar fill
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, '#FF6B9D');
  fillGrad.addColorStop(1, '#C084FC');
  ctx.fillStyle = fillGrad;
  roundRect(ctx, barX, barY, barW * (options.percent / 100), barH, Math.round(14 * S));

  // Percentage text
  ctx.fillStyle = '#F1F5F9';
  ctx.font = `bold ${Math.round(28 * S)}px "Pretendard Variable", "Outfit", sans-serif`;
  const matchLabel = options.lang === 'ko' ? '매칭' : 'Match';
  ctx.fillText(`${options.percent}% ${matchLabel}`, W / 2, barY + barH + Math.round(42 * S));

  // 6. Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(240 * S), Math.round(1180 * S));
  ctx.lineTo(Math.round(840 * S), Math.round(1180 * S));
  ctx.stroke();

  // 7. Branding
  ctx.fillStyle = '#FF6B9D';
  ctx.font = `bold ${Math.round(26 * S)}px "Outfit", sans-serif`;
  ctx.fillText('AniMatch', W / 2, Math.round(1225 * S));
  ctx.fillStyle = '#64748B';
  ctx.font = `${Math.round(20 * S)}px "Outfit", sans-serif`;
  ctx.fillText('animatch.social', W / 2, Math.round(1260 * S));

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
      1.0,
    );
  });
}
