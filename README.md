# AniMatch

**AI가 당신과 닮은 애니메이션 주인공을 찾고, 운명의 히로인을 매칭해드립니다.**

사용자가 사진을 업로드하면 CLIP(ViT-B/32) 모델이 브라우저에서 직접 얼굴 특징을 분석하고, 27명의 애니메이션 주인공 중 가장 닮은 캐릭터를 찾아 그의 연인 캐릭터를 매칭해주는 웹 앱입니다.

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
  (vs 27 pre-computed embeddings)
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
| UI | HTML / CSS / Vanilla JS (SPA) |
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
| Schema | animes(28) + characters(56) + analysis_logs |
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
├── index.html                 # SPA 메인 (4개 화면)
├── app.js                     # ML 추론 + UI 로직
├── style.css                  # 전체 스타일
│
├── public/
│   ├── embeddings.json        # 27 캐릭터 × 512d 임베딩
│   └── models/
│       ├── clip-image-encoder-q8.onnx    # INT8 양자화 (85MB)
│       ├── clip-image-encoder.onnx       # FP32 원본 (335MB)
│       └── preprocess_config.json
│
├── db/
│   ├── animatch.db            # SQLite DB
│   ├── schema.sql             # 테이블 정의
│   ├── seed.sql               # 28작품 56캐릭터 시드
│   ├── seed_generator.js      # 시드 생성 스크립트
│   ├── fetch_images.js        # AniList API 이미지 수집
│   └── fetch_images_retry.js  # 재시도 스크립트
│
├── ml/
│   ├── generate_embeddings.py # CLIP 임베딩 생성
│   ├── export_clip_onnx.py    # ONNX 모델 변환
│   ├── quantize_model.py      # INT8 양자화
│   ├── enrich_embeddings.py   # 임베딩 데이터 보강
│   └── requirements.txt
│
└── docs/
    ├── tech_stack.md           # 기술 스택 상세
    └── anime_character_db.md   # 캐릭터 DB 설계 (62작품)
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
# 프로젝트 루트에서
python3 -m http.server 8080
# → http://localhost:8080
```

---

## Character Database

| 구분 | 작품 수 | 캐릭터 수 |
|------|---------|-----------|
| 남성향 (주인공♂ → 히로인♀) | 18 | 36 |
| 여성향 (주인공♀ → 히어로♂) | 10 | 20 |
| **Phase 1 합계** | **28** | **56** |
| **계획 전체** | **62** | **124** |

### Tier 분류
- **Tier 1 (인기작)** — SAO, Re:Zero, 프루츠 바스켓, 아오하라이드 등
- **Tier 2 (발견)** — 슈타인즈 게이트, 메이드사마!, 카미사마 키스 등
- **Tier 3 (트렌드)** — 프리렌, 약사의 혼잣말, 블루 록 등

---

## Milestones & Phases

### Phase 1 — Prototype (Current)
> **목표**: 핵심 ML 파이프라인 + 프론트엔드 MVP

- [x] SQLite DB 설계 및 시드 데이터 (28작품 56캐릭터)
- [x] AniList API 캐릭터 이미지 수집
- [x] CLIP 임베딩 생성 (27 protagonist × 512d)
- [x] ONNX 모델 변환 + INT8 양자화 (335MB → 85MB)
- [x] 프론트엔드 SPA (랜딩 → 업로드 → 가챠 로딩 → 결과)
- [x] ONNX Runtime Web 브라우저 추론 연동
- [x] 이미지 가이드라인 피드백 (밝기, 해상도, 얼굴 감지)
- [x] 크롭 기능
- [x] SNS 공유 (X, Bluesky)

### Phase 2 — Enhanced ML
> **목표**: 매칭 정확도 향상 + 얼굴 특화 모델

- [ ] MediaPipe Face Detection 통합 (얼굴 영역 자동 크롭)
- [ ] InsightFace (ArcFace) 얼굴 임베딩 도입
- [ ] AnimeGAN v2 실사→애니 스타일 변환 (시각적 연출)
- [ ] 캐릭터 DB 확장 (62작품 124캐릭터)
- [ ] 캐릭터별 학습 이미지 확보 (10장+/캐릭터)
- [ ] 매칭 알고리즘 고도화 (얼굴 특징 가중치 조정)

### Phase 3 — React Migration
> **목표**: 프로덕션 프론트엔드로 전환

- [ ] React 19 + TypeScript + Vite 6 마이그레이션
- [ ] CSS Modules 전환
- [ ] Framer Motion 가챠 애니메이션 강화
- [ ] React Router v7 라우팅
- [ ] Zustand 상태관리
- [ ] react-image-crop 크롭 기능 개선
- [ ] i18n (한국어 / English)

### Phase 4 — Backend & Deploy
> **목표**: Cloudflare 풀스택 배포

- [ ] Cloudflare Workers API (Hono)
- [ ] Cloudflare D1 DB 마이그레이션
- [ ] Cloudflare R2 이미지/모델 호스팅
- [ ] Cloudflare KV 세션 캐시
- [ ] Cloudflare Pages 프론트엔드 배포
- [ ] 커스텀 도메인 + SSL

### Phase 5 — Monetization & Growth
> **목표**: 수익화 + 사용자 확대

- [ ] Google AdSense 광고 통합
- [ ] Google Analytics 4 이벤트 트래킹
- [ ] OG 이미지 동적 생성 (결과 카드)
- [ ] 결과 카드 이미지 다운로드
- [ ] SEO 최적화
- [ ] Sentry 에러 트래킹

### Phase 6 — Social & Engagement
> **목표**: 소셜 기능 + 재방문 유도

- [ ] 결과 히스토리 저장
- [ ] 인기 매칭 랭킹
- [ ] 시즌/이벤트 캐릭터 추가
- [ ] 커뮤니티 기능 (결과 댓글)
- [ ] 푸시 알림 (신규 캐릭터 추가 시)

### Phase 7 — Continuous Operation
> **목표**: 지속 운영 파이프라인

- [ ] 분기별 신작 캐릭터 추가 파이프라인
- [ ] A/B 테스트 (매칭 알고리즘, UI)
- [ ] 사용자 피드백 기반 매칭 튜닝
- [ ] 성능 모니터링 + 자동 스케일링

---

## ML Model Performance

| 지표 | 값 |
|------|-----|
| 모델 | CLIP ViT-B/32 (OpenAI) |
| 임베딩 차원 | 512 |
| FP32 모델 크기 | 335 MB |
| INT8 모델 크기 | 85 MB (75% 감소) |
| FP32 ↔ INT8 유사도 | 0.993 |
| 브라우저 추론 시간 | ~200-500ms (WASM) |
| 전처리 | Center crop → 224×224, CLIP normalize |

---

## License

Private — All rights reserved.

---

> Built with CLIP, ONNX Runtime Web, and a love for anime.
