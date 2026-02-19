#!/usr/bin/env python3
"""Analyze character embeddings: pairwise similarities, distribution, random vector comparison."""

import json
import numpy as np
from pathlib import Path

# --- Load data ---------------------------------------------------------------
data = json.load(open(Path(__file__).parent.parent / "public" / "embeddings.json"))
chars = data["characters"]
names = [c["heroine_name_en"] for c in chars]
orientations = [c["orientation"] for c in chars]
N = len(chars)

clip_emb = np.array([c["embedding"] for c in chars], dtype=np.float64)  # (N, 512)
has_arcface = [c["arcface_embedding"] is not None for c in chars]
arcface_emb = np.array(
    [c["arcface_embedding"] if c["arcface_embedding"] else np.zeros(512) for c in chars],
    dtype=np.float64,
)

print(f"Characters: {N}")
print(f"CLIP embeddings: {clip_emb.shape}")
print(f"ArcFace embeddings: {sum(has_arcface)}/{N} have arcface")
print()

# Verify L2 normalization
clip_norms = np.linalg.norm(clip_emb, axis=1)
print(f"CLIP L2 norms -- min: {clip_norms.min():.6f}, max: {clip_norms.max():.6f}, mean: {clip_norms.mean():.6f}")
if sum(has_arcface) > 0:
    af_subset = arcface_emb[np.array(has_arcface)]
    af_norms = np.linalg.norm(af_subset, axis=1)
    print(f"ArcFace L2 norms -- min: {af_norms.min():.6f}, max: {af_norms.max():.6f}, mean: {af_norms.mean():.6f}")
print()

# --- 1. All pairwise cosine similarities (CLIP) -----------------------------
sim_matrix = clip_emb @ clip_emb.T  # (N, N)

triu_idx = np.triu_indices(N, k=1)
pairwise_sims = sim_matrix[triu_idx]
n_pairs = len(pairwise_sims)

print("=" * 70)
print(f"CLIP PAIRWISE COSINE SIMILARITY STATS ({n_pairs} pairs)")
print("=" * 70)
print(f"  Min:    {pairwise_sims.min():.6f}")
print(f"  Max:    {pairwise_sims.max():.6f}")
print(f"  Mean:   {pairwise_sims.mean():.6f}")
print(f"  Median: {np.median(pairwise_sims):.6f}")
print(f"  Std:    {pairwise_sims.std():.6f}")
print(f"  P5:     {np.percentile(pairwise_sims, 5):.6f}")
print(f"  P25:    {np.percentile(pairwise_sims, 25):.6f}")
print(f"  P75:    {np.percentile(pairwise_sims, 75):.6f}")
print(f"  P95:    {np.percentile(pairwise_sims, 95):.6f}")
print()

# Most similar and least similar pairs
most_sim_idx = np.argmax(pairwise_sims)
least_sim_idx = np.argmin(pairwise_sims)
i_max, j_max = triu_idx[0][most_sim_idx], triu_idx[1][most_sim_idx]
i_min, j_min = triu_idx[0][least_sim_idx], triu_idx[1][least_sim_idx]
print(f"Most similar pair:  {names[i_max]} <-> {names[j_max]} = {pairwise_sims[most_sim_idx]:.6f}")
print(f"Least similar pair: {names[i_min]} <-> {names[j_min]} = {pairwise_sims[least_sim_idx]:.6f}")
print()

# Top 10 most similar pairs
top10_idx = np.argsort(pairwise_sims)[-10:][::-1]
print("Top 10 most similar pairs:")
for rank, idx in enumerate(top10_idx, 1):
    i, j = triu_idx[0][idx], triu_idx[1][idx]
    print(f"  {rank:2d}. {names[i]:25s} <-> {names[j]:25s} = {pairwise_sims[idx]:.6f}")
print()

# Bottom 10 least similar pairs
bot10_idx = np.argsort(pairwise_sims)[:10]
print("Bottom 10 least similar pairs:")
for rank, idx in enumerate(bot10_idx, 1):
    i, j = triu_idx[0][idx], triu_idx[1][idx]
    print(f"  {rank:2d}. {names[i]:25s} <-> {names[j]:25s} = {pairwise_sims[idx]:.6f}")
print()

# --- 2. Example characters: similarity to all others ------------------------
print("=" * 70)
print("EXAMPLE CHARACTER SIMILARITIES (sorted)")
print("=" * 70)

