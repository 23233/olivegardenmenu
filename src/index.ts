import {Hono, MiddlewareHandler} from 'hono'
import {serveStatic} from 'hono/cloudflare-workers'
import indexData from '../raw/index.json';
import siteConfig from "../raw/site.json";
import nearMeData from "../raw/near_me.json";
import contactUsData from "../raw/contact_us.json";
import privacyPolicyData from "../raw/privacy_policy.json";
import termsOfServiceData from "../raw/terms_of_service.json";
import drinkMenuData from "../raw/drink-menu.json";
import lunchMenuData from "../raw/lunch-menu.json";
import dinnerMenuData from "../raw/dinner-menu.json";
import dessertMenuData from "../raw/dessert-menu.json";
import cateringMenuData from "../raw/catering-menu.json";
import hawaiiData from "../raw/hawaii.json";
import hawaiiFullMenuData from "../raw/hawai-full-menu.json";
import kidsMenuData from "../raw/kids-menu.json";
import pastaMenuData from "../raw/pasta-menu.json";
import soupMenuData from "../raw/soup-menu.json";
import nutritionAllergenMenuData from "../raw/nutrition-allergen-menu.json";
import specialsData from "../raw/specials.json";
import happyHoursData from "../raw/happy-hours.json";
import couponsData from "../raw/coupons.json";
import holidayHoursData from "../raw/holiday-hours.json";
import masterMenuData from "../raw/master-menu-data.json";

const pageDataMap: { [key: string]: any } = {
  '/': indexData,
  '/olive-garden-drink-menu': drinkMenuData,
  '/olive-garden-near-me': nearMeData,
  '/olive-garden-lunch-menu': lunchMenuData,
  '/olive-garden-dinner-menu': dinnerMenuData,
  '/olive-garden-dessert-menu': dessertMenuData,
  '/olive-garden-catering-menu': cateringMenuData,
  '/olive-garden-kids-menu': kidsMenuData,
  '/olive-garden-pasta-menu': pastaMenuData,
  '/olive-garden-soup-menu': soupMenuData,
  '/olive-garden-nutrition-allergen-menu': nutritionAllergenMenuData,
  '/contact-olive-garden': contactUsData,
  '/privacy-policy': privacyPolicyData,
  '/terms-of-service': termsOfServiceData,
  '/olive-garden-specials': specialsData,
  '/olive-garden-happy-hours': happyHoursData,
  '/olive-garden-coupons': couponsData,
  '/olive-garden-holiday-hours': holidayHoursData,
  '/olive-garden-hawaii': hawaiiData,
};

const app = new Hono()

// --- Caching Middleware ---
const cacheMiddleware: MiddlewareHandler = async (c, next) => {
  const url = new URL(c.req.url);
  const path = url.pathname;

  // Define paths to exclude from caching
  const excludedPaths = ['/static', '/robots.txt', '/sitemap.xml'];
  const isExcluded = excludedPaths.some(p => path.startsWith(p));

  if (isExcluded) {
    await next();
    return;
  }

  const cache = caches.default;
  const cachedResponse = await cache.match(c.req.raw);

  if (cachedResponse) {
    return cachedResponse;
  }

  await next();

  if (c.res.ok && c.res.headers.get('Content-Type')?.includes('text/html')) {
    const responseToCache = c.res.clone();
    // Add a cache control header to the response to be cached
    responseToCache.headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    c.executionCtx.waitUntil(cache.put(c.req.raw, responseToCache));
  }
};

// Apply the middleware to all requests
app.use(cacheMiddleware);


// --- Utility Functions ---

function toKebabCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}


/**
 * Safely joins a base URL with multiple path segments.
 * Handles leading/trailing slashes to prevent duplicates.
 * @param base The base URL (e.g., "https://example.com/")
 * @param paths The path segments to join (e.g., "path1", "/path2")
 * @returns A correctly formatted full URL, not ending with a slash.
 */
function joinUrlPaths(base: string, ...paths: string[]): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPaths = paths.map(p => p.startsWith('/') ? p.slice(1) : p);
  let fullUrl = [trimmedBase, ...trimmedPaths].join('/');

  // Ensure the final URL does not end with a slash, unless it is just "/"
  if (fullUrl.length > 1 && fullUrl.endsWith('/')) {
    fullUrl = fullUrl.slice(0, -1);
  }

  return fullUrl;
}


// --- HTML Generation Functions ---

