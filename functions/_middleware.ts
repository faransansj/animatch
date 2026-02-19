/**
 * Cloudflare Pages Middleware for dynamic OG meta tags.
 *
 * When a crawler (Twitter, Discord, etc.) visits /?match={heroine_id},
 * this middleware rewrites the OG tags in index.html with character-specific data.
 * Regular browser visits pass through unchanged.
 */

const CRAWLER_UA = /bot|crawl|spider|preview|telegram|whatsapp|discord|slack|facebook|twitter|Twitterbot|Slackbot|Discordbot|facebookexternalhit|Facebot|LinkedInBot|Pinterest|Embedly|vkShare|LINE/i;

const CHARACTER_DATA: Record<number, { name: string; name_en: string; anime: string; anime_en: string }> = {
  38: { name: '소마 큐', name_en: 'Yuki Soma', anime: '프루츠 바스켓', anime_en: 'Fruits Basket' },
  40: { name: '마부치 코우', name_en: 'Kou Mabuchi', anime: '아오하라이드', anime_en: 'Ao Haru Ride' },
  42: { name: '쿠도 키요카', name_en: 'Kiyoka Kudou', anime: '나의 행복한 결혼', anime_en: 'My Happy Marriage' },
  44: { name: '하크', name_en: 'Hak', anime: '새벽의 연화', anime_en: 'Yona of the Dawn' },
  46: { name: '스오 타마키', name_en: 'Tamaki Suoh', anime: '오란 고교 호스트부', anime_en: 'Ouran High School Host Club' },
  84: { name: '리 샤오랑', name_en: 'Syaoran Li', anime: '카드캡터 사쿠라', anime_en: 'Cardcaptor Sakura' },
  94: { name: '히지카타 토시조', name_en: 'Toshizo Hijikata', anime: '월영환담', anime_en: 'Hakuoki' },
  96: { name: '쿠란 카나메', name_en: 'Kaname Kuran', anime: '뱀파이어 기사', anime_en: 'Vampire Knight' },
  102: { name: '우즈마키 나루토', name_en: 'Naruto Uzumaki', anime: '나루토', anime_en: 'Naruto' },
  48: { name: '우스이 타쿠미', name_en: 'Takumi Usui', anime: '메이드사마!', anime_en: 'Maid Sama!' },
  50: { name: '토모에', name_en: 'Tomoe', anime: '카미사마 키스', anime_en: 'Kamisama Kiss' },
  52: { name: '츠루가 렌', name_en: 'Ren Tsuruga', anime: '스킵 비트!', anime_en: 'Skip Beat!' },
  104: { name: '마시마 타이치', name_en: 'Taichi Mashima', anime: '치하야후루', anime_en: 'Chihayafuru' },
  106: { name: '사오토메 란마', name_en: 'Ranma Saotome', anime: '란마 1/2', anime_en: 'Ranma 1/2' },
  112: { name: '후지모토 키요카즈', name_en: 'Kiyokazu Fujimoto', anime: '코바토', anime_en: 'Kobato.' },
  114: { name: '타니 히로키', name_en: 'Hiroki Tani', anime: '낫-나에 일로맞춤', anime_en: 'You and I Are Polar Opposites' },
  54: { name: '진시', name_en: 'Jinshi', anime: '약사의 혼잣말', anime_en: 'The Apothecary Diaries' },
  2: { name: '아스나', name_en: 'Asuna', anime: '소드 아트 온라인', anime_en: 'Sword Art Online' },
  4: { name: '렘', name_en: 'Rem', anime: 'Re:Zero', anime_en: 'Re:Zero' },
  6: { name: '호리 쿄코', name_en: 'Kyoko Hori', anime: '호리미야', anime_en: 'Horimiya' },
  8: { name: '츠유리 카나오', name_en: 'Kanao Tsuyuri', anime: '귀멸의 칼날', anime_en: 'Demon Slayer' },
  10: { name: '아이사카 타이가', name_en: 'Taiga Aisaka', anime: '토라도라!', anime_en: 'Toradora!' },
  12: { name: '메구밍', name_en: 'Megumin', anime: '이 멋진 세계에 축복을!', anime_en: 'KonoSuba' },
  14: { name: '시노미야 카구야', name_en: 'Kaguya Shinomiya', anime: '카구야 님은 고백받고 싶어', anime_en: 'Kaguya-sama: Love Is War' },
  16: { name: '요르 포저', name_en: 'Yor Forger', anime: '스파이 패밀리', anime_en: 'Spy x Family' },
  18: { name: '유키노시타 유키노', name_en: 'Yukino Yukinoshita', anime: '내 청춘 러브코미디는 잘못됐다', anime_en: 'Oregairu' },
  58: { name: '우라라카 오차코', name_en: 'Ochaco Uraraka', anime: '나의 히어로 아카데미아', anime_en: 'My Hero Academia' },
  60: { name: '미카사 아커만', name_en: 'Mikasa Ackerman', anime: '진격의 거인', anime_en: 'Attack on Titan' },
  62: { name: '키리사키 치토게', name_en: 'Chitoge Kirisaki', anime: '니세코이', anime_en: 'Nisekoi' },
  64: { name: '나카노 미쿠', name_en: 'Miku Nakano', anime: '오등분의 신부', anime_en: 'The Quintessential Quintuplets' },
  66: { name: '쿠기사키 노바라', name_en: 'Nobara Kugisaki', anime: '주술회전', anime_en: 'Jujutsu Kaisen' },
  68: { name: '마키마', name_en: 'Makima', anime: '체인소 맨', anime_en: 'Chainsaw Man' },
  20: { name: '마키세 쿠리스', name_en: 'Kurisu Makise', anime: '슈타인즈 게이트', anime_en: 'Steins;Gate' },
  22: { name: '실피엣', name_en: 'Sylphiette', anime: '무직전생', anime_en: 'Mushoku Tensei' },
  24: { name: '사쿠라지마 마이', name_en: 'Mai Sakurajima', anime: '번역 BUNNY GIRL', anime_en: 'Bunny Girl Senpai' },
  26: { name: '블라디레나 밀리제', name_en: 'Vladilena Milize', anime: '86 에이티식스', anime_en: '86 Eighty-Six' },
  28: { name: '타카기', name_en: 'Takagi', anime: '반짝반짝 물방울', anime_en: 'Teasing Master Takagi-san' },
  30: { name: '미즈노 아카네', name_en: 'Akane Mizuno', anime: '츠키가 키레이', anime_en: 'Tsuki ga Kirei' },
  72: { name: '시다레 호타루', name_en: 'Hotaru Shidare', anime: '다가시카시', anime_en: 'Dagashi Kashi' },
  74: { name: '시이나 마시로', name_en: 'Mashiro Shiina', anime: '사쿠라장의 애완 그녀', anime_en: 'The Pet Girl of Sakurasou' },
  76: { name: '코부치자와 시라세', name_en: 'Shirase Kobuchizawa', anime: '우주보다 먼 곳', anime_en: 'A Place Further Than the Universe' },
  78: { name: '오오토리 아카네', name_en: 'Akane Hououji', anime: '여신의 카페 테라스', anime_en: 'The Cafe Terrace and Its Goddesses' },
  32: { name: '쿠로카와 아카네', name_en: 'Akane Kurokawa', anime: '최애의 아이', anime_en: 'Oshi no Ko' },
  34: { name: '프리렌', name_en: 'Frieren', anime: '프리렌', anime_en: 'Frieren' },
  36: { name: '차해인', name_en: 'Cha Hae-In', anime: '나 혼자만 레벨업', anime_en: 'Solo Leveling' },
  80: { name: '이이노 미코', name_en: 'Miko Iino', anime: '사랑은 전쟁이다 극장판', anime_en: 'Kaguya-sama: The First Kiss That Never Ends' },
  82: { name: '아야세 모모', name_en: 'Momo Ayase', anime: '단델', anime_en: 'DAN DA DAN' },
};

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const matchId = url.searchParams.get('match');
  const ua = context.request.headers.get('User-Agent') || '';

  // Only intercept: root path + ?match= param + crawler UA
  if (url.pathname !== '/' || !matchId || !CRAWLER_UA.test(ua)) {
    return context.next();
  }

  const heroineId = parseInt(matchId, 10);
  const charData = CHARACTER_DATA[heroineId];

  if (!charData) {
    return context.next();
  }

  // Fetch the static index.html
  const response = await context.next();
  let html = await response.text();

  const ogTitle = `AniMatch - ${charData.name_en} (${charData.anime_en})`;
  const ogDesc = `I matched with ${charData.name_en} from ${charData.anime_en} on AniMatch! Find your anime partner too.`;
  const ogImage = `${url.origin}/images/tarot/${heroineId}.webp`;
  const ogUrl = `${url.origin}/?match=${heroineId}`;

  html = html
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${ogTitle}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${ogDesc}">`)
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${ogImage}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${ogTitle}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${ogDesc}">`);

  if (!html.includes('og:url')) {
    html = html.replace('</head>', `  <meta property="og:url" content="${ogUrl}">\n</head>`);
  }

  return new Response(html, {
    headers: response.headers,
  });
};