example_indices = [0, N // 3, 2 * N // 3]
for idx in example_indices:
    sims = sim_matrix[idx].copy()
    sims[idx] = -999  # exclude self
    order = np.argsort(sims)[::-1]
    print(f"\n{names[idx]} ({orientations[idx]}):")
    print(f"  Most similar:")
    for r, j in enumerate(order[:5], 1):
        print(f"    {r}. {names[j]:25s} ({orientations[j]}) = {sims[j]:.6f}")
    print(f"  Least similar:")
    for r, j in enumerate(order[-3:], 1):
        print(f"    {r}. {names[j]:25s} ({orientations[j]}) = {sims[j]:.6f}")

print()

# --- 3. Male vs Female cluster analysis --------------------------------------
print("=" * 70)
print("ORIENTATION CLUSTER ANALYSIS")
print("=" * 70)

male_idx = [i for i, o in enumerate(orientations) if o == "male"]
female_idx = [i for i, o in enumerate(orientations) if o == "female"]
print(f"Male characters: {len(male_idx)}, Female characters: {len(female_idx)}")

if len(male_idx) > 1:
    male_sims = []
    for i in range(len(male_idx)):
        for j in range(i + 1, len(male_idx)):
            male_sims.append(sim_matrix[male_idx[i], male_idx[j]])
    male_sims = np.array(male_sims)
    print(f"Male-Male sims:     mean={male_sims.mean():.4f}, std={male_sims.std():.4f}, min={male_sims.min():.4f}, max={male_sims.max():.4f}")

if len(female_idx) > 1:
    fem_sims = []
    for i in range(len(female_idx)):
        for j in range(i + 1, len(female_idx)):
            fem_sims.append(sim_matrix[female_idx[i], female_idx[j]])
    fem_sims = np.array(fem_sims)
    print(f"Female-Female sims: mean={fem_sims.mean():.4f}, std={fem_sims.std():.4f}, min={fem_sims.min():.4f}, max={fem_sims.max():.4f}")

if len(male_idx) > 0 and len(female_idx) > 0:
    cross_sims = []
    for i in male_idx:
        for j in female_idx:
            cross_sims.append(sim_matrix[i, j])
    cross_sims = np.array(cross_sims)
    print(f"Male-Female sims:   mean={cross_sims.mean():.4f}, std={cross_sims.std():.4f}, min={cross_sims.min():.4f}, max={cross_sims.max():.4f}")
print()

# --- 4. Random vector comparison ---------------------------------------------
print("=" * 70)
print("RANDOM VECTOR COMPARISON")
print("=" * 70)

np.random.seed(42)

# 4a. Purely random (Gaussian)
print("\n--- Random Gaussian vector (L2 normalized) ---")
rand_results = []
for trial in range(100):
    rv = np.random.randn(512)
    rv /= np.linalg.norm(rv)
    sims = clip_emb @ rv
    rand_results.append(sims)
rand_results = np.array(rand_results)  # (100, N)
all_rand_sims = rand_results.flatten()
print(f"  Over 100 random vectors x {N} characters:")
print(f"  Min:    {all_rand_sims.min():.6f}")
print(f"  Max:    {all_rand_sims.max():.6f}")
print(f"  Mean:   {all_rand_sims.mean():.6f}")
print(f"  Std:    {all_rand_sims.std():.6f}")
print(f"  Spread: {all_rand_sims.max() - all_rand_sims.min():.6f}")

rv = np.random.randn(512)
rv /= np.linalg.norm(rv)
sims = clip_emb @ rv
order = np.argsort(sims)[::-1]
print(f"\n  Single random vector -- top match: {names[order[0]]} ({sims[order[0]]:.6f}), worst: {names[order[-1]]} ({sims[order[-1]]:.6f})")

# 4b. Positive-only random vector
print("\n--- Positive-only random vector (L2 normalized) ---")
pos_results = []
for trial in range(100):
    rv = np.abs(np.random.randn(512))
    rv /= np.linalg.norm(rv)
    sims = clip_emb @ rv
    pos_results.append(sims)
pos_results = np.array(pos_results)
all_pos_sims = pos_results.flatten()
print(f"  Over 100 positive random vectors x {N} characters:")
print(f"  Min:    {all_pos_sims.min():.6f}")
print(f"  Max:    {all_pos_sims.max():.6f}")
print(f"  Mean:   {all_pos_sims.mean():.6f}")
print(f"  Std:    {all_pos_sims.std():.6f}")
print(f"  Spread: {all_pos_sims.max() - all_pos_sims.min():.6f}")

# 4c. Mean-shifted random vector
print("\n--- Mean-shifted random vector (mean of all chars + noise, L2 normalized) ---")
char_mean = clip_emb.mean(axis=0)
char_mean /= np.linalg.norm(char_mean)
shifted_results = []
for trial in range(100):
    rv = char_mean + 0.3 * np.random.randn(512)
    rv /= np.linalg.norm(rv)
    sims = clip_emb @ rv
    shifted_results.append(sims)
shifted_results = np.array(shifted_results)
all_shifted_sims = shifted_results.flatten()
print(f"  Over 100 mean-shifted vectors x {N} characters:")
print(f"  Min:    {all_shifted_sims.min():.6f}")
print(f"  Max:    {all_shifted_sims.max():.6f}")
print(f"  Mean:   {all_shifted_sims.mean():.6f}")
print(f"  Std:    {all_shifted_sims.std():.6f}")
print(f"  Spread: {all_shifted_sims.max() - all_shifted_sims.min():.6f}")
print()

# --- 5. Distribution histogram (text-based) ----------------------------------
print("=" * 70)
print("INTER-CHARACTER SIMILARITY DISTRIBUTION (CLIP)")
print("=" * 70)

bins = np.linspace(pairwise_sims.min() - 0.01, pairwise_sims.max() + 0.01, 21)
hist, bin_edges = np.histogram(pairwise_sims, bins=bins)
max_bar = 50
scale = max_bar / hist.max() if hist.max() > 0 else 1

for i in range(len(hist)):
    lo, hi = bin_edges[i], bin_edges[i + 1]
    bar = "#" * int(hist[i] * scale)
    print(f"  [{lo:+.3f}, {hi:+.3f}) | {bar} {hist[i]}")
print()

# --- 6. ArcFace pairwise analysis (if available) ----------------------------
if sum(has_arcface) > 1:
    print("=" * 70)
    print(f"ARCFACE PAIRWISE COSINE SIMILARITY STATS")
    print("=" * 70)
    af_valid = arcface_emb[np.array(has_arcface)]
    af_names = [n for n, h in zip(names, has_arcface) if h]
    Naf = len(af_valid)
    af_sim = af_valid @ af_valid.T
    af_triu = np.triu_indices(Naf, k=1)
    af_pairs = af_sim[af_triu]
    print(f"  Characters with ArcFace: {Naf}")
    print(f"  Pairs: {len(af_pairs)}")
    print(f"  Min:    {af_pairs.min():.6f}")
    print(f"  Max:    {af_pairs.max():.6f}")
    print(f"  Mean:   {af_pairs.mean():.6f}")
    print(f"  Median: {np.median(af_pairs):.6f}")
    print(f"  Std:    {af_pairs.std():.6f}")

    af_most = np.argmax(af_pairs)
    af_least = np.argmin(af_pairs)
    i_m, j_m = af_triu[0][af_most], af_triu[1][af_most]
    i_l, j_l = af_triu[0][af_least], af_triu[1][af_least]
    print(f"\n  Most similar:  {af_names[i_m]} <-> {af_names[j_m]} = {af_pairs[af_most]:.6f}")
    print(f"  Least similar: {af_names[i_l]} <-> {af_names[j_l]} = {af_pairs[af_least]:.6f}")
    print()

    # CLIP vs ArcFace correlation
    clip_sub = clip_emb[np.array(has_arcface)]
    clip_sub_sim = clip_sub @ clip_sub.T
    clip_sub_pairs = clip_sub_sim[af_triu]
    corr = np.corrcoef(clip_sub_pairs, af_pairs)[0, 1]
    print(f"  CLIP vs ArcFace pairwise similarity correlation: {corr:.4f}")
    print()

print("=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"  The {N} character CLIP embeddings have pairwise similarities")
print(f"  ranging from {pairwise_sims.min():.4f} to {pairwise_sims.max():.4f}")
print(f"  with mean {pairwise_sims.mean():.4f} (std {pairwise_sims.std():.4f}).")
print(f"  A random vector typically gets sims in [{all_rand_sims.min():.4f}, {all_rand_sims.max():.4f}]")
print(f"  with mean {all_rand_sims.mean():.4f}.")
if pairwise_sims.std() < 0.05:
    print(f"  WARNING: Very tight clustering (std={pairwise_sims.std():.4f}) -- embeddings may not differentiate well.")
elif pairwise_sims.std() > 0.15:
    print(f"  Good spread in embeddings (std={pairwise_sims.std():.4f}) -- characters are well-differentiated.")
else:
    print(f"  Moderate clustering (std={pairwise_sims.std():.4f}) -- reasonable differentiation.")