function generateHead(siteConfig: any, data: any, pagePath: string): string {
  const {siteName, colors, baseURL} = siteConfig;
  const {metadata} = data;
  const {h1, description, coreKeyword, author, datePublished} = metadata;

  const pageUrl = joinUrlPaths(baseURL, pagePath);
  const logoUrl = joinUrlPaths(baseURL, siteConfig.logoUrl);

  const graph = [
    {"@type": "WebSite", "name": siteName, "url": pageUrl, "@id": `${pageUrl}#website`},
    {"@type": "Organization", "name": siteName, "url": pageUrl, "logo": logoUrl},
    {
      "@type": "WebPage",
      "url": pageUrl,
      "name": h1,
      "description": description,
      "isPartOf": {"@id": `${pageUrl}#website`},
      "primaryImageOfPage": {"@id": `${pageUrl}#primaryimage`}
    },
    {
      "@type": "Person",
      "name": author.name,
      "email": author.email
    }
  ];

  // Dynamically add Restaurant schema if a locationBlock exists
  const locationBlock = data.contentBlocks.find((block: any) => block.type === 'locationBlock');
  if (locationBlock && locationBlock.data && Array.isArray(locationBlock.data.locations)) {
    locationBlock.data.locations.forEach((location: any) => {
      const restaurantSchema = {
        "@type": "Restaurant",
        "name": location.name,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": location.streetAddress,
          "addressLocality": location.addressLocality,
          "addressRegion": location.addressRegion,
          "postalCode": location.postalCode,
          "addressCountry": "US"
        },
        "telephone": location.telephone,
        "openingHoursSpecification": location.openingHoursSpecification.map((spec: any) => ({
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": spec.dayOfWeek,
          "opens": spec.opens,
          "closes": spec.closes
        }))
      };
      // @ts-ignore
      graph.push(restaurantSchema);
    });
  }

  // Dynamically add FAQPage schema if an FAQ block exists
  const faqBlock = data.contentBlocks.find((block: any) => block.type === 'faq');
  if (faqBlock) {
    const faqPageSchema = {
      "@type": "FAQPage",
      "mainEntity": faqBlock.data.items.map((item: any) => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    };
    // @ts-ignore
    graph.push(faqPageSchema);
  }

  // Dynamically add ImageGallery schema and its images
  const galleryBlock = data.contentBlocks.find((block: any) => block.type === 'imageGallery');
  if (galleryBlock) {
    const imageGallerySchema = {
      "@type": "ImageGallery",
      "name": galleryBlock.data.title,
      "description": galleryBlock.data.description,
      "image": galleryBlock.data.items.map((item: any) => ({
        "@type": "ImageObject",
        "contentUrl": joinUrlPaths(pageUrl, item.url),
        "caption": item.alt
      }))
    };
    // @ts-ignore
    graph.push(imageGallerySchema);

    // Add primary image for WebPage
    const primaryImage = {
      "@type": "ImageObject",
      "@id": `${pageUrl}#primaryimage`,
      "url": joinUrlPaths(pageUrl, galleryBlock.data.items[0].url),
      "caption": galleryBlock.data.items[0].alt
    };
    // @ts-ignore
    graph.push(primaryImage);
  }

  // Dynamically add Menu and MenuItem schema
  const dataTableBlock = data.contentBlocks.find((block: any) => block.type === 'dataTable');
  if (dataTableBlock && dataTableBlock.data) {
    let categoriesToRender: { [key: string]: any } = {};
    const suffix = dataTableBlock.data.suffix || "of Olive Garden Menu";

    if (dataTableBlock.data.categoriesDataUrl) {
      const sourceData = menuDataSources[dataTableBlock.data.categoriesDataUrl];
      if (sourceData) {
        if (dataTableBlock.data.categoriesFilter === '*') {
          categoriesToRender = sourceData;
        } else if (Array.isArray(dataTableBlock.data.categoriesFilter)) {
          dataTableBlock.data.categoriesFilter.forEach((key: string) => {
            if (sourceData[key]) {
              categoriesToRender[key] = sourceData[key];
            }
          });
        }
      }
    } else if (dataTableBlock.data.categories) {
      categoriesToRender = dataTableBlock.data.categories;
    }

    for (const categoryName in categoriesToRender) {
      const category = categoriesToRender[categoryName];
      if (!category.items) continue;

      const menuItems = category.items.map((item: any) => ({
        "@type": "MenuItem",
        "name": item.title || item.name,
        "description": item.review || item.description || `A delicious ${item.title || item.name} from the Olive Garden menu.`,
        "image": item.image_url ? joinUrlPaths(baseURL, item.image_url) : undefined,
        "offers": {
          "@type": "Offer",
          "price": item.price,
          "priceCurrency": "USD"
        },
        "nutrition": {
          "@type": "NutritionInformation",
          "calories": item.calories ? `${item.calories} Cal` : undefined
        }
      })).filter((item: any) => item.name); // Ensure item has a name

      if (menuItems.length > 0) {
        const menuSchema = {
          "@type": "Menu",
          "name": `${categoryName} ${suffix}`,
          "description": category.description || `A selection of ${categoryName} from our menu.`,
          "hasMenuItem": menuItems
        };
        // @ts-ignore
        graph.push(menuSchema);
      }
    }
  }


  return `
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${h1}</title>
        <meta name="description" content="${description}">
        <link rel="canonical" href="${pageUrl}">
        <meta name="robots" content="follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large">
        <link rel="alternate" hreflang="en" href="${pageUrl}"><link rel="alternate" hreflang="x-default" href="${pageUrl}">
        <meta property="og:title" content="${h1}"><meta property="og:description" content="${description}"><meta property="og:url" content="${pageUrl}"><meta property="og:site_name" content="${siteName}"><meta property="og:type" content="website"><meta property="og:image" content="${logoUrl}">
        <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h1}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${logoUrl}"><meta name="twitter:site" content="${pageUrl}">
        <link rel="icon" href="${siteConfig.favicon.url}" sizes="${siteConfig.favicon.size}x${siteConfig.favicon.size}">
        <link rel="apple-touch-icon" href="${siteConfig.appleTouchIcon}">
        <script type="application/ld+json">${JSON.stringify({"@context": "https://schema.org", "@graph": graph})}</script>
        ${siteConfig.googleAnalyticsId ? `
        <!-- Global site tag (gtag.js) - Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=${siteConfig.googleAnalyticsId}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${siteConfig.googleAnalyticsId}');
        </script>
        ` : ''}
        ${siteConfig.googleAdsenseId ? `
        <!-- Google AdSense -->
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${siteConfig.googleAdsenseId}"
     crossorigin="anonymous"></script>
        ` : ''}
        <style>
            :root {
                --primary: ${colors.primary}; --secondary: ${colors.secondary}; --background: ${colors.background};
                --text-primary: ${colors.text_primary}; --text-secondary: ${colors.text_secondary}; --accent: ${colors.accent};
                --footer-bg: ${colors.footer_bg}; --footer-text: ${colors.footer_text};
                --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            body { 
                font-family: var(--font-sans); 
                background-color: var(--background); 
                color: var(--text-primary); 
                margin: 0; 
                line-height: 1.6; 
            }
            .container { max-width: ${siteConfig.maxWidth}px; margin: 0 auto; padding: 20px; }
            h1, h2, h3 , h4 { color: var(--text-primary); line-height: 1.2; }
            h1 { font-size: 2.5rem; text-align: center; margin-bottom: 0.5rem; }
            h2 { font-size: 2rem; border-bottom: 2px solid var(--primary); padding-bottom: 10px; margin-top: 40px; }
            p { color: var(--text-secondary); }
            a { color: var(--accent); text-decoration: none; }
            header { 
                background-color: var(--secondary); 
                color: white; 
                padding: 0.5rem 1rem; 
                position: sticky; 
                top: 0; 
                z-index: 100;
            }
            .main-nav { display: flex; justify-content: space-between; align-items: center;padding: 0; }
            .logo img { height: 40px; }
            .nav-links { display: flex; gap: 0.5rem; list-style: none; margin: 0; padding: 0;align-items: center; }
            .nav-links a { color: white; padding: 0.5rem; text-decoration: none; }
            .nav-links a:hover { color: var(--accent); }
            .nav-toggle { display: none; background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
            .has-submenu { position: relative; }
            .submenu-toggle { cursor: pointer; margin-left: 5px; font-size: 0.8em; user-select: none; transition: transform 0.3s; }
            .submenu-toggle.active { transform: rotate(180deg); }
            .submenu { list-style: none; padding: 0; margin: 0; position: absolute; top: 100%; left: 0; background-color: var(--secondary); border-radius: 4px; min-width: 220px;
                         max-height: 0; overflow: hidden; 
                         transition: max-height 0.4s ease-out;
                       }
            .submenu.active { max-height: 1000px; }
            .has-submenu:hover .submenu { max-height: 1000px; }
            
            .submenu li a { padding: 0.5rem 1rem; display: block; }
            .submenu li:first-child a { padding-top: 1rem; }
            .submenu li:last-child a { padding-bottom: 1rem; }
            .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
            
            .menu-card { 
                position: relative;
                border: 1px solid #eee; 
                border-radius: 8px; 
                box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
            }
            .menu-card img { 
                width: 100%; 
                height: 200px; 
                object-fit: cover; 
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
            }
            .no-image-placeholder {
                width: 100%;
                height: 200px;
                background-color: #ccc;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
                font-size: 0.9rem;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
            }
            
            .menu-card-content { padding: 15px; }
            .menu-card h3 , .menu-card h4 { font-size: 1.2rem; margin-top: 0; min-height: 2.9rem;}
            
            .price-calories-container {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                margin-top: 15px;
            }
            .price { font-size: 1.1rem; font-weight: bold; color: var(--accent); }
            .calories-badge { color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; }
            .category-description { margin: -5px 0 25px; font-style: italic; color: var(--text-secondary); text-align: left; }
            .category-description strong { color: var(--text-primary); font-weight: 600; }
            .review-text {
                font-size: 0.85rem;
                font-style: italic;
                color: #444;
                margin: 10px 0;
                padding: 10px;
                border-left: 3px solid var(--accent);
                background-color: #f9f9f9;
                border-radius: 4px;
            }
            .menu-item-description {
                font-size: 0.9rem;
                color: #666;
                cursor: pointer;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                transition: -webkit-line-clamp 0.2s ease-in-out;
            }
            .menu-item-description.expanded {
                -webkit-line-clamp: 99; /* A large number to show all lines */
            }
            .recommend-badge {
                position: absolute;
                width: 100px; /* Smaller width */
                text-align: center;
                top: 15px; /* Adjusted position */
                right: -25px; /* Adjusted position */
                padding: 3px 0; /* Reduced padding */
                background-color: var(--accent);
                color: white;
                font-size: 0.75rem; /* Smaller font */
                font-weight: bold;
                transform: rotate(45deg);
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                z-index: 2;
            }
            .quick-jumps, .data-table-details { background-color: #f9f9f9; padding: 15px; border: 1px solid #eee; border-radius: 8px; margin: 20px 0; }
            .quick-jumps summary, .data-table-details summary { font-weight: bold; cursor: pointer; font-size: 0.9rem; }
            .quick-jumps ul { list-style: none; padding-left: 0; }
            .quick-jumps span { margin-right: 5px; font-size: 12px;color: var(--text-secondary) }
            .shots-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 30px; }
            .shot-card { border: 1px solid #eee; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); overflow: hidden; cursor: pointer; }
            .shot-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
            .shot-card:hover img { transform: scale(1.05); }
            #lightbox-modal { display: none; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.9); }
            .lightbox-content { margin: auto; display: block; width: 80%; max-width: 640px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
            #lightbox-modal .close { position: absolute; top: 15px; right: 35px; color: #f1f1f1; font-size: 40px; font-weight: bold; transition: 0.3s; }
            #lightbox-modal .close:hover, #lightbox-modal .close:focus { color: #bbb; text-decoration: none; cursor: pointer; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .data-table th, .data-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .data-table th { background-color: #f2f2f2; }
            .scroll-to-top { position: fixed; bottom: 20px; right: 20px; background-color: var(--accent); color: white; border: none; border-radius: 50%; width: 50px; height: 50px; font-size: 1.5rem; cursor: pointer; display: none; z-index: 1000; opacity: 0.8; transition: opacity 0.3s; }
            .scroll-to-top:hover { opacity: 1; }
            footer { background-color: var(--footer-bg); color: var(--footer-text); padding: 2rem 1rem; font-size: 0.9rem; margin-top: 40px; }
            .footer-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
            .footer-links { display: flex; gap: 1rem; }
            .footer-links a { color: var(--footer-text); }
            .footer-disclaimer { font-size: 0.8rem; color: #999; margin-top: 1rem; text-align: center; width: 100%; }
            .video-container { position: relative; overflow: hidden; width: 100%; padding-top: 56.25%; margin: 2rem 0; }
            .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
            .submenu-parent-button {
                background: none; border: none; color: white; padding: 0.5rem; margin: 0;
                font-size: inherit; font-family: inherit; cursor: pointer; display: flex; align-items: center; width: 100%; text-align: left;
            }
            @media (min-width: 769px) { .submenu-parent-button { width: auto; } }
            @media (max-width: 768px) {
                h1 {font-size: 2rem;}
                .nav-links { 
                    display: none; position: absolute; top: 100%; right: 0; background-color: var(--secondary); 
                    flex-direction: column; width: 100%; text-align: center; padding: 1rem 0;
                }
                .nav-links.active { display: flex; }
                .nav-toggle { display: block; }
                .has-submenu:hover .submenu { max-height: 0; padding: 0; }
                .submenu { position: static; background-color: #5a5a5a; min-width: auto; border-radius: 0; }
                .has-submenu .submenu.active { max-height: 500px; }
                .submenu-parent-button { justify-content: center; }
            }
            .youtube-facade {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                cursor: pointer;
                background-size: cover;
                background-position: center;
            }
            .youtube-facade .play-button {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 68px;
                height: 48px;
                background: url('data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 68 48\\"><path d=\\"M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z\\" fill=\\"red\\"></path><path d=\\"M 45,24 27,14 27,34\\" fill=\\"white\\"></path></svg>') no-repeat;
                border: none;
                transition: opacity 0.2s ease;
            }
            .youtube-facade:hover .play-button {
                opacity: 0.8;
            }
            .video-container iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 0;
            }
        </style>
    </head>
    `;
}

