# AniMatch

**AI가 당신과 닮은 애니메이션 주인공을 찾고, 운명의 히로인을 매칭해드립니다.**

사용자가 사진을 업로드하면 CLIP(ViT-B/32) 모델이 브라우저에서 직접 얼굴 특징을 분석하고, 47명의 애니메이션 주인공 중 가장 닮은 캐릭터를 찾아 그의 연인 캐릭터를 매칭해주는 웹 앱입니다.

---

## How It Works

```
사용자 사진 업로드
       ↓
┌─────────────────────────────┐
│  Browser (ONNX Runtime Web) │
│                             │
│  Center Crop → 224×224      │
│  CLIP Normalize (mean/std)  │
│  ViT-B/32 Image Encoder     │
│        ↓                    │
│  512-dim Embedding          │
└──────────┬──────────────────┘
           ↓
  Cosine Similarity Search
  (vs 47 pre-computed embeddings)
           ↓
  Best Match → Heroine Result
  + Gacha-style reveal animation
```

- 모든 추론은 **브라우저에서 실행** (서버 전송 없음)
- INT8 양자화 모델 사용 (335MB → 85MB, 품질 손실 < 1%)
- 모델 로딩 실패 시 자동으로 랜덤 매칭으로 fallback

---

## Tech Stack

### Frontend
| 항목 | 기술 |
|------|------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| State | Zustand |
| Routing | React Router DOM v7 |
| Animation | Framer Motion |
| i18n | react-i18next (ko/en) |
| Styling | CSS Modules |
| ML Runtime | ONNX Runtime Web 1.21 (WASM) |
| ML Model | CLIP ViT-B/32 (OpenAI, INT8 quantized) |
| Font | Pretendard Variable, Outfit |

### ML Pipeline (Python)
| 항목 | 기술 |
|------|------|
| Model | open_clip_torch (ViT-B-32) |
| Framework | PyTorch → ONNX Export (opset 18) |
| Quantization | onnxruntime.quantization (Dynamic INT8) |
| Image Processing | Pillow, NumPy |

### Database
| 항목 | 기술 |
|------|------|
| Engine | SQLite (Cloudflare D1 호환) |
| Schema | animes(59) + characters(118) + analysis_logs |
| Image Source | AniList GraphQL API |

### Planned Backend
| 항목 | 기술 |
|------|------|
| API | Cloudflare Workers + Hono |
| DB | Cloudflare D1 |
| Storage | Cloudflare R2 |
| Hosting | Cloudflare Pages |

---

## Project Structure

```
animatch/
├── index.html                 # Vite 엔트리 포인트
├── package.json               # pnpm 의존성
├── vite.config.ts             # Vite 설정 (chunks, COOP/COEP)
├── tsconfig.json              # TypeScript 설정
│
├── src/
│   ├── App.tsx                # 라우팅 + AnimatePresence
│   ├── main.tsx               # React 엔트리
│   ├── components/
│   │   ├── landing/           # 랜딩 화면
│   │   ├── upload/            # 업로드 + 얼굴감지 + 멀티셀렉터
│   │   ├── loading/           # 가챠 애니메이션
│   │   ├── result/            # 결과 화면
│   │   ├── legal/             # 개인정보처리방침, 이용약관
│   │   └── shared/            # Header, Footer, LangToggle, Toast, AdBanner
│   ├── hooks/                 # useMLEngine, useGachaAnimation, useFaceDetection
│   ├── stores/                # Zustand (app, ml, upload, result)
│   ├── ml/                    # CLIP, ArcFace, BlazeFace, 듀얼매칭
│   ├── i18n/                  # react-i18next (ko/en)
│   ├── styles/                # CSS Modules
│   ├── types/                 # TypeScript 타입
│   └── utils/                 # 이미지 처리, 공유, 결과카드 유틸
│
├── public/
│   ├── embeddings.json(.gz)   # 캐릭터 임베딩 (CLIP + ArcFace)
│   ├── robots.txt             # 크롤러 규칙
│   ├── sitemap.xml            # 사이트맵
│   ├── images/
│   │   ├── og-default.webp    # OG 기본 이미지 (1200×630)
│   │   └── tarot/             # 캐릭터 타로카드 이미지 (WebP)
│   └── models/
│       ├── clip-image-encoder-q8.onnx    # CLIP INT8 (85MB)
│       └── mobilefacenet-q8.onnx         # ArcFace INT8
│
├── db/
│   ├── animatch.db            # SQLite DB (59작품 118캐릭터)
│   ├── schema.sql / seed.sql  # 스키마 + 시드
│   └── seed_generator.js      # 시드 생성
│
├── functions/
│   └── _middleware.ts         # Cloudflare Pages 미들웨어 (동적 OG 태그)
│
└── ml/
    ├── generate_embeddings.py       # CLIP 임베딩 생성
    ├── generate_dual_embeddings.py  # 듀얼 임베딩 (CLIP + ArcFace)
    ├── generate_tarot_images.py     # 타로카드 이미지 검증/변환
    ├── generate_og_default.py       # OG 기본 이미지 생성
    ├── generate_og_data.py          # 미들웨어용 캐릭터 데이터 생성
    ├── export_arcface_onnx.py       # ArcFace ONNX 변환
    ├── quantize_arcface.py          # ArcFace INT8 양자화
    └── requirements.txt
```

