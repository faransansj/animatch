#!/usr/bin/env node
/**
 * AniMatch DB Seed Script
 * Generates seed.sql from structured character data
 * Usage: node seed_generator.js > seed.sql
 */

const animes = [
    // ===== 남성향 Tier 1 =====
    {
        title_ko: '소드 아트 온라인', title_jp: 'ソードアート・オンライン', title_en: 'Sword Art Online', genre: '["액션","로맨스","판타지"]', orientation: 'male', tier: 1,
        protagonist: { name_ko: '키리토', name_jp: 'キリト', name_en: 'Kirito', gender: 'male', tags: '["검술","솔로플레이","게이머"]', emoji: '⚔️', color: 'linear-gradient(135deg, #1a1a2e, #16213e)' },
        heroine: {
            name_ko: '아스나', name_jp: 'アスナ', name_en: 'Asuna', gender: 'female', tags: '["검술","리더십","요리"]', emoji: '⚔️', color: 'linear-gradient(135deg, #f093fb, #f5576c)',
            personality: '["강인하고 따뜻한 성격의 소유자","뛰어난 리더십과 판단력","요리를 잘하는 가정적인 면","사랑하는 사람을 위해 모든 것을 걸 수 있는 용기"]',
            charm: '든든하면서도 다정한 파트너. 위기의 순간에는 누구보다 강하게 당신 곁을 지켜주고, 일상에서는 손수 만든 요리로 따뜻하게 맞이해주는 사람.',
            quote: '내가 너의 검이자 방패가 되어줄게'
        }
    },
    {
        title_ko: 'Re:Zero', title_jp: 'Re:ゼロから始める異世界生活', title_en: 'Re:Zero', genre: '["이세계","판타지","로맨스"]', orientation: 'male', tier: 1,
        protagonist: { name_ko: '나츠키 스바루', name_jp: 'ナツキ・スバル', name_en: 'Subaru Natsuki', gender: 'male', tags: '["사망귀환","근성","오타쿠"]', emoji: '🔄', color: 'linear-gradient(135deg, #2d1b69, #11998e)' },
        heroine: {
            name_ko: '렘', name_jp: 'レム', name_en: 'Rem', gender: 'female', tags: '["헌신","쌍둥이","메이드"]', emoji: '💙', color: 'linear-gradient(135deg, #667eea, #764ba2)',
            personality: '["한없이 다정하고 헌신적인 성격","사랑하는 사람을 누구보다 깊이 이해함","겉으로는 차분하지만 내면은 열정적","위기 상황에서 놀라운 전투 능력 발휘"]',
            charm: '당신이 주저앉아도 괜찮아요. 렘이 당신의 영웅이 되어줄 테니까요. 세상 누구도 당신의 가치를 모른다 해도, 렘만은 알고 있어요.',
            quote: '렘은... 수바루 군이 좋으니까요'
        }
    },
    {
        title_ko: '호리미야', title_jp: 'ホリミヤ', title_en: 'Horimiya', genre: '["순정","학원","일상"]', orientation: 'male', tier: 1,
        protagonist: { name_ko: '미야무라 이즈미', name_jp: '宮村伊澄', name_en: 'Izumi Miyamura', gender: 'male', tags: '["반전매력","피어싱","온화"]', emoji: '🌸', color: 'linear-gradient(135deg, #2c3e50, #3498db)' },
        heroine: {
            name_ko: '호리 쿄코', name_jp: '堀京子', name_en: 'Kyoko Hori', gender: 'female', tags: '["츤데레","가정적","활발"]', emoji: '🌸', color: 'linear-gradient(135deg, #f6d365, #fda085)',
            personality: '["겉으로는 완벽한 우등생이지만 집에서는 가정적","솔직하고 화끈한 성격","은근히 질투가 많은 귀여운 면","가족과 연인을 무엇보다 소중히 여김"]',
            charm: '낮에는 학교의 인기녀, 집에서는 앞치마를 두르고 동생을 챙기는 반전 매력의 소유자. 일상의 소소한 행복이 무엇인지 알려주는 연인.',
            quote: '평범한 게 가장 행복한 거잖아'
        }
    },
    {
        title_ko: '귀멸의 칼날', title_jp: '鬼滅の刃', title_en: 'Demon Slayer', genre: '["액션","판타지"]', orientation: 'male', tier: 1,
        protagonist: { name_ko: '카마도 탄지로', name_jp: '竈門炭治郎', name_en: 'Tanjiro Kamado', gender: 'male', tags: '["후각","가족애","성실"]', emoji: '🔥', color: 'linear-gradient(135deg, #c0392b, #2c3e50)' },
        heroine: {
            name_ko: '츠유리 카나오', name_jp: '栗花落カナヲ', name_en: 'Kanao Tsuyuri', gender: 'female', tags: '["나비","치유","과묵"]', emoji: '🦋', color: 'linear-gradient(135deg, #f8b4d9, #a78bfa)',
            personality: '["처음에는 감정 표현이 서툴지만 점차 마음을 열어감","조용하지만 내면에 강한 의지를 품고 있음","사랑하는 사람 앞에서 수줍게 웃는 모습이 매력적","뛰어난 동체시력과 전투 능력"]',
            charm: '조용히 당신 곁에서 세상을 배워가는 사람. 처음으로 동전 없이 스스로 선택한 것이 당신이에요.',
            quote: '내 가슴이 하라는 대로 따를 거야'
        }
    },
    {
        title_ko: '토라도라!', title_jp: 'とらドラ！', title_en: 'Toradora!', genre: '["학원","순정"]', orientation: 'male', tier: 1,
        protagonist: { name_ko: '타카스 류지', name_jp: '高須竜児', name_en: 'Ryuuji Takasu', gender: 'male', tags: '["가정적","눈매","요리"]', emoji: '🐉', color: 'linear-gradient(135deg, #2c3e50, #4ca1af)' },
        heroine: {
            name_ko: '아이사카 타이가', name_jp: '逢坂大河', name_en: 'Taiga Aisaka', gender: 'female', tags: '["츤데레","소형","전투적"]', emoji: '🐯', color: 'linear-gradient(135deg, #f39c12, #e74c3c)',
            personality: '["작은 체구에 폭발적인 성격 — 손바닥 위의 호랑이","처음에는 거칠지만 마음을 열면 한없이 순수","혼자 있을 때 외로움을 많이 타는 여린 마음","사랑을 깨닫고 나면 누구보다 솔직해짐"]',
            charm: '처음엔 날카로운 가시뿐이지만, 그 안에 숨겨진 외로움과 순수함을 발견하는 순간 빠져나올 수 없어요. 진심을 고백하는 그 순간의 눈물이 당신의 마음을 녹일 거예요.',
            quote: '류지는 나의 거야!'
        }
    },
    {
        title_ko: '이 멋진 세계에 축복을!', title_jp: 'この素晴らしい世界に祝福を！', title_en: 'KonoSuba', genre: '["이세계","코미디"]', orientation: 'male', tier: 1,
        protagonist: { name_ko: '사토 카즈마', name_jp: '佐藤和真', name_en: 'Kazuma Sato', gender: 'male', tags: '["현실주의","행운","전략"]', emoji: '🎲', color: 'linear-gradient(135deg, #27ae60, #2c3e50)' },
        heroine: {
            name_ko: '메구밍', name_jp: 'めぐみん', name_en: 'Megumin', gender: 'female', tags: '["폭발마법","중이병","귀여움"]', emoji: '💥', color: 'linear-gradient(135deg, #e74c3c, #8e44ad)',
            personality: '["폭렬마법에 대한 무한한 열정과 집착","중이병적 언행이지만 진심은 순수","하루에 한 번 폭렬마법을 쓰고 쓰러지는 귀여움","의외로 로맨틱하고 수줍음을 많이 탐"]',
            charm: '매일 폭발마법을 위해 당신 등에 업혀야 하는 위험한(?) 연인. 하지만 별이 쏟아지는 밤, 둘이서 폭발을 바라보는 그 순간은 세상에서 가장 로맨틱해요.',
            quote: '엑스플로전!!'
        }
    },
    {
        title_ko: '카구야 님은 고백받고 싶어', title_jp: 'かぐや様は告らせたい', title_en: 'Kaguya-sama: Love Is War', genre: '["학원","코미디","순정"]', orientation: 'male', tier: 1,
        protagonist: { name_ko: '시로가네 미유키', name_jp: '白銀御行', name_en: 'Miyuki Shirogane', gender: 'male', tags: '["천재","노력","학생회장"]', emoji: '👑', color: 'linear-gradient(135deg, #bdc3c7, #2c3e50)' },
        heroine: {
            name_ko: '시노미야 카구야', name_jp: '四宮かぐや', name_en: 'Kaguya Shinomiya', gender: 'female', tags: '["천재","재벌","두뇌전"]', emoji: '🌙', color: 'linear-gradient(135deg, #e74c3c, #2c3e50)',
            personality: '["명문가 출신의 완벽한 재원","사랑 앞에서는 천재도 바보가 되는 귀여움","겉으로는 도도하지만 속은 여리고 순수","한번 마음을 정하면 끝까지 밀고 나가는 의지"]',
            charm: '세상 모든 것을 가졌지만, 당신의 고백 한마디에 얼굴이 빨개지는 그 갭이 치명적. 두뇌전의 끝에서 결국 솔직해지는 순간, 이것이 진정한 승리.',
            quote: '오늘의 승부는... 무승부'
        }
    },
    {
        title_ko: '스파이 패밀리', title_jp: 'SPY×FAMILY', title_en: 'Spy x Family', genre: '["액션","코미디","가족"]', orientation: 'male', tier: 1,
        protagonist: { name_ko: '로이드 포저', name_jp: 'ロイド・フォージャー', name_en: 'Loid Forger', gender: 'male', tags: '["스파이","천재","가족"]', emoji: '🕵️', color: 'linear-gradient(135deg, #2c3e50, #34495e)' },
        heroine: {
            name_ko: '요르 포저', name_jp: 'ヨル・フォージャー', name_en: 'Yor Forger', gender: 'female', tags: '["암살자","가족","천연"]', emoji: '🌹', color: 'linear-gradient(135deg, #c0392b, #2c3e50)',
            personality: '["초인적 전투력을 지닌 프로 암살자","가족을 위해서라면 무엇이든 하는 헌신","의외로 천연덕스럽고 귀여운 일면","요리는 못하지만 사랑은 진심인 엄마"]',
            charm: '세상에서 가장 위험하면서도 가장 다정한 아내. 당신과 아이를 지키기 위해서라면 세계도 적으로 돌릴 수 있는 사람.',
            quote: '가족이니까요'
        }
    },
    {
        title_ko: '내 청춘 러브코미디는 잘못됐다', title_jp: 'やはり俺の青春ラブコメはまちがっている', title_en: 'Oregairu', genre: '["학원","순정","드라마"]', orientation: 'male', tier: 1,
        protagonist: { name_ko: '히키가야 하치만', name_jp: '比企谷八幡', name_en: 'Hachiman Hikigaya', gender: 'male', tags: '["솔로","관찰력","자기희생"]', emoji: '🐟', color: 'linear-gradient(135deg, #2c3e50, #7f8c8d)' },
        heroine: {
            name_ko: '유키노시타 유키노', name_jp: '雪ノ下雪乃', name_en: 'Yukino Yukinoshita', gender: 'female', tags: '["빙하","독서","진심"]', emoji: '❄️', color: 'linear-gradient(135deg, #74b9ff, #0984e3)',
            personality: '["냉철하고 논리적이지만 외로움을 잘 타는","완벽주의자이면서도 자신에게 가장 엄격한","진심을 표현하는 것이 서툴지만 한번 열면 따뜻한","대등한 관계를 원하는 자존심 강한 성격"]',
            charm: '빙하 같은 외면 아래 숨겨진 따뜻함. 겉으로는 날카롭지만, 진심을 나누는 순간 세상에서 가장 솔직한 사람이 돼요. 가짜가 아닌 진짜를 함께 찾아가는 관계.',
            quote: '난 진짜를 원해'
        }
    },
    {
        title_ko: '슈타인즈 게이트', title_jp: 'STEINS;GATE', title_en: 'Steins;Gate', genre: '["SF","서스펜스"]', orientation: 'male', tier: 2,
        protagonist: { name_ko: '오카베 린타로', name_jp: '岡部倫太郎', name_en: 'Rintaro Okabe', gender: 'male', tags: '["매드사이언티스트","중이병","시간여행"]', emoji: '⏰', color: 'linear-gradient(135deg, #2c3e50, #8e44ad)' },
        heroine: {
            name_ko: '마키세 쿠리스', name_jp: '牧瀬紅莉栖', name_en: 'Kurisu Makise', gender: 'female', tags: '["천재","츤데레","과학"]', emoji: '🔬', color: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            personality: '["18세에 학술지에 논문을 발표한 천재 과학자","논리적이고 이성적이지만 사랑 앞에서는 솔직하지 못한","@채널러라는 의외의 인터넷 취미","당당하면서도 수줍은 갭 모에"]',
            charm: '시간을 넘어서까지 만나고 싶은 사람. 세계선이 바뀌어도, 우주가 달라져도, 결국 당신에게 돌아오는 운명의 상대.',
            quote: '자칭 크리스티나입니다만'
        }
    },
    // ===== 남성향 Tier 2 계속 =====
    {
        title_ko: '무직전생', title_jp: '無職転生', title_en: 'Mushoku Tensei', genre: '["이세계","성장","로맨스"]', orientation: 'male', tier: 2,
        protagonist: { name_ko: '루데우스 그레이랏', name_jp: 'ルーデウス・グレイラット', name_en: 'Rudeus Greyrat', gender: 'male', tags: '["전생","마법","성장"]', emoji: '📖', color: 'linear-gradient(135deg, #2ecc71, #3498db)' },
        heroine: {
            name_ko: '실피엣', name_jp: 'シルフィエット', name_en: 'Sylphiette', gender: 'female', tags: '["소꿉친구","엘프귀","치유"]', emoji: '🍀', color: 'linear-gradient(135deg, #55efc4, #81ecec)',
            personality: '["어릴 때부터 함께한 소꿉친구","수줍음이 많지만 사랑하는 사람에게는 용감","무소속 마법의 천재","변함없는 마음으로 기다려주는 사람"]',
            charm: '어린 시절의 약속을 가슴에 품고, 몇 년이고 기다려주는 사람. 당신이 힘들 때 조용히 곁에 있어주는 든든한 존재.',
            quote: '당신이 있어서 내가 강해질 수 있었어'
        }
    },
    {
        title_ko: '번역 BUNNY GIRL', title_jp: '青春ブタ野郎はバニーガール先輩の夢を見ない', title_en: 'Bunny Girl Senpai', genre: '["학원","SF","순정"]', orientation: 'male', tier: 2,
        protagonist: { name_ko: '아즈사가와 사쿠타', name_jp: '梓川咲太', name_en: 'Sakuta Azusagawa', gender: 'male', tags: '["둔감","직설","다정"]', emoji: '🐰', color: 'linear-gradient(135deg, #2c3e50, #e67e22)' },
        heroine: {
            name_ko: '사쿠라지마 마이', name_jp: '桜島麻衣', name_en: 'Mai Sakurajima', gender: 'female', tags: '["투명","선배","여배우"]', emoji: '🎭', color: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
            personality: '["국민 여배우라는 타이틀 뒤의 외로움","투명해져 가는 자신을 받아들이는 강인함","연인 앞에서는 질투도 하고 토라지기도 하는 귀여움","성숙하면서도 소녀 감성을 간직한 매력"]',
            charm: '세상 모두가 그녀를 잊어도, 당신만은 기억하고 있었죠. 그 기억 하나로 세계를 바꾼 사랑.',
            quote: '나를 잊지 마'
        }
    },
    {
        title_ko: '86 에이티식스', title_jp: '86―エイティシックス―', title_en: '86 Eighty-Six', genre: '["SF","전쟁","드라마"]', orientation: 'male', tier: 2,
        protagonist: { name_ko: '신에이 노우젠', name_jp: 'シンエイ・ノウゼン', name_en: 'Shin Nouzen', gender: 'male', tags: '["사신","전사","과묵"]', emoji: '💀', color: 'linear-gradient(135deg, #2c3e50, #95a5a6)' },
        heroine: {
            name_ko: '블라디레나 밀리제', name_jp: 'ヴラディレーナ・ミリーゼ', name_en: 'Vladilena Milize', gender: 'female', tags: '["소령","정의감","목소리"]', emoji: '🎖️', color: 'linear-gradient(135deg, #3498db, #e74c3c)',
            personality: '["불의를 참지 못하는 강한 정의감","전장의 병사를 이름으로 기억하는 따뜻함","냉철한 지휘 능력과 뜨거운 마음의 공존","거리를 넘어 목소리로 연결된 유대"]',
            charm: '목소리만으로 전해지는 사랑. 한 번도 만나지 않았지만, 당신의 이름을 기억하고 불러주는 사람.',
            quote: '당신은 살아야 해요'
        }
    },
    {
        title_ko: '반짝반짝 물방울', title_jp: 'からかい上手の高木さん', title_en: 'Teasing Master Takagi-san', genre: '["학원","코미디","순정"]', orientation: 'male', tier: 2,
        protagonist: { name_ko: '니시카타', name_jp: '西片', name_en: 'Nishikata', gender: 'male', tags: '["순수","열혈","패배"]', emoji: '😤', color: 'linear-gradient(135deg, #e67e22, #d35400)' },
        heroine: {
            name_ko: '타카기', name_jp: '高木さん', name_en: 'Takagi', gender: 'female', tags: '["장난","미소","소꿉친구"]', emoji: '😊', color: 'linear-gradient(135deg, #fdcb6e, #f39c12)',
            personality: '["여유로운 미소 뒤에 숨겨진 깊은 애정","장난을 걸면서도 절대 상처주지 않는 배려","상대의 마음을 꿰뚫어보는 관찰력","한 사람만을 오래오래 좋아하는 일편단심"]',
            charm: '매일 걸리는 장난 속에 숨겨진 고백. 당신이 눈치채든 못 채든, 그 미소 안에는 항상 사랑이 담겨 있어요.',
            quote: '또 졌네~ 니시카타~'
        }
    },
    {
        title_ko: '츠키가 키레이', title_jp: '月がきれい', title_en: 'Tsuki ga Kirei', genre: '["순정","학원"]', orientation: 'male', tier: 2,
        protagonist: { name_ko: '아즈미 코타로', name_jp: '安曇小太郎', name_en: 'Kotaro Azumi', gender: 'male', tags: '["문학소년","수줍음","순수"]', emoji: '📝', color: 'linear-gradient(135deg, #2c3e50, #8e44ad)' },
        heroine: {
            name_ko: '미즈노 아카네', name_jp: '水野茜', name_en: 'Akane Mizuno', gender: 'female', tags: '["첫사랑","육상","순수"]', emoji: '🌙', color: 'linear-gradient(135deg, #a29bfe, #6c5ce7)',
            personality: '["수줍음 많지만 좋아하는 일에는 전력투구","작은 용기를 내서 먼저 다가가는 진심","LINE 메시지에 하트를 넣을까 말까 고민하는 귀여움","첫사랑의 설렘 그 자체"]',
            charm: '가장 순수한 형태의 첫사랑. 손을 잡는 것만으로도 심장이 터질 것 같은, 그 투명한 감정 그대로.',
            quote: '달이 아름답네요'
        }
    },
    // ===== 남성향 Tier 3 =====
    {
        title_ko: '최애의 아이', title_jp: '【推しの子】', title_en: 'Oshi no Ko', genre: '["연예","서스펜스"]', orientation: 'male', tier: 3,
        protagonist: { name_ko: '호시노 아쿠아마린', name_jp: '星野アクアマリン', name_en: 'Aquamarine Hoshino', gender: 'male', tags: '["전생","복수","연기"]', emoji: '⭐', color: 'linear-gradient(135deg, #0984e3, #6c5ce7)' },
        heroine: {
            name_ko: '쿠로카와 아카네', name_jp: '黒川あかね', name_en: 'Akane Kurokawa', gender: 'female', tags: '["연기","완벽주의","카멜레온"]', emoji: '🎭', color: 'linear-gradient(135deg, #d63031, #e17055)',
            personality: '["천재적 관찰력으로 어떤 역할이든 완벽히 소화","겉으로는 침착하지만 내면은 열정적","상대를 깊이 이해하고 분석하는 능력","사랑하는 사람을 위해 자신을 바꿀 수 있는 헌신"]',
            charm: '당신이 원하는 모습이 되어줄 수 있는 사람. 하지만 진짜 매력은, 연기가 아닌 진심으로 당신을 바라보는 그 눈빛.',
            quote: '당신이 원하는 내가 되어줄게'
        }
    },
    {
        title_ko: '프리렌', title_jp: '葬送のフリーレン', title_en: 'Frieren', genre: '["판타지","모험"]', orientation: 'male', tier: 3,
        protagonist: { name_ko: '힘멜', name_jp: 'ヒンメル', name_en: 'Himmel', gender: 'male', tags: '["용사","나르시스트","다정"]', emoji: '⚜️', color: 'linear-gradient(135deg, #fdcb6e, #e17055)' },
        heroine: {
            name_ko: '프리렌', name_jp: 'フリーレン', name_en: 'Frieren', gender: 'female', tags: '["마법","영생","후회"]', emoji: '📚', color: 'linear-gradient(135deg, #dfe6e9, #b2bec3)',
            personality: '["천년을 사는 엘프이기에 감정 표현이 느린","작은 행복의 의미를 뒤늦게 깨닫는 성장","무표정 속에 숨겨진 깊은 애정","마법 수집이 취미인 귀여운 일면"]',
            charm: '천년의 시간 속에서 당신과의 짧은 순간이 가장 소중했다는 것을, 뒤늦게야 깨닫는 사람.',
            quote: '인간을 알기 위한 여행'
        }
    },
    {
        title_ko: '나 혼자만 레벨업', title_jp: '俺だけレベルアップな件', title_en: 'Solo Leveling', genre: '["액션","판타지"]', orientation: 'male', tier: 3,
        protagonist: { name_ko: '성진우', name_jp: '水篠旬', name_en: 'Sung Jinwoo', gender: 'male', tags: '["각성","그림자","최강"]', emoji: '🗡️', color: 'linear-gradient(135deg, #6c5ce7, #2d3436)' },
        heroine: {
            name_ko: '차해인', name_jp: 'チャ・ヘイン', name_en: 'Cha Hae-In', gender: 'female', tags: '["헌터","쿨뷰티","강인"]', emoji: '⚔️', color: 'linear-gradient(135deg, #ffeaa7, #dfe6e9)',
            personality: '["한국 최강 S급 헌터의 실력","냉철해 보이지만 좋아하는 사람 앞에서 수줍어하는 갭 모에","향기로 그를 알아본 운명적 만남","강하지만 사랑 앞에서는 여린 마음"]',
            charm: '세상에서 가장 강한 여자가, 당신 앞에서만 수줍어하는 그 갭. 전장에서는 동료로, 일상에서는 연인으로.',
            quote: '당신은... 특별해요'
        }
    },

    // ===== 여성향 Tier 1 =====
    {
        title_ko: '프루츠 바스켓', title_jp: 'フルーツバスケット', title_en: 'Fruits Basket', genre: '["순정","드라마","판타지"]', orientation: 'female', tier: 1,
        protagonist: { name_ko: '혼다 토오루', name_jp: '本田透', name_en: 'Tohru Honda', gender: 'female', tags: '["치유","엄마","순수"]', emoji: '🍙', color: 'linear-gradient(135deg, #fdcb6e, #e17055)' },
        heroine: {
            name_ko: '소마 큐', name_jp: '草摩由希', name_en: 'Yuki Soma', gender: 'male', tags: '["왕자님","미스터리","다정"]', emoji: '🌙', color: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
            personality: '["부드럽고 다정하지만 내면에 깊은 상처를 가진","상대방의 마음을 섬세하게 읽어내는 공감 능력","차분하고 지적인 대화를 즐기는 타입","진심으로 사랑하면 모든 것을 내어줌"]',
            charm: '그의 미소 뒤에 숨겨진 아픔을 당신만이 치유해줄 수 있어요. 서로의 상처를 보듬으며 함께 성장하는 관계.',
            quote: '그저 널 아끼고 있었을 뿐이야'
        }
    },
    {
        title_ko: '아오하라이드', title_jp: 'アオハライド', title_en: 'Ao Haru Ride', genre: '["순정","학원","청춘"]', orientation: 'female', tier: 1,
        protagonist: { name_ko: '요시오카 후타바', name_jp: '吉岡双葉', name_en: 'Futaba Yoshioka', gender: 'female', tags: '["첫사랑","밝음","성장"]', emoji: '🌻', color: 'linear-gradient(135deg, #fdcb6e, #e17055)' },
        heroine: {
            name_ko: '마부치 코우', name_jp: '馬渕洸', name_en: 'Kou Mabuchi', gender: 'male', tags: '["첫사랑","쿨데레","성장"]', emoji: '☔', color: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            personality: '["무뚝뚝해 보이지만 속은 여리고 다정한","과거의 상처로 사람들과 거리를 두지만","진심을 보이면 누구보다 따뜻하게 대해줌","성장하면서 진정한 사랑을 배워가는"]',
            charm: '첫사랑의 설렘을 다시 느끼게 해주는 사람. 비 오는 날 조용히 우산을 씌워주는 그런 남자.',
            quote: '널 좋아했어... 지금도 좋아해'
        }
    },
    {
        title_ko: '나의 행복한 결혼', title_jp: 'わたしの幸せな結婼', title_en: 'My Happy Marriage', genre: '["역사","순정","판타지"]', orientation: 'female', tier: 1,
        protagonist: { name_ko: '사이묘 미요', name_jp: '斎森美世', name_en: 'Miyo Saimori', gender: 'female', tags: '["인내","순수","각성"]', emoji: '🌸', color: 'linear-gradient(135deg, #fbc2eb, #a18cd1)' },
        heroine: {
            name_ko: '쿠도 키요카', name_jp: '久堂清霞', name_en: 'Kiyoka Kudou', gender: 'male', tags: '["빙하남","군인","보호"]', emoji: '❄️', color: 'linear-gradient(135deg, #74b9ff, #0984e3)',
            personality: '["냉정하고 엄격해 보이지만 사랑하는 사람에게는 한없이 상냥한","강력한 이능력을 가진 군인","정의감이 강하고 약한 자를 지키려는 의지","한번 마음을 정하면 절대 흔들리지 않는"]',
            charm: '세상 모두가 두려워하는 냉혈한이, 당신 앞에서만 상냥해지는 그 갭. 당신을 행복하게 만들겠다는 그 약속은 절대 깨지지 않아요.',
            quote: '당신을 행복하게 만들겠습니다'
        }
    },
    {
        title_ko: '새벽의 연화', title_jp: '暁のヨナ', title_en: 'Yona of the Dawn', genre: '["판타지","액션","순정"]', orientation: 'female', tier: 1,
        protagonist: { name_ko: '요나', name_jp: 'ヨナ', name_en: 'Yona', gender: 'female', tags: '["공주","성장","각성"]', emoji: '🌅', color: 'linear-gradient(135deg, #e74c3c, #e17055)' },
        heroine: {
            name_ko: '하크', name_jp: 'ハク', name_en: 'Hak', gender: 'male', tags: '["호위","충성","전사"]', emoji: '⛰️', color: 'linear-gradient(135deg, #2c3e50, #3498db)',
            personality: '["뇌수의 번개라 불리는 최강의 전사","공주를 향한 변함없는 충성과 사랑","장난기 많은 성격으로 무거운 상황도 가볍게","사랑하는 사람을 위해 목숨도 아끼지 않는"]',
            charm: '어릴 때부터 곁을 지켜온 그 사람. 세상이 무너져도 당신만은 절대 놓지 않겠다는 그 손.',
            quote: '공주님, 제가 지켜드리겠습니다'
        }
    },
    {
        title_ko: '오란 고교 호스트부', title_jp: '桜蘭高校ホスト部', title_en: 'Ouran High School Host Club', genre: '["순정","코미디","학원"]', orientation: 'female', tier: 1,
        protagonist: { name_ko: '후지오카 하루히', name_jp: '藤岡ハルヒ', name_en: 'Haruhi Fujioka', gender: 'female', tags: '["실용적","성별무관","장학생"]', emoji: '📚', color: 'linear-gradient(135deg, #636e72, #2d3436)' },
        heroine: {
            name_ko: '스오 타마키', name_jp: '須王環', name_en: 'Tamaki Suoh', gender: 'male', tags: '["왕자님","엉뚱","화려"]', emoji: '👑', color: 'linear-gradient(135deg, #fdcb6e, #f39c12)',
            personality: '["화려하고 드라마틱한 왕자님 기질","엉뚱하지만 진심으로 사람을 걱정하는 따뜻함","피아노를 치는 섬세한 감성","사랑하는 사람 앞에서 오히려 허둥대는 귀여움"]',
            charm: '매일이 무도회처럼 화려한 사랑. 과하다 싶을 정도로 당신을 소중히 하는, 진심 가득한 왕자님.',
            quote: '너야말로 이 클럽의 보석이야'
        }
    },
    {
        title_ko: '메이드사마!', title_jp: '会長はメイド様！', title_en: 'Maid Sama!', genre: '["학원","순정"]', orientation: 'female', tier: 2,
        protagonist: { name_ko: '아유자와 미사키', name_jp: '鮎沢美咲', name_en: 'Misaki Ayuzawa', gender: 'female', tags: '["학생회장","강인","비밀"]', emoji: '🎀', color: 'linear-gradient(135deg, #e74c3c, #c0392b)' },
        heroine: {
            name_ko: '우스이 타쿠미', name_jp: '碓氷拓海', name_en: 'Takumi Usui', gender: 'male', tags: '["완벽남","장난","미스터리"]', emoji: '✨', color: 'linear-gradient(135deg, #2ecc71, #27ae60)',
            personality: '["공부, 운동, 요리 모든 것이 완벽한 만능인","관심 있는 사람에게는 집요할 정도로 다가가는","쿨한 표정 뒤에 숨겨진 외로움","사랑하는 사람의 비밀을 지켜주는 신사"]',
            charm: '당신의 비밀을 알고 있지만 절대 말하지 않는 사람. 완벽해 보이는 그가 당신 앞에서만 진심을 보여줘요.',
            quote: '이 모습의 회장님도 귀여워'
        }
    },
    {
        title_ko: '카미사마 키스', title_jp: '神様はじめました', title_en: 'Kamisama Kiss', genre: '["순정","판타지"]', orientation: 'female', tier: 2,
        protagonist: { name_ko: '모모조노 나나미', name_jp: '桃園奈々生', name_en: 'Nanami Momozono', gender: 'female', tags: '["신","밝음","용기"]', emoji: '🌸', color: 'linear-gradient(135deg, #fd79a8, #e17055)' },
        heroine: {
            name_ko: '토모에', name_jp: '巴衛', name_en: 'Tomoe', gender: 'male', tags: '["여우요괴","츤데레","보호"]', emoji: '🦊', color: 'linear-gradient(135deg, #dfe6e9, #636e72)',
            personality: '["500년을 산 여우 요괴의 도도함","입은 거칠지만 행동은 한없이 다정한","질투심이 강하고 독점욕이 있는","주인을 향한 충성이 사랑으로 변해가는"]',
            charm: '도도한 여우가 당신 앞에서만 꼬리를 살랑이는 순간. 500년의 세월도 당신 하나로 의미가 생겨요.',
            quote: '네 걱정은 내가 해'
        }
    },
    {
        title_ko: '스킵 비트!', title_jp: 'スキップ・ビート！', title_en: 'Skip Beat!', genre: '["순정","연예"]', orientation: 'female', tier: 2,
        protagonist: { name_ko: '모가미 쿄코', name_jp: '最上キョーコ', name_en: 'Kyoko Mogami', gender: 'female', tags: '["복수","연기","성장"]', emoji: '🔥', color: 'linear-gradient(135deg, #e17055, #d63031)' },
        heroine: {
            name_ko: '츠루가 렌', name_jp: '敦賀蓮', name_en: 'Ren Tsuruga', gender: 'male', tags: '["배우","미스터리","다정"]', emoji: '🎬', color: 'linear-gradient(135deg, #2c3e50, #34495e)',
            personality: '["일본 최고의 배우라는 완벽한 가면","가면 뒤에 숨겨진 어둠과 상처","사랑하는 사람 앞에서 무너지는 완벽함","연기가 아닌 진심으로 빛나는 순간"]',
            charm: '완벽한 배우의 가면이 벗겨지는 순간, 당신만이 볼 수 있는 진짜 그를 만나게 돼요.',
            quote: '네가 빛나고 있어'
        }
    },
    // ===== 여성향 Tier 3 =====
    {
        title_ko: '약사의 혼잣말', title_jp: '薬屋のひとりごと', title_en: 'The Apothecary Diaries', genre: '["역사","미스터리","순정"]', orientation: 'female', tier: 3,
        protagonist: { name_ko: '마오마오', name_jp: '猫猫', name_en: 'Maomao', gender: 'female', tags: '["약사","추리","독설"]', emoji: '🧪', color: 'linear-gradient(135deg, #00b894, #55efc4)' },
        heroine: {
            name_ko: '진시', name_jp: '壬氏', name_en: 'Jinshi', gender: 'male', tags: '["환관","미모","미스터리"]', emoji: '🌺', color: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
            personality: '["미모가 죄가 되는 수준의 절세미남","정치적 수완과 지략이 뛰어남","관심 있는 사람에게 장난을 걸며 반응을 즐기는","고양이 같은 여자에게 끌려다니는 강아지 같은 면"]',
            charm: '천하의 미남이 당신에게만 약해지는 순간. 독에 미쳐사는 당신이 그에게는 가장 달콤한 독이에요.',
            quote: '고양이 같은 여자군'
        }
    },
    {
        title_ko: '블루 록', title_jp: 'ブルーロック', title_en: 'Blue Lock', genre: '["스포츠","축구"]', orientation: 'female', tier: 3,
        protagonist: { name_ko: '(관객 시점)', name_jp: '', name_en: 'Audience POV', gender: 'female', tags: '["시점"]', emoji: '👁️', color: 'linear-gradient(135deg, #636e72, #2d3436)' },
        heroine: {
            name_ko: '이사기 요이치', name_jp: '潔世一', name_en: 'Yoichi Isagi', gender: 'male', tags: '["에고","천재","각성"]', emoji: '⚽', color: 'linear-gradient(135deg, #0984e3, #00b894)',
            personality: '["평범함에서 최강으로 각성해가는 성장형","냉철한 판단력과 뜨거운 승부욕의 공존","팀보다 자아를 택하는 에고이스트","결정적 순간에 빛나는 천재적 직감"]',
            charm: '세계 최고의 스트라이커를 향한 순수한 열정. 그 눈빛에 빠지면 당신도 꿈을 향해 달리고 싶어질 거예요.',
            quote: '세계 제일의 스트라이커가 된다'
        }
    },
];