function generateHeader(siteConfig: any): string {
  const {navigation, logoUrl, siteName} = siteConfig;
  const generateSubmenu = (submenuItems: any[]) => {
    return `<ul class="submenu">${submenuItems.map(sub => `<li><a href="${sub.url}">${sub.text}</a></li>`).join('')}</ul>`;
  };

  return `
    <header>
        <nav class="main-nav container">
            <a href="/" class="logo"><img src="${logoUrl}" alt="${siteName} Logo"></a>
            <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">☰</button>
            <ul class="nav-links">
                ${navigation.header.map((item: any) => `
                    <li class="${item.submenu ? 'has-submenu' : ''}">
                        ${item.submenu
    ? `<button type="button" class="submenu-parent-button" aria-expanded="false">
                                 ${item.text}
                                 <span class="submenu-toggle">▼</span>
                               </button>`
    : `<a href="${item.url}">${item.text}</a>`
  }
                        ${item.submenu ? generateSubmenu(item.submenu) : ''}
                    </li>
                `).join('')}
            </ul>
        </nav>
    </header>
    `;
}

function generateFooter(siteConfig: any): string {
  const {navigation} = siteConfig;
  const copyright = navigation.footer.find((i: any) => i.text && i.text.startsWith('©'));
  const disclaimer = navigation.footer.find((i: any) => i.text && i.text.startsWith('This website'));
  const links = navigation.footer.filter((i: any) => i.url);

  return `
    <footer>
        <div class="container">
            <div class="footer-content">
                <span>${copyright ? copyright.text : ''}</span>
                <div class="footer-links">
                    ${links.map((item: any) => `<a href="${item.url}">${item.text}</a>`).join('')}
                </div>
            </div>
            <p class="footer-disclaimer">${disclaimer ? disclaimer.text : ''}</p>
        </div>
    </footer>
    `;
}