---

## Development

### ML Pipeline 실행

```bash
cd ml
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 1. 캐릭터 임베딩 생성
python generate_embeddings.py

# 2. ONNX 모델 변환
python export_clip_onnx.py

# 3. INT8 양자화
python quantize_model.py
```

### 로컬 실행

```bash
pnpm install
pnpm dev
# → http://localhost:5173
```

---

## Character Database

| 구분 | 작품 수 | 캐릭터 수 | 임베딩 |
|------|---------|-----------|--------|
| 남성향 (주인공♂ → 히로인♀) | 31 | 62 | 30 |
| 여성향 (주인공♀ → 히어로♂) | 28 | 56 | 17 |
| **Phase 2a 합계** | **59** | **118** | **47** |
| **계획 전체** | **62** | **124** | - |

- 여성향 11작품은 관객 시점 주인공 (임베딩 불가 → 랜덤 매칭)

### Tier 분류
- **Tier 1 (인기작)** — SAO, Re:Zero, 프루츠 바스켓, 아오하라이드, 히어로 아카데미아, 진격의 거인 등
- **Tier 2 (발견)** — 슈타인즈 게이트, 메이드사마!, 카미사마 키스, 치하야후루 등
- **Tier 3 (트렌드)** — 프리렌, 약사의 혼잣말, 블루 록, 단델 등

---

## Milestones & Phases

### Phase 1 — Prototype (Complete)
> **목표**: 핵심 ML 파이프라인 + 프론트엔드 MVP

- [x] SQLite DB 설계 및 시드 데이터
- [x] AniList API 캐릭터 이미지 수집
- [x] CLIP 임베딩 생성
- [x] ONNX 모델 변환 + INT8 양자화 (335MB → 85MB)
- [x] 프론트엔드 SPA (랜딩 → 업로드 → 가챠 로딩 → 결과)
- [x] ONNX Runtime Web 브라우저 추론 연동
- [x] 이미지 가이드라인 피드백 (밝기, 해상도, 얼굴 감지)
- [x] 크롭 기능
- [x] SNS 공유 (X, Bluesky)

### Phase 2a — 매칭 정확도 기반 강화 (Complete)
> 신규 모델 없이, 기존 CLIP 파이프라인 위에서 데이터 확장 + 알고리즘 개선

- [x] 캐릭터 DB 확장 (28→59작품, 56→118캐릭터)
  - [x] `anime_character_db.md` 기반 seed.sql 확장 (31작품 추가)
  - [x] AniList API 신규 캐릭터 이미지 수집 (105/118)
  - [x] 확장 캐릭터 CLIP 임베딩 생성 (47 embeddings)
- [ ] 멀티 이미지 임베딩 (캐릭터당 5장+ 평균 벡터)
  - [ ] 수집 스크립트 작성
  - [x] `generate_embeddings.py` 다중 이미지 인프라 구축
- [x] 매칭 알고리즘 개선 (Tier 가중 스코어링, Top-3 후보 시각화, 신뢰도 지표)
- [x] embeddings.json 최적화 (gzip 압축, 265KB → 93KB)

### Phase 2b — 얼굴 감지 자동화 (Complete)
> MediaPipe BlazeFace (<1MB) 브라우저 SDK로 자동 얼굴 크롭

- [x] MediaPipe Face Detection 통합 (`@mediapipe/tasks-vision`)
- [x] 자동 크롭 → 수동 크롭 fallback 통합
- [x] 다중 얼굴 감지 시 선택 UI
- [x] 얼굴 미감지 시 가이드라인 피드백 강화

### Phase 2c — 얼굴 특화 임베딩 (Complete)
> MobileFaceNet(ArcFace) 경량 모델 브라우저 실행 가능성 검증

- [x] MobileFaceNet ONNX 변환 + INT8 양자화 (목표: <15MB, <1s)
- [x] CLIP vs ArcFace 매칭 정확도 A/B 비교
- [x] 듀얼 임베딩 전략 검토 (0.6·CLIP + 0.4·ArcFace)
- [x] AnimeGAN v2 → CSS/Canvas 간단 필터로 대체 (Phase 4 백엔드 이관)

### Phase 3 — React Migration (Complete)
> **목표**: 프로덕션 프론트엔드로 전환

- [x] React 19 + TypeScript + Vite 6 마이그레이션
- [x] CSS Modules 전환
- [x] Framer Motion 가챠 애니메이션 강화
- [x] React Router v7 라우팅
- [x] Zustand 상태관리
- [x] react-image-crop 크롭 기능 개선
- [x] i18n (한국어 / English)

