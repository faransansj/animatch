import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'animatch.db')

# High-quality English translations for characters
# This maps name_ko -> { 'personality_en': [...], 'charm_points_en': "...", 'iconic_quote_en': "..." }
TRANSLATIONS = {
    # Sword Art Online
    '아스나': {
        'personality_en': ["Strong yet warm-hearted", "Excellent leadership and judgment", "Domestic and great at cooking", "Courageous enough to risk everything for her loved one"],
        'charm_points_en': "A reliable and affectionate partner. Stands strongly by your side in crises, and warmly welcomes you with home-cooked meals in daily life.",
        'iconic_quote_en': "I'll be your sword and your shield."
    },
    # Re:Zero
    '렘': {
        'personality_en': ["Infinitely gentle and devoted", "Understands her loved one deeper than anyone", "Calm on the outside but passionate inside", "Displays incredible combat prowess in crises"],
        'charm_points_en': "It's okay if you stumble. Rem will be your hero. Even if the whole world doesn't know your worth, Rem knows.",
        'iconic_quote_en': "Because Rem... loves Subaru."
    },
    # Horimiya
    '호리 쿄코': {
        'personality_en': ["Perfect honor student at school, but highly domestic at home", "Honest and straightforward personality", "Secretly jealous in a cute way", "Values family and her lover above all else"],
        'charm_points_en': "A popular girl by day, a caring sister with an apron by night. A partner who teaches you the small joys of daily life.",
        'iconic_quote_en': "Being normal is what makes me the happiest."
    },
    # Demon Slayer
    '츠유리 카나오': {
        'personality_en': ["Initially struggles with emotions but gradually opens up", "Quiet but harbors strong inner resolve", "Her shy smile in front of her loved one is captivating", "Exceptional kinetic vision and combat skills"],
        'charm_points_en': "Someone who quietly learns about the world by your side. You are the first choice she ever made without tossing a coin.",
        'iconic_quote_en': "I will follow what my heart tells me."
    },
    # Toradora!
    '아이사카 타이가': {
        'personality_en': ["Explosive personality in a small framed body — the Palmtop Tiger", "Rough at first, but infinitely pure once she opens up", "A delicate heart that gets deeply lonely when alone", "Becomes more honest than anyone once she realizes her love"],
        'charm_points_en': "Covered in sharp thorns at first, but once you discover the loneliness and purity hidden within, you can't escape. Her tears during a sincere confession will melt your heart.",
        'iconic_quote_en': "Ryuji is mine!"
    },
    # KonoSuba
    '메구밍': {
        'personality_en': ["Limitless passion and obsession for Explosion magic", "Chunibyo tendencies but genuinely pure at heart", "Adorable habit of collapsing after casting one spell a day", "Surprisingly romantic and gets shy easily"],
        'charm_points_en': "A subtly dangerous lover who makes you carry her every day for her magic. But watching an explosion together under a starry night is the most romantic thing in the world.",
        'iconic_quote_en': "EX...PLOSION!!"
    },
    # Kaguya-sama
    '시노미야 카구야': {
        'personality_en': ["Perfect young lady from a prestigious family", "A genius who becomes adorably foolish in the face of love", "Haughty on the outside but fragile and pure inside", "Once she decides on something, she pushes through with iron will"],
        'charm_points_en': "She has everything in the world, but the way she blushes at your single confession is fatal. The moment she finally gets honest after endless mind games is a true victory.",
        'iconic_quote_en': "Today's battle... is a draw."
    },
    # Spy x Family
    '요르 포저': {
        'personality_en': ["Professional assassin with superhuman combat abilities", "Devoted enough to do anything for her family", "Surprisingly airheaded and cute in daily life", "Terrible at cooking but completely sincere about love"],
        'charm_points_en': "The most dangerous yet most affectionate wife in the world. Someone who would turn the entire world into an enemy to protect you and your child.",
        'iconic_quote_en': "Because we are family."
    },
    # Oregairu
    '유키노시타 유키노': {
        'personality_en': ["Cool-headed and logical, but easily feels lonely", "A perfectionist who is strictest upon herself", "Clumsy at expressing sincerity but incredibly warm once opened up", "Proud personality seeking an equal relationship"],
        'charm_points_en': "Warmth hidden beneath a glacier-like exterior. Sharp on the outside, but when sharing true feelings, she becomes the most honest person in the world.",
        'iconic_quote_en': "I want something genuine."
    },
    # Steins;Gate
    '마키세 쿠리스': {
        'personality_en': ["Genius scientist who published in academic journals at 18", "Logical and rational, but dishonest in front of love", "Has a surprising internet hobby as a @channeler", "Confident yet shy—the ultimate gap moe"],
        'charm_points_en': "Someone you want to meet even transcending time. Even if worldlines shift and the universe changes, she is the destined partner you will always return to.",
        'iconic_quote_en': "I am not 'Christina'!"
    },
    # Mushoku Tensei
    '실피엣': {
        'personality_en': ["Childhood friend who has been there since the beginning", "Shy but incredibly brave for the one she loves", "Genius of voiceless incantation magic", "Someone who waits with an unchanging heart"],
        'charm_points_en': "Someone who keeps childhood promises in her heart and waits for years. A reliable presence who quietly stays by your side when you're struggling.",
        'iconic_quote_en': "Because you were there, I was able to become strong."
    },
    # Bunny Girl Senpai
    '사쿠라지마 마이': {
        'personality_en': ["Loneliness hidden behind the title of a national actress", "Inner strength to accept herself fading away", "Adorably gets jealous and sulks in front of her lover", "Mature yet retains a maiden's sensibility"],
        'charm_points_en': "Even if the whole world forgets her, you remembered. A love that changed the world with that single memory.",
        'iconic_quote_en': "Don't forget me."
    },
    # 86
    '블라디레나 밀리제': {
        'personality_en': ["Strong sense of justice that cannot tolerate unfairness", "Warmth to remember soldiers on the battlefield by their names", "Coexistence of cold-headed command and a passionate heart", "A bond connected by voice across vast distances"],
        'charm_points_en': "A love conveyed solely through voice. Someone who remembers and calls your name even without ever having met you.",
        'iconic_quote_en': "You must survive."
    },
    # Takagi-san
    '타카기': {
        'personality_en': ["Deep affection hidden behind a relaxed smile", "Teases constantly but never crosses the line to hurt", "Exceptional observation skills that see right through you", "Single-minded devotion to loving one person for a long time"],
        'charm_points_en': "Confessions hidden in daily teasing. Whether you notice it or not, her smiles are always filled with love.",
        'iconic_quote_en': "You lost again~ Nishikata~"
    },
    # Tsuki ga Kirei
    '미즈노 아카네': {
        'personality_en': ["Shy but puts her all into what she loves", "Sincere heart that takes small courage to approach first", "Adorable dilemma over whether to add a heart to a LINE message", "The very essence of first love's fluttering hearts"],
        'charm_points_en': "The purest form of first love. That transparent emotion where just holding hands feels like your heart might burst.",
        'iconic_quote_en': "The moon is beautiful, isn't it?"
    },
    # Oshi no Ko
    '쿠로카와 아카네': {
        'personality_en': ["Perfectly embodies any role with genius observational skills", "Calm on the outside but passionate on the inside", "Possesses the ability to deeply understand and analyze others", "Devotion to change oneself for the person they love"],
        'charm_points_en': "Someone who can become whoever you want. But her true charm is that gaze looking at you with sincerity, not acting.",
        'iconic_quote_en': "I'll become the person you want me to be."
    },
    # Frieren
    '프리렌': {
        'personality_en': ["Slow to express emotions due to being a thousand-year-old elf", "Growth in realizing the meaning of small happiness belatedly", "Deep affection hidden behind an expressionless face", "Cute side that treats collecting magic as a hobby"],
        'charm_points_en': "Someone who, after a thousand years, finally realizes that the fleeting moments spent with you were the most precious.",
        'iconic_quote_en': "A journey to understand humans."
    },
    # Solo Leveling
    '차해인': {
        'personality_en': ["Skills of Korea's strongest S-Rank Hunter", "Cool-headed but gets shy in front of her crush (gap moe)", "Destined meeting recognizing him by his scent", "Strong exterior but a tender heart in love"],
        'charm_points_en': "The gap of the strongest woman in the world acting shy only in front of you. A comrade on the battlefield, a lover in daily life.",
        'iconic_quote_en': "You are... special."
    },
    # Fruits Basket
    '소마 큐': {
        'personality_en': ["Gentle and kind but carries deep inner scars", "Empathetic ability to delicately read others' hearts", "Prefers calm and intellectual conversations", "Gives everything when truly in love"],
        'charm_points_en': "Only you can heal the pain hidden behind his smile. A relationship where you comfort each other's scars and grow together.",
        'iconic_quote_en': "I was simply cherishing you."
    },
    # Ao Haru Ride
    '마부치 코우': {
        'personality_en': ["Appears blunt but is fragile and sweet inside", "Keeps distance due to past trauma", "Treats those who show sincerity with utmost warmth", "Learns true love as he grows"],
        'charm_points_en': "Someone who makes you feel the flutter of first love again. The kind of guy who quietly shares his umbrella on a rainy day.",
        'iconic_quote_en': "I liked you... and I still do."
    },
    # My Happy Marriage
    '쿠도 키요카': {
        'personality_en': ["Cold and strict exterior, but infinitely gentle to his loved one", "Military commander with powerful supernatural abilities", "Strong sense of justice and will to protect the weak", "Once he makes up his mind, he never wavers"],
        'charm_points_en': "The gap where a cold-blooded man feared by everyone becomes gentle only in front of you. His promise to make you happy will never be broken.",
        'iconic_quote_en': "I will make you happy."
    },
    # Yona of the Dawn
    '하크': {
        'personality_en': ["The strongest warrior known as the Thunder Beast", "Unwavering loyalty and love for the princess", "Playful personality that lightens heavy situations", "Willing to risk his life for the one he loves"],
        'charm_points_en': "The person who has stayed by your side since childhood. The hand that will never let go even if the world collapses.",
        'iconic_quote_en': "Princess, I will protect you."
    },
    # Ouran High School Host Club
    '스오 타마키': {
        'personality_en': ["Glamorous and dramatic prince-like temperament", "Eccentric but genuinely worries about others warmly", "Delicate sensibility playing the piano", "Adorably flustered in front of the person he loves"],
        'charm_points_en': "A love as glamorous as a daily ball. A sincere prince who cherishes you to an almost excessive degree.",
        'iconic_quote_en': "You are truly the jewel of this club."
    },
    # Maid Sama
    '우스이 타쿠미': {
        'personality_en': ["Perfect all-rounder in studies, sports, and cooking", "Persistently approaches the person he's interested in", "Loneliness hidden behind a cool expression", "A gentleman who keeps his loved one's secrets"],
        'charm_points_en': "Someone who knows your secret but never speaks of it. The seemingly perfect guy who shows his true self only to you.",
        'iconic_quote_en': "You're cute even like this, Prez."
    },
    # Kamisama Kiss
    '토모에': {
        'personality_en': ["The haughtiness of a 500-year-old fox yokai", "Rough with words but infinitely gentle in actions", "Highly jealous and possessive", "Loyalty to his master evolving into deep love"],
        'charm_points_en': "The moment the haughty fox wags his tail only for you. Even 500 years of time find meaning solely in you.",
        'iconic_quote_en': "I'm the one who worries about you."
    },
    # Skip Beat
    '츠루가 렌': {
        'personality_en': ["The perfect mask of Japan's top actor", "Darkness and scars hidden behind the mask", "Perfection crumbling in front of the one he loves", "Moments shining with sincerity, not acting"],
        'charm_points_en': "The moment the perfect actor's mask comes off, you meet the real him that only you are allowed to see.",
        'iconic_quote_en': "You are shining."
    },
    # Apothecary Diaries
    '진시': {
        'personality_en': ["Peerless beauty so handsome it's considered a crime", "Excellent political acumen and tactics", "Enjoys teasing and watching the reactions of the one he's interested in", "Puppy-like side, getting led around by a cat-like woman"],
        'charm_points_en': "The moment the greatest beauty in the land becomes weak only to you. To you, who lives for poison, he is the sweetest poison.",
        'iconic_quote_en': "What a cat-like woman."
    },
    # Blue Lock 
    '이사기 요이치': {
        'personality_en': ["Growth-type who awakens from mediocrity to the strongest", "Coexistence of cold judgment and burning competitive spirit", "An egoist who chooses his ego over the team", "Genius intuition that shines in crucial moments"],
        'charm_points_en': "Pure passion aimed at becoming the world's best striker. Getting lost in his eyes will make you want to sprint toward your own dreams.",
        'iconic_quote_en': "I will become the world's best striker."
    },
    # My Hero Academia
    '우라라카 오차코': {
        'personality_en': ["Owner of bright and positive energy at all times", "A filial daughter dreaming of being a hero for her family", "Pure innocence, turning red in front of her crush", "Surprisingly bold and brave in combat"],
        'charm_points_en': "The person who lifts you up every time you fall. The solid determination hidden behind her bright smile will become your hero.",
        'iconic_quote_en': "Do your best, Deku!"
    },
    # Attack on Titan
    '미카사 아커만': {
        'personality_en': ["Female warrior with humanity's strongest combat abilities", "Silent but infinitely gentle to the one she loves", "Devoted heart, cherishing her childhood muffler forever", "Coexistence of cold judgment and fiery emotions"],
        'charm_points_en': "The promise to stay by your side even if the world ends. The deep love hidden behind her stoic expression will embrace you.",
        'iconic_quote_en': "This world is cruel... but beautiful."
    },
    # Nisekoi
    '키리사키 치토게': {
        'personality_en': ["Rough and violent outside, but fragile and lonely inside", "Emotions transitioning from fake lovers to true love", "Cute habit of mixing English and Japanese", "Classic tsundere who can't be honest with her crush"],
        'charm_points_en': "The moment a love that started as fake becomes real. The destined partner who fits you perfectly, like a key and a lock.",
        'iconic_quote_en': "I'm not happy about it... idiot!"
    },
    # Quintessential Quintuplets
    '나카노 미쿠': {
        'personality_en': ["Quiet and introverted, but honest about her feelings of love", "Unexpected hobby as a Sengoku warlord nerd", "The first among the sisters to realize her own feelings", "Shy confession moments hidden behind her headphones"],
        'charm_points_en': "A person of few words who expresses love through actions. Her shy confession is the bravest moment in the world.",
        'iconic_quote_en': "I... like you, Futaro."
    },
    # Jujutsu Kaisen
    '쿠기사키 노바라': {
        'personality_en': ["Firm pride in her own beauty and strength", "Confident fashion lover who came to Tokyo from the countryside", "Loyalty to risk her life for her comrades", "Her honest and unrestrained personality is her true charm"],
        'charm_points_en': "Unfiltered honesty is her biggest charm. Someone who teaches you that living true to yourself is the most beautiful thing.",
        'iconic_quote_en': "I'm going to die being myself!"
    },
    # Chainsaw Man
    '마키마': {
        'personality_en': ["Overwhelming charisma hidden behind a gentle smile", "Mysterious gaze that seems to pierce through everything", "Duality where kindness and cruelty coexist", "Loneliness behind the identity of the Control Devil"],
        'charm_points_en': "A fatal charm that pulls you in even knowing it's dangerous. A presence that makes you feel like offering the world for just one of her smiles.",
        'iconic_quote_en': "Denji-kun, make my dream come true."
    },
    # Nagisa no Koto
    '사쿠라이 나기사': {
        'personality_en': ["Transfer student with a mysterious aura", "Kind to everyone but hides her true inner feelings", "Sentimental side that loves the ocean", "A charm that draws you in deeper the more you know her"],
        'charm_points_en': "Her smile that comes and goes like the tide. A brief encounter, but a moment of first love that will be remembered forever.",
        'iconic_quote_en': "Please remember me."
    },
    # Dagashi Kashi
    '시다레 호타루': {
        'personality_en': ["Encyclopedia-level knowledge about dagashi (Japanese snacks)", "Passionate and highly energetic personality", "Beautiful girl with captivating large eyes", "Conversational skills that capture your heart, starting from snacks"],
        'charm_points_en': "A charm you fall into just like sweet snacks. With her, even an ordinary snack shop becomes the most special place in the world.",
        'iconic_quote_en': "Do you know this dagashi? It's really delicious!"
    },
    # Sakurasou
    '시이나 마시로': {
        'personality_en': ["World-class genius painter with zero life skills", "Expressionless, but her paintings hold deep emotions", "Purity in trying to understand her own heart", "Starts drawing manga for the first time just for you"],
        'charm_points_en': "The moment when only you are painted on the genius's canvas. Clumsy with words, but her love conveyed through art is the most genuine.",
        'iconic_quote_en': "I need Sorata."
    },
    # A Place Further Than the Universe
    '코부치자와 시라세': {
        'personality_en': ["Indomitable will to go to Antarctica to find her mother", "Seems cold and stubborn but is fragile and emotional inside", "Once she decides, she never gives up", "The resonance of moments when her true emotions burst out"],
        'charm_points_en': "A companion walking beside you to the ends of the earth. In her tears, you learn what true courage is.",
        'iconic_quote_en': "Did you hear?! It's Antarctica!"
    },
    # Cafe Terrace
    '오오토리 아카네': {
        'personality_en': ["Bright, sociable, and popular idol", "Perfect on stage but an airhead in daily life", "Hardworking nature, diligently working at the cafe", "Gap moe: gets shy in front of the person she loves"],
        'charm_points_en': "The moment the sparkling star on stage looks only at you off stage. Sharing the small happiness of everyday life together.",
        'iconic_quote_en': "This cafe is where we began."
    },
    # Kaguya-sama Movie
    '이이노 미코': {
        'personality_en': ["Strong beliefs in rules and justice", "Loud voice and great courage coming from a petite frame", "Purity: turns bright red in front of her crush", "Easily feels lonely but never shows it outwardly"],
        'charm_points_en': "The moment the girl who lived strictly by the rules wavers in the face of love. Her earnesty is actually the cutest thing in the world.",
        'iconic_quote_en': "Rules are rules!"
    },
    # Dandadan
    '아야세 모모': {
        'personality_en': ["Supernatural nerd who believes in UMAs and espers", "Fearless and confident personality", "Bravery to fight for the person she likes", "Honest and unrestrained expressions of affection"],
        'charm_points_en': "A girl who grabs your hand and charges forward even when ghosts appear. She loves in the most realistic way within an unrealistic world.",
        'iconic_quote_en': "Okarun, let's go together!"
    },
    # Cardcaptor
    '리 샤오랑': {
        'personality_en': ["Started as rivals but gradually falls in love", "Blunt, but turns bright red (tsundere) only around Sakura", "Hong Kong boy with excellent martial arts skills", "Once he makes up his mind, he never wavers"],
        'charm_points_en': "From rivals to lovers. The moment he nervously but bravely confesses—one of the greatest moments in shoujo manga history.",
        'iconic_quote_en': "I like Sakura the best!"
    },
    # Banana Fish
    '애쉬 링크스': {
        'personality_en': ["Genius with a 200 IQ and boss of a NY street gang", "Deep scars hidden behind beautiful looks", "A solitary soul yearning for freedom", "Willing to sacrifice everything for the one he loves"],
        'charm_points_en': "The seat next to him as he quietly reads in the library. That fleeting peace is the most beautiful moment in the world.",
        'iconic_quote_en': "My soul is always with you."
    },
    # Kuroko
    '쿠로코 테츠야': {
        'personality_en': ["The shadow player, lacking presence but the core of the team", "Stoic but possesses stronger convictions than anyone", "Devotion to sacrifice himself for his teammates", "Cute side: loves vanilla shakes"],
        'charm_points_en': "The moment he lacks presence to everyone else, but you always notice him. He shines even brighter because he is the shadow, not the light.",
        'iconic_quote_en': "I am a shadow. But a shadow will become darker if the light is stronger."
    },
    # Haikyu!!
    '히나타 쇼요': {
        'personality_en': ["Incredible jumping power resolving his height disadvantage", "Infects everyone around him with bright, positive energy", "Indomitable spirit that stands up again even after failing", "Pure, passionate personality that charms even rivals"],
        'charm_points_en': "The infinite potential shown by the Small Giant on the court. Falling into his energy makes you feel like you can fly too.",
        'iconic_quote_en': "Height doesn't matter on the court!"
    },
    # Natsume
    '나츠메 타카시': {
        'personality_en': ["The warm growth of a lonely boy who can see yokai", "Kind and deeply considerate to everyone", "Loves both humans and yokai despite getting hurt", "Deep emotions hidden behind a quiet smile"],
        'charm_points_en': "A warmth that feels like it heals all the scars in the world just being by his side. A person who makes you happy just watching the sunset together.",
        'iconic_quote_en': "I will return your name to you."
    },
    # Hakuouki
    '히지카타 토시조': {
        'personality_en': ["Strict and charismatic leadership as Shinsengumi Vice-Commander", "Samurai spirit, risking his life for duty and loyalty", "Deep tenderness hidden beneath a cold exterior", "Resolve to protect his loved one to the very end"],
        'charm_points_en': "The blade that swears to protect only you, even in the maelstrom of history. The moment a samurai's loyalty turns into love.",
        'iconic_quote_en': "I will protect you."
    },
    # Vampire Knight
    '쿠란 카나메': {
        'personality_en': ["The noble charisma of a pureblood vampire prince", "Willing to turn the world into his enemy for Yuki", "Gentle and elegant but can be cruel within", "Waited for only one person through thousands of years of solitude"],
        'charm_points_en': "The moment the prince of darkness offers eternity just for you. A dangerous yet irresistible forbidden love.",
        'iconic_quote_en': "Yuki, you are my everything."
    },
    # Black Butler
    '세바스찬 미카엘리스': {
        'personality_en': ["The dignity of a perfect butler, despite being a demon", "Possesses elegant and refined manners", "Cynical yet exudes an uncanny charm", "Surprisingly cute side: loves cats"],
        'charm_points_en': "A being so perfect you wouldn't mind a contract with a devil. The moment those red eyes look only at you, you'd gladly give your soul.",
        'iconic_quote_en': "I am simply one hell of a butler."
    },
    # Bungo Stray Dogs
    '다자이 오사무': {
        'personality_en': ["Eccentric obsession with suicide, yet a genius tactician", "Hides profound darkness behind a bright expression", "Playful, but shows his true self in critical moments", "The plot twist of being a former mafia boss"],
        'charm_points_en': "His smile that shines even in the darkness. The moment the illusion that only you can save him in this broken world becomes reality.",
        'iconic_quote_en': "I'd like to commit double suicide with a beautiful woman."
    },
    # Naruto
    '우즈마키 나루토': {
        'personality_en': ["A ninja way that never gives up", "Overcame a lonely past to become everyone's hero", "Loud and boisterous, but deeply loves his comrades", "The eternal boy who loves ramen"],
        'charm_points_en': "You, who always cheered at his back when the whole village shunned him. The moment he finally turns around to look at you.",
        'iconic_quote_en': "I never go back on my word. That's my ninja way!"
    },
    # Chihayafuru
    '마시마 타이치': {
        'personality_en': ["Someone who tries harder than anyone because he isn't a genius", "Complexes hidden behind perfect looks and grades", "Single-minded devotion, looking at only one person", "A real man who grows through karuta"],
        'charm_points_en': "Someone who tries to stand by your side through sheer effort, even lacking talent. His back is the most handsome in the world.",
        'iconic_quote_en': "I want to win with skill, not luck."
    },
    # Ranma
    '사오토메 란마': {
        'personality_en': ["Bizarre constitution that turns him into a girl when splashed with water", "Genius at martial arts but clumsy at romance", "Arrogant and foul-mouthed but secretly caring (classic tsundere)", "Competitive spirit that absolutely refuses to lose"],
        'charm_points_en': "A relationship where they fight every day but worry about each other the most. The chaotic daily life is actually the happiest moment.",
        'iconic_quote_en': "Akane is my fiancée!"
    },
    # Yuri on Ice
    '빅토르 니키포로프': {
        'personality_en': ["Legendary figure skater and 5-time consecutive world champion", "Free-spirited and charismatic personality", "Finding new meaning in love and life", "The presence that shines most beautifully on the ice"],
        'charm_points_en': "The moment the legend on the ice becomes a coach just for you. The message of love embedded in his program.",
        'iconic_quote_en': "Yuri, surprise me."
    },
    # Welcome to Ballroom
    '후지타 타타라': {
        'personality_en': ["Dance awakening of an ordinary boy with no hobbies or talents", "Qualities of a leader trying to make his partner shine", "Dance genius with exceptional observation and imitation skills", "A growth character who shines brighter match by match"],
        'charm_points_en': "His hand holding yours and leading on the dance floor. The world feels like it stops while you dance together.",
        'iconic_quote_en': "Dance is created by a man and a woman together."
    },
    # Kobato
    '후지모토 키요카즈': {
        'personality_en': ["Initially cynical and blunt attitude", "Infinitely gentle to the children at the orphanage", "Hides past trauma and bears it alone", "Gradually opens his heart in front of Kobato"],
        'charm_points_en': "The moment his winter-cold heart melts like spring. You are the one knocking on the door to his slowly opening heart.",
        'iconic_quote_en': "You're such a pain..."
    },
    # Polar Opposites
    '타니 히로키': {
        'personality_en': ["Talks little and shows almost no facial expressions", "Actually a deeply considerate and meticulous observer", "Clumsy personality that swallows words he wants to say", "Slowly expressing his feelings of love through actions"],
        'charm_points_en': "The process of two complete opposites understanding each other. A single word from the blunt guy is the sweetest thing in the world.",
        'iconic_quote_en': "...I like you."
    },
    # Prince of Tennis
    '에치젠 료마': {
        'personality_en': ["A tennis prodigy facing the world at a young age", "Provocative confidence backed up by actual skills", "Fierce competitive spirit hidden behind a cool expression", "Cute side: loves his cat Karupin"],
        'charm_points_en': "The moment the little prince of the court smiles pulling down his hat after a victory. That confidence is his most attractive trait.",
        'iconic_quote_en': "You still have a long way to go."
    },
    # Wind Breaker
    '사쿠라 하루카': {
        'personality_en': ["The bond of a solitary boy with his first comrades", "Outstanding fighting skills hiding a warm heart", "Strong will to prove his own worth", "Growing and changing as he mingles with people"],
        'charm_points_en': "The first person the lonely boy opens his heart to. You are the one who notices the warm heart hidden behind his rough fists.",
        'iconic_quote_en': "I protect this town."
    }
}

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
    "활발": "Energetic", "단정": "Neat", "츤츤": "Tsun-Tsun", "데레데레": "Dere-Dere",
    "연기": "Acting", "완벽주의": "Perfectionism", "카멜레온": "Chameleon",
    "검술": "Swordsmanship", "마법": "Magic", "성녀": "Saint", "공주": "Princess",
    "아이돌": "Idol", "배우": "Actress", "복수": "Revenge", "순진": "Innocent",
    "천재": "Genius", "노력": "Effort", "우정": "Friendship", "가족": "Family",
    "사극": "Historical", "추리": "Deduction", "연예": "Entertainment", "서스펜스": "Suspense",
    "사망귀환": "Return by Death", "근성": "Guts", "오타쿠": "Otaku", "쌍둥이": "Twins",
    "반전매력": "Gap Moe", "피어싱": "Piercings", "온화": "Gentle", "후각": "Sense of Smell",
    "가족애": "Family Love", "성실": "Diligent", "나비": "Butterfly", "과묵": "Taciturn",
    "현실주의": "Realism", "행운": "Luck", "전략": "Strategy", "폭발마법": "Explosion Magic",
    "중이병": "Chunibyo", "귀여움": "Cute", "학생회장": "Student Council President",
    "재벌": "Conglomerate", "두뇌전": "Mind Games", "스파이": "Spy", "암살자": "Assassin",
    "천연": "Airhead", "솔로": "Solo", "관찰력": "Observation", "자기희생": "Self-sacrifice",
    "빙하": "Glacier", "독서": "Reading", "진심": "Sincerity", "매드사이언티스트": "Mad Scientist",
    "시간여행": "Time Travel", "과학": "Science", "전생": "Reincarnation", "엘프귀": "Elf Ears",
    "둔감": "Dense", "직설": "Blunt", "다정": "Sweet", "투명": "Invisible", "선배": "Senpai",
    "여배우": "Actress", "사신": "Reaper", "전사": "Warrior", "소령": "Major", "정의감": "Sense of Justice",
    "목소리": "Voice", "순수": "Pure", "열혈": "Hot-blooded", "패배": "Defeat", "장난": "Prank",
    "미소": "Smile", "문학소년": "Literary Boy", "첫사랑": "First Love", "육상": "Track and Field",
    "용사": "Hero", "나르시스트": "Narcissist", "영생": "Eternal Life", "후회": "Regret",
    "각성": "Awakening", "그림자": "Shadow", "최강": "Strongest", "헌터": "Hunter", "쿨뷰티": "Cool Beauty",
    "강인": "Strong", "엄마": "Mother", "왕자님": "Prince", "밝음": "Bright", "인내": "Patience",
    "빙하남": "Ice Prince", "보호": "Protection", "호위": "Escort", "충성": "Loyalty", "실용적": "Pragmatic",
    "성별무관": "Genderless", "장학생": "Scholarship Student", "엉뚱": "Eccentric", "화려": "Glamorous",
    "신": "God", "용기": "Courage", "여우요괴": "Fox Yokai", "약사": "Apothecary", "독설": "Poisonous Tongue",
    "환관": "Eunuch", "미모": "Beauty", "에고": "Ego", "히어로": "Hero", "무중력": "Zero Gravity",
    "응원": "Cheering", "자유": "Freedom", "거인": "Titan", "의지": "Willpower", "머플러": "Muffler",
    "야쿠자": "Yakuza", "약속": "Promise", "폭력계": "Violent Type", "금발": "Blonde", "수재": "Honor Student",
    "가난": "Poor", "가정교사": "Tutor", "헤드폰": "Headphones", "수줍음": "Shy", "스쿠나": "Sukuna",
    "인간애": "Humanity", "패션": "Fashion", "자신감": "Confidence", "못": "Nails", "체인소": "Chainsaw",
    "꿈": "Dream", "지배": "Control", "카리스마": "Charisma", "관찰": "Observation", "아름다움": "Beauty",
    "만화가지망": "Aspiring Mangaka", "다가시": "Dagashi", "고민": "Worries", "다가시매니아": "Dagashi Maniac",
    "부잣집": "Rich Family", "고양이": "Cat", "천재화가": "Genius Painter", "무표정": "Expressionless",
    "도전": "Challenge", "열정": "Passion", "남극": "Antarctica", "모녀": "Mother and Daughter",
    "카페": "Cafe", "고백후": "After Confession", "연인": "Lover", "풍기위원": "Disciplinary Committee",
    "오컬트": "Occult", "변신": "Transformation", "초능력": "Superpowers", "당당": "Confident",
    "UMA": "UMA", "마법소녀": "Magical Girl", "카드": "Cards", "무술": "Martial Arts", "홍콩": "Hong Kong",
    "비극": "Tragedy", "존재감제로": "Zero Presence", "패스": "Pass", "점프": "Jump", "태양": "Sun",
    "요괴": "Yokai", "고독": "Solitude", "신선조": "Shinsengumi", "충의": "Loyalty", "기억": "Memory",
    "순혈종": "Pureblood", "악마집사": "Demon Butler", "완벽": "Perfect", "자살매니아": "Suicide Maniac",
    "어둠": "Darkness", "호카게": "Hokage", "여우": "Fox", "카루타": "Karuta", "재능": "Talent",
    "편연": "Slight Affection", "요리치": "Terrible Cook", "전설": "Legend", "피겨": "Figure",
    "러시아": "Russia", "노래": "Singing", "차가움": "Coldness", "아르바이트": "Part-time Job",
    "과거": "Past", "무뚝뚝": "Blunt", "쿨": "Cool", "시점": "POV", "솔로플레이": "Solo Play", "게이머": "Gamer",
    "리더십": "Leadership"
}

