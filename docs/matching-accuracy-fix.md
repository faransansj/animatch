# 매칭 정확도 개선 — 문제 분석 및 해결 기록

## 증상

모든 입력 이미지(사람 얼굴, 고양이, 풍경 등)에 대해 매칭 결과가 **90% 후반대**로 표시됨.
사실상 어떤 이미지를 넣어도 "완벽한 매칭"으로 보이는 문제.

---

## 근본 원인 분석

### 1. CLIP 임베딩의 극심한 밀집 (Embedding Clustering)

47개 캐릭터 CLIP 임베딩의 pairwise 코사인 유사도를 분석한 결과:

| 지표 | 값 |
|------|-----|
| Min pairwise similarity | 0.607 |
| Max pairwise similarity | 1.000 |
| **Mean** | **0.759** |
| **Std** | **0.049** |

모든 캐릭터가 512차원 공간에서 **좁은 영역에 밀집**되어 있음.
이는 CLIP이 "애니메이션 캐릭터"라는 **카테고리 레벨의 유사성**을 강하게 인코딩하기 때문.

### 2. 외부 입력과의 유사도 분포

| 입력 유형 | 47캐릭터와의 유사도 범위 | 전체 spread |
|-----------|------------------------|-------------|
| 랜덤 가우시안 벡터 | -0.145 ~ 0.145 | ~0.29 |
| 근접 평균 벡터 | -0.03 ~ 0.25 | ~0.28 |
| 실제 사용자 사진 (추정) | 0.15 ~ 0.25 | **~0.02–0.06** |

어떤 외부 입력이든 47캐릭터에 대해 **거의 동일한 유사도**를 보임.
spread(최고-최저 차이)가 0.02~0.06으로 극히 작음.

### 3. 문제의 정규화 공식

```typescript
// 기존 코드 (matching.ts, dualEmbedding.ts)
const normalized = range > 0.001 ? (s.similarity - min) / range : 1;
percent = Math.round(75 + normalized * 23);
```

**문제점:**
- min-max 정규화로 spread 0.02를 0~1 범위로 확대
- 결과를 75~98% 구간에 매핑
- **1등은 항상 ~98%, 꼴등도 항상 ~75%**
- 입력이 고양이든 풍경이든 동일하게 90%+ 표시

### 4. ArcFace vs CLIP 분별력 비교

| 모델 | Pairwise Mean | Pairwise Std | 분별력 |
|------|--------------|-------------|--------|
| CLIP | 0.759 | 0.049 | 낮음 |
| **ArcFace** | **0.404** | **0.139** | **높음 (3배)** |

ArcFace는 얼굴 특징을 훨씬 잘 구분하며, 두 모델 간 상관관계는 0.146으로 매우 낮음 (서로 다른 정보 포착).

### 5. 데이터 버그: 중복 임베딩

Kaguya Shinomiya와 Miko Iino의 임베딩이 **완전 동일** (cosine sim = 1.000).

**원인:** DB에서 두 작품의 주인공이 동일 캐릭터(Miyuki Shirogane)이며 동일한 이미지 URL 사용:
- ID 13: Miyuki Shirogane (TV) → Kaguya Shinomiya
- ID 79: Miyuki Shirogane (Movie) → Miko Iino
- 두 주인공의 `image_url`이 동일: `b121101-Q8HzKP15At2d.png`

---

## 해결 방안

### A. 정규화 공식 개선 — `similarityToPercent()`

```typescript
// 신규 공식: spread 기반 품질 계수 + 얼굴 감지 보너스
function similarityToPercent(
  rawSim: number,
  allRawSims: number[],
  spreadThresh: number,
  hasFace: boolean,
): number {
  const best = allRawSims[0];
  const worst = allRawSims[allRawSims.length - 1];
  const spread = best - worst;

  // 1. 후보 내 상대 위치 (0~1)
  const relPos = spread > 0.0001 ? (rawSim - worst) / spread : 0.5;

  // 2. Spread 품질 계수 (작은 spread = 불확실 = 낮은 기본 점수)
  const spreadQuality = Math.min(spread / spreadThresh, 1.0);

  // 3. 얼굴 감지 보너스
  const faceBonus = hasFace ? 0.12 : 0;

  // 4. 혼합
  const score = relPos * (0.35 + 0.40 * spreadQuality) + faceBonus;

  // 50~97% 범위로 매핑
  return Math.min(97, Math.max(50, Math.round(50 + score * 47)));
}
```

**핵심 차이점:**
| 항목 | 기존 | 개선 |
|------|------|------|
| 범위 | 75~98% | 50~97% |
| Spread 반영 | 없음 (항상 동일) | spreadQuality로 기본 점수 조절 |
| 얼굴 감지 | 무관 | hasFace=false면 보너스 없음 |
| 비얼굴 입력 | ~98% | ~50~67% |
| 얼굴 입력 (좋은 매칭) | ~98% | ~85~97% |

### B. ArcFace 가중치 상향

```
기존: 0.6 × CLIP + 0.4 × ArcFace
변경: 0.3 × CLIP + 0.7 × ArcFace
```

ArcFace의 분별력이 CLIP의 3배이므로, 얼굴 감지 시 ArcFace에 더 의존.
Dual matching의 spread threshold도 0.05 → 0.15로 상향 (ArcFace의 넓은 분포 반영).

### C. 얼굴 미감지 시 페널티

MediaPipe BlazeFace의 감지 결과를 매칭 파이프라인에 전달:
- `detectedFaces.length > 0` → `hasFace = true` → 12% 보너스
- 얼굴 미감지 → 보너스 없음 → 자연스럽게 50~67% 범위

### D. 중복 임베딩 제거

- `protagonist_id=79` (Miyuki Shirogane Movie → Miko Iino) 항목을 `embeddings.json`에서 제거
- 47 → 46 캐릭터

---

## 예상 결과 비교

### 사람 얼굴 입력 (얼굴 감지 성공, ArcFace 활성)
| 순위 | 기존 % | 개선 % |
|------|--------|--------|
| 1위 | 97~98% | 85~97% |
| 2위 | 91~95% | 70~85% |
| 3위 | 85~92% | 60~75% |

### 비얼굴 입력 (고양이, 풍경 등)
| 순위 | 기존 % | 개선 % |
|------|--------|--------|
| 1위 | 97~98% | 55~67% |
| 2위 | 91~95% | 52~62% |
| 3위 | 85~92% | 50~58% |

---

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/ml/matching.ts` | `similarityToPercent()` 신규, `findBestMatch()`에 hasFace 파라미터 추가 |
| `src/ml/dualEmbedding.ts` | ArcFace 가중치 0.4→0.7, spread threshold 조정, hasFace 전달 |
| `src/hooks/useGachaAnimation.ts` | `detectedFaces` 구독, hasFace를 매칭 함수에 전달 |
| `public/embeddings.json` | Shirogane Movie 중복 제거 (47→46) |

---

## 향후 개선 사항

1. **실사용 데이터 기반 캘리브레이션**: 실제 사용자 사진의 raw similarity 분포를 수집하여 spreadThresh 미세 조정
2. **Miko Iino 별도 임베딩**: Movie 버전 Shirogane의 별도 이미지를 확보하여 재생성
3. **멀티 이미지 임베딩**: 캐릭터당 5장+ 이미지의 평균 벡터 (Phase 2a 미완료 항목)
4. **Confidence 임계값 조정**: ArcFace spread 기반으로 confidence 판정 기준 보정

---

*작성일: 2026-02-19*
