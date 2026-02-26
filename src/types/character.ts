export interface CharacterEmbedding {
  // Anime Information
  anime: string;
  anime_en: string;
  anime_ja?: string;
  anime_zh_tw?: string;
  genre: string[];
  genre_en: string[];
  genre_ja?: string[];
  genre_zh_tw?: string[];

  // Heroine Information
  heroine_id: number;
  heroine_name: string;
  heroine_name_en: string;
  heroine_name_ja?: string;
  heroine_name_zh_tw?: string;
  heroine_image: string;
  heroine_personality: string[];
  heroine_personality_en: string[];
  heroine_personality_ja?: string[];
  heroine_personality_zh_tw?: string[];
  heroine_charm: string;
  heroine_charm_en: string;
  heroine_charm_ja?: string;
  heroine_charm_zh_tw?: string;
  heroine_quote: string;
  heroine_quote_en: string;
  heroine_quote_ja?: string;
  heroine_quote_zh_tw?: string;
  heroine_tags: string[];
  heroine_tags_en: string[];
  heroine_tags_ja?: string[];
  heroine_tags_zh_tw?: string[];
  heroine_color: string;
  heroine_emoji: string;

  // Other
  orientation: 'male' | 'female';
  tier: number;
  protagonist: string;
  protagonist_en: string;
  embedding: number[];
  arcface_embedding?: number[];
}

export interface EmbeddingsData {
  model: string;
  embedding_dim: number;
  count: number;
  characters: CharacterEmbedding[];
}
