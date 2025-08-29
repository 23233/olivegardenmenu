import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import menuData from '../raw/index.json'

const app = new Hono()

// --- Data & Config ---

const siteConfig = {
  siteName: "Olive Garden Menu With Prices",
  colors: {
    primary: "#FFC0CB",
    secondary: "#4A4A4A",
    background: "#FFFFFF",
    text_primary: "#121212",
    text_secondary: "#5A5A5A",
    accent: "#FF69B4",
  },
  navigation: {
    header: [
      { text: "Olive Garden Menu 2025", url: "/menu/" },
      { text: "Olive Garden Specials", url: "/about/" },
      { text: "Happy Hours 2025", url: "/about/" },
      { text: "Coupons", url: "/about/" },
      { text: "Holiday Hours 2025", url: "/about/" },
      { text: "App", url: "/about/" }
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


// --- Utility Functions ---

function toKebabCase(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}


// --- HTML Generation Functions ---

function generateHead(siteConfig: any): string {
    const { siteName, colors } = siteConfig;
    const coreKeyword = "Olive Garden Menu Prices";
    const title = `Today's ${coreKeyword}? 👀 Every Item & Price! 🔥`;
    const description = `Hungry for Olive Garden? 🍝 We've got the FULL 2025 menu with prices, from appetizers to desserts. See the complete lineup before you go! 👇`;
    const pageUrl = "https://olivegardenmenue.com/"; // Replace with actual domain

    const ldJson = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "name": siteName,
                "url": pageUrl
            },
            {
                "@type": "Organization",
                "name": siteName,
                "url": pageUrl,
                "logo": `${pageUrl}static/image/logo-2.png`
            },
            {
                "@type": "WebPage",
                "url": pageUrl,
                "name": title,
                "description": description,
                "isPartOf": { "@id": `${pageUrl}#website` }
            }
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
        <link rel="alternate" hreflang="en" href="${pageUrl}">
        <link rel="alternate" hreflang="x-default" href="${pageUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:url" content="${pageUrl}">
        <meta property="og:site_name" content="${siteName}">
        <meta property="og:type" content="website">
        <meta property="og:image" content="${pageUrl}static/image/logo-2.png">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${pageUrl}static/image/logo-2.png">
        <link rel="icon" href="/static/image/favicon32.ico" sizes="32x32">
        <link rel="apple-touch-icon" href="/static/image/apple-touch-icon.webp">
        <script type="application/ld+json">${JSON.stringify(ldJson)}</script>
        <style>
            :root {
                --primary: ${colors.primary};
                --secondary: ${colors.secondary};
                --background: ${colors.background};
                --text-primary: ${colors.text_primary};
                --text-secondary: ${colors.text_secondary};
                --accent: ${colors.accent};
                --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
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
            header, footer { background-color: var(--secondary); color: white; padding: 1rem; }
            header a, footer a { color: white; }
            .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
            .menu-card { border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .menu-card img { width: 100%; height: 200px; object-fit: cover; }
            .menu-card-content { padding: 15px; }
            .menu-card h3 { font-size: 1.2rem; margin-top: 0; }
            .calories-badge { background-color: var(--accent); color: white; padding: 5px 10px; border-radius: 12px; font-size: 0.9rem; display: inline-block; }
            .quick-jumps { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .quick-jumps summary { font-weight: bold; cursor: pointer; }
            .quick-jumps ul { list-style: none; padding-left: 0; }
        </style>
    </head>
    `;
}

function generateHeader(siteConfig: any): string {
    const { navigation } = siteConfig;
    return `
    <header>
        <nav class="container">
            <a href="/" style="font-size: 1.5rem; font-weight: bold;">${siteConfig.siteName}</a>
             ${navigation.header.map((item: any) => `
                <a href="${item.url || '#'}">${item.text}</a>
            `).join('')}
        </nav>
    </header>
    `;
}

function generateFooter(siteConfig: any): string {
    const { navigation } = siteConfig;
    return `
    <footer>
        <div class="container">
            ${navigation.footer.map((item: any) => `<p>${item.url ? `<a href="${item.url}">${item.text}</a>` : item.text}</p>`).join('')}
        </div>
    </footer>
    `;
}

function generateMainContent(data: typeof menuData): string {
    const categories = Object.keys(data);
    return `
    <main class="container">
        <h1>What's on the Olive Garden Menu Today? 🍝</h1>
        <p style="text-align: center;">Your ultimate guide to all Olive Garden menu items and prices for 2025. Let's dig in! 👇</p>

        <details class="quick-jumps">
            <summary>🚀 Quick Jumps to Menu Sections</summary>
            <ul>
                ${categories.map(cat => `<li><a href="#${toKebabCase(cat)}">${cat}</a></li>`).join('')}
            </ul>
        </details>

        ${categories.map(category => `
            <section id="${toKebabCase(category)}">
                <h2>${category}</h2>
                <div class="menu-grid">
                    ${(data as any)[category].map((item: any) => `
                        <div class="menu-card">
                            <picture>
                                <source srcset="${item.image_url}" type="image/webp">
                                <img src="${item.image_url.replace('.webp', '.jpg')}" alt="Image of ${item.name}" loading="lazy">
                            </picture>
                            <div class="menu-card-content">
                                <h3>${item.name}</h3>
                                <p><span class="calories-badge">${item.calories} Calories</span></p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `).join('')}
    </main>
    `;
}


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
    </body>
    </html>
  `;

  return c.html(html);
})

export default app