// --- Component Rendering Functions ---

const renderHero = (data: any) => {
  const style = data.imageUrl ? ` style="background-image: url('${data.imageUrl}');"` : '';
  return `
  <section class="hero"${style}>
    <div class="hero-content">
      <h1>${data.h1}</h1>
      <p>${data.tagline}</p>
    </div>
  </section>
`
};

const renderRichText = (data: any) => `
  <section class="rich-text" id="${toKebabCase(data.title)}">
    ${data.title ? `<h2>${data.title}</h2>` : ''}
    <div>${data.htmlContent}</div>
  </section>
`;

const renderTableOfContents = (data: any, blocks: any[]) => {
  const headings = blocks.map(block => {
    if (block.data && block.data.title && (block.type === 'dataTable' || block.type === 'faq' || block.type === 'imageGallery' || block.type === 'richText' || block.type === "locationBlock")) {
      return {title: block.data.title, id: toKebabCase(block.data.title)};
    }
    return null;
  }).filter(Boolean);

  return `
    <details class="quick-jumps" open>
      <summary>🚀 ${data.title}</summary>
      <ul>
        ${headings.map((h, index) => `<li><span>${index + 1}.</span><a href="#${h.id}">${h.title}</a></li>`).join('')}
      </ul>
    </details>
  `;
};