### Phase 4 — Backend & Deploy (Complete)
> **목표**: Cloudflare 풀스택 배포

- [x] Cloudflare Workers API (Hono) — analytics log/trending API
- [x] Cloudflare D1 DB 마이그레이션 — analysis_logs 테이블
- [ ] Cloudflare R2 이미지/모델 호스팅
- [x] Cloudflare KV 세션 캐시 — rate limiting (30 req/min)
- [x] Cloudflare Pages 프론트엔드 배포
- [ ] 커스텀 도메인 + SSL
- [x] 개인정보처리방침 + 이용약관 페이지 (ko/en)

### Phase 5 — UX 개선 & Monetization (In Progress)
> **목표**: 사용자 경험 최적화 + 수익화 + 사용자 확대

**UX 개선**
- [x] AI 모델 백그라운드 로딩 (블로킹 오버레이 제거, GachaScreen에서 대기)
- [x] 카메라 촬영 기능 (모바일 대응)
- [x] OG 이미지 동적 생성 (Cloudflare Pages 미들웨어 + 캐릭터별 동적 OG 태그)
- [x] 결과 카드 이미지 다운로드 (Canvas 2D, 1080×1350 PNG)
- [x] 타로카드 이미지 파이프라인 (프롬프트 생성 + 검증 + WebP 변환 스크립트)

**수익화**
- [x] Google AdSense 광고 통합 (AdBanner 컴포넌트, pub ID 발급 후 활성화)
- [ ] Google Analytics 4 이벤트 트래킹
- [x] SEO 최적화 (robots.txt, sitemap.xml, JSON-LD 구조화 데이터, OG/Twitter Card 메타 태그)
- [ ] Sentry 에러 트래킹

### Phase 6 — Social & Engagement (canceled)
~> **목표**: 소셜 기능 + 재방문 유도~

~- [ ] 결과 히스토리 저장~
~- [ ] 인기 매칭 랭킹~
~- [ ] 시즌/이벤트 캐릭터 추가~
~- [ ] 커뮤니티 기능 (결과 댓글)~
~- [ ] 푸시 알림 (신규 캐릭터 추가 시)~

### Phase 7 — Mobile Architecture Optimization (Complete)
> **목표**: 모바일 환경 체감 성능 및 안정성 상향 (UI 프리징 차단 및 OOM 방지)

- [x] HTML5 Canvas 기반 업로드 이미지 즉시 리사이징 (메모리 스파이크 억제)
- [x] Web Worker를 이용한 ML 추론 물리적 분리 (메인 스레드 블로킹 방지)
- [x] Service Worker 및 Cache Storage 기반 모델 파일 영구 캐싱
- [x] 유휴 시간 활용 모델 백그라운드 사전 로드(Pre-load)

### Phase 8 — Continuous Operation
> **목표**: 지속 운영 파이프라인

- [ ] 분기별 신작 캐릭터 추가 파이프라인
- [ ] A/B 테스트 (매칭 알고리즘, UI)
- [ ] 사용자 피드백 기반 매칭 튜닝
- [ ] 성능 모니터링 + 자동 스케일링

---

## ML Model Performance

### CLIP (전체 이미지 매칭)
| 지표 | 값 |
|------|-----|
| 모델 | CLIP ViT-B/32 (OpenAI) |
| 임베딩 차원 | 512 |
| 임베딩 캐릭터 수 | 47 (59작품 중 관객시점 제외) |
| FP32 모델 크기 | 335 MB |
| INT8 모델 크기 | 85 MB (75% 감소) |
| FP32 ↔ INT8 유사도 | 0.993 |
| 브라우저 추론 시간 | ~200-500ms (WASM) |
| 전처리 | Center crop → 224×224, CLIP normalize |

### ArcFace (얼굴 특화 매칭)
| 지표 | 값 |
|------|-----|
| 모델 | MobileFaceNet (ArcFace) |
| 임베딩 차원 | 512 |
| INT8 모델 크기 | <15 MB |
| 전처리 | 112×112, mean=0.5, std=0.5 |
| 듀얼 매칭 | 0.6·CLIP + 0.4·ArcFace |
| Fallback | CLIP-only → 랜덤 매칭 |

### 얼굴 감지
| 지표 | 값 |
|------|-----|
| 모델 | MediaPipe BlazeFace SHORT_RANGE |
| 크기 | <1 MB |
| 자동 크롭 | 30% 패딩 |
| Fallback | GPU → CPU |

### 임베딩 데이터
| 지표 | 값 |
|------|-----|
| 임베딩 파일 크기 | 265 KB (gzip: 93 KB) |
| 번들 크기 | ~151KB initial gzip |

---

## License

Private — All rights reserved.

---

> Built with CLIP, ONNX Runtime Web, and a love for anime.
