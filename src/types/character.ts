export interface CharacterEmbedding {
  protagonist: string;
  protagonist_en: string;
  heroine_name: string;
  heroine_name_en: string;
  heroine_emoji: string;
  heroine_color: string;
  heroine_quote: string;
  heroine_quote_en: string;
  heroine_tags: string[];
  heroine_tags_en: string[];
  heroine_personality: string[];
  heroine_personality_en: string[];
  heroine_charm: string;
  heroine_charm_en: string;
  anime: string;
  anime_en: string;
  genre: string[];
  genre_en: string[];
  orientation: 'male' | 'female';
  tier: number;
  embedding: number[];
  arcface_embedding?: number[];
}

export interface EmbeddingsData {
  model: string;
  embedding_dim: number;
  count: number;
  characters: CharacterEmbedding[];
}