const renderCategoryJumpLinks = (data: any) => {
  const categories = Object.keys(data.categories);
  // Use a different emoji to distinguish from the main ToC
  return `
    <details class="quick-jumps" open>
      <summary>🍝 ${data.title}</summary>
      <ul>
        ${categories.map((category, index) => `<li><span class="">${index + 1}.</span><a href="#${toKebabCase(category)}">${category}</a></li>`).join('')}
      </ul>
    </details>
  `;
};

const renderImageGallery = (data: any) => `
  <section id="${toKebabCase(data.title)}">
    <h2>${data.title}</h2>
    <p class="category-description">${data.description}</p>
    <div class="shots-gallery-grid">
      ${data.items.map((item: any, index: number) => `
        <div class="shot-card">
          <img src="${item.url}" alt="${item.alt} - photo ${index + 1}" loading="lazy" data-full-src="${item.url}">
        </div>
      `).join('')}
    </div>
  </section>
`;

const menuDataSources: { [key: string]: any } = {
  'raw/master-menu-data.json': masterMenuData,
  'raw/hawai-full-menu.json': hawaiiFullMenuData
};

const renderDataTable = (data: any,suffix = "of Olive Garden Menu") => {
  // Helper to format price strings consistently
  const formatPrice = (price: any) => {
    if (price === null || typeof price === 'undefined') return '$0.00';
    const priceStr = String(price);
    if (/^\d+(\.\d+)?$/.test(priceStr)) {
      return `$${Number(priceStr).toFixed(2)}`;
    }
    if (priceStr.includes("$")) {
      return priceStr;
    }
    return `$${priceStr}`;
  };

  const formatCalories = (calories: any): string => {
    if (calories === null || typeof calories === 'undefined' || String(calories).trim().toUpperCase() === 'N/A') {
      return '';
    }
    const calStr = String(calories).trim();
    if (calStr.toLowerCase().includes('cal')) {
      return calStr;
    }
    if (/^\d+$/.test(calStr)) {
      return `${calStr} Cal`;
    }
    return calStr;
  };

  let categoriesToRender: { [key: string]: any } = {};

  // Check if we need to load data dynamically
  if (data.categoriesDataUrl) {
    const sourceData = menuDataSources[data.categoriesDataUrl];
    if (!sourceData) {
      return `<p>Error: Menu data not found for ${data.categoriesDataUrl}</p>`;
    }

    if (data.categoriesFilter === '*') {
      categoriesToRender = sourceData;
    } else if (Array.isArray(data.categoriesFilter)) {
      data.categoriesFilter.forEach((key: string) => {
        // @ts-ignore
        if (sourceData[key]) {
          // @ts-ignore
          categoriesToRender[key] = sourceData[key];
        }
      });
    }
  } else {
    // Fallback to inline categories
    categoriesToRender = data.categories;
  }

  return `
    <section id="${toKebabCase(data.title || '')}">
      <h2>${data.title || ''}</h2>
      ${Object.keys(categoriesToRender).map(categoryName => {
    const categoryData = categoriesToRender[categoryName];
    const recommendedItemName = categoryData.recommended;
    return `
          <div id="${toKebabCase(categoryName || '')}">
            <h3>${categoryName || ''} ${suffix || ""}</h3>
            ${categoryData.description ? `<p class="category-description">${categoryData.description}</p>` : ''}
            <div class="menu-grid">
              ${categoryData.items.map((item: any) => `
                <div class="menu-card">
                  ${recommendedItemName && item.name === recommendedItemName ? '<div class="recommend-badge">Recommended</div>' : ''}
                  ${item.image_url ? `<img src="${item.image_url}" alt="Image of ${item.name || ''}" loading="lazy">` : '<div class="no-image-placeholder"><span>No Image Available</span></div>'}
                  <div class="menu-card-content">
                    <h4>${item.title || item.name || ''}</h4>
                    ${item.description ? `<p class="menu-item-description">${item.description}</p>` : ''}
                    ${item.review ? `<p class="review-text">${item.review}</p>` : ''}
                    <div class="price-calories-container">
                      <span class="price">${formatPrice(item.price)}</span>
                      <span class="calories-badge">${formatCalories(item.calories)}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `
  }).join('')}
    </section>
  `;
};

const renderFaq = (data: any) => `
  <section id="${toKebabCase(data.title)}">
    <h2>${data.title}</h2>
    <div class="faq-container">
      ${data.items.map((item: any) => `
        <details class="faq-item">
          <summary>${item.question}</summary>
          <p>${item.answer}</p>
        </details>
      `).join('')}
    </div>
  </section>
