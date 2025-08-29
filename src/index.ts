import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import menuData from '../raw/index.json'

const app = new Hono()

// --- Data & Config ---

const siteConfig = {
  siteName: "Olive Garden Menu With Prices",
  logoUrl: "/static/image/logo-2.png",
  colors: {
    primary: "#FFC0CB",
    secondary: "#4A4A4A",
    background: "#FFFFFF",
    text_primary: "#121212",
    text_secondary: "#5A5A5A",
    accent: "#e53e3e",
    footer_bg: "#333333",
    footer_text: "#cccccc",
  },
  navigation: {
    header: [
      { text: "Olive Garden Menu 2025", submenu: [
          { text: "Olive Garden Drink Menu 2025", url: "/menu/"},
          { text: "Olive Garden Lunch Menu 2025", url: "/menu/"},
          { text: "Olive Garden Dinner Menu 2025", url: "/menu/"},
        ]},
      { text: "Olive Garden Specials", url: "/about/" },
      { text: "Happy Hours 2025", url: "/about/" },
      { text: "Coupons", url: "/about/" },
    ],
    footer: [
      { text: "This website is not affiliated with, sponsored by, or endorsed by Olive Garden. All trademarks, names, and logos belong to their respective owners. For official information, visit the official Olive Garden website." },
      { text: "© 2025 Olive Garden Menu" },
      { text: "Contact Us", url: "/contact_us" },
      { text: "Privacy Policy", url: "/privacy_policy" },
      { text: "Terms of Service", url: "/terms_of_service" }
    ]
  }
};

// --- Descriptions and Recommendations are now loaded from index.json ---
// No more hardcoded data here!

// --- Utility Functions ---

function toKebabCase(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}


// --- HTML Generation Functions ---

function generateHead(siteConfig: any): string {
  const { siteName, colors } = siteConfig;
  const coreKeyword = "Olive Garden Menu";
  const title = `The Complete ${coreKeyword} 2025: Prices, Specials & Calories`;
  const description = `Explore the full ${coreKeyword} for 2025. We have the complete list of prices, calories, and special menu items. Your ultimate guide to the Olive Garden menu.`;
  const pageUrl = "https://olivegardenmenu.info/";

  const ldJson = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "name": siteName, "url": pageUrl },
      { "@type": "Organization", "name": siteName, "url": pageUrl, "logo": `${pageUrl}${siteConfig.logoUrl}` },
      { "@type": "WebPage", "url": pageUrl, "name": title, "description": description, "isPartOf": { "@id": `${pageUrl}#website` } }
    ]
  };

  return `
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <meta name="description" content="${description}">
        <link rel="canonical" href="${pageUrl}">
        <meta name="robots" content="follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large">
        <link rel="alternate" hreflang="en" href="${pageUrl}"><link rel="alternate" hreflang="x-default" href="${pageUrl}">
        <meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${pageUrl}"><meta property="og:site_name" content="${siteName}"><meta property="og:type" content="website"><meta property="og:image" content="${pageUrl}${siteConfig.logoUrl}">
        <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${pageUrl}${siteConfig.logoUrl}">
        <link rel="icon" href="/static/image/favicon32.ico" sizes="32x32">
        <link rel="apple-touch-icon" href="/static/image/apple-touch-icon.webp">
        <script type="application/ld+json">${JSON.stringify(ldJson)}</script>
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
            .container { max-width: 960px; margin: 0 auto; padding: 20px; }
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
            .nav-links { display: flex; gap: 1rem; list-style: none; margin: 0; padding: 0;align-items: center; }
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
            .submenu.active { max-height: 500px; }
            .has-submenu:hover .submenu { max-height: 500px; }
            
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
            .menu-card h3 { font-size: 1.2rem; margin-top: 0; }
            
            .price-calories-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 15px;
            }
            .price { font-size: 1.1rem; font-weight: bold; color: var(--accent); }
            .calories-badge { color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; }

            .category-description { margin: -5px 0 25px; font-style: italic; color: var(--text-secondary); text-align: left; }
            .category-description strong { color: var(--text-primary); font-weight: 600; }
            
            .recommend-badge {
                position: absolute;
                width: 150px;
                text-align: center;
                top: 25px;
                right: -35px;
                padding: 5px 0;
                background-color: var(--accent);
                color: white;
                font-size: 0.9rem;
                font-weight: bold;
                transform: rotate(45deg);
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                z-index: 2;
            }

            .quick-jumps, .data-table-details { background-color: #f9f9f9; padding: 15px; border: 1px solid #eee; border-radius: 8px; margin: 20px 0; }
            .quick-jumps summary, .data-table-details summary { font-weight: bold; cursor: pointer; font-size: 1.1rem; }
            .quick-jumps ul { list-style: none; padding-left: 0; }
            .quick-jumps span { margin-right: 5px; font-size: 12px;color: var(--text-secondary) }
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
  // This function remains the same
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
  // This function remains the same
  const { navigation } = siteConfig;
  const copyright = navigation.footer.find((i:any) => i.text.startsWith('©'));
  const disclaimer = navigation.footer.find((i:any) => i.text.startsWith('This website'));
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

// --- START: UPDATED Main Content Function ---
function generateMainContent(data: typeof menuData): string {
  const categories = Object.keys(data);
  const formatPrice = (price: any) => {
    if (price === null || typeof price === 'undefined') { return '$0.00'; }
    const priceNumber = Number(price);
    return isNaN(priceNumber) ? '$0.00' : `$${priceNumber.toFixed(2)}`;
  };

  return `
    <main class="container">
        <h1>Explore the Full Olive Garden Menu for 2025 🍝</h1>
        <p style="text-align: center;">Welcome to your complete guide to the Olive Garden menu. Find all items, prices, and calorie information for the entire Olive Garden menu lineup below.</p>
        <details class="quick-jumps">
            <summary>🚀 Quick Jumps to Olive Garden Menu Sections</summary>
            <ul>
                ${categories.map((cat,index) => `<li><span>${index + 1}.</span><a href="#${toKebabCase(cat)}">${cat}</a></li>`).join('')}
            </ul>
        </details>
        ${categories.map(category => {
    // Read the new data structure from JSON
    const categoryData = (data as any)[category];
    if (!categoryData || !categoryData.items) return ''; // Skip if the category is malformed

    const items = categoryData.items;
    const baseDescription = categoryData.description || '';
    const recommendedItemName = categoryData.recommended;

    let fullDescription = baseDescription;
    if (baseDescription && recommendedItemName) {
      fullDescription += ` As a special recommendation, don't miss out on the <strong>${recommendedItemName}</strong>.`;
    }

    return `
            <section id="${toKebabCase(category)}">
                <h2>${category.replace(/–/g, '-')} - Olive Garden Menu</h2>
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
                                    <span class="calories-badge">${item.calories} Calories</span>
                                 </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <details class="data-table-details">
                    <summary>Show Full Price & Calorie Data for the ${category.replace(/–/g, '-')} Olive Garden Menu</summary>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Price</th>
                                <th>Calories</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item: any) => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${formatPrice(item.price)}</td>
                                    <td>${item.calories}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </details>
            </section>
        `}).join('')}
    </main>
    `;
}
// --- END: UPDATED Main Content Function ---


// --- Hono App ---

// @ts-ignore
app.get('/static/*', serveStatic({ root: './' }))

app.get('/', (c) => {
  const head = generateHead(siteConfig);
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
        <button id="scrollToTopBtn" class="scroll-to-top" title="Go to top">▲</button>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
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