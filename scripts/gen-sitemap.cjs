const fs = require('fs');

const path = '/Users/midori/Develop/test/public/sitemap.xml';
const base = 'https://animatch.midori-lab.com';
const routes = ['/', '/upload', '/privacy', '/terms'];
const langs = ['ko', 'en', 'ja', 'zh-TW'];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

// Helper for alternates
const getAlternates = (r) => {
  return langs.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${base}${r}?lang=${l}" />`).join('\n') +
         `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${r}" />`;
};

routes.forEach(r => {
  const prio = r === '/' ? '1.0' : r === '/upload' ? '0.8' : '0.3';
  const freq = r === '/' ? 'daily' : r === '/upload' ? 'monthly' : 'yearly';
  
  // Base x-default URL
  xml += `  <url>
    <loc>${base}${r}</loc>
${getAlternates(r)}
    <lastmod>2026-02-26</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${prio}</priority>
  </url>\n`;

  // Language specific URLs
  langs.forEach(l => {
    xml += `  <url>
    <loc>${base}${r}?lang=${l}</loc>
${getAlternates(r)}
    <lastmod>2026-02-26</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${prio}</priority>
  </url>\n`;
  });
});

xml += `</urlset>\n`;

fs.writeFileSync(path, xml);
console.log('Sitemap generated!');