// === SQL Generation ===
let animeId = 1;
let charId = 1;
const insertAnimes = [];
const insertChars = [];
const partnerUpdates = [];

for (const a of animes) {
    const esc = (s) => s ? s.replace(/'/g, "''") : '';

    insertAnimes.push(`INSERT INTO animes (id, title_ko, title_jp, title_en, genre, orientation, tier) VALUES (${animeId}, '${esc(a.title_ko)}', '${esc(a.title_jp)}', '${esc(a.title_en)}', '${esc(a.genre)}', '${a.orientation}', ${a.tier});`);

    const protId = charId++;
    const heroId = charId++;

    const p = a.protagonist;
    const h = a.heroine;

    insertChars.push(`INSERT INTO characters (id, anime_id, name_ko, name_jp, name_en, gender, role, image_url, personality, charm_points, iconic_quote, tags, color_primary, emoji) VALUES (${protId}, ${animeId}, '${esc(p.name_ko)}', '${esc(p.name_jp)}', '${esc(p.name_en)}', '${p.gender}', 'protagonist', NULL, NULL, NULL, NULL, '${esc(p.tags)}', '${esc(p.color)}', '${esc(p.emoji)}');`);

    insertChars.push(`INSERT INTO characters (id, anime_id, name_ko, name_jp, name_en, gender, role, image_url, personality, charm_points, iconic_quote, tags, color_primary, emoji) VALUES (${heroId}, ${animeId}, '${esc(h.name_ko)}', '${esc(h.name_jp)}', '${esc(h.name_en)}', '${h.gender}', 'heroine', NULL, '${esc(h.personality)}', '${esc(h.charm)}', '${esc(h.quote)}', '${esc(h.tags)}', '${esc(h.color)}', '${esc(h.emoji)}');`);

    partnerUpdates.push(`UPDATE characters SET partner_id = ${heroId} WHERE id = ${protId};`);
    partnerUpdates.push(`UPDATE characters SET partner_id = ${protId} WHERE id = ${heroId};`);

    animeId++;
}

console.log('-- AniMatch Seed Data');
console.log('-- Generated: ' + new Date().toISOString());
console.log('-- Total: ' + animes.length + ' works, ' + (animes.length * 2) + ' characters\n');
console.log('-- === ANIMES ===');
insertAnimes.forEach(s => console.log(s));
console.log('\n-- === CHARACTERS ===');
insertChars.forEach(s => console.log(s));
console.log('\n-- === PARTNER LINKS ===');
partnerUpdates.forEach(s => console.log(s));