`;

const renderGoogleMap = (data: any) => `
  <section id="${toKebabCase(data.title)}">
    <h2>${data.title}</h2>
    <div style="text-align: center; margin: 20px 0;">
      <iframe
        src="${data.url}"
        width="100%"
        height="450px"
        style="border:0;"
        allowfullscreen=""
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade">
      </iframe>
    </div>
  </section>
`;

const renderLocationBlock = (data: any) => `
  <section id="${toKebabCase(data.title)}">
    <h2>${data.title}</h2>
    <p>${data.intro}</p>
    <div class='locations-container' style='display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px;'>
      ${data.locations.map((location: any) => `
        <div class='location-card' style='border: 1px solid #eee; border-radius: 8px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);'>
          <h3 style='margin-top:0;'>${location.displayName}</h3>
          <p>${location.streetAddress},<br>${location.addressLocality}, ${location.addressRegion} ${location.postalCode}</p>
          <p><strong>Phone:</strong> <a href='tel:${location.telephone}'>${location.telephone}</a></p>
          <p><strong>Hours:</strong> ${location.hours}</p>
        </div>
      `).join('')}
    </div>
  </section>
`;

const renderStoreDataTable = (data: any) => `
  <section id="${toKebabCase(data.title)}">
    <h2>${data.title}</h2>
    ${data.description ? `<p class="category-description">${data.description}</p>` : ''}
    <details class="data-table-details" open>
      <summary>Click to view all locations</summary>
      <table class="data-table">
        <thead>
          <tr>
            ${data.headers.map((header: string) => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.rows.map((row: string[]) => `
            <tr>
              ${row.map((cell: string) => `<td>${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </details>
  </section>
`;

function generatePageBody(data: any): string {
  let bodyContent = data.contentBlocks.map((block: any) => {
    switch (block.type) {
      case 'hero':
        return renderHero(block.data);
      case 'richText':
        return renderRichText(block.data);
      case 'tableOfContents':
        return renderTableOfContents(block.data, data.contentBlocks);
      case 'categoryJumpLinks':
        return renderCategoryJumpLinks(block.data);
      case 'imageGallery':
        return renderImageGallery(block.data);
      case 'dataTable':
        if (block.data.categories || block.data.categoriesDataUrl) {
          return renderDataTable(block.data,block.data.suffix);
        }
        return renderStoreDataTable(block.data);
      case 'faq':
        return renderFaq(block.data);
      case 'googleMap':
        return renderGoogleMap(block.data);
      case 'locationBlock':
        return renderLocationBlock(block.data);
      default:
        return `<!-- Unknown block type: ${block.type} -->`;
    }
  }).join('');

  const hasHero = data.contentBlocks.some((block: any) => block.type === 'hero');
  if (!hasHero && data.metadata.h1) {
    bodyContent = `<h1>${data.metadata.h1}</h1>` + bodyContent;
  }

  return `<main class="container">${bodyContent}</main>`;
}

function generateCommonScripts(): string {
  return `
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                // --- 现有导航栏逻辑 ---
                const navToggle = document.querySelector('.nav-toggle');
                const navLinks = document.querySelector('.nav-links');
                if (navToggle && navLinks) {
                    navToggle.addEventListener('click', () => {
                        const isActive = navLinks.classList.toggle('active');
                        navToggle.setAttribute('aria-expanded', isActive.toString());
                    });
                }
                const submenuButtons = document.querySelectorAll('.submenu-parent-button');
                submenuButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        const parentLi = button.parentElement;
                        const submenu = parentLi.querySelector('.submenu');
                        const toggleArrow = button.querySelector('.submenu-toggle');
                        if (submenu) {
                            const isExpanded = submenu.classList.toggle('active');
                            button.setAttribute('aria-expanded', isExpanded.toString());
                            if (toggleArrow) {
                                toggleArrow.classList.toggle('active');
                            }
                        }
                    });
                });
                const scrollToTopBtn = document.getElementById('scrollToTopBtn');
                if (scrollToTopBtn) {
                    window.onscroll = function() {
                        if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
                            scrollToTopBtn.style.display = "block";
                        } else {
                            scrollToTopBtn.style.display = "none";
                        }
                    };
                    scrollToTopBtn.addEventListener('click', () => {
                        window.scrollTo({top: 0, behavior: 'smooth'});
                    });
                }

                // --- 新增：YouTube Facade 逻辑 ---
                const videoFacades = document.querySelectorAll('.youtube-facade');
                videoFacades.forEach(facade => {
                    facade.addEventListener('click', function () {
                        const videoId = this.getAttribute('data-youtube-id');
                        const iframe = document.createElement('iframe');
                        iframe.setAttribute('src', \`https://www.youtube.com/embed/\${videoId}?autoplay=1&rel=0\`);
                        iframe.setAttribute('title', 'YouTube video player');
                        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
                        iframe.setAttribute('allowfullscreen', '');
                        this.replaceWith(iframe);
                    }, { once: true });
                });
                
                // --- 新增：Twitter 延迟加载逻辑 ---
                const twitterEmbed = document.querySelector('.twitter-tweet');
                if (twitterEmbed) {
                    const observer = new IntersectionObserver((entries, obs) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const script = document.createElement('script');
                                script.src = "https://platform.twitter.com/widgets.js";
                                script.async = true;
                                script.charset = 'utf-8';
                                document.body.appendChild(script);
                                obs.unobserve(entry.target);
                            }
                        });
                    }, { rootMargin: '800px' }); // 当元素距离视口800px时开始加载
                    observer.observe(twitterEmbed);
                }

                // --- 新增：可折叠的描述文本 ---
                const mainContainer = document.querySelector('main.container');
                if (mainContainer) {
                    mainContainer.addEventListener('click', function(event) {
                        if (event.target.classList.contains('menu-item-description')) {
                            event.target.classList.toggle('expanded');
                        }
                    });
                }
            });
        </script>
    `;
}

// --- Hono App ---

// @ts-ignore
app.get('/static/*', serveStatic({root: './'}))

app.get('/robots.txt', (c) => {
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${joinUrlPaths(siteConfig.baseURL, 'sitemap.xml')}`;
  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
});

app.get('/sitemap.xml', (c) => {
  const today = new Date().toISOString().split('T')[0];

  const allUrls = Object.keys(pageDataMap);

  const sitemapEntries = allUrls.map(path => {
    const pageData = pageDataMap[path];
    const fullUrl = joinUrlPaths(siteConfig.baseURL, path);
    const lastMod = pageData?.metadata?.datePublished || today;
    const priority = path === '/' ? '1.0' : '0.8'; // Simple priority logic

    return `
  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>${priority}</priority>
  </url>`;
  }).join('');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
});

app.get('/:filename{.+\\.txt$}', (c) => {
  const { filename } = c.req.param();
  const key = filename.slice(0, -4); // Remove .txt extension

  // @ts-ignore
  const { indexNowKey } = siteConfig.metadata;

  if (key === indexNowKey) {
    return new Response(indexNowKey, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return c.notFound();
});

app.get("/ads.txt", (c) => {
  if (siteConfig.googleAdsTxt) {
    return new Response(siteConfig.googleAdsTxt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });
  }
  // 404
  return c.notFound();

})

app.get('*', (c) => {
  let path = new URL(c.req.url).pathname;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  const pageData = pageDataMap[path];

  if (!pageData) {
    // Before 404, check if it's a known URL with a trailing slash
    const pathWithoutSlash = path.endsWith('/') ? path.slice(0, -1) : null;
    if (pathWithoutSlash && pageDataMap[pathWithoutSlash]) {
      return c.redirect(pathWithoutSlash, 301);
    }
    return c.notFound();
  }

  const head = generateHead(siteConfig, pageData, path);
  const header = generateHeader(siteConfig);
  let mainContent = generatePageBody(pageData);
  const footer = generateFooter(siteConfig);
  const commonScripts = generateCommonScripts();

  // Special handling for the homepage to inject the Near Me section
  if (path === '/') {
    const nearMeSection = `
       <section id="near-me">
        <h2>Find an Olive Garden Near Me! 📍</h2>
        <p>Craving some delicious Italian food? 🍝 Use the map below to find the nearest Olive Garden restaurant to you! We've got thousands of locations across the country, so there's a good chance there's one just around the corner.</p>
        <div style="text-align: center; margin: 20px 0;">
          <iframe
            src="${siteConfig.maps.url}"
            width="100%"
            height="450px"
            title="Olive Garden Google Map"
            style="border:0;"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>
        <p>For a detailed list of all Olive Garden locations, including addresses and hours, check out our new <a href="/olive-garden-near-me"><strong>Olive Garden Near Me</strong></a> page. We've got all the info you need to get your pasta fix! 🚀</p>
      </section>
    `;
    mainContent = mainContent.replace('</main>', nearMeSection + '</main>');
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    ${head}
    <body>
        ${header}
        ${mainContent}
        ${footer}
        <div id="lightbox-modal">
            <span class="close">&times;</span>
            <img class="lightbox-content" id="lightbox-image">
        </div>
        <button id="scrollToTopBtn" class="scroll-to-top" title="Go to top">▲</button>
        ${commonScripts}
        ${path === '/' ? `
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                const modal = document.getElementById('lightbox-modal');
                const modalImg = document.getElementById('lightbox-image');
                const galleryImages = document.querySelectorAll('.shot-card img');
                const closeBtn = document.querySelector('#lightbox-modal .close');
                if (galleryImages.length > 0 && modal && modalImg && closeBtn) {
                    galleryImages.forEach(image => {
                        image.addEventListener('click', () => {
                            modal.style.display = "block";
                            modalImg.src = image.dataset.fullSrc;
                        });
                    });
                    closeBtn.addEventListener('click', () => {
                        modal.style.display = "none";
                    });
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            modal.style.display = "none";
                        }
                    });
                }
            });
        </script>
        ` : ''}
    </body>
    </html>
  `;

  return c.html(html);
});

