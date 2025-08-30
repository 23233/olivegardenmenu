import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import menuData from '../raw/index.json'
import siteConfig from "../raw/site.json"

const app = new Hono()

// --- Utility Functions ---

function toKebabCase(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Safely joins a base URL with multiple path segments.
 * Handles leading/trailing slashes to prevent duplicates.
 * @param base The base URL (e.g., "https://example.com/")
 * @param paths The path segments to join (e.g., "path1", "/path2")
 * @returns A correctly formatted full URL.
 */
function joinUrlPaths(base: string, ...paths: string[]): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPaths = paths.map(p => p.startsWith('/') ? p.slice(1) : p);
  return [trimmedBase, ...trimmedPaths].join('/');
}


// --- HTML Generation Functions ---

// MODIFIED: Added menuData parameter and using the new joinUrlPaths utility
function generateHead(siteConfig: any, menuData: any): string {
  const { siteName, colors, baseURL } = siteConfig;
  const coreKeyword = "Olive Garden Menu";
  const title = `The Complete ${coreKeyword} 2025: Prices, Specials & Calories`;
  const description = `Explore the full ${coreKeyword} for 2025. We have the complete list of prices, calories, and special menu items. Your ultimate guide to the Olive Garden menu.`;

  // Use the base URL directly from config
  const pageUrl = baseURL;

  // Construct absolute URLs safely using the utility function
  const logoUrl = joinUrlPaths(pageUrl, siteConfig.logoUrl);

  const graph = [
    { "@type": "WebSite", "name": siteName, "url": pageUrl, "@id": `${pageUrl}#website` },
    { "@type": "Organization", "name": siteName, "url": pageUrl, "logo": logoUrl },
    { "@type": "WebPage", "url": pageUrl, "name": title, "description": description, "isPartOf": { "@id": `${pageUrl}#website` } }
  ];

  const menu = {
    "@type": "Menu",
    "name": "Olive Garden Full Menu",
    "hasMenuSection": [] as any[]
  };

  for (const category in menuData.menuContent) {
    if (Object.prototype.hasOwnProperty.call(menuData.menuContent, category)) {
      // @ts-ignore
      const categoryData = menuData.menuContent[category];
      if (!categoryData.items) continue; // Skip if there are no items, like in the gallery

      const menuSection = {
        "@type": "MenuSection",
        "name": category,
        "description": categoryData.description,
        "hasMenuItem": [] as any[]
      };

      categoryData.items.forEach((item: any) => {
        const menuItem = {
          "@type": "MenuItem",
          "name": item.name,
          "image": joinUrlPaths(pageUrl, item.image_url), // Safely join image URL
          "offers": {
            "@type": "Offer",
            "price": item.price,
            "priceCurrency": "USD"
          },
          "nutrition": {
            "@type": "NutritionInformation",
            "calories": item.calories + " Cal"
          }
        };
        menuSection.hasMenuItem.push(menuItem);
      });

      menu.hasMenuSection.push(menuSection);
    }
  }

  // @ts-ignore
  graph.push(menu);

  return `
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <meta name="description" content="${description}">
        <link rel="canonical" href="${pageUrl}">
        <meta name="robots" content="follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large">
        <link rel="alternate" hreflang="en" href="${pageUrl}"><link rel="alternate" hreflang="x-default" href="${pageUrl}">
        <meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${pageUrl}"><meta property="og:site_name" content="${siteName}"><meta property="og:type" content="website"><meta property="og:image" content="${logoUrl}">
        <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${logoUrl}">
        <link rel="icon" href="${siteConfig.favicon.url}" sizes="${siteConfig.favicon.size}x${siteConfig.favicon.size}">
        <link rel="apple-touch-icon" href="${siteConfig.appleTouchIcon}">
        <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>
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
            h1, h2, h3 { color: var(--text-primary); line-height: 1.2; }
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
            
            .menu-card-content { padding: 15px; }
            .menu-card h3 { font-size: 1.2rem; margin-top: 0; min-height: 2.9rem;}
            
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
        </style>
    </head>
    `;
}

