import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface SEOProps {
    title?: string;
    description?: string;
}

export default function SEO({ title, description }: SEOProps) {
    const { i18n } = useTranslation();
    const location = useLocation();
    const lang = i18n.language || 'en';
    const isKo = lang.startsWith('ko');

    const isJa = lang.startsWith('ja');
    const isZh = lang.startsWith('zh');

    const defaultTitle = isKo
        ? 'AniMatch - 나와 닮은 애니 주인공 연인 찾기'
        : isJa ? 'AniMatch - アニメの恋人を見つけよう'
            : isZh ? 'AniMatch - 尋找你的動漫戀人'
                : 'AniMatch - Find Your Anime Partner';

    const defaultDesc = isKo
        ? 'AI가 당신의 얼굴을 분석해 운명의 애니메이션 연인을 매칭해드립니다.'
        : isJa ? 'AIがあなたの顔を分析し運命のアニメキャラとマッチングします。'
            : isZh ? 'AI會分析你的臉部特徵，為你配對命中注定的動漫戀人。'
                : 'AI-powered anime character matching. Find your destined anime partner.';

    const finalTitle = title || defaultTitle;
    const finalDesc = description || defaultDesc;

    // Construct canonical URL without the lang query parameter for the base (or x-default)
    const baseUrl = 'https://animatch.midori-lab.com';
    const path = location.pathname;

    // Current URL with lang param
    const currentUrl = `${baseUrl}${path}?lang=${i18n.language}`;
    const koUrl = `${baseUrl}${path}?lang=ko`;
    const enUrl = `${baseUrl}${path}?lang=en`;
    const jaUrl = `${baseUrl}${path}?lang=ja`;
    const zhUrl = `${baseUrl}${path}?lang=zh-TW`;
    // x-default should point to the bare path so users without preference get the default behavior (or redirected later).
    const xDefaultUrl = `${baseUrl}${path}`;

    return (
        <Helmet>
            <title>{finalTitle}</title>
            <meta name="description" content={finalDesc} />

            {/* Canonical and Alternate Links */}
            <link rel="canonical" href={currentUrl} />
            <link rel="alternate" hrefLang="ko" href={koUrl} />
            <link rel="alternate" hrefLang="en" href={enUrl} />
            <link rel="alternate" hrefLang="ja" href={jaUrl} />
            <link rel="alternate" hrefLang="zh-TW" href={zhUrl} />
            <link rel="alternate" hrefLang="x-default" href={xDefaultUrl} />

            {/* Open Graph Tags */}
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDesc} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:locale" content={isKo ? 'ko_KR' : isJa ? 'ja_JP' : isZh ? 'zh_TW' : 'en_US'} />
            {/* The alternate tags are usually kept simple, so rendering x-default/others is optional in HTML, but we will add primary alternates if needed */}
            <meta property="og:locale:alternate" content="ko_KR" />
            <meta property="og:locale:alternate" content="en_US" />
            <meta property="og:locale:alternate" content="ja_JP" />
            <meta property="og:locale:alternate" content="zh_TW" />

            {/* Twitter Cards */}
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={finalDesc} />
        </Helmet>
    );
}
