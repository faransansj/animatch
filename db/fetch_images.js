#!/usr/bin/env node
/**
 * AniMatch — AniList API Image Collector
 * Fetches character images from AniList GraphQL API
 * Updates the local SQLite database with image URLs
 * 
 * Usage: node fetch_images.js
 */

const https = require('https');
const { execSync } = require('child_process');

const DB_PATH = './animatch.db';

// AniList GraphQL endpoint
const ANILIST_URL = 'https://graphql.anilist.co';

// Rate limiting: AniList allows 90 req/min
const DELAY_MS = 800;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function graphqlRequest(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query, variables });
        const options = {
            hostname: 'graphql.anilist.co',
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Accept': 'application/json',
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.errors) {
                        reject(new Error(JSON.stringify(parsed.errors)));
                    } else {
                        resolve(parsed.data);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Search for a character by name and anime title
const SEARCH_CHARACTER_QUERY = `
query ($charName: String, $animeName: String) {
  Page(page: 1, perPage: 5) {
    characters(search: $charName) {
      id
      name {
        full
        native
      }
      image {
        large
        medium
      }
      media(sort: POPULARITY_DESC, perPage: 3) {
        nodes {
          title {
            romaji
            english
            native
          }
        }
      }
    }
  }
}
`;

// Search anime and get characters
const SEARCH_ANIME_QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
    }
    characters(sort: FAVOURITES_DESC, perPage: 20) {
      nodes {
        id
        name {
          full
          native
        }
        image {
          large
          medium
        }
      }
    }
  }
}
`;

function dbQuery(sql) {
    try {
        const result = execSync(`sqlite3 -json "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
        return JSON.parse(result || '[]');
    } catch (e) {
        return [];
    }
}

function dbExec(sql) {
    execSync(`sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
}

function normalizeForCompare(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[・\s\-_:：！!？?、。,\.]/g, '')
        .replace(/[ぁ-ん]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60)) // hiragana to katakana
        .trim();
}

function nameMatch(dbName, apiName) {
    if (!dbName || !apiName) return false;
    const a = normalizeForCompare(dbName);
    const b = normalizeForCompare(apiName);
    // Exact or contains
    return a === b || a.includes(b) || b.includes(a);
}

async function fetchCharacterImage(charNameJp, charNameEn, animeTitle) {
    // Try Japanese name first
    const searchName = charNameJp || charNameEn;
    if (!searchName) return null;

    try {
        const data = await graphqlRequest(SEARCH_CHARACTER_QUERY, {
            charName: searchName
        });

        const characters = data?.Page?.characters || [];

        // Try to match by name
        for (const char of characters) {
            const fullName = char.name?.full || '';
            const nativeName = char.name?.native || '';

            if (nameMatch(charNameJp, nativeName) || nameMatch(charNameEn, fullName)) {
                return char.image?.large || char.image?.medium || null;
            }
        }

        // If no exact match, return first result if it seems reasonable
        if (characters.length > 0) {
            return characters[0].image?.large || characters[0].image?.medium || null;
        }
    } catch (e) {
        console.error(`  ⚠️ API error for ${searchName}: ${e.message}`);
    }

    return null;
}

async function fetchAnimeImage(animeTitleJp, animeTitleEn) {
    const searchTitle = animeTitleEn || animeTitleJp;
    if (!searchTitle) return { coverImage: null, characters: [] };

    try {
        const data = await graphqlRequest(SEARCH_ANIME_QUERY, {
            search: searchTitle
        });

        const media = data?.Media;
        if (!media) return { coverImage: null, characters: [] };

        return {
            coverImage: media.coverImage?.extraLarge || media.coverImage?.large || null,
            anilistId: media.id,
            characters: media.characters?.nodes || []
        };
    } catch (e) {
        console.error(`  ⚠️ API error for anime ${searchTitle}: ${e.message}`);
        return { coverImage: null, characters: [] };
    }
}

async function main() {
    console.log('🎌 AniMatch — AniList Image Collector\n');

    // Get all animes
    const animes = dbQuery("SELECT id, title_ko, title_jp, title_en FROM animes ORDER BY id");
    console.log(`📋 Found ${animes.length} animes to process\n`);

    let totalUpdated = 0;
    let failures = [];

    for (const anime of animes) {
        console.log(`\n🔍 [${anime.id}] ${anime.title_ko} (${anime.title_en || anime.title_jp})`);

        // Fetch anime data (cover + characters)
        const animeData = await fetchAnimeImage(anime.title_jp, anime.title_en);
        await sleep(DELAY_MS);

        // Update anime cover image & anilist ID
        if (animeData.coverImage) {
            const escapedUrl = animeData.coverImage.replace(/'/g, "''");
            dbExec(`UPDATE animes SET image_url = '${escapedUrl}', anilist_id = ${animeData.anilistId || 'NULL'}, updated_at = datetime('now') WHERE id = ${anime.id}`);
            console.log(`  ✅ Anime cover: ${animeData.coverImage.substring(0, 60)}...`);
        }

        // Get characters for this anime
        const chars = dbQuery(`SELECT id, name_ko, name_jp, name_en, role FROM characters WHERE anime_id = ${anime.id}`);

        for (const char of chars) {
            console.log(`  🔎 ${char.role === 'protagonist' ? '주인공' : '히로인'}: ${char.name_ko}...`);

            // First try to find in the anime's character list
            let imageUrl = null;

            if (animeData.characters && animeData.characters.length > 0) {
                for (const apiChar of animeData.characters) {
                    const nativeName = apiChar.name?.native || '';
                    const fullName = apiChar.name?.full || '';
                    if (nameMatch(char.name_jp, nativeName) || nameMatch(char.name_en, fullName)) {
                        imageUrl = apiChar.image?.large || apiChar.image?.medium || null;
                        break;
                    }
                }
            }

            // If not found in anime data, search directly
            if (!imageUrl) {
                imageUrl = await fetchCharacterImage(char.name_jp, char.name_en);
                await sleep(DELAY_MS);
            }

            if (imageUrl) {
                const escapedUrl = imageUrl.replace(/'/g, "''");
                dbExec(`UPDATE characters SET image_url = '${escapedUrl}', updated_at = datetime('now') WHERE id = ${char.id}`);
                console.log(`    ✅ ${imageUrl.substring(0, 60)}...`);
                totalUpdated++;
            } else {
                console.log(`    ❌ No image found`);
                failures.push(`${char.name_ko} (${anime.title_ko})`);
            }
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Updated: ${totalUpdated} character images`);
    if (failures.length > 0) {
        console.log(`❌ Failed: ${failures.length} characters`);
        failures.forEach(f => console.log(`   - ${f}`));
    }

    // Summary
    const stats = dbQuery("SELECT COUNT(*) as total, SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as with_image FROM characters");
    console.log(`\n📊 DB Status: ${stats[0]?.with_image || 0}/${stats[0]?.total || 0} characters have images`);
}

main().catch(console.error);
