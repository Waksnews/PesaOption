import React, { useEffect } from 'react';

export interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  ogType?: string;
  schemaData?: object | object[];
}

const DEFAULT_KEYWORDS = "Forex Trading Kenya, Crypto Trading Kenya, Binary Options Trading, M-PESA Trading Platform, Online Trading Kenya, Demo Trading Account, Live Trading Platform, PesaOption";
const BASE_URL = "https://www.pesaoption.site";

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords = DEFAULT_KEYWORDS,
  canonicalPath = '',
  ogType = 'website',
  schemaData
}) => {
  useEffect(() => {
    // 1. Update document title
    document.title = title;

    // 2. Helper to set or create meta tag
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attrName = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attrName}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attrName, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // 3. Set standard meta tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    setMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMetaTag('author', 'PesaOption');

    // Google Search Console verification meta tag (optional env var support)
    const gscCode = import.meta.env.VITE_GSC_VERIFICATION;
    if (gscCode) {
      setMetaTag('google-site-verification', gscCode);
    }

    // 4. Set Open Graph tags
    const fullCanonicalUrl = `${BASE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:url', fullCanonicalUrl, true);
    setMetaTag('og:site_name', 'PesaOption', true);
    setMetaTag('og:image', `${BASE_URL}/favicon.svg`, true);

    // 5. Set Twitter tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', `${BASE_URL}/favicon.svg`);

    // 6. Set Canonical link tag
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullCanonicalUrl);

    // 7. Apple touch icon
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.setAttribute('rel', 'apple-touch-icon');
      document.head.appendChild(appleIcon);
    }
    appleIcon.setAttribute('href', `${BASE_URL}/favicon.svg`);

    // 8. Inject JSON-LD Schema
    let scriptTag = document.getElementById('pesaoption-dynamic-seo-schema') as HTMLScriptElement;
    if (schemaData) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'pesaoption-dynamic-seo-schema';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schemaData);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    // 9. Optional GA4 tracking code initialization
    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (gaId) {
      if (!document.getElementById('ga-gtag-script')) {
        const gaScript = document.createElement('script');
        gaScript.id = 'ga-gtag-script';
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(gaScript);

        const gaInline = document.createElement('script');
        gaInline.id = 'ga-gtag-inline';
        gaInline.textContent = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { page_path: '${fullCanonicalUrl}' });
        `;
        document.head.appendChild(gaInline);
      } else if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'page_view', { page_path: fullCanonicalUrl });
      }
    }

    // 10. Optional Microsoft Clarity initialization
    const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID;
    if (clarityId && !document.getElementById('clarity-script')) {
      const clarityScript = document.createElement('script');
      clarityScript.id = 'clarity-script';
      clarityScript.textContent = `
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarityId}");
      `;
      document.head.appendChild(clarityScript);
    }

    // 11. Optional Google Tag Manager (GTM) initialization
    const gtmId = import.meta.env.VITE_GTM_ID;
    if (gtmId && !document.getElementById('gtm-script')) {
      const gtmScript = document.createElement('script');
      gtmScript.id = 'gtm-script';
      gtmScript.textContent = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `;
      document.head.appendChild(gtmScript);
    }
  }, [title, description, keywords, canonicalPath, ogType, schemaData]);

  return null;
};

