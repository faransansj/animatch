#!/usr/bin/env node
/**
 * AniMatch — Retry missing images
 * Only fetches images for characters that don't have one yet
 * Uses longer delays to avoid rate limiting
 */

const https = require('https');
const { execSync } = require('child_process');
const DB_PATH = './animatch.db';
const DELAY_MS = 2000; // 2s between requests

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function gql(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query, variables });
        const req = https.request({
            hostname: 'graphql.anilist.co', path: '/', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'Accept': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const p = JSON.parse(body);
                    if (p.errors) reject(new Error(p.errors[0]?.message || 'API Error'));
                    else resolve(p.data);
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function db(sql) {
    try {
        return JSON.parse(execSync(`sqlite3 -json "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' }) || '[]');
    } catch { return []; }
}
function dbExec(sql) { execSync(`sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' }); }

const ANIME_Q = `query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    coverImage { extraLarge large }
    characters(sort: FAVOURITES_DESC, perPage: 25) {
      nodes { id name { full native } image { large medium } }
    }
  }
}`;

const CHAR_Q = `query ($search: String) {
  Page(page: 1, perPage: 5) {
    characters(search: $search) {
      id name { full native } image { large medium }
    }
  }
}`;

function norm(s) { return (s || '').toLowerCase().replace(/[\s・\-_]/g, ''); }
function match(a, b) { if (!a || !b) return false; const x = norm(a), y = norm(b); return x === y || x.includes(y) || y.includes(x); }

async function main() {
    // Get animes with missing character images
    const missing = db(`SELECT c.id, c.name_ko, c.name_jp, c.name_en, c.role, a.id as anime_id, a.title_ko, a.title_jp, a.title_en FROM characters c JOIN animes a ON c.anime_id = a.id WHERE c.image_url IS NULL ORDER BY a.id`);

    console.log(`🔄 Retrying ${missing.length} characters with missing images (2s delay)\n`);

    let updated = 0;
    let processedAnimes = new Set();
    let animeCache = {};

    for (const char of missing) {
        // Skip audience POV characters
        if (char.name_ko === '(관객 시점)') {
            console.log(`  ⏭️ Skipping audience POV: ${char.name_ko}`);
            continue;
        }

        // Fetch anime characters if not cached
        if (!processedAnimes.has(char.anime_id)) {
            console.log(`\n🔍 Fetching: ${char.title_en || char.title_ko}`);
            try {
                const data = await gql(ANIME_Q, { search: char.title_en || char.title_jp });
                animeCache[char.anime_id] = data?.Media?.characters?.nodes || [];

                // Update anime cover if missing
                const cover = data?.Media?.coverImage?.extraLarge || data?.Media?.coverImage?.large;
                if (cover) {
                    dbExec(`UPDATE animes SET image_url = '${cover.replace(/'/g, "''")}', anilist_id = ${data?.Media?.id || 'NULL'}, updated_at = datetime('now') WHERE id = ${char.anime_id} AND image_url IS NULL`);
                }
            } catch (e) {
                console.log(`  ⚠️ ${e.message}`);
                animeCache[char.anime_id] = [];
            }
            processedAnimes.add(char.anime_id);
            await sleep(DELAY_MS);
        }

        // Try to find in anime's character list
        let imgUrl = null;
        const apiChars = animeCache[char.anime_id] || [];
        for (const ac of apiChars) {
            if (match(char.name_jp, ac.name?.native) || match(char.name_en, ac.name?.full)) {
                imgUrl = ac.image?.large || ac.image?.medium;
                break;
            }
        }

        // Direct search if not found
        if (!imgUrl) {
            const searchName = char.name_en || char.name_jp;
            if (searchName) {
                try {
                    const data = await gql(CHAR_Q, { search: searchName });
                    const results = data?.Page?.characters || [];
                    if (results.length > 0) {
                        // Try name match first
                        for (const r of results) {
                            if (match(char.name_jp, r.name?.native) || match(char.name_en, r.name?.full)) {
                                imgUrl = r.image?.large || r.image?.medium;
                                break;
                            }
                        }
                        // Fallback to first result
                        if (!imgUrl) imgUrl = results[0]?.image?.large || results[0]?.image?.medium;
                    }
                } catch (e) {
                    console.log(`  ⚠️ Search failed: ${e.message}`);
                }
                await sleep(DELAY_MS);
            }
        }

        if (imgUrl) {
            dbExec(`UPDATE characters SET image_url = '${imgUrl.replace(/'/g, "''")}', updated_at = datetime('now') WHERE id = ${char.id}`);
            console.log(`  ✅ ${char.name_ko}: ${imgUrl.substring(0, 50)}...`);
            updated++;
        } else {
            console.log(`  ❌ ${char.name_ko}: no image found`);
        }
    }

    console.log('\n' + '='.repeat(40));
    console.log(`✅ Updated: ${updated} images`);
    const stats = db("SELECT COUNT(*) as t, SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as i FROM characters");
    console.log(`📊 Total: ${stats[0]?.i}/${stats[0]?.t} characters have images`);
}

main().catch(console.error);