GENRE_MAP = {
    "순정": "Romance", "학원": "School", "일상": "Slice of Life", "판타지": "Fantasy",
    "액션": "Action", "코미디": "Comedy", "스릴러": "Thriller", "미스터리": "Mystery",
    "이세계": "Isekai", "다크판타지": "Dark Fantasy", "스포츠": "Sports", "닌자": "Ninja",
    "성장": "Growth", "피겨스케이팅": "Figure Skating", "댄스": "Dance", "테니스": "Tennis",
    "치유": "Healing", "연예": "Entertainment", "서스펜스": "Suspense", "모험": "Adventure",
    "드라마": "Drama", "가족": "Family", "SF": "Sci-Fi", "전쟁": "Military", "역사": "Historical",
    "축구": "Soccer", "히어로": "Hero", "오컬트": "Occult", "마법소녀": "Magical Girl", "범죄": "Crime",
    "농구": "Basketball", "배구": "Volleyball", "청춘": "Youth"
}

def translate_list(items, mapping):
    if not items: return []
    return [mapping.get(item, item) for item in items]

def main():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create missing columns if they don't exist (schema was updated, but DB might not be)
    try:
        cursor.execute("ALTER TABLE animes ADD COLUMN genre_en TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists
    
    try:
        cursor.execute("ALTER TABLE characters ADD COLUMN personality_en TEXT")
        cursor.execute("ALTER TABLE characters ADD COLUMN charm_points_en TEXT")
        cursor.execute("ALTER TABLE characters ADD COLUMN iconic_quote_en TEXT")
        cursor.execute("ALTER TABLE characters ADD COLUMN tags_en TEXT")
    except sqlite3.OperationalError:
        pass

    # Update Animes
    print("Updating anime genres...")
    cursor.execute("SELECT id, genre FROM animes")
    for row in cursor.fetchall():
        genres = json.loads(row['genre']) if row['genre'] else []
        genres_en = translate_list(genres, GENRE_MAP)
        cursor.execute("UPDATE animes SET genre_en = ? WHERE id = ?", (json.dumps(genres_en), row['id']))

    # Update Characters
    print("Updating character translations...")
    cursor.execute("SELECT id, name_ko, tags, personality, charm_points FROM characters")
    for row in cursor.fetchall():
        tags = json.loads(row['tags']) if row['tags'] else []
        tags_en = translate_list(tags, TAG_MAP)
        
        name_ko = row['name_ko']
        en_data = TRANSLATIONS.get(name_ko, {})
        
        pers_en = en_data.get('personality_en', [])
        if not pers_en and row['personality']:
            pers_en = json.loads(row['personality']) # Fallback to KO if missing
            
        charm_en = en_data.get('charm_points_en', row['charm_points'] or "")
        quote_en = en_data.get('iconic_quote_en', "")
        
        cursor.execute("""
            UPDATE characters 
            SET tags_en = ?, personality_en = ?, charm_points_en = ?, iconic_quote_en = ?
            WHERE id = ?
        """, (json.dumps(tags_en), json.dumps(pers_en), charm_en, quote_en, row['id']))

    conn.commit()
    conn.close()
    print("✅ Translation applied successfully to animatch.db")

if __name__ == "__main__":
    main()