function generateHeader(siteConfig: any): string {
  const { navigation, logoUrl, siteName } = siteConfig;
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
  const { navigation } = siteConfig;
  const copyright = navigation.footer.find((i:any) => i.text && i.text.startsWith('©'));
  const disclaimer = navigation.footer.find((i:any) => i.text && i.text.startsWith('This website'));
  const links = navigation.footer.filter((i:any) => i.url);

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

function generateMainContent(data: typeof menuData): string {
  const { menuContent, shotsGallery } = data;
  const menuCategories = Object.keys(menuContent);

  menuCategories.push("Near Me")

  const formatPrice = (price: any) => {
    if (price === null || typeof price === 'undefined') { return '$0.00'; }
    const priceNumber = Number(price);
    return isNaN(priceNumber) ? '$0.00' : `$${priceNumber.toFixed(2)}`;
  };

  const renderMenuCategory = (categoryName: string, categoryData: any) => {
    if (!categoryData || !categoryData.items) { return ''; }
    const items = categoryData.items;
    const baseDescription = categoryData.description || '';
    const recommendedItemName = categoryData.recommended;
    let fullDescription = baseDescription;
    if (baseDescription && recommendedItemName) {
      fullDescription += ` As a special recommendation, don't miss out on the <strong>${recommendedItemName}</strong>.`;
    }
    return `
      <section id="${toKebabCase(categoryName)}">
        <h2>${categoryName.replace(/–/g, '-')} - Olive Garden Menu</h2>
        ${fullDescription ? `<p class="category-description">${fullDescription}</p>` : ''}
        <div class="menu-grid">
          ${items.map((item: any) => `
            <div class="menu-card">
              ${item.name === recommendedItemName ? '<div class="recommend-badge">Recommended</div>' : ''}
              <img src="${item.image_url}" alt="Image of ${item.name} from the Olive Garden Menu" loading="lazy">
              <div class="menu-card-content">
                <h3>${item.name}</h3>
                <div class="price-calories-container">
                  <span class="price">${formatPrice(item.price)}</span>
                  <span class="calories-badge">${item.calories} Cal</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <details class="data-table-details">
          <summary>Show Full Price & Calorie Data for the ${categoryName.replace(/–/g, '-')} Olive Garden Menu</summary>
          <table class="data-table">
            <thead><tr><th>Item</th><th>Price</th><th>Calories</th></tr></thead>
            <tbody>
              ${items.map((item: any) => `
                <tr><td>${item.name}</td><td>${formatPrice(item.price)}</td><td>${item.calories}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </details>
      </section>
    `;
  };

  const renderEmbededTwitter = (rawHtml :string) => {
    return `
      <section id="twitter-embed">
        <div>${rawHtml}</div>
      </section>
    `;
  };

  const renderShotsGallery = (galleryData: any) => {
    return `
      <section id="shots-gallery">
        <h2>Shots Gallery 📸 - <strong>Olive Garden Menu</strong></h2>
        <p class="category-description">${galleryData.description}</p>
        <div class="shots-gallery-grid">
          ${galleryData.items.map((item: any) => `
            <div class="shot-card">
              <img src="${item.url}" alt="${item.alt}" loading="lazy" data-full-src="${item.url}">
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  return `
    <main class="container">
      <h1>${data.h1}</h1>
      <p style="text-align: center;">${data.description}</p>
      ${renderShotsGallery(shotsGallery)}
      
      ${renderEmbededTwitter(data.embedded_twitter.html)}
      
      <details class="quick-jumps" open>
        <summary>🚀 Quick Jumps to Olive Garden Menu Sections</summary>
        <ul>
          ${menuCategories.map((cat, index) => `<li><span>${index + 1}.</span><a href="#${toKebabCase(cat)}">${cat}</a></li>`).join('')}
        </ul>
      </details>
      
      ${menuCategories.map(category => renderMenuCategory(category, (menuContent as any)[category])).join('')}

        
      <section id="near-me">
        <h2>Find an Olive Garden Near Me! 📍</h2>
        <p>Craving some delicious Italian food? 🍝 Use the map below to find the nearest Olive Garden restaurant to you! We've got hundreds of locations across the country, so there's a good chance there's one just around the corner.</p>
        <div style="text-align: center; margin: 20px 0;">
          <iframe 
            src="${siteConfig.maps.url}" 
            width="100%" 
            height="450px" 
            style="border:0;" 
            allowfullscreen="" 
            loading="lazy" 
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>
        <p>For a detailed list of all Olive Garden locations, including addresses and hours, check out our new <a href="/near-me/"><strong>Olive Garden Near Me</strong></a> page. We've got all the info you need to get your pasta fix! 🚀</p>
      </section>
        
    </main>
    `;
}

// --- Hono App ---

// @ts-ignore
app.get('/static/*', serveStatic({ root: './' }))

app.get('/', (c) => {
  // MODIFIED: Pass menuData to generateHead
  const head = generateHead(siteConfig, menuData);
  const header = generateHeader(siteConfig);
  const mainContent = generateMainContent(menuData);
  const footer = generateFooter(siteConfig);

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
                            // @ts-ignore
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
            });
        </script>
    </body>
    </html>
  `;

  return c.html(html);
})

export default app