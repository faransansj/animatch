import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'animatch.db')

# Translation Mappings
TAG_MAP = {
    "순정": "Romance", "학원": "School", "일상": "Slice of Life", "판타지": "Fantasy",
    "이세계": "Isekai", "액션": "Action", "코미디": "Comedy", "스릴러": "Thriller",
    "미스터리": "Mystery", "치유": "Healing", "츤데레": "Tsundere", "쿨데레": "Kuudere",
    "얀데레": "Yandere", "메가데레": "Megadere", "단발": "Short Hair", "장발": "Long Hair",
    "안경": "Glasses", "동아리": "Club", "소꿉친구": "Childhood Friend", "요리": "Cooking",
    "음악": "Music", "스포츠": "Sports", "전투": "Battle", "성장": "Growth",
    "닌자": "Ninja", "피겨스케이팅": "Figure Skating", "댄스": "Dance", "테니스": "Tennis",
    "다크판타지": "Dark Fantasy", "로맨틱코미디": "RomCom", "집착": "Obsession",
    "메이드": "Maid", "비밀": "Secret", "헌신": "Devotion", "가정적": "Domestic",
    "눈매": "Sharp Eyes", "소형": "Petite", "전투적": "Aggressive", "서포트": "Support",
    "활발": "Energetic", "단정": "Neat", "츤츤": "Tsun-Tsun", "데레데레": "Dere-Dere"
}

GENRE_MAP = {
    "순정": "Romance", "학원": "School", "일상": "Slice of Life", "판타지": "Fantasy",
    "액션": "Action", "코미디": "Comedy", "스릴러": "Thriller", "미스터리": "Mystery",
    "이세계": "Isekai", "다크판타지": "Dark Fantasy", "스포츠": "Sports", "닌자": "Ninja",
    "성장": "Growth", "피겨스케이팅": "Figure Skating", "댄스": "Dance", "테니스": "Tennis",
    "치유": "Healing"
}

def translate_list(items, mapping):
    if not items: return []
    return [mapping.get(item, item) for item in items]

def translate_personality(name, personality_ko):
    # Simple heuristic-based translation for common traits
    if not personality_ko: return []
    # In a real app, you'd use an LLM here. For now, we'll do a simple mapping
    # of common phrases if possible, or just return the English version of the list
    # based on some known character archetypes.
    return [translate_text(p) for p in personality_ko]

def translate_text(text):
    # Placeholder for simple text translation
    # In this context, I'll provide a few manual translations for the most common ones
    translations = {
        "처음에는 거칠지만 마음을 열면 한없이 순수": "Rough at first, but infinitely pure once opened up",
        "혼자 있을 때 외로움을 많이 타는 여린 마음": "A delicate heart that gets lonely when alone",
        "사랑을 깨닫고 나면 누구보다 솔직해짐": "Becomes more honest than anyone once realizing love",
        "작은 체구에 폭발적인 성격 — 손바닥 위의 호랑이": "Explosive personality in a small body — Palmtop Tiger",
        "완벽해 보이지만 사실은 허당끼 있는 매력": "Looks perfect but has a clumsy, charming side",
        "자신의 감정에 솔직하지 못한 츤데레": "A tsundere who can't be honest with their feelings",
        "동료를 아끼는 마음이 누구보다 강함": "Cares for comrades more than anyone",
        "포기를 모르는 끈질긴 근성": "Persistent spirit that never gives up",
        "다재다능하고 배려심 깊은 성격": "Versatile and deeply considerate character",
        "겉으로는 까칠하지만 속은 누구보다 따뜻함": "Prickly on the outside but warmer than anyone inside"
    }
    return translations.get(text, text)

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Translate Animes
    print("Updating animes...")
    cursor.execute("SELECT id, title_ko, genre FROM animes")
    for row in cursor.fetchall():
        genres = json.loads(row['genre']) if row['genre'] else []
        genres_en = translate_list(genres, GENRE_MAP)
        cursor.execute("UPDATE animes SET genre_en = ? WHERE id = ?", (json.dumps(genres_en), row['id']))

    # Translate Characters
    print("Updating characters...")
    cursor.execute("SELECT id, name_ko, personality, charm_points, iconic_quote, tags FROM characters")
    for row in cursor.fetchall():
        tags = json.loads(row['tags']) if row['tags'] else []
        tags_en = translate_list(tags, TAG_MAP)
        
        pers = json.loads(row['personality']) if row['personality'] else []
        pers_en = translate_personality(row['name_ko'], pers)
        
        # Simple translation for charm and quote for now
        charm_en = translate_text(row['charm_points'])
        quote_en = translate_text(row['iconic_quote'])
        
        cursor.execute("""
            UPDATE characters 
            SET tags_en = ?, personality_en = ?, charm_points_en = ?, iconic_quote_en = ?
            WHERE id = ?
        """, (json.dumps(tags_en), json.dumps(pers_en), charm_en, quote_en, row['id']))

    conn.commit()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    main()
