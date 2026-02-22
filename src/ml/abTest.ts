/**
 * A/B Testing infrastructure for matching algorithm experiments.
 *
 * Experiments are defined as constants (no server needed).
 * Variant assignment is persisted in localStorage.
 */

export interface VariantConfig {
  clipWeight: number;     // CLIP alpha (default 0.3)
  arcfaceWeight: number;  // ArcFace beta (default 0.7)
  spreadThresh: number;   // default 0.15 (dual), 0.05 (clip-only)
  tierWeights: Record<number, number>;
}

interface Experiment {
  id: string;
  variants: Record<string, VariantConfig>;
  weights: number[];  // traffic split, same order as Object.keys(variants)
  active: boolean;
}

const DEFAULT_CONFIG: VariantConfig = {
  clipWeight: 0.3,
  arcfaceWeight: 0.7,
  spreadThresh: 0.15,
  tierWeights: { 1: 1.02, 2: 1.0, 3: 0.98 },
};

/**
 * Active experiments. Add new experiments here.
 * Only one experiment should be active at a time for clean results.
 */
const EXPERIMENTS: Experiment[] = [
  {
    id: 'matching-weights-v2',
    active: true,
    weights: [0.34, 0.33, 0.33],
    variants: {
      control: { ...DEFAULT_CONFIG },
      variant_a_arcface_heavier: {
        clipWeight: 0.1,
        arcfaceWeight: 0.9,
        spreadThresh: 0.15,
        tierWeights: { 1: 1.02, 2: 1.0, 3: 0.98 },
      },
      variant_b_clip_heavier: {
        clipWeight: 0.7,
        arcfaceWeight: 0.3,
        spreadThresh: 0.15,
        tierWeights: { 1: 1.02, 2: 1.0, 3: 0.98 },
      },
    },
  },
];

function getStorageKey(experimentId: string): string {
  return `ab_variant_${experimentId}`;
}

/**
 * Get or assign a variant for the given experiment.
 * Assignment is sticky via localStorage.
 */
export function getVariant(experimentId: string): string {
  const experiment = EXPERIMENTS.find(e => e.id === experimentId);
  if (!experiment || !experiment.active) return 'control';

  const key = getStorageKey(experimentId);

  try {
    const stored = localStorage.getItem(key);
    if (stored && stored in experiment.variants) return stored;
  } catch {
    // localStorage unavailable
  }

  // Assign based on weights
  const variantNames = Object.keys(experiment.variants);
  const rand = Math.random();
  let cumulative = 0;
  let assigned = variantNames[0]!;

  for (let i = 0; i < experiment.weights.length; i++) {
    cumulative += experiment.weights[i]!;
    if (rand < cumulative) {
      assigned = variantNames[i]!;
      break;
    }
  }

  try {
    localStorage.setItem(key, assigned);
  } catch {
    // localStorage unavailable
  }

  return assigned;
}

/**
 * Get the VariantConfig for the current user's assigned variant.
 * Returns undefined if no active experiment matches.
 */
export function getVariantConfig(experimentId: string): VariantConfig | undefined {
  const experiment = EXPERIMENTS.find(e => e.id === experimentId);
  if (!experiment || !experiment.active) return undefined;

  const variant = getVariant(experimentId);
  return experiment.variants[variant];
}

/**
 * Get the active experiment ID, if any.
 */
export function getActiveExperimentId(): string | undefined {
  return EXPERIMENTS.find(e => e.active)?.id;
}

/**
 * Get current variant label for logging (e.g. "matching-weights-v1:treatment_a").
 * Returns empty string if no active experiment.
 */
export function getActiveVariantLabel(): string {
  const experiment = EXPERIMENTS.find(e => e.active);
  if (!experiment) return '';
  const variant = getVariant(experiment.id);
  return `${experiment.id}:${variant}`;
}