app.post('/api/index-now-submit', async (c) => {
  try {
    const body = await c.req.json();
    // @ts-ignore
    const { adminKey, indexNowKey } = siteConfig.metadata;
    const { baseURL } = siteConfig;

    // 1. Authorize
    if (!body || body.adminKey !== adminKey) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 2. Get URL List
    const allFullUrls = Object.keys(pageDataMap).map(path => joinUrlPaths(baseURL, path));

    // 3. Construct IndexNow Payload
    const payload = {
      host: new URL(baseURL).hostname,
      key: indexNowKey,
      urlList: allFullUrls,
    };

    // 4. Send to IndexNow
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Try to get error text from IndexNow response
      const errorText = await response.text();
      throw new Error(`IndexNow API returned status ${response.status}: ${errorText}`);
    }

    const responseData = await response.text();


    // 5. Return success response
    return c.json({ success: true, message: 'Submitted to IndexNow.', submittedUrls: allFullUrls.length, apiResponse: responseData || "OK" }, 200);

  } catch (error: any) {
    console.error('IndexNow submission failed:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/admin-panel/:key', (c) => {
  const { key } = c.req.param();
  // @ts-ignore
  const { adminKey, indexNowKey } = siteConfig.metadata;
  const { baseURL } = siteConfig;

  if (!adminKey || key !== adminKey) {
    return c.notFound();
  }

  // --- Logic to get all URLs ---
  const allFullUrls = Object.keys(pageDataMap).map(path => joinUrlPaths(baseURL, path));

  // --- Generate HTML page ---
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>IndexNow 手动提交</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; background-color: #f8f9fa; color: #212529; }
        .container { max-width: 800px; margin: 2em auto; background: white; padding: 2em; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        h1 { color: #343a40; }
        #url-list { list-style-type: none; padding: 0; max-height: 50vh; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 4px; padding: 1em; }
        #url-list li { padding: 0.5em; border-bottom: 1px solid #e9ecef; font-size: 0.9em; }
        #url-list li:last-child { border-bottom: none; }
        button { background-color: #007bff; color: white; padding: 0.8em 1.5em; border: none; border-radius: 5px; font-size: 1em; cursor: pointer; transition: background-color 0.3s; margin-top: 1em; }
        button:hover { background-color: #0056b3; }
        button:disabled { background-color: #6c757d; cursor: not-allowed; }
        .status { margin-top: 1em; padding: 1em; border-radius: 5px; display: none; font-weight: bold; }
        .status.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        code { background-color: #e9ecef; padding: .2em .4em; margin: 0; font-size: 85%; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>IndexNow 手动提交面板</h1>
        <p>找到以下 <strong>${allFullUrls.length}</strong> 个页面。点击按钮将它们全部提交到 IndexNow。</p>
        <p><small>您的 IndexNow Key: <code>${indexNowKey}</code></small></p>
        <button id="submit-btn">🚀 一键提交到 IndexNow</button>
        <div id="status-message" class="status"></div>
        <h2>将要提交的 URLs:</h2>
        <ul id="url-list">
          ${allFullUrls.map(url => `<li>${url}</li>`).join('')}
        </ul>
      </div>
      <script>
        document.getElementById('submit-btn').addEventListener('click', async () => {
          const btn = document.getElementById('submit-btn');
          const statusDiv = document.getElementById('status-message');
          
          btn.disabled = true;
          btn.textContent = '提交中...';
          statusDiv.style.display = 'none';

          try {
            const response = await fetch('/api/index-now-submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ adminKey: '${adminKey}' })
            });

            const result = await response.json();

            if (response.ok) {
              statusDiv.className = 'status success';
              statusDiv.textContent = '✅ 提交成功! IndexNow 已接收请求。服务器响应: ' + JSON.stringify(result);
            } else {
              throw new Error(result.error || '提交失败，服务器返回错误。');
            }
          } catch (error) {
            statusDiv.className = 'status error';
            statusDiv.textContent = '❌ 提交失败: ' + error.message;
          } finally {
            statusDiv.style.display = 'block';
            btn.disabled = false;
            btn.textContent = '🚀 一键提交到 IndexNow';
          }
        });
      </script>
    </body>
    </html>
  `;

  return c.html(html);
});

export default app;